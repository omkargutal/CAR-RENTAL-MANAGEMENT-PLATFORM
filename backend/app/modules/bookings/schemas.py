from datetime import datetime
from decimal import Decimal
from typing import Optional
import uuid
from pydantic import EmailStr, Field
from app.common.schemas import BaseSchema
from app.modules.bookings.models import BookingStatus
from app.modules.bookings.pricing import PricingBreakdown


class AvailabilityCheckRequest(BaseSchema):
    vehicle_id: uuid.UUID
    start_datetime: datetime
    end_datetime: datetime
    buffer_minutes: int = Field(default=60, ge=0, le=720)


class AvailabilityCheckResponse(BaseSchema):
    is_available: bool
    vehicle_id: uuid.UUID
    start_datetime: datetime
    end_datetime: datetime
    buffer_minutes: int
    reason: Optional[str] = None


class BookingQuoteRequest(BaseSchema):
    vehicle_id: uuid.UUID
    pickup_location_id: uuid.UUID
    return_location_id: uuid.UUID
    start_datetime: datetime
    end_datetime: datetime
    promo_code: Optional[str] = None
    estimated_km: Optional[int] = None


class BookingQuoteResponse(BaseSchema):
    pricing: PricingBreakdown
    vehicle_name: str
    pickup_location_name: Optional[str] = None
    return_location_name: Optional[str] = None


class BookingCreate(BaseSchema):
    vehicle_id: uuid.UUID
    pickup_location_id: uuid.UUID
    return_location_id: uuid.UUID
    start_datetime: datetime
    end_datetime: datetime
    customer_id: Optional[uuid.UUID] = None
    customer_name: Optional[str] = Field(None, min_length=2, max_length=150)
    customer_email: Optional[EmailStr] = None
    customer_phone: Optional[str] = Field(None, min_length=5, max_length=32)
    driver_license_number: Optional[str] = Field(None, min_length=3, max_length=64)
    promo_code: Optional[str] = None
    idempotency_key: Optional[str] = Field(None, max_length=128)
    buffer_minutes: int = Field(default=60, ge=0, le=720)
    estimated_km: Optional[int] = None


class BookingStatusUpdate(BaseSchema):
    status: BookingStatus
    reason: Optional[str] = None


class BookingUpdate(BaseSchema):
    status: Optional[BookingStatus] = None
    cancellation_reason: Optional[str] = None
    return_location_id: Optional[uuid.UUID] = None


class BookingCancelRequest(BaseSchema):
    cancellation_reason: str = Field(..., min_length=3, max_length=500)


class BookingVehicleSummary(BaseSchema):
    id: uuid.UUID
    brand: str
    model: str
    category: str
    year: int
    license_plate: str


class BookingLocationSummary(BaseSchema):
    id: uuid.UUID
    name: str
    code: str
    city: str


class BookingRead(BaseSchema):
    id: uuid.UUID
    booking_reference: str
    customer_id: Optional[uuid.UUID] = None
    vehicle_id: uuid.UUID
    pickup_location_id: uuid.UUID
    return_location_id: uuid.UUID
    start_datetime: datetime
    end_datetime: datetime
    status: BookingStatus

    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    driver_license_number: Optional[str] = None

    currency: str
    daily_rate_cents: int
    daily_rate: Decimal
    base_amount_cents: int
    base_amount: Decimal
    location_fee_cents: int
    location_fee: Decimal
    tax_amount_cents: int
    tax_amount: Decimal
    discount_amount_cents: int
    discount_amount: Decimal
    deposit_amount_cents: int
    deposit_amount: Decimal
    total_amount_cents: int
    total_amount: Decimal
    total_days: int

    buffer_minutes: int
    expires_at: Optional[datetime] = None
    cancellation_reason: Optional[str] = None
    idempotency_key: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    vehicle: Optional[BookingVehicleSummary] = None
    pickup_location: Optional[BookingLocationSummary] = None
    return_location: Optional[BookingLocationSummary] = None
