from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.database import get_db
from app.integrations.payment_stub import get_payment_provider as get_stub_provider
from app.integrations.razorpay import get_razorpay_provider
from app.interfaces.payment import PaymentGatewayProvider
from app.modules.bookings.repository import BookingRepository
from app.modules.payments.repository import (
    PaymentOrderRepository,
    PaymentRefundRepository,
    PaymentRepository,
    PaymentTransactionRepository,
    PaymentWebhookEventRepository,
)
from app.modules.payments.service import PaymentService
from app.modules.vehicles.repository import VehicleRepository


def get_payment_gateway() -> PaymentGatewayProvider:
    if settings.PAYMENT_PROVIDER == "razorpay":
        return get_razorpay_provider()
    return get_stub_provider()


def get_payment_service(
    db: AsyncSession = Depends(get_db),
    gateway: PaymentGatewayProvider = Depends(get_payment_gateway),
) -> PaymentService:
    payment_repo = PaymentRepository(db)
    order_repo = PaymentOrderRepository(db)
    refund_repo = PaymentRefundRepository(db)
    tx_repo = PaymentTransactionRepository(db)
    webhook_repo = PaymentWebhookEventRepository(db)
    booking_repo = BookingRepository(db)
    vehicle_repo = VehicleRepository(db)

    return PaymentService(
        payment_repo=payment_repo,
        order_repo=order_repo,
        refund_repo=refund_repo,
        tx_repo=tx_repo,
        webhook_repo=webhook_repo,
        booking_repo=booking_repo,
        vehicle_repo=vehicle_repo,
        gateway=gateway,
    )
