from decimal import Decimal
from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from app.common.schemas import ResponseEnvelope
from app.modules.auth.dependencies import (
    extract_client_info,
    get_current_user,
    get_current_user_optional,
    require_admin,
    require_staff_or_admin,
)
from app.modules.bookings.dependencies import get_booking_service
from app.modules.bookings.models import Booking, BookingStatus
from app.modules.bookings.schemas import (
    AvailabilityCheckRequest,
    AvailabilityCheckResponse,
    BookingCancelRequest,
    BookingCreate,
    BookingLocationSummary,
    BookingQuoteRequest,
    BookingQuoteResponse,
    BookingRead,
    BookingStatusUpdate,
    BookingUpdate,
    BookingVehicleSummary,
)
from app.modules.bookings.service import BookingService
from app.modules.users.models import User

router = APIRouter(prefix="/bookings", tags=["Bookings & Vehicle Availability"])


def serialize_booking(b: Booking) -> BookingRead:
    vehicle_summary = None
    if getattr(b, "vehicle", None):
        v = b.vehicle
        cat_val = v.category.value if hasattr(v.category, "value") else str(v.category)
        vehicle_summary = BookingVehicleSummary(
            id=v.id,
            brand=v.make,
            model=v.model,
            category=cat_val,
            year=v.year,
            license_plate=v.license_plate,
        )

    pickup_summary = None
    if getattr(b, "pickup_location", None):
        p = b.pickup_location
        pickup_summary = BookingLocationSummary(
            id=p.id,
            name=p.name,
            code=p.code,
            city=p.city,
        )

    return_summary = None
    if getattr(b, "return_location", None):
        r = b.return_location
        return_summary = BookingLocationSummary(
            id=r.id,
            name=r.name,
            code=r.code,
            city=r.city,
        )

    return BookingRead(
        id=b.id,
        booking_reference=b.booking_reference,
        customer_id=b.customer_id,
        vehicle_id=b.vehicle_id,
        pickup_location_id=b.pickup_location_id,
        return_location_id=b.return_location_id,
        start_datetime=b.start_datetime,
        end_datetime=b.end_datetime,
        status=b.status,
        customer_name=b.customer_name,
        customer_email=b.customer_email,
        customer_phone=b.customer_phone,
        driver_license_number=b.driver_license_number,
        currency=b.currency or "INR",
        daily_rate_cents=b.daily_rate_cents,
        daily_rate=Decimal(b.daily_rate_cents or 0) / Decimal(100) if b.daily_rate_cents else b.daily_rate,
        base_amount_cents=b.base_amount_cents,
        base_amount=Decimal(b.base_amount_cents or 0) / Decimal(100),
        location_fee_cents=b.location_fee_cents,
        location_fee=Decimal(b.location_fee_cents or 0) / Decimal(100),
        tax_amount_cents=b.tax_amount_cents,
        tax_amount=Decimal(b.tax_amount_cents or 0) / Decimal(100),
        discount_amount_cents=b.discount_amount_cents,
        discount_amount=Decimal(b.discount_amount_cents or 0) / Decimal(100),
        deposit_amount_cents=b.deposit_amount_cents,
        deposit_amount=Decimal(b.deposit_amount_cents or 0) / Decimal(100) if b.deposit_amount_cents else b.deposit_amount,
        total_amount_cents=b.total_amount_cents,
        total_amount=Decimal(b.total_amount_cents or 0) / Decimal(100) if b.total_amount_cents else b.total_amount,
        total_days=b.total_days,
        buffer_minutes=b.buffer_minutes,
        expires_at=b.expires_at,
        cancellation_reason=b.cancellation_reason,
        idempotency_key=b.idempotency_key,
        created_at=b.created_at,
        updated_at=b.updated_at,
        vehicle=vehicle_summary,
        pickup_location=pickup_summary,
        return_location=return_summary,
    )


# ------------------------------------------------------------------------------
# 1. Real-time Availability & Pricing Quotes
# ------------------------------------------------------------------------------

@router.post("/check-availability", response_model=ResponseEnvelope[AvailabilityCheckResponse])
async def check_availability(
    payload: AvailabilityCheckRequest,
    service: BookingService = Depends(get_booking_service),
):
    """Checks whether a vehicle is available for the given dates taking into account buffer time."""
    result = await service.check_availability(
        vehicle_id=payload.vehicle_id,
        start_datetime=payload.start_datetime,
        end_datetime=payload.end_datetime,
        buffer_minutes=payload.buffer_minutes,
    )
    return ResponseEnvelope(data=result)


@router.post("/quote", response_model=ResponseEnvelope[BookingQuoteResponse])
async def calculate_quote(
    payload: BookingQuoteRequest,
    service: BookingService = Depends(get_booking_service),
):
    """Calculates authoritative backend pricing with integer minor units, location charges, and taxes."""
    quote = await service.get_quote(payload)
    return ResponseEnvelope(data=quote)


# ------------------------------------------------------------------------------
# 2. Booking Submission & Tracking
# ------------------------------------------------------------------------------

