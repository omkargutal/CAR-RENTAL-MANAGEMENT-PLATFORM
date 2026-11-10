from decimal import Decimal
from typing import Any, Dict, List, Optional
import uuid
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status

from app.common.schemas import ResponseEnvelope
from app.modules.auth.dependencies import (
    get_current_user,
    require_admin,
    require_staff_or_admin,
)
from app.core.exceptions import ForbiddenError
from app.modules.users.models import User, UserRole
from app.modules.vehicles.dependencies import get_vehicle_service
from app.modules.vehicles.models import (
    FuelType,
    TransmissionType,
    VehicleCategoryEnum,
)
from app.modules.vehicles.schemas import (
    VehicleAvailabilityUpdate,
    VehicleCategoryCreate,
    VehicleCategoryRead,
    VehicleCreate,
    VehicleDetailRead,
    VehicleImageRead,
    VehicleMaintenanceCreate,
    VehicleMaintenanceRead,
    VehicleMaintenanceUpdate,
    VehiclePricingUpdate,
    VehicleRead,
    VehicleUpdate,
)
from app.modules.vehicles.service import VehicleService

router = APIRouter(prefix="/vehicles", tags=["Vehicles & Fleet Management"])


# ------------------------------------------------------------------------------
# 1. Categories (Static & Custom)
# ------------------------------------------------------------------------------

@router.get("/categories", response_model=ResponseEnvelope[List[VehicleCategoryRead]])
async def list_categories(
    service: VehicleService = Depends(get_vehicle_service),
):
    categories = await service.list_categories()
    return ResponseEnvelope(data=[VehicleCategoryRead.model_validate(c) for c in categories])


@router.post("/categories", response_model=ResponseEnvelope[VehicleCategoryRead], status_code=status.HTTP_201_CREATED)
async def create_category(
    payload: VehicleCategoryCreate,
    current_user: User = Depends(require_admin),
    service: VehicleService = Depends(get_vehicle_service),
):
    cat = await service.create_category(payload)
    return ResponseEnvelope(data=VehicleCategoryRead.model_validate(cat), message="Category created.")


# ------------------------------------------------------------------------------
# 2. Vehicle Catalog & Search (Public + Customer Features)
# ------------------------------------------------------------------------------

@router.get("", response_model=ResponseEnvelope[List[VehicleRead]])
async def list_vehicles(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    min_price: Optional[Decimal] = Query(None, ge=0),
    max_price: Optional[Decimal] = Query(None, ge=0),
    category: Optional[VehicleCategoryEnum] = None,
    brand: Optional[str] = Query(None, description="Filter by brand/make"),
    fuel_type: Optional[FuelType] = None,
    transmission: Optional[TransmissionType] = None,
    seats: Optional[int] = Query(None, ge=1, le=60, description="Minimum seating capacity"),
    location_id: Optional[uuid.UUID] = None,
    available_only: bool = Query(False, description="Filter only immediately bookable vehicles"),
    sort_by: str = Query("capacity", pattern="^(capacity|capacity_asc|price_asc|price_desc|newest|popularity)$"),
    search: Optional[str] = Query(None, description="Search by make, model, license plate, VIN"),
    include_archived: bool = Query(False, description="Admin flag to include archived vehicles"),
    service: VehicleService = Depends(get_vehicle_service),
):
    vehicles, total = await service.search_catalog(
        skip=skip,
        limit=limit,
        min_price=min_price,
        max_price=max_price,
        category=category,
        brand=brand,
        fuel_type=fuel_type,
        transmission=transmission,
        seats=seats,
        location_id=location_id,
        available_only=available_only,
        exclude_archived=not include_archived,
        sort_by=sort_by,
        search=search,
    )
    return ResponseEnvelope(
        data=[VehicleRead.model_validate(v) for v in vehicles],
        meta={"total": total, "skip": skip, "limit": limit},
    )


@router.get("/{vehicle_id}", response_model=ResponseEnvelope[VehicleDetailRead])
async def get_vehicle_details(
    vehicle_id: uuid.UUID,
    service: VehicleService = Depends(get_vehicle_service),
):
    vehicle = await service.get_detail(vehicle_id)
    return ResponseEnvelope(data=VehicleDetailRead.model_validate(vehicle))


# ------------------------------------------------------------------------------
# 3. Admin / Staff Fleet Operations
# ------------------------------------------------------------------------------

@router.post("", response_model=ResponseEnvelope[VehicleDetailRead], status_code=status.HTTP_201_CREATED)
async def create_vehicle(
    payload: VehicleCreate,
    current_user: User = Depends(require_staff_or_admin),
    service: VehicleService = Depends(get_vehicle_service),
):
    vehicle = await service.create_vehicle(payload, actor_id=current_user.id)
    return ResponseEnvelope(data=VehicleDetailRead.model_validate(vehicle), message="Vehicle created successfully.")


@router.patch("/{vehicle_id}", response_model=ResponseEnvelope[VehicleDetailRead])
async def update_vehicle(
    vehicle_id: uuid.UUID,
    payload: VehicleUpdate,
    current_user: User = Depends(require_staff_or_admin),
    service: VehicleService = Depends(get_vehicle_service),
):
    # Only administrators can modify vehicle availability status
    if payload.status is not None and current_user.role != UserRole.ADMIN:
        raise ForbiddenError("Only administrators have permission to manage vehicle availability.")
    updated = await service.update_vehicle(vehicle_id, payload, actor_id=current_user.id)
    return ResponseEnvelope(data=VehicleDetailRead.model_validate(updated), message="Vehicle updated successfully.")


