from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.modules.bookings.repository import BookingRepository
from app.modules.bookings.service import BookingService
from app.modules.locations.dependencies import get_location_repository
from app.modules.locations.repository import LocationRepository
from app.modules.vehicles.dependencies import get_vehicle_repository
from app.modules.vehicles.repository import VehicleRepository


def get_booking_repository(
    db: AsyncSession = Depends(get_db),
) -> BookingRepository:
    return BookingRepository(db)


def get_booking_service(
    repo: BookingRepository = Depends(get_booking_repository),
    vehicle_repo: VehicleRepository = Depends(get_vehicle_repository),
    location_repo: LocationRepository = Depends(get_location_repository),
) -> BookingService:
    return BookingService(repo, vehicle_repo, location_repo)
