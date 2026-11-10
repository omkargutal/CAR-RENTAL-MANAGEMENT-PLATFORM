import uuid
from typing import Optional, Sequence
from app.common.services import BaseService
from app.core.exceptions import ConflictError
from app.modules.locations.models import Location
from app.modules.locations.repository import LocationRepository
from app.modules.locations.schemas import LocationCreate, LocationUpdate


class LocationService(BaseService[Location]):
    def __init__(self, repository: LocationRepository):
        super().__init__(repository)
        self.location_repo = repository

    async def get_by_code(self, code: str) -> Optional[Location]:
        return await self.location_repo.get_by_code(code)

    async def create_location(self, payload: LocationCreate) -> Location:
        existing = await self.location_repo.get_by_code(payload.code)
        if existing:
            raise ConflictError(f"Location with code '{payload.code}' already exists.")

        loc = Location(
            name=payload.name,
            code=payload.code.upper(),
            address=payload.address,
            city=payload.city,
            state=payload.state,
            country=payload.country,
            postal_code=payload.postal_code,
            latitude=payload.latitude,
            longitude=payload.longitude,
            phone=payload.phone,
            email=payload.email,
            is_active=payload.is_active,
        )
        return await self.location_repo.create(loc)

    async def update_location(
        self, location_id: uuid.UUID, payload: LocationUpdate
    ) -> Location:
        loc = await self.get_or_404(location_id)
        for key, val in payload.model_dump(exclude_unset=True).items():
            setattr(loc, key, val)
        return await self.location_repo.update(loc)

    async def delete_location(self, location_id: uuid.UUID) -> None:
        loc = await self.get_or_404(location_id)
        await self.location_repo.delete(loc)