@router.post("", response_model=ResponseEnvelope[BookingRead], status_code=status.HTTP_201_CREATED)
async def create_booking(
    payload: BookingCreate,
    idempotency_key_header: Optional[str] = Header(None, alias="Idempotency-Key"),
    current_user: Optional[User] = Depends(get_current_user_optional),
    service: BookingService = Depends(get_booking_service),
):
    """Submits booking request with anti-double-booking protection and backend pricing calculation."""
    if not payload.idempotency_key and idempotency_key_header:
        payload.idempotency_key = idempotency_key_header

    # Auto-link customer ID if logged in
    if current_user and not payload.customer_id:
        if getattr(current_user, "customer", None):
            payload.customer_id = current_user.customer.id
        if not payload.customer_name:
            payload.customer_name = f"{current_user.first_name} {current_user.last_name}".strip()
        if not payload.customer_email:
            payload.customer_email = current_user.email
        if not payload.customer_phone and current_user.phone_number:
            payload.customer_phone = current_user.phone_number

    booking = await service.create_booking(payload)
    return ResponseEnvelope(data=serialize_booking(booking))


@router.get("/reference/{reference}", response_model=ResponseEnvelope[BookingRead])
async def track_booking_by_reference(
    reference: str,
    service: BookingService = Depends(get_booking_service),
):
    """Public customer tracking of booking status using booking reference number (e.g. BK-XXXXXXXX)."""
    booking = await service.get_by_reference(reference)
    return ResponseEnvelope(data=serialize_booking(booking))


@router.get("/my-bookings", response_model=ResponseEnvelope[List[BookingRead]])
async def list_my_bookings(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    service: BookingService = Depends(get_booking_service),
):
    """Lists bookings for the authenticated customer."""
    customer_id = current_user.customer.id if getattr(current_user, "customer", None) else None
    if not customer_id:
        # If user has no customer record, search by email
        bookings = await service.list(skip=skip, limit=limit)
        user_bookings = [b for b in bookings if b.customer_email == current_user.email]
        return ResponseEnvelope(data=[serialize_booking(b) for b in user_bookings])

    bookings = await service.booking_repo.list_by_customer(customer_id, skip=skip, limit=limit)
    return ResponseEnvelope(data=[serialize_booking(b) for b in bookings])


@router.get("/{booking_id}", response_model=ResponseEnvelope[BookingRead])
async def get_booking(
    booking_id: uuid.UUID,
    service: BookingService = Depends(get_booking_service),
):
    """Retrieves full details of a booking by ID."""
    booking = await service.get_or_404(booking_id)
    return ResponseEnvelope(data=serialize_booking(booking))


@router.post("/{booking_id}/cancel", response_model=ResponseEnvelope[BookingRead])
async def cancel_booking(
    booking_id: uuid.UUID,
    payload: BookingCancelRequest,
    request: Request,
    current_user: Optional[User] = Depends(get_current_user_optional),
    service: BookingService = Depends(get_booking_service),
):
    """Cancels a booking and immediately releases the reserved vehicle slot."""
    ip_address, _ = extract_client_info(request)
    booking = await service.cancel_booking(
        booking_id=booking_id,
        reason=payload.cancellation_reason,
        user_id=current_user.id if current_user else None,
        ip_address=ip_address,
    )
    return ResponseEnvelope(data=serialize_booking(booking))


@router.patch("/{booking_id}/status", response_model=ResponseEnvelope[BookingRead])
async def transition_booking_status(
    booking_id: uuid.UUID,
    payload: BookingStatusUpdate,
    request: Request,
    current_user: User = Depends(require_staff_or_admin),
    service: BookingService = Depends(get_booking_service),
):
    """Operational/Administrative status transition complying with booking state machine."""
    ip_address, _ = extract_client_info(request)
    booking = await service.transition_status(
        booking_id=booking_id,
        payload=payload,
        actor_id=current_user.id,
        ip_address=ip_address,
    )
    return ResponseEnvelope(data=serialize_booking(booking))


@router.patch("/{booking_id}", response_model=ResponseEnvelope[BookingRead])
async def update_booking(
    booking_id: uuid.UUID,
    payload: BookingUpdate,
    service: BookingService = Depends(get_booking_service),
):
    booking = await service.update_booking(booking_id, payload)
    return ResponseEnvelope(data=serialize_booking(booking))


@router.get("", response_model=ResponseEnvelope[List[BookingRead]])
async def list_all_bookings(
    customer_id: Optional[uuid.UUID] = Query(None),
    vehicle_id: Optional[uuid.UUID] = Query(None),
    status: Optional[BookingStatus] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    service: BookingService = Depends(get_booking_service),
):
    """Lists bookings with optional filters."""
    if customer_id:
        bookings = await service.booking_repo.list_by_customer(customer_id, skip=skip, limit=limit)
    else:
        bookings = await service.list(skip=skip, limit=limit)

    filtered = bookings
    if vehicle_id:
        filtered = [b for b in filtered if b.vehicle_id == vehicle_id]
    if status:
        filtered = [b for b in filtered if b.status == status]

    return ResponseEnvelope(data=[serialize_booking(b) for b in filtered])
