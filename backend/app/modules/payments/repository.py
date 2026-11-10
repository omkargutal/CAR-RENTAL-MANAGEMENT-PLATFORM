from typing import Any, List, Optional, Sequence
import uuid
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.common.repositories import BaseRepository
from app.modules.payments.models import (
    Payment,
    PaymentOrder,
    PaymentRefund,
    PaymentTransaction,
    PaymentWebhookEvent,
)


class PaymentOrderRepository(BaseRepository[PaymentOrder]):
    def __init__(self, db: AsyncSession):
        super().__init__(PaymentOrder, db)

    async def get_by_reference(self, order_reference: str) -> Optional[PaymentOrder]:
        stmt = select(PaymentOrder).where(
            PaymentOrder.order_reference == order_reference,
            PaymentOrder.is_deleted == False,
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_booking(self, booking_id: uuid.UUID) -> Sequence[PaymentOrder]:
        stmt = (
            select(PaymentOrder)
            .where(PaymentOrder.booking_id == booking_id, PaymentOrder.is_deleted == False)
            .order_by(desc(PaymentOrder.created_at))
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()


class PaymentRepository(BaseRepository[Payment]):
    def __init__(self, db: AsyncSession):
        super().__init__(Payment, db)

    async def get_by_reference(self, reference: str) -> Optional[Payment]:
        stmt = select(Payment).where(
            Payment.transaction_reference == reference, Payment.is_deleted == False
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_gateway_payment_id(self, gateway_payment_id: str) -> Optional[Payment]:
        stmt = select(Payment).where(
            Payment.gateway_payment_id == gateway_payment_id, Payment.is_deleted == False
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_receipt_number(self, receipt_number: str) -> Optional[Payment]:
        stmt = select(Payment).where(
            Payment.receipt_number == receipt_number, Payment.is_deleted == False
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_booking(self, booking_id: uuid.UUID) -> Sequence[Payment]:
        stmt = (
            select(Payment)
            .where(Payment.booking_id == booking_id, Payment.is_deleted == False)
            .order_by(desc(Payment.created_at))
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()


class PaymentRefundRepository(BaseRepository[PaymentRefund]):
    def __init__(self, db: AsyncSession):
        super().__init__(PaymentRefund, db)

    async def get_by_reference(self, refund_reference: str) -> Optional[PaymentRefund]:
        stmt = select(PaymentRefund).where(
            PaymentRefund.refund_reference == refund_reference,
            PaymentRefund.is_deleted == False,
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_payment(self, payment_id: uuid.UUID) -> Sequence[PaymentRefund]:
        stmt = (
            select(PaymentRefund)
            .where(PaymentRefund.payment_id == payment_id, PaymentRefund.is_deleted == False)
            .order_by(desc(PaymentRefund.created_at))
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def list_by_booking(self, booking_id: uuid.UUID) -> Sequence[PaymentRefund]:
        stmt = (
            select(PaymentRefund)
            .where(PaymentRefund.booking_id == booking_id, PaymentRefund.is_deleted == False)
            .order_by(desc(PaymentRefund.created_at))
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()


class PaymentTransactionRepository(BaseRepository[PaymentTransaction]):
    def __init__(self, db: AsyncSession):
        super().__init__(PaymentTransaction, db)

    async def list_by_payment(self, payment_id: uuid.UUID) -> Sequence[PaymentTransaction]:
        stmt = (
            select(PaymentTransaction)
            .where(PaymentTransaction.payment_id == payment_id)
            .order_by(desc(PaymentTransaction.created_at))
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def list_by_booking(self, booking_id: uuid.UUID) -> Sequence[PaymentTransaction]:
        stmt = (
            select(PaymentTransaction)
            .where(PaymentTransaction.booking_id == booking_id)
            .order_by(desc(PaymentTransaction.created_at))
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()


class PaymentWebhookEventRepository(BaseRepository[PaymentWebhookEvent]):
    def __init__(self, db: AsyncSession):
        super().__init__(PaymentWebhookEvent, db)

    async def get_by_event_id(self, event_id: str) -> Optional[PaymentWebhookEvent]:
        stmt = select(PaymentWebhookEvent).where(PaymentWebhookEvent.event_id == event_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
