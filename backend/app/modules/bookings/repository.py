from datetime import datetime, timedelta, timezone
from typing import Any, List, Optional, Sequence
import uuid
from sqlalchemy import func, or_, select, update
from sqlalchemy.dialects.postgresql import Range
from sqlalchemy.ext.asyncio import AsyncSession
from app.common.repositories import BaseRepository
from app.modules.bookings.models import Booking, BookingStatus


ACTIVE_BLOCKING_STATUSES = [
    BookingStatus.PENDING,
    BookingStatus.AWAITING_PAYMENT,
    BookingStatus.CONFIRMED,
    BookingStatus.ACTIVE,
]


class BookingRepository(BaseRepository[Booking]):
    def __init__(self, db: AsyncSession):
        super().__init__(Booking, db)

    async def list(
        self,
        *,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[List[Any]] = None,
    ) -> Sequence[Booking]:
        stmt = select(Booking).where(Booking.is_deleted == False)
        if filters:
            for condition in filters:
                stmt = stmt.where(condition)
        stmt = stmt.order_by(Booking.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_by_reference(self, reference: str) -> Optional[Booking]:
        stmt = (
            select(Booking)
            .where(
                func.upper(Booking.booking_reference) == reference.strip().upper(),
                Booking.is_deleted == False,
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_idempotency_key(self, idempotency_key: str) -> Optional[Booking]:
        if not idempotency_key:
            return None
        stmt = select(Booking).where(
            Booking.idempotency_key == idempotency_key.strip(),
            Booking.is_deleted == False,
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_customer(
        self, customer_id: uuid.UUID, skip: int = 0, limit: int = 50
    ) -> Sequence[Booking]:
        stmt = (
            select(Booking)
            .where(Booking.customer_id == customer_id, Booking.is_deleted == False)
            .order_by(Booking.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def find_overlapping_bookings(
        self,
        vehicle_id: uuid.UUID,
        start_datetime: datetime,
        end_datetime: datetime,
        buffer_minutes: int = 60,
        exclude_booking_id: Optional[uuid.UUID] = None,
        include_buffer: bool = True,
    ) -> Sequence[Booking]:
        """Finds any active bookings that overlap with requested [start_datetime, end_datetime) range.
        Takes into account buffer turnaround time and filters out expired pending bookings.
        """
        now = datetime.now(timezone.utc)
        
        # Candidate query: Active blocking statuses
        stmt = select(Booking).where(
            Booking.vehicle_id == vehicle_id,
            Booking.is_deleted == False,
            Booking.status.in_(ACTIVE_BLOCKING_STATUSES),
            # Filter out stale/expired reservations that haven't been transitioned yet
            or_(
                Booking.expires_at == None,
                Booking.expires_at > now,
                Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.ACTIVE]),
            ),
        )

        if exclude_booking_id:
            stmt = stmt.where(Booking.id != exclude_booking_id)

        result = await self.db.execute(stmt)
        candidates = result.scalars().all()

        overlapping: list[Booking] = []
        for b in candidates:
            effective_buffer = b.buffer_minutes if include_buffer else 0
            existing_effective_end = b.end_datetime + timedelta(minutes=effective_buffer)
            
            # Half-open interval overlap check: [start, end) && [b.start, existing_effective_end)
            if start_datetime < existing_effective_end and end_datetime > b.start_datetime:
                overlapping.append(b)

        return overlapping

    async def expire_stale_bookings(self) -> int:
        """Transitions expired PENDING or AWAITING_PAYMENT bookings to REJECTED."""
        now = datetime.now(timezone.utc)
        stmt = (
            update(Booking)
            .where(
                Booking.is_deleted == False,
                Booking.status.in_([BookingStatus.PENDING, BookingStatus.AWAITING_PAYMENT]),
                Booking.expires_at != None,
                Booking.expires_at <= now,
            )
            .values(
                status=BookingStatus.REJECTED,
                cancellation_reason="Booking expired: payment window elapsed.",
                updated_at=now,
            )
        )
        result = await self.db.execute(stmt)
        return result.rowcount
