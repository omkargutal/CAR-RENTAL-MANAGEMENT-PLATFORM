from datetime import datetime
import uuid
from typing import Optional
from app.common.schemas import BaseSchema
from app.modules.availability.models import BlockReason


class AvailabilityBlockBase(BaseSchema):
    vehicle_id: uuid.UUID
    start_time: datetime
    end_time: datetime
    reason: BlockReason = BlockReason.MANUAL_HOLD
    booking_id: Optional[uuid.UUID] = None
    is_active: bool = True


class AvailabilityBlockCreate(AvailabilityBlockBase):
    pass


class AvailabilityBlockRead(AvailabilityBlockBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class CheckAvailabilityQuery(BaseSchema):
    vehicle_id: uuid.UUID
    start_time: datetime
    end_time: datetime


class AvailabilityResult(BaseSchema):
    vehicle_id: uuid.UUID
    is_available: bool
    conflicting_blocks: int
