from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.modules.locations.repository import LocationRepository
from app.modules.locations.service import LocationService


def get_location_repository(
    db: AsyncSession = Depends(get_db),
) -> LocationRepository:
    return LocationRepository(db)


def get_location_service(
    repo: LocationRepository = Depends(get_location_repository),
) -> LocationService:
    return LocationService(repo)
