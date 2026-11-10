from datetime import datetime
import uuid
from typing import Optional
from pydantic import Field
from app.common.schemas import BaseSchema


class ReviewBase(BaseSchema):
    booking_id: uuid.UUID
    vehicle_id: uuid.UUID
    customer_id: uuid.UUID
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None
    is_published: bool = True


class ReviewCreate(ReviewBase):
    pass


class ReviewUpdate(BaseSchema):
    rating: Optional[int] = Field(None, ge=1, le=5)
    comment: Optional[str] = None
    is_published: Optional[bool] = None


class ReviewRead(ReviewBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
