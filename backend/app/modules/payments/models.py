from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Dict, List, Optional
import uuid
from sqlalchemy import Boolean, DateTime, Enum as SQLEnum, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.common.models import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin


class PaymentStatus(str, Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    AUTHORIZED = "AUTHORIZED"
    CAPTURED = "CAPTURED"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"
    PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED"


class PaymentMethod(str, Enum):
    CREDIT_CARD = "CREDIT_CARD"
    DEBIT_CARD = "DEBIT_CARD"
    DIGITAL_WALLET = "DIGITAL_WALLET"
    CASH = "CASH"
    BANK_TRANSFER = "BANK_TRANSFER"


class PaymentType(str, Enum):
    FULL = "FULL"
    ADVANCE = "ADVANCE"
    SECURITY_DEPOSIT = "SECURITY_DEPOSIT"
    BALANCE = "BALANCE"


class TransactionType(str, Enum):
    ORDER_CREATED = "ORDER_CREATED"
    AUTHORIZE = "AUTHORIZE"
    CAPTURE = "CAPTURE"
    REFUND = "REFUND"
    FAILURE = "FAILURE"


class PaymentOrder(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "payment_orders"

    order_reference: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    booking_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("bookings.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    customer_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("customers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    payment_type: Mapped[str] = mapped_column(String(32), default=PaymentType.FULL.value, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="PENDING", index=True, nullable=False)
    receipt_number: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    notes: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)

    payments: Mapped[List["Payment"]] = relationship("Payment", back_populates="order", lazy="selectin")

    @property
    def amount(self) -> Decimal:
        return Decimal(self.amount_cents) / Decimal(100)


class Payment(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "payments"

    booking_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("bookings.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    order_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("payment_orders.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    transaction_reference: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    provider: Mapped[str] = mapped_column(String(32), default="razorpay", nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    amount_cents: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    status: Mapped[PaymentStatus] = mapped_column(
        SQLEnum(PaymentStatus, name="payment_status_enum"),
        default=PaymentStatus.PENDING,
        nullable=False,
        index=True,
    )
    payment_method: Mapped[PaymentMethod] = mapped_column(
        SQLEnum(PaymentMethod, name="payment_method_enum"),
        default=PaymentMethod.CREDIT_CARD,
        nullable=False,
    )
    receipt_number: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)
    payment_type: Mapped[str] = mapped_column(String(32), default=PaymentType.FULL.value, nullable=False)
    gateway_order_id: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)
    gateway_payment_id: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)
    gateway_signature: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    card_network: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    card_last4: Mapped[Optional[str]] = mapped_column(String(4), nullable=True)
    upi_vpa: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    failure_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    captured_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    order: Mapped[Optional["PaymentOrder"]] = relationship("PaymentOrder", back_populates="payments", lazy="selectin")
    refunds: Mapped[List["PaymentRefund"]] = relationship("PaymentRefund", back_populates="payment", lazy="selectin")


class PaymentRefund(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "payment_refunds"

    refund_reference: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    payment_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("payments.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    booking_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("bookings.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="PROCESSED", index=True, nullable=False)
    gateway_refund_id: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)
    gateway_response: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)

    payment: Mapped["Payment"] = relationship("Payment", back_populates="refunds", lazy="selectin")

    @property
    def amount(self) -> Decimal:
        return Decimal(self.amount_cents) / Decimal(100)


class PaymentTransaction(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "payment_transactions"

    payment_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("payments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    order_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("payment_orders.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    booking_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("bookings.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    transaction_type: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    status: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    gateway_reference: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)
    metadata_: Mapped[Optional[Dict[str, Any]]] = mapped_column("metadata", JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)

    @property
    def amount(self) -> Decimal:
        return Decimal(self.amount_cents) / Decimal(100)


class PaymentWebhookEvent(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "payment_webhook_events"

    event_id: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    event_type: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    provider: Mapped[str] = mapped_column(String(32), default="razorpay", nullable=False)
    payload: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="RECEIVED", index=True, nullable=False)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)
