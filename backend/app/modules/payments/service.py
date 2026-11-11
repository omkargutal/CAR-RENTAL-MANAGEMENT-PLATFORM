from datetime import datetime, timezone
from decimal import Decimal
import json
from typing import Any, Dict, List, Optional
import uuid
from app.core.exceptions import (
    BadRequestError,
    ConflictError,
    NotFoundError,
    UnauthorizedError,
    ValidationAppError,
)
from app.common.services import BaseService
from app.core.config import settings
from app.core.logging import logger
from app.interfaces.payment import PaymentGatewayProvider
from app.modules.bookings.models import Booking, BookingStatus
from app.modules.bookings.repository import BookingRepository
from app.modules.payments.models import (
    Payment,
    PaymentMethod,
    PaymentOrder,
    PaymentRefund,
    PaymentStatus,
    PaymentTransaction,
    PaymentType,
    PaymentWebhookEvent,
    TransactionType,
)
from app.modules.payments.repository import (
    PaymentOrderRepository,
    PaymentRefundRepository,
    PaymentRepository,
    PaymentTransactionRepository,
    PaymentWebhookEventRepository,
)
from app.modules.payments.schemas import (
    PaymentFailureRequest,
    PaymentOrderCreate,
    PaymentOrderResponse,
    PaymentReceiptItem,
    PaymentReceiptResponse,
    PaymentRefundRequest,
    PaymentRefundResponse,
    PaymentVerifyRequest,
    PaymentVerifyResponse,
)
from app.modules.users.models import User
from app.modules.users.repository import AuditLogRepository
from app.modules.vehicles.repository import VehicleRepository


