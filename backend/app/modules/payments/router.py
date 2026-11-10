from decimal import Decimal
from typing import Any, Dict, List, Optional
import uuid
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from app.common.schemas import ResponseEnvelope
from app.modules.auth.dependencies import get_current_user, get_current_user_optional, require_staff_or_admin
from app.modules.payments.dependencies import get_payment_service
from app.modules.payments.models import Payment, PaymentStatus
from app.modules.payments.schemas import (
    PaymentCreateIntent,
    PaymentFailureRequest,
    PaymentIntentResponse,
    PaymentOrderCreate,
    PaymentOrderResponse,
    PaymentRead,
    PaymentReceiptResponse,
    PaymentRefundRequest,
    PaymentRefundResponse,
    PaymentTransactionRead,
    PaymentVerifyRequest,
    PaymentVerifyResponse,
)
from app.modules.payments.service import PaymentService
from app.modules.users.models import User

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("/orders", response_model=ResponseEnvelope[PaymentOrderResponse], status_code=status.HTTP_201_CREATED)
async def create_payment_order(
    payload: PaymentOrderCreate,
    service: PaymentService = Depends(get_payment_service),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Creates a payment order for a booking.
    Supports full payment, configurable advance payment, and security deposits.
    """
    order = await service.create_order(payload, current_user=current_user)
    return ResponseEnvelope(data=order)


@router.post("/verify", response_model=ResponseEnvelope[PaymentVerifyResponse])
async def verify_payment(
    payload: PaymentVerifyRequest,
    request: Request,
    service: PaymentService = Depends(get_payment_service),
):
    """
    Verifies Razorpay payment signature on backend.
    Only transitions booking to CONFIRMED after verification and availability validation.
    """
    client_ip = request.client.host if request.client else None
    result = await service.verify_and_capture_payment(payload, ip_address=client_ip)
    return ResponseEnvelope(data=result)


@router.post("/failure", response_model=ResponseEnvelope[Dict[str, str]])
async def record_payment_failure(
    payload: PaymentFailureRequest,
    service: PaymentService = Depends(get_payment_service),
):
    """Records client or gateway payment failure."""
    await service.record_payment_failure(payload)
    return ResponseEnvelope(data={"status": "recorded", "order_id": payload.order_id})


@router.get("/{payment_id}/receipt", response_model=ResponseEnvelope[PaymentReceiptResponse])
async def get_payment_receipt(
    payment_id: uuid.UUID,
    service: PaymentService = Depends(get_payment_service),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Generates itemized payment receipt for a payment."""
    receipt = await service.get_receipt(payment_id)
    return ResponseEnvelope(data=receipt)


@router.get("/{payment_id}/transactions", response_model=ResponseEnvelope[List[PaymentTransactionRead]])
async def list_payment_transactions(
    payment_id: uuid.UUID,
    service: PaymentService = Depends(get_payment_service),
    current_user: User = Depends(get_current_user),
):
    """Retrieves full transaction audit history for a payment."""
    txs = await service.tx_repo.list_by_payment(payment_id)
    return ResponseEnvelope(data=[PaymentTransactionRead.model_validate(t) for t in txs])


@router.post("/{payment_id}/refund", response_model=ResponseEnvelope[PaymentRefundResponse])
async def refund_payment(
    payment_id: uuid.UUID,
    payload: PaymentRefundRequest,
    request: Request,
    service: PaymentService = Depends(get_payment_service),
    current_user: User = Depends(require_staff_or_admin),
):
    """
    Processes full or partial refund for a captured payment.
    Requires staff or admin permissions.
    """
    client_ip = request.client.host if request.client else None
    refund = await service.process_refund(
        payment_id=payment_id,
        payload=payload,
        actor_id=current_user.id,
        ip_address=client_ip,
    )
    return ResponseEnvelope(data=refund)


@router.post("/webhooks/razorpay")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: Optional[str] = Header(None, alias="X-Razorpay-Signature"),
    service: PaymentService = Depends(get_payment_service),
):
    """
    Secure webhook handling for Razorpay events.
    Verifies signature and processes deliveries idempotently.
    """
    if not x_razorpay_signature:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-Razorpay-Signature header",
        )

    raw_body = await request.body()
    result = await service.process_webhook(raw_body, x_razorpay_signature)
    return result


@router.get("", response_model=ResponseEnvelope[List[PaymentRead]])
async def list_payments(
    booking_id: Optional[uuid.UUID] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    service: PaymentService = Depends(get_payment_service),
    current_user: User = Depends(get_current_user),
):
    """Lists payments, filterable by booking_id or status."""
    if booking_id:
        payments = await service.payment_repo.list_by_booking(booking_id)
    else:
        payments = await service.list(skip=skip, limit=limit)
    if status_filter:
        payments = [p for p in payments if p.status == status_filter.lower()]
    return ResponseEnvelope(data=[PaymentRead.model_validate(p) for p in payments])


# Backwards compatibility endpoints
@router.post("/intent", response_model=ResponseEnvelope[PaymentIntentResponse], status_code=status.HTTP_201_CREATED)
async def create_payment_intent(
    payload: PaymentCreateIntent,
    service: PaymentService = Depends(get_payment_service),
):
    order = await service.create_order(
        PaymentOrderCreate(
            booking_id=payload.booking_id,
            amount_cents=int(payload.amount * 100),
        )
    )
    return ResponseEnvelope(
        data=PaymentIntentResponse(
            payment_id=order.order_db_id,
            transaction_reference=order.order_id,
            client_secret=f"{order.order_id}_secret",
            amount=order.amount,
            currency=order.currency,
            status=PaymentStatus.PENDING,
        )
    )


@router.post("/{payment_id}/confirm", response_model=ResponseEnvelope[PaymentRead])
async def legacy_confirm_payment(
    payment_id: uuid.UUID,
    service: PaymentService = Depends(get_payment_service),
):
    payment = await service.get_or_404(payment_id)
    payment.status = PaymentStatus.CAPTURED.value
    updated = await service.payment_repo.update(payment)
    return ResponseEnvelope(data=PaymentRead.model_validate(updated))
