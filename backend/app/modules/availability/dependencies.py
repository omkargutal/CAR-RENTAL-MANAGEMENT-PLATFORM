from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.modules.availability.repository import AvailabilityRepository
from app.modules.availability.service import AvailabilityService


def get_availability_repository(
    db: AsyncSession = Depends(get_db),
) -> AvailabilityRepository:
    return AvailabilityRepository(db)


def get_availability_service(
    repo: AvailabilityRepository = Depends(get_availability_repository),
) -> AvailabilityService:
    return AvailabilityService(repo)
