from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Optional, Sequence
import uuid
from asyncpg import Range
from sqlalchemy.exc import IntegrityError
from app.common.services import BaseService
from app.core.exceptions import ConflictError, NotFoundError, ValidationAppError
from app.modules.bookings.models import Booking, BookingStatus
from app.modules.bookings.pricing import PricingBreakdown, PricingEngine
from app.modules.bookings.repository import BookingRepository
from app.modules.bookings.schemas import (
    AvailabilityCheckResponse,
    BookingCancelRequest,
    BookingCreate,
    BookingQuoteRequest,
    BookingQuoteResponse,
    BookingStatusUpdate,
    BookingUpdate,
    CustomerStatsResponse,
)
from app.modules.locations.repository import LocationRepository
from app.modules.users.repository import AuditLogRepository
from app.modules.vehicles.models import VehicleStatus
from app.modules.vehicles.repository import VehicleRepository


class BookingService(BaseService[Booking]):
    def __init__(
        self,
        repository: BookingRepository,
        vehicle_repository: VehicleRepository,
        location_repository: LocationRepository,
    ):
        super().__init__(repository)
        self.booking_repo = repository
        self.vehicle_repo = vehicle_repository
        self.location_repo = location_repository
        self.audit_repo = AuditLogRepository(repository.db)

    async def check_availability(
        self,
        vehicle_id: uuid.UUID,
        start_datetime: datetime,
        end_datetime: datetime,
        buffer_minutes: int = 60,
    ) -> AvailabilityCheckResponse:
        """Evaluates whether vehicle is available during [start_datetime, end_datetime) half-open interval."""
        if end_datetime <= start_datetime:
            return AvailabilityCheckResponse(
                is_available=False,
                vehicle_id=vehicle_id,
                start_datetime=start_datetime,
                end_datetime=end_datetime,
                buffer_minutes=buffer_minutes,
                reason="End datetime must be strictly after start datetime.",
            )

        vehicle = await self.vehicle_repo.get_by_id(vehicle_id)
        if not vehicle:
            raise NotFoundError(f"Vehicle {vehicle_id} not found.")

        # Check vehicle operational status: ONLY administrator-set status controls availability
        if vehicle.status != VehicleStatus.AVAILABLE:
            return AvailabilityCheckResponse(
                is_available=False,
                vehicle_id=vehicle_id,
                start_datetime=start_datetime,
                end_datetime=end_datetime,
                buffer_minutes=buffer_minutes,
                reason=f"Vehicle is currently {vehicle.status.value.lower().replace('_', ' ')} and unavailable for booking.",
            )

        # Vehicle is always available for booking per business requirements (overlapping bookings permitted)
        return AvailabilityCheckResponse(
            is_available=True,
            vehicle_id=vehicle_id,
            start_datetime=start_datetime,
            end_datetime=end_datetime,
            buffer_minutes=buffer_minutes,
            reason=None,
        )

    async def get_quote(self, payload: BookingQuoteRequest) -> BookingQuoteResponse:
        """Calculates authentic backend pricing quote for customer review."""
        if payload.end_datetime <= payload.start_datetime:
            raise ValidationAppError("Return date/time must be after pickup date/time.")

        vehicle = await self.vehicle_repo.get_by_id(payload.vehicle_id)
        if not vehicle:
            raise NotFoundError(f"Vehicle {payload.vehicle_id} not found.")

        pickup_loc = await self.location_repo.get_by_id(payload.pickup_location_id)
        return_loc = await self.location_repo.get_by_id(payload.return_location_id)

        pricing = PricingEngine.calculate_charges(
            vehicle=vehicle,
            start=payload.start_datetime,
            end=payload.end_datetime,
            pickup_location_id=payload.pickup_location_id,
            return_location_id=payload.return_location_id,
            promo_code=payload.promo_code,
            estimated_km=getattr(payload, "estimated_km", None),
        )

        return BookingQuoteResponse(
            pricing=pricing,
            vehicle_name=f"{vehicle.make} {vehicle.model} ({vehicle.year})",
            pickup_location_name=pickup_loc.name if pickup_loc else None,
            return_location_name=return_loc.name if return_loc else None,
        )

    async def create_booking(self, payload: BookingCreate) -> Booking:
        """Atomically reserves a vehicle using row-level locking, availability validation,
        backend pricing calculation, and PostgreSQL exclusion constraint double-booking prevention.
        """
        # 1. Idempotency Check: Return existing booking if idempotency_key is repeated
        if payload.idempotency_key:
            existing = await self.booking_repo.get_by_idempotency_key(payload.idempotency_key)
            if existing:
                return existing

        # 2. Date validation: explicit half-open boundary policy [start, end)
        if payload.end_datetime <= payload.start_datetime:
            raise ValidationAppError("Return date and time must be strictly after pickup date and time.")

        # Minimum rental duration: at least 1 hour
        delta_seconds = (payload.end_datetime - payload.start_datetime).total_seconds()
        if delta_seconds < 3600:
            raise ValidationAppError("Minimum rental duration is 1 hour.")

        # 3. Location verification
        pickup_loc = await self.location_repo.get_by_id(payload.pickup_location_id)
        if not pickup_loc:
            raise NotFoundError(f"Pickup location {payload.pickup_location_id} not found.")

        return_loc = await self.location_repo.get_by_id(payload.return_location_id)
        if not return_loc:
            raise NotFoundError(f"Return location {payload.return_location_id} not found.")

        # 4. Concurrency: Lock Vehicle row with pessimistic locking (FOR UPDATE)
        vehicle = await self.vehicle_repo.get_by_id_for_update(payload.vehicle_id)
        if not vehicle:
            raise NotFoundError(f"Vehicle {payload.vehicle_id} not found.")

        # Check vehicle status: ONLY vehicles marked AVAILABLE by admin can be booked
        if vehicle.status != VehicleStatus.AVAILABLE:
            raise ConflictError(
                f"Vehicle is currently {vehicle.status.value.lower().replace('_', ' ')} and unavailable for booking."
            )

        # Backend pricing calculation (Never trust frontend prices)
        pricing = PricingEngine.calculate_charges(
            vehicle=vehicle,
            start=payload.start_datetime,
            end=payload.end_datetime,
            pickup_location_id=payload.pickup_location_id,
            return_location_id=payload.return_location_id,
            promo_code=payload.promo_code,
            estimated_km=getattr(payload, "estimated_km", None),
        )

        # 7. Generate unique booking reference and PostgreSQL Range
        ref = f"BK-{uuid.uuid4().hex[:8].upper()}"
        rental_period = Range(
            payload.start_datetime, payload.end_datetime, lower_inc=True, upper_inc=False
        )

        # 8. Separate booking from payment: expires in 15 minutes if not paid/confirmed
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(minutes=15)

        booking = Booking(
            booking_reference=ref,
            customer_id=payload.customer_id,
            vehicle_id=payload.vehicle_id,
            pickup_location_id=payload.pickup_location_id,
            return_location_id=payload.return_location_id,
            start_datetime=payload.start_datetime,
            end_datetime=payload.end_datetime,
            rental_period=rental_period,
            total_days=pricing.duration_days,
            daily_rate=pricing.daily_rate,
            total_amount=pricing.total_amount,
            deposit_amount=pricing.deposit_amount,
            # Customer details
            customer_name=payload.customer_name,
            customer_email=str(payload.customer_email) if payload.customer_email else None,
            customer_phone=payload.customer_phone,
            driver_license_number=payload.driver_license_number,
            # Integer minor units (cents)
            currency="INR",
            daily_rate_cents=pricing.daily_rate_cents,
            base_amount_cents=pricing.base_amount_cents,
            location_fee_cents=pricing.location_fee_cents,
            tax_amount_cents=pricing.tax_amount_cents,
            discount_amount_cents=pricing.discount_amount_cents,
            deposit_amount_cents=pricing.deposit_amount_cents,
            total_amount_cents=pricing.total_amount_cents,
            # Buffer & lifecycle
            buffer_minutes=payload.buffer_minutes,
            expires_at=expires_at,
            idempotency_key=payload.idempotency_key,
            status=BookingStatus.AWAITING_PAYMENT,
        )

        try:
            created = await self.booking_repo.create(booking)
            return created
        except IntegrityError as exc:
            orig_msg = str(exc.orig) if hasattr(exc, "orig") else str(exc)
            if "ix_bookings_idempotency_key" in orig_msg and payload.idempotency_key:
                # Concurrent request with same key
                existing = await self.booking_repo.get_by_idempotency_key(payload.idempotency_key)
                if existing:
                    return existing
            raise ConflictError(f"Booking could not be completed: {orig_msg}")

    async def get_by_reference(self, reference: str) -> Booking:
        booking = await self.booking_repo.get_by_reference(reference)
        if not booking:
            raise NotFoundError(f"Booking reference {reference} not found.")
        return booking

    async def update_booking(
        self, booking_id: uuid.UUID, payload: BookingUpdate
    ) -> Booking:
        booking = await self.get_or_404(booking_id)
        if payload.status:
            if not booking.can_transition_to(payload.status):
                raise ValidationAppError(
                    f"Cannot transition booking from {booking.status.value} to {payload.status.value}."
                )
            booking.status = payload.status
            if payload.status == BookingStatus.CONFIRMED:
                booking.expires_at = None

        if payload.cancellation_reason:
            booking.cancellation_reason = payload.cancellation_reason
        if payload.return_location_id:
            booking.return_location_id = payload.return_location_id

        return await self.booking_repo.update(booking)

    async def transition_status(
        self,
        booking_id: uuid.UUID,
        payload: BookingStatusUpdate,
        actor_id: Optional[uuid.UUID] = None,
        ip_address: Optional[str] = None,
    ) -> Booking:
        booking = await self.get_or_404(booking_id)
        old_status = booking.status.value
        if not booking.can_transition_to(payload.status):
            raise ValidationAppError(
                f"Cannot transition booking from '{booking.status.value}' to '{payload.status.value}'."
            )
        booking.status = payload.status
        if payload.status == BookingStatus.CONFIRMED:
            booking.expires_at = None
        if payload.reason:
            booking.cancellation_reason = payload.reason

        updated = await self.booking_repo.update(booking)

        # Audit log critical booking operations
        if actor_id:
            action_map = {
                BookingStatus.CONFIRMED: "booking.approved",
                BookingStatus.REJECTED: "booking.rejected",
                BookingStatus.ACTIVE: "booking.pickup_completed",
                BookingStatus.COMPLETED: "booking.return_completed",
                BookingStatus.REFUND_PENDING: "booking.refund_pending",
                BookingStatus.REFUNDED: "booking.refund_processed",
                BookingStatus.CANCELLED: "booking.cancelled",
            }
            action_name = action_map.get(payload.status, "booking.status_changed")
            await self.audit_repo.log_action(
                actor_id=actor_id,
                action=action_name,
                target_type="booking",
                target_id=str(booking_id),
                details={
                    "old_status": old_status,
                    "new_status": payload.status.value,
                    "reason": payload.reason,
                    "reference": booking.booking_reference,
                },
                ip_address=ip_address,
            )

        return updated

    async def cancel_booking(
        self,
        booking_id: uuid.UUID,
        reason: str,
        user_id: Optional[uuid.UUID] = None,
        ip_address: Optional[str] = None,
    ) -> Booking:
        booking = await self.get_or_404(booking_id)
        if booking.status in [BookingStatus.CANCELLED, BookingStatus.COMPLETED, BookingStatus.REFUNDED]:
            raise ValidationAppError(f"Booking cannot be cancelled from current status: {booking.status.value}.")

        old_status = booking.status.value
        booking.status = BookingStatus.CANCELLED
        booking.cancellation_reason = reason
        booking.expires_at = None
        updated = await self.booking_repo.update(booking)

        if user_id:
            await self.audit_repo.log_action(
                actor_id=user_id,
                action="booking.cancelled",
                target_type="booking",
                target_id=str(booking_id),
                details={
                    "old_status": old_status,
                    "new_status": BookingStatus.CANCELLED.value,
                    "reason": reason,
                    "reference": booking.booking_reference,
                },
                ip_address=ip_address,
            )

        # Automated WhatsApp cancellation alert
        try:
            from app.modules.whatsapp.service import WhatsAppService
            whatsapp_svc = WhatsAppService(self.booking_repo.db)
            await whatsapp_svc.notify_booking_cancelled(
                booking_reference=booking.booking_reference,
                customer_phone=booking.customer_phone,
                customer_name=booking.customer_name,
                reason=reason,
            )
        except Exception as exc:
            import logging
            logging.getLogger(__name__).warning(f"Non-blocking WhatsApp cancellation dispatch: {exc}")

        return updated

    async def expire_stale_bookings(self) -> int:
        return await self.booking_repo.expire_stale_bookings()

    async def get_customer_stats(self, user: Any) -> CustomerStatsResponse:
        from app.modules.payments.models import Payment, PaymentStatus
        from sqlalchemy import func, or_, select

        customer_id = user.customer.id if getattr(user, "customer", None) else None

        # 1. Fetch bookings for customer
        if customer_id:
            stmt = select(Booking).where(
                or_(Booking.customer_id == customer_id, Booking.customer_email == user.email),
                Booking.is_deleted == False,
            )
        else:
            stmt = select(Booking).where(
                Booking.customer_email == user.email,
                Booking.is_deleted == False,
            )
        result = await self.booking_repo.db.execute(stmt)
        bookings = result.scalars().all()

        total_bookings = len(bookings)
        now = datetime.now(timezone.utc)
        upcoming_trips = 0
        completed_trips = 0
        cancelled_bookings = 0
        booking_ids = []

        for b in bookings:
            booking_ids.append(b.id)
            if b.status == BookingStatus.COMPLETED:
                completed_trips += 1
            elif b.status in (BookingStatus.CANCELLED, BookingStatus.REJECTED):
                cancelled_bookings += 1
            elif b.status in (
                BookingStatus.CONFIRMED,
                BookingStatus.ACTIVE,
                BookingStatus.PENDING,
                BookingStatus.AWAITING_PAYMENT,
            ):
                if b.end_datetime >= now:
                    upcoming_trips += 1

        # 2. Total amount spent from verified/captured payments
        total_amount_spent = Decimal("0.00")
        if booking_ids:
            pay_stmt = select(func.coalesce(func.sum(Payment.amount), Decimal("0.00"))).where(
                Payment.booking_id.in_(booking_ids),
                Payment.status.in_([PaymentStatus.CAPTURED, PaymentStatus.SUCCEEDED]),
                Payment.is_deleted == False,
            )
            pay_res = await self.booking_repo.db.execute(pay_stmt)
            val = pay_res.scalar()
            if val is not None:
                total_amount_spent = Decimal(str(val))

        return CustomerStatsResponse(
            total_bookings=total_bookings,
            upcoming_trips=upcoming_trips,
            completed_trips=completed_trips,
            cancelled_bookings=cancelled_bookings,
            total_amount_spent=total_amount_spent,
            currency="INR",
        )

