from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Optional
import uuid
from sqlalchemy import BigInteger, DateTime, Enum as SQLEnum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import TSTZRANGE, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.common.models import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin


class BookingStatus(str, Enum):
    PENDING = "PENDING"
    AWAITING_PAYMENT = "AWAITING_PAYMENT"
    CONFIRMED = "CONFIRMED"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    REJECTED = "REJECTED"
    REFUND_PENDING = "REFUND_PENDING"
    REFUNDED = "REFUNDED"

    @classmethod
    def _missing_(cls, value: object):
        if isinstance(value, str):
            clean = value.strip().upper().replace(" ", "_")
            for member in cls:
                if member.value == clean or member.name == clean:
                    return member
        return None


# Allowed state transitions for Booking status state machine
VALID_BOOKING_TRANSITIONS = {
    BookingStatus.PENDING: {BookingStatus.AWAITING_PAYMENT, BookingStatus.CONFIRMED, BookingStatus.CANCELLED, BookingStatus.REJECTED},
    BookingStatus.AWAITING_PAYMENT: {BookingStatus.CONFIRMED, BookingStatus.CANCELLED, BookingStatus.REJECTED},
    BookingStatus.CONFIRMED: {BookingStatus.ACTIVE, BookingStatus.CANCELLED, BookingStatus.REFUND_PENDING},
    BookingStatus.ACTIVE: {BookingStatus.COMPLETED, BookingStatus.CANCELLED},
    BookingStatus.COMPLETED: {BookingStatus.REFUND_PENDING},
    BookingStatus.CANCELLED: {BookingStatus.REFUND_PENDING},
    BookingStatus.REJECTED: set(),
    BookingStatus.REFUND_PENDING: {BookingStatus.REFUNDED},
    BookingStatus.REFUNDED: set(),
}


class Booking(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "bookings"

    booking_reference: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    customer_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("customers.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )
    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("vehicles.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    pickup_location_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("locations.id", ondelete="RESTRICT"),
        nullable=False,
    )
    return_location_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("locations.id", ondelete="RESTRICT"),
        nullable=False,
    )
    start_datetime: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    end_datetime: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    rental_period: Mapped[Any] = mapped_column(TSTZRANGE, nullable=False)

    total_days: Mapped[int] = mapped_column(Integer, nullable=False)
    daily_rate: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    deposit_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)

    # Customer Contact Info (Supports direct booking flow)
    customer_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    customer_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    customer_phone: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    driver_license_number: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    # Integer minor unit pricing fields (Backend authoritative in cents/paise)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    daily_rate_cents: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    base_amount_cents: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    location_fee_cents: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    tax_amount_cents: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    discount_amount_cents: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    deposit_amount_cents: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_amount_cents: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)

    # Buffer & Lifecycle Management
    buffer_minutes: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    idempotency_key: Mapped[Optional[str]] = mapped_column(String(128), unique=True, index=True, nullable=True)

    status: Mapped[BookingStatus] = mapped_column(
        SQLEnum(BookingStatus, name="booking_status_enum"),
        default=BookingStatus.PENDING,
        nullable=False,
        index=True,
    )
    cancellation_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    vehicle: Mapped["Vehicle"] = relationship("Vehicle", lazy="selectin")
    pickup_location: Mapped["Location"] = relationship("Location", foreign_keys=[pickup_location_id], lazy="selectin")
    return_location: Mapped["Location"] = relationship("Location", foreign_keys=[return_location_id], lazy="selectin")

    @property
    def base_amount(self) -> Decimal:
        return Decimal(self.base_amount_cents) / Decimal(100)

    @property
    def location_fee(self) -> Decimal:
        return Decimal(self.location_fee_cents) / Decimal(100)

    @property
    def tax_amount(self) -> Decimal:
        return Decimal(self.tax_amount_cents) / Decimal(100)

    @property
    def discount_amount(self) -> Decimal:
        return Decimal(self.discount_amount_cents) / Decimal(100)

    def can_transition_to(self, new_status: BookingStatus) -> bool:
        """Evaluates whether state machine allows transition to new_status."""
        allowed = VALID_BOOKING_TRANSITIONS.get(self.status, set())
        return new_status in allowed
