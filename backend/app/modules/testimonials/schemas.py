from datetime import datetime
from typing import Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field


class TestimonialBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150, description="Customer name")
    designation: str = Field(..., min_length=1, max_length=150, description="Customer designation or role")
    review: str = Field(..., min_length=5, description="Customer review text")
    rating: int = Field(5, ge=1, le=5, description="Rating from 1 to 5 stars")
    image_url: Optional[str] = Field(None, max_length=500, description="Customer profile image URL")
    is_active: bool = Field(True, description="Whether this testimonial is displayed publicly")
    sort_order: int = Field(0, description="Display sorting order (lowest first)")


class TestimonialCreate(TestimonialBase):
    pass


class TestimonialUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    designation: Optional[str] = Field(None, min_length=1, max_length=150)
    review: Optional[str] = Field(None, min_length=5)
    rating: Optional[int] = Field(None, ge=1, le=5)
    image_url: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class TestimonialStatusUpdate(BaseModel):
    is_active: bool


class TestimonialRead(TestimonialBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
