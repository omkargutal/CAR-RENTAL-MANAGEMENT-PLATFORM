from datetime import datetime
import uuid
from typing import Sequence
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.common.repositories import BaseRepository
from app.modules.availability.models import VehicleAvailabilityBlock


class AvailabilityRepository(BaseRepository[VehicleAvailabilityBlock]):
    def __init__(self, db: AsyncSession):
        super().__init__(VehicleAvailabilityBlock, db)

    async def find_conflicts(
        self, vehicle_id: uuid.UUID, start_time: datetime, end_time: datetime
    ) -> Sequence[VehicleAvailabilityBlock]:
        """
        Check for any overlapping active availability block for this vehicle:
        (Block.start_time < end_time AND Block.end_time > start_time)
        """
        stmt = (
            select(VehicleAvailabilityBlock)
            .where(
                VehicleAvailabilityBlock.vehicle_id == vehicle_id,
                VehicleAvailabilityBlock.is_active == True,
                VehicleAvailabilityBlock.is_deleted == False,
                VehicleAvailabilityBlock.start_time < end_time,
                VehicleAvailabilityBlock.end_time > start_time,
            )
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()
