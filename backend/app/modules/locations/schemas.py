import uuid
from datetime import datetime
from typing import Optional
from pydantic import EmailStr, Field
from app.common.schemas import BaseSchema


class LocationBase(BaseSchema):
    name: str
    code: str = Field(..., max_length=32)
    address: str
    city: str
    state: str
    country: str = "US"
    postal_code: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    is_active: bool = True


class LocationCreate(LocationBase):
    pass


class LocationUpdate(BaseSchema):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None


class LocationRead(LocationBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