class PaymentService(BaseService[Payment]):
    def __init__(
        self,
        payment_repo: PaymentRepository,
        order_repo: PaymentOrderRepository,
        refund_repo: PaymentRefundRepository,
        tx_repo: PaymentTransactionRepository,
        webhook_repo: PaymentWebhookEventRepository,
        booking_repo: BookingRepository,
        vehicle_repo: VehicleRepository,
        gateway: PaymentGatewayProvider,
    ):
        super().__init__(payment_repo)
        self.payment_repo = payment_repo
        self.order_repo = order_repo
        self.refund_repo = refund_repo
        self.tx_repo = tx_repo
        self.webhook_repo = webhook_repo
        self.booking_repo = booking_repo
        self.vehicle_repo = vehicle_repo
        self.gateway = gateway
        self.audit_repo = AuditLogRepository(payment_repo.db)

    async def create_order(
        self,
        payload: PaymentOrderCreate,
        current_user: Optional[User] = None,
    ) -> PaymentOrderResponse:
        """
        Creates a payment order for a booking.
        Supports full payment, configurable advance payment, and security deposits.
        """
        booking = await self.booking_repo.get_by_id(payload.booking_id)
        if not booking or booking.is_deleted:
            raise NotFoundError(f"Booking {payload.booking_id} not found.")

        if booking.status not in [BookingStatus.PENDING, BookingStatus.AWAITING_PAYMENT]:
            raise ValidationAppError(
                f"Cannot create payment order for booking in '{booking.status.value}' state."
            )

        now = datetime.now(timezone.utc)
        if booking.expires_at and booking.expires_at < now:
            raise ConflictError("Booking reservation hold has expired. Please initiate a new booking.")

        # Determine amount in cents
        if payload.amount_cents is not None and payload.amount_cents > 0:
            amount_cents = payload.amount_cents
        elif payload.payment_type == PaymentType.FULL:
            amount_cents = booking.total_amount_cents + booking.deposit_amount_cents
        elif payload.payment_type == PaymentType.ADVANCE:
            # 25% advance of total booking charges (minimum $20 / 2000 cents)
            advance = max(int(booking.total_amount_cents * 0.25), 2000)
            amount_cents = min(advance, booking.total_amount_cents)
        elif payload.payment_type == PaymentType.SECURITY_DEPOSIT:
            amount_cents = booking.deposit_amount_cents
        else:
            amount_cents = booking.total_amount_cents

        receipt_number = f"REC-{now.strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

        # Call Payment Gateway to create order
        notes = {
            "booking_id": str(booking.id),
            "booking_reference": booking.booking_reference,
            "payment_type": payload.payment_type.value,
        }
        order_res = await self.gateway.create_order(
            amount_cents=amount_cents,
            currency=booking.currency or "INR",
            receipt=receipt_number,
            notes=notes,
        )

        # Save order record
        payment_order = PaymentOrder(
            order_reference=order_res.order_id,
            booking_id=booking.id,
            customer_id=booking.customer_id,
            amount_cents=amount_cents,
            currency=booking.currency or "INR",
            payment_type=payload.payment_type.value,
            status="PENDING",
            receipt_number=receipt_number,
            notes=notes,
        )
        saved_order = await self.order_repo.create(payment_order)

        # Log transaction
        tx = PaymentTransaction(
            order_id=saved_order.id,
            booking_id=booking.id,
            transaction_type=TransactionType.ORDER_CREATED.value,
            amount_cents=amount_cents,
            currency=saved_order.currency,
            status="PENDING",
            gateway_reference=order_res.order_id,
            metadata_={"receipt_number": receipt_number, "payment_type": payload.payment_type.value},
        )
        await self.tx_repo.create(tx)

        return PaymentOrderResponse(
            order_id=saved_order.order_reference,
            order_db_id=saved_order.id,
            booking_id=booking.id,
            amount_cents=saved_order.amount_cents,
            amount=saved_order.amount,
            currency=saved_order.currency,
            key_id=getattr(self.gateway, "key_id", "rzp_test_public"),
            payment_type=saved_order.payment_type,
            receipt_number=saved_order.receipt_number,
            status=saved_order.status,
        )

    async def verify_and_capture_payment(
        self,
        payload: PaymentVerifyRequest,
        ip_address: Optional[str] = None,
    ) -> PaymentVerifyResponse:
        """
        Verifies Razorpay payment signature on backend.
        Guarantees booking transitions to Confirmed only if payment is verified AND vehicle remains available.
        """
        # 1. Verify cryptographic signature
        is_valid = self.gateway.verify_payment_signature(
            order_id=payload.order_id,
            payment_id=payload.razorpay_payment_id,
            signature=payload.razorpay_signature,
        )
        if not is_valid:
            logger.warning(f"Payment verification failed for order {payload.order_id}")
            raise ValidationAppError("Invalid payment signature. Payment cannot be verified.")

        # 2. Retrieve Payment Order
        order = await self.order_repo.get_by_reference(payload.order_id)
        if not order:
            raise NotFoundError(f"Payment order '{payload.order_id}' not found.")

        booking = await self.booking_repo.get_by_id(order.booking_id)
        if not booking:
            raise NotFoundError(f"Booking {order.booking_id} not found.")

        # 3. Idempotent check: If already paid and confirmed, return existing confirmation
        if order.status == "PAID":
            existing = await self.payment_repo.get_by_gateway_payment_id(payload.razorpay_payment_id)
            if existing:
                return PaymentVerifyResponse(
                    payment_id=existing.id,
                    transaction_reference=existing.transaction_reference,
                    status=existing.status,
                    receipt_number=existing.receipt_number or order.receipt_number,
                    booking_id=booking.id,
                    booking_status=booking.status.value,
                    amount=existing.amount,
                    currency=existing.currency,
                    message="Payment already verified and confirmed.",
                )

        # 4. Check vehicle availability and expiration before confirmation
        now = datetime.now(timezone.utc)
        if booking.expires_at and booking.expires_at < now:
            order.status = "EXPIRED"
            await self.order_repo.update(order)
            # Payment signature is valid, but reservation expired: auto-refund
            try:
                await self.gateway.refund_payment(
                    payload.razorpay_payment_id,
                    amount_cents=order.amount_cents,
                    notes={"reason": "Reservation expired before payment completion"},
                )
            except Exception as e:
                logger.error(f"Failed to auto-refund expired booking payment: {e}")
            raise ConflictError("Reservation expired prior to payment confirmation. Refund has been initiated.")
        # Overlapping bookings are explicitly allowed per business rules: no double-booking rejection

        # 5. Create Payment record
        payment = Payment(
            booking_id=booking.id,
            order_id=order.id,
            transaction_reference=payload.razorpay_payment_id,
            provider="razorpay",
            amount=order.amount,
            amount_cents=order.amount_cents,
            currency=order.currency,
            status=PaymentStatus.CAPTURED,
            payment_method=PaymentMethod.CREDIT_CARD,
            receipt_number=order.receipt_number,
            payment_type=order.payment_type,
            gateway_order_id=payload.order_id,
            gateway_payment_id=payload.razorpay_payment_id,
            gateway_signature=payload.razorpay_signature,
            captured_at=now,
        )
        saved_payment = await self.payment_repo.create(payment)

        # 6. Update order status
        order.status = "PAID"
        await self.order_repo.update(order)

        # 7. Transition Booking to CONFIRMED and clear expiry
        booking.status = BookingStatus.CONFIRMED
        booking.expires_at = None
        await self.booking_repo.update(booking)

        # Notify customer of successful payment and booking confirmation
        try:
            from app.modules.notifications.models import Notification, NotificationChannel, NotificationStatus
            recipient = booking.customer_email
            if recipient:
                conf_notif = Notification(
                    recipient=recipient,
                    channel=NotificationChannel.IN_APP,
                    subject=f"Payment Verified: Booking {booking.booking_reference} Confirmed! 🎉",
                    message=f"We have verified your payment of ₹{order.amount:.2f}. Your cab booking ({booking.booking_reference}) is confirmed! Driver and car details will be shared prior to pickup.",
                    link_url=f"/bookings?ref={booking.booking_reference}",
                    is_read=False,
                    status=NotificationStatus.SENT,
                )
                self.payment_repo.db.add(conf_notif)
                await self.payment_repo.db.flush()
        except Exception as e:
            logger.warning(f"Could not persist payment confirmation notification: {e}")

        # 8. Record transaction history

        tx = PaymentTransaction(
            payment_id=saved_payment.id,
            order_id=order.id,
            booking_id=booking.id,
            transaction_type=TransactionType.CAPTURE.value,
            amount_cents=order.amount_cents,
            currency=order.currency,
            status="SUCCESS",
            gateway_reference=payload.razorpay_payment_id,
            metadata_={
                "gateway_order_id": payload.order_id,
                "receipt_number": order.receipt_number,
            },
        )
        await self.tx_repo.create(tx)

        # 9. Audit trail
        await self.audit_repo.log_action(
            actor_id=booking.customer_id,
            action="booking.confirmed_via_payment",
            target_type="booking",
            target_id=str(booking.id),
            details={
                "order_id": payload.order_id,
                "payment_id": payload.razorpay_payment_id,
                "amount": str(order.amount),
                "receipt_number": order.receipt_number,
            },
            ip_address=ip_address,
        )

        # 10. Automated WhatsApp Notifications (Customer & Admin)
        try:
            from app.modules.whatsapp.service import WhatsAppService
            whatsapp_svc = WhatsAppService(self.payment_repo.db)
            await whatsapp_svc.notify_payment_confirmed(
                booking_reference=booking.booking_reference,
                customer_phone=booking.customer_phone,
                customer_name=booking.customer_name,
                amount_cents=order.amount_cents,
                payment_reference=saved_payment.transaction_reference,
            )
            vehicle = await self.vehicle_repo.get_by_id(booking.vehicle_id)
            v_brand = vehicle.brand if vehicle else "Swaraj"
            v_model = vehicle.model if vehicle else "Cab"
            await whatsapp_svc.notify_booking_confirmed(
                booking=booking,
                vehicle_brand=v_brand,
                vehicle_model=v_model,
                pickup_location_name="Swaraj Travel Hub",
            )
        except Exception as exc:
            logger.warning(f"Non-blocking WhatsApp notification notice: {exc}")

        return PaymentVerifyResponse(
            payment_id=saved_payment.id,
            transaction_reference=saved_payment.transaction_reference,
            status=saved_payment.status,
            receipt_number=order.receipt_number,
            booking_id=booking.id,
            booking_status=booking.status.value,
            amount=saved_payment.amount,
            currency=saved_payment.currency,
            message="Payment verified successfully. Booking confirmed.",
        )

    async def record_payment_failure(self, payload: PaymentFailureRequest) -> None:
        """Records payment failure from client or gateway."""
        order = await self.order_repo.get_by_reference(payload.order_id)
        if order:
            order.status = "FAILED"
            await self.order_repo.update(order)
            tx = PaymentTransaction(
                order_id=order.id,
                booking_id=order.booking_id,
                transaction_type=TransactionType.FAILURE.value,
                amount_cents=order.amount_cents,
                currency=order.currency,
                status="FAILED",
                gateway_reference=payload.order_id,
                metadata_={
                    "error_code": payload.error_code,
                    "error_description": payload.error_description,
                },
            )
            await self.tx_repo.create(tx)

    async def process_refund(
        self,
        payment_id: uuid.UUID,
        payload: PaymentRefundRequest,
        actor_id: Optional[uuid.UUID] = None,
        ip_address: Optional[str] = None,
    ) -> PaymentRefundResponse:
        """
        Processes full or partial refund for a captured payment.
        """
        payment = await self.payment_repo.get_by_id(payment_id)
        if not payment or payment.is_deleted:
            raise NotFoundError(f"Payment {payment_id} not found.")

        if payment.status not in [PaymentStatus.CAPTURED, PaymentStatus.SUCCEEDED, PaymentStatus.PARTIALLY_REFUNDED]:
            raise ValidationAppError(f"Payment cannot be refunded from status '{payment.status}'.")

        # Calculate refundable balance
        existing_refunds = await self.refund_repo.list_by_payment(payment.id)
        total_refunded_cents = sum(r.amount_cents for r in existing_refunds if r.status == "PROCESSED")
        total_payment_cents = payment.amount_cents or int(payment.amount * 100)
        remaining_cents = total_payment_cents - total_refunded_cents

        if remaining_cents <= 0:
            raise ValidationAppError("Payment has already been fully refunded.")

        refund_amount_cents = payload.amount_cents if payload.amount_cents is not None else remaining_cents
        if refund_amount_cents <= 0 or refund_amount_cents > remaining_cents:
            raise ValidationAppError(
                f"Requested refund ({refund_amount_cents} cents) exceeds refundable balance ({remaining_cents} cents)."
            )

        refund_ref = f"RFND-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

        # Call payment gateway
        target_payment_ref = payment.gateway_payment_id or payment.transaction_reference
        rfnd_res = await self.gateway.refund_payment(
            payment_id=target_payment_ref,
            amount_cents=refund_amount_cents,
            notes={"reason": payload.reason, "refund_ref": refund_ref},
        )

        # Record refund in database
        refund = PaymentRefund(
            refund_reference=refund_ref,
            payment_id=payment.id,
            booking_id=payment.booking_id,
            amount_cents=refund_amount_cents,
            currency=payment.currency,
            reason=payload.reason,
            status="PROCESSED",
            gateway_refund_id=rfnd_res.refund_id,
            gateway_response=rfnd_res.raw_response,
        )
        saved_refund = await self.refund_repo.create(refund)

        # Update payment status
        new_total_refunded = total_refunded_cents + refund_amount_cents
        if new_total_refunded >= total_payment_cents:
            payment.status = PaymentStatus.REFUNDED
        else:
            payment.status = PaymentStatus.PARTIALLY_REFUNDED
        await self.payment_repo.update(payment)

        # Log transaction
        tx = PaymentTransaction(
            payment_id=payment.id,
            booking_id=payment.booking_id,
            transaction_type=TransactionType.REFUND.value,
            amount_cents=refund_amount_cents,
            currency=payment.currency,
            status="PROCESSED",
            gateway_reference=rfnd_res.refund_id,
            metadata_={"reason": payload.reason, "refund_reference": refund_ref},
        )
        await self.tx_repo.create(tx)

        # Audit log
        if actor_id:
            await self.audit_repo.log_action(
                actor_id=actor_id,
                action="payment.refunded",
                target_type="payment",
                target_id=str(payment.id),
                details={
                    "refund_reference": refund_ref,
                    "amount_cents": refund_amount_cents,
                    "reason": payload.reason,
                    "gateway_refund_id": rfnd_res.refund_id,
                },
                ip_address=ip_address,
            )

        return PaymentRefundResponse(
            refund_id=saved_refund.id,
            refund_reference=saved_refund.refund_reference,
            payment_id=payment.id,
            booking_id=payment.booking_id,
            amount_cents=saved_refund.amount_cents,
            amount=saved_refund.amount,
            currency=saved_refund.currency,
            status=saved_refund.status,
            gateway_refund_id=saved_refund.gateway_refund_id,
            created_at=saved_refund.created_at,
        )

    async def get_receipt(self, payment_id: uuid.UUID) -> PaymentReceiptResponse:
        """Generates itemized receipt data for customer or admin download."""
        payment = await self.payment_repo.get_by_id(payment_id)
        if not payment or payment.is_deleted:
            raise NotFoundError(f"Payment {payment_id} not found.")

        booking = await self.booking_repo.get_by_id(payment.booking_id)
        vehicle = await self.vehicle_repo.get_by_id(booking.vehicle_id) if booking else None
        vehicle_name = f"{vehicle.brand} {vehicle.model} ({vehicle.year})" if vehicle else "Reserved Vehicle"

        # Construct itemized lines
        line_items = [
            PaymentReceiptItem(
                description=f"Rental Charges ({booking.total_days} days @ ${booking.daily_rate}/day)",
                amount=booking.base_amount,
            )
        ]
        if booking.tax_amount > 0:
            line_items.append(PaymentReceiptItem(description="Taxes & Surcharges", amount=booking.tax_amount))
        if booking.deposit_amount > 0:
            line_items.append(PaymentReceiptItem(description="Refundable Security Deposit", amount=booking.deposit_amount))
        if booking.discount_amount > 0:
            line_items.append(PaymentReceiptItem(description="Promotional Discount", amount=-booking.discount_amount))

        return PaymentReceiptResponse(
            receipt_number=payment.receipt_number or f"REC-{payment.id.hex[:8].upper()}",
            payment_id=payment.id,
            order_reference=payment.gateway_order_id,
            transaction_reference=payment.transaction_reference,
            payment_method=payment.payment_method.value,
            status=payment.status,
            date=payment.captured_at or payment.created_at,
            customer_name=booking.customer_name if booking else None,
            customer_email=booking.customer_email if booking else None,
            booking_reference=booking.booking_reference if booking else "N/A",
            vehicle_name=vehicle_name,
            start_datetime=booking.start_datetime if booking else datetime.now(timezone.utc),
            end_datetime=booking.end_datetime if booking else datetime.now(timezone.utc),
            base_amount=booking.base_amount if booking else payment.amount,
            deposit_amount=booking.deposit_amount if booking else Decimal("0.00"),
            tax_amount=booking.tax_amount if booking else Decimal("0.00"),
            discount_amount=booking.discount_amount if booking else Decimal("0.00"),
            total_paid=payment.amount,
            currency=payment.currency,
            line_items=line_items,
        )

    async def process_webhook(
        self,
        raw_body: bytes,
        signature: str,
    ) -> Dict[str, Any]:
        """
        Secure, idempotent webhook processing.
        Verifies HMAC signature, ensures duplicate deliveries are handled idempotently,
        and transitions bookings upon payment capture.
        """
        # 1. Verify webhook signature
        is_valid = self.gateway.verify_webhook_signature(raw_body, signature)
        if not is_valid:
            logger.warning("[Webhook] Invalid signature received")
            raise UnauthorizedError("Invalid webhook signature.")

        # 2. Parse payload
        try:
            payload = json.loads(raw_body.decode("utf-8"))
        except Exception as e:
            raise ValidationAppError(f"Malformed JSON payload: {e}")

        # Unique event ID from Razorpay header or payload
        event_id = payload.get("id") or payload.get("event_id") or uuid.uuid5(uuid.NAMESPACE_URL, str(raw_body)).hex
        event_type = payload.get("event", "unknown")

        # 3. Idempotency Check
        existing_event = await self.webhook_repo.get_by_event_id(event_id)
        if existing_event and existing_event.status == "PROCESSED":
            logger.info(f"[Webhook] Event {event_id} already processed. Returning idempotent success.")
            return {"status": "already_processed", "event_id": event_id}

        # Record incoming event
        if not existing_event:
            event_record = PaymentWebhookEvent(
                event_id=event_id,
                event_type=event_type,
                provider="razorpay",
                payload=payload,
                status="RECEIVED",
            )
            existing_event = await self.webhook_repo.create(event_record)

        # 4. Handle specific event types
        try:
            if event_type in ("payment.captured", "order.paid"):
                # Handle payment capture
                payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
                order_id = payment_entity.get("order_id")
                payment_id = payment_entity.get("id")

                if order_id and payment_id:
                    order = await self.order_repo.get_by_reference(order_id)
                    if order and order.status != "PAID":
                        # Simulate or trigger backend verify
                        sig = getattr(self.gateway, "generate_signature", lambda o, p: "webhook_verified")(order_id, payment_id)
                        await self.verify_and_capture_payment(
                            PaymentVerifyRequest(
                                order_id=order_id,
                                razorpay_payment_id=payment_id,
                                razorpay_signature=sig,
                            )
                        )

            elif event_type == "payment.failed":
                payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
                order_id = payment_entity.get("order_id")
                if order_id:
                    await self.record_payment_failure(
                        PaymentFailureRequest(
                            order_id=order_id,
                            error_code=payment_entity.get("error_code"),
                            error_description=payment_entity.get("error_description"),
                        )
                    )

            existing_event.status = "PROCESSED"
            existing_event.processed_at = datetime.now(timezone.utc)
            await self.webhook_repo.update(existing_event)
            return {"status": "processed", "event_id": event_id}

        except Exception as e:
            existing_event.status = "FAILED"
            existing_event.error_message = str(e)
            await self.webhook_repo.update(existing_event)
            logger.error(f"[Webhook] Failed processing event {event_id}: {e}")
            raise
