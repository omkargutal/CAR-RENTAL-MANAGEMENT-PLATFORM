from datetime import datetime
import uuid
from app.common.services import BaseService
from app.core.exceptions import ConflictError, ValidationAppError
from app.modules.availability.models import VehicleAvailabilityBlock
from app.modules.availability.repository import AvailabilityRepository
from app.modules.availability.schemas import (
    AvailabilityBlockCreate,
    AvailabilityResult,
)


class AvailabilityService(BaseService[VehicleAvailabilityBlock]):
    def __init__(self, repository: AvailabilityRepository):
        super().__init__(repository)
        self.avail_repo = repository

    async def check_availability(
        self, vehicle_id: uuid.UUID, start_time: datetime, end_time: datetime
    ) -> AvailabilityResult:
        if end_time <= start_time:
            raise ValidationAppError("end_time must be greater than start_time.")
        conflicts = await self.avail_repo.find_conflicts(vehicle_id, start_time, end_time)
        return AvailabilityResult(
            vehicle_id=vehicle_id,
            is_available=len(conflicts) == 0,
            conflicting_blocks=len(conflicts),
        )

    async def create_block(
        self, payload: AvailabilityBlockCreate
    ) -> VehicleAvailabilityBlock:
        if payload.end_time <= payload.start_time:
            raise ValidationAppError("end_time must be greater than start_time.")

        conflicts = await self.avail_repo.find_conflicts(
            payload.vehicle_id, payload.start_time, payload.end_time
        )
        if conflicts:
            raise ConflictError(
                f"Vehicle {payload.vehicle_id} is already blocked during this time range."
            )

        block = VehicleAvailabilityBlock(
            vehicle_id=payload.vehicle_id,
            start_time=payload.start_time,
            end_time=payload.end_time,
            reason=payload.reason,
            booking_id=payload.booking_id,
            is_active=payload.is_active,
        )
        return await self.avail_repo.create(block)
