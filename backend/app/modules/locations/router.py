import uuid
from typing import Dict, List
from fastapi import APIRouter, Depends, Query, status
from app.common.schemas import ResponseEnvelope
from app.modules.auth.dependencies import require_admin, require_staff_or_admin
from app.modules.locations.dependencies import get_location_service
from app.modules.locations.schemas import LocationCreate, LocationRead, LocationUpdate
from app.modules.locations.service import LocationService
from app.modules.users.models import User

router = APIRouter(prefix="/locations", tags=["Locations"])


@router.get("", response_model=ResponseEnvelope[List[LocationRead]])
async def list_locations(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    service: LocationService = Depends(get_location_service),
):
    locations = await service.list(skip=skip, limit=limit)
    return ResponseEnvelope(data=[LocationRead.model_validate(loc) for loc in locations])


@router.post("", response_model=ResponseEnvelope[LocationRead], status_code=status.HTTP_201_CREATED)
async def create_location(
    payload: LocationCreate,
    current_user: User = Depends(require_staff_or_admin),
    service: LocationService = Depends(get_location_service),
):
    loc = await service.create_location(payload)
    return ResponseEnvelope(data=LocationRead.model_validate(loc), message="Location created successfully.")


@router.get("/{location_id}", response_model=ResponseEnvelope[LocationRead])
async def get_location(
    location_id: uuid.UUID,
    service: LocationService = Depends(get_location_service),
):
    loc = await service.get_or_404(location_id)
    return ResponseEnvelope(data=LocationRead.model_validate(loc))


@router.patch("/{location_id}", response_model=ResponseEnvelope[LocationRead])
async def update_location(
    location_id: uuid.UUID,
    payload: LocationUpdate,
    current_user: User = Depends(require_staff_or_admin),
    service: LocationService = Depends(get_location_service),
):
    loc = await service.update_location(location_id, payload)
    return ResponseEnvelope(data=LocationRead.model_validate(loc), message="Location updated successfully.")


@router.delete("/{location_id}", response_model=ResponseEnvelope[Dict[str, bool]])
async def delete_location(
    location_id: uuid.UUID,
    current_user: User = Depends(require_admin),
    service: LocationService = Depends(get_location_service),
):
    await service.delete_location(location_id)
    return ResponseEnvelope(data={"deleted": True}, message="Location deleted successfully.")