@router.patch("/{vehicle_id}/availability", response_model=ResponseEnvelope[VehicleDetailRead])
async def update_vehicle_availability(
    vehicle_id: uuid.UUID,
    payload: VehicleAvailabilityUpdate,
    current_user: User = Depends(require_admin),
    service: VehicleService = Depends(get_vehicle_service),
):
    """Admin-only endpoint to explicitly set vehicle availability status (AVAILABLE, UNAVAILABLE, MAINTENANCE)."""
    updated = await service.update_availability(vehicle_id, payload.status, actor_id=current_user.id)
    return ResponseEnvelope(
        data=VehicleDetailRead.model_validate(updated),
        message=f"Vehicle availability updated to {payload.status.value}."
    )


@router.post("/{vehicle_id}/archive", response_model=ResponseEnvelope[VehicleRead])
async def archive_vehicle(
    vehicle_id: uuid.UUID,
    current_user: User = Depends(require_admin),
    service: VehicleService = Depends(get_vehicle_service),
):
    archived = await service.archive_vehicle(vehicle_id, actor_id=current_user.id)
    return ResponseEnvelope(data=VehicleRead.model_validate(archived), message="Vehicle archived.")


@router.put("/{vehicle_id}/pricing", response_model=ResponseEnvelope[VehicleRead])
async def manage_vehicle_pricing(
    vehicle_id: uuid.UUID,
    payload: VehiclePricingUpdate,
    current_user: User = Depends(require_admin),
    service: VehicleService = Depends(get_vehicle_service),
):
    updated = await service.update_pricing(vehicle_id, payload, actor_id=current_user.id)
    return ResponseEnvelope(data=VehicleRead.model_validate(updated), message="Vehicle pricing updated.")


# ------------------------------------------------------------------------------
# 4. Image Upload & Management (Provider-Independent Storage)
# ------------------------------------------------------------------------------

@router.post("/{vehicle_id}/images", response_model=ResponseEnvelope[VehicleImageRead], status_code=status.HTTP_201_CREATED)
async def upload_vehicle_image(
    vehicle_id: uuid.UUID,
    file: UploadFile = File(...),
    is_primary: bool = Form(False),
    caption: Optional[str] = Form(None),
    current_user: User = Depends(require_staff_or_admin),
    service: VehicleService = Depends(get_vehicle_service),
):
    image = await service.upload_vehicle_image(
        vehicle_id=vehicle_id,
        file_obj=file.file,
        filename=file.filename or "vehicle_image.jpg",
        content_type=file.content_type or "image/jpeg",
        is_primary=is_primary,
        caption=caption,
    )
    return ResponseEnvelope(data=VehicleImageRead.model_validate(image), message="Image uploaded successfully.")


@router.patch("/{vehicle_id}/images/{image_id}/primary", response_model=ResponseEnvelope[VehicleImageRead])
async def set_primary_image(
    vehicle_id: uuid.UUID,
    image_id: uuid.UUID,
    current_user: User = Depends(require_staff_or_admin),
    service: VehicleService = Depends(get_vehicle_service),
):
    img = await service.set_primary_image(vehicle_id, image_id)
    return ResponseEnvelope(data=VehicleImageRead.model_validate(img), message="Primary image updated.")


@router.delete("/images/{image_id}", response_model=ResponseEnvelope[Dict[str, bool]])
async def delete_vehicle_image(
    image_id: uuid.UUID,
    current_user: User = Depends(require_staff_or_admin),
    service: VehicleService = Depends(get_vehicle_service),
):
    await service.delete_image(image_id)
    return ResponseEnvelope(data={"deleted": True}, message="Image deleted.")


# ------------------------------------------------------------------------------
# 5. Maintenance Status & Records
# ------------------------------------------------------------------------------

@router.post("/{vehicle_id}/maintenance", response_model=ResponseEnvelope[VehicleMaintenanceRead], status_code=status.HTTP_201_CREATED)
async def add_maintenance_record(
    vehicle_id: uuid.UUID,
    payload: VehicleMaintenanceCreate,
    current_user: User = Depends(require_staff_or_admin),
    service: VehicleService = Depends(get_vehicle_service),
):
    record = await service.add_maintenance_record(vehicle_id, payload, actor_id=current_user.id)
    return ResponseEnvelope(data=VehicleMaintenanceRead.model_validate(record), message="Maintenance record scheduled.")


@router.get("/{vehicle_id}/maintenance", response_model=ResponseEnvelope[List[VehicleMaintenanceRead]])
async def list_maintenance_records(
    vehicle_id: uuid.UUID,
    current_user: User = Depends(require_staff_or_admin),
    service: VehicleService = Depends(get_vehicle_service),
):
    records = await service.list_maintenance_records(vehicle_id)
    return ResponseEnvelope(data=[VehicleMaintenanceRead.model_validate(r) for r in records])


@router.patch("/maintenance/{record_id}", response_model=ResponseEnvelope[VehicleMaintenanceRead])
async def update_maintenance_record(
    record_id: uuid.UUID,
    payload: VehicleMaintenanceUpdate,
    current_user: User = Depends(require_staff_or_admin),
    service: VehicleService = Depends(get_vehicle_service),
):
    record = await service.update_maintenance_record(record_id, payload, actor_id=current_user.id)
    return ResponseEnvelope(data=VehicleMaintenanceRead.model_validate(record), message="Maintenance record updated.")


# ------------------------------------------------------------------------------
# 6. Rental History
# ------------------------------------------------------------------------------

@router.get("/{vehicle_id}/rental-history", response_model=ResponseEnvelope[List[Dict[str, Any]]])
async def get_rental_history(
    vehicle_id: uuid.UUID,
    current_user: User = Depends(require_staff_or_admin),
    service: VehicleService = Depends(get_vehicle_service),
):
    history = await service.get_rental_history(vehicle_id)
    return ResponseEnvelope(data=history)
