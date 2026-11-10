from datetime import datetime
from enum import Enum
import uuid
from sqlalchemy import Boolean, DateTime, Enum as SQLEnum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.common.models import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin


class BlockReason(str, Enum):
    BOOKING = "booking"
    MAINTENANCE = "maintenance"
    CLEANING = "cleaning"
    TRANSIT = "transit"
    MANUAL_HOLD = "manual_hold"


class VehicleAvailabilityBlock(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "vehicle_availability_blocks"

    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("vehicles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    start_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    end_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    reason: Mapped[BlockReason] = mapped_column(
        SQLEnum(BlockReason, name="block_reason_enum"),
        default=BlockReason.MANUAL_HOLD,
        nullable=False,
    )
    booking_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("bookings.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
