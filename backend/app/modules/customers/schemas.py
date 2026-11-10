from datetime import date, datetime
import uuid
from typing import Any, Dict, List, Optional
from pydantic import Field
from app.common.schemas import BaseSchema
from app.modules.bookings.schemas import BookingRead


class CustomerUserSummary(BaseSchema):
    id: uuid.UUID
    email: str
    full_name: str
    phone_number: Optional[str] = None
    role: str
    is_active: bool
    is_verified: bool
    documents: Optional[Dict[str, Any]] = None


class CustomerBase(BaseSchema):
    user_id: uuid.UUID
    driver_license_number: str = Field(..., max_length=64)
    driver_license_expiry: date
    driver_license_country: str = "US"
    date_of_birth: date
    is_identity_verified: bool = False
    notes: Optional[str] = None


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseSchema):
    driver_license_number: Optional[str] = None
    driver_license_expiry: Optional[date] = None
    driver_license_country: Optional[str] = None
    is_identity_verified: Optional[bool] = None
    notes: Optional[str] = None


class CustomerVerificationUpdate(BaseSchema):
    is_identity_verified: bool
    verification_notes: Optional[str] = None


class CustomerRead(CustomerBase):
    id: uuid.UUID
    user: Optional[CustomerUserSummary] = None
    created_at: datetime
    updated_at: datetime


class CustomerDetailRead(CustomerRead):
    bookings: List[BookingRead] = Field(default_factory=list)
