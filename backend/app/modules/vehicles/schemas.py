from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional
import uuid
from pydantic import Field, computed_field, model_validator

from app.common.schemas import BaseSchema
from app.modules.vehicles.models import (
    FuelType,
    TransmissionType,
    VehicleCategoryEnum,
    VehicleStatus,
)


class VehicleCategoryRead(BaseSchema):
    id: uuid.UUID
    name: str
    slug: str
    description: Optional[str] = None
    icon: Optional[str] = None
    display_order: int = 0
    is_active: bool = True
    created_at: datetime

    @computed_field
    @property
    def code(self) -> str:
        return self.slug


class VehicleCategoryCreate(BaseSchema):
    name: str = Field(..., min_length=2, max_length=64)
    slug: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    display_order: int = 0
    is_active: bool = True

    @model_validator(mode="before")
    @classmethod
    def populate_slug(cls, data: Any):
        if isinstance(data, dict):
            if not data.get("slug"):
                base = data.get("code") or data.get("name", "category")
                data["slug"] = str(base).lower().replace(" ", "-")
        return data


class VehicleImageRead(BaseSchema):
    id: uuid.UUID
    vehicle_id: uuid.UUID
    url: str
    is_primary: bool = False
    display_order: int = 0
    caption: Optional[str] = None
    created_at: datetime


class VehicleImageCreate(BaseSchema):
    url: str
    is_primary: bool = False
    display_order: int = 0
    caption: Optional[str] = None


class VehicleMaintenanceRead(BaseSchema):
    id: uuid.UUID
    vehicle_id: uuid.UUID
    service_type: str
    description: Optional[str] = None
    cost: Optional[Decimal] = None
    service_date: datetime
    completed_date: Optional[datetime] = None
    performed_by: Optional[str] = None
    mileage_at_service: Optional[int] = None
    is_completed: bool = False
    created_at: datetime


class VehicleMaintenanceCreate(BaseSchema):
    service_type: Optional[str] = None
    maintenance_type: Optional[str] = None
    description: Optional[str] = None
    cost: Optional[Decimal] = None
    service_date: Optional[datetime] = None
    start_date: Optional[datetime] = None
    performed_by: Optional[str] = None
    service_provider: Optional[str] = None
    mileage_at_service: Optional[int] = None
    set_vehicle_in_maintenance: bool = True

    @model_validator(mode="before")
    @classmethod
    def normalize_fields(cls, data: Any):
        if isinstance(data, dict):
            if not data.get("service_type") and data.get("maintenance_type"):
                data["service_type"] = data["maintenance_type"]
            if not data.get("service_date") and data.get("start_date"):
                data["service_date"] = data["start_date"]
            if not data.get("performed_by") and data.get("service_provider"):
                data["performed_by"] = data["service_provider"]
            if not data.get("service_type"):
                data["service_type"] = "SCHEDULED_SERVICE"
            if not data.get("service_date"):
                data["service_date"] = datetime.now(timezone.utc)
        return data


class VehicleMaintenanceUpdate(BaseSchema):
    service_type: Optional[str] = None
    description: Optional[str] = None
    cost: Optional[Decimal] = None
    completed_date: Optional[datetime] = None
    performed_by: Optional[str] = None
    mileage_at_service: Optional[int] = None
    is_completed: Optional[bool] = None
    set_vehicle_available: Optional[bool] = None
    notes: Optional[str] = None
    status: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def normalize_update(cls, data: Any):
        if isinstance(data, dict):
            if data.get("status") == "COMPLETED" or data.get("notes"):
                data["is_completed"] = True
                data["set_vehicle_available"] = True
                if not data.get("completed_date"):
                    data["completed_date"] = data.get("end_date") or datetime.now(timezone.utc)
                if data.get("notes") and not data.get("description"):
                    data["description"] = data["notes"]
        return data


class VehiclePricingUpdate(BaseSchema):
    daily_rate: Decimal = Field(..., gt=0)
    weekly_rate: Optional[Decimal] = Field(None, gt=0)
    monthly_rate: Optional[Decimal] = Field(None, gt=0)


class VehicleBase(BaseSchema):
    vin: str = Field(..., min_length=5, max_length=32)
    make: str = Field(..., min_length=1, max_length=64)
    model: str = Field(..., min_length=1, max_length=64)
    year: int = Field(..., ge=1990, le=2030)
    license_plate: str = Field(..., min_length=2, max_length=32)
    category: VehicleCategoryEnum = VehicleCategoryEnum.SEDAN
    status: VehicleStatus = VehicleStatus.AVAILABLE
    fuel_type: FuelType = FuelType.GASOLINE
    transmission: TransmissionType = TransmissionType.AUTOMATIC
    seats: int = Field(5, ge=1, le=60)
    doors: int = Field(4, ge=2, le=6)
    suitcases: int = Field(2, ge=0, le=30)
    mileage: int = Field(0, ge=0)
    daily_rate: Decimal = Field(..., gt=0)
    weekly_rate: Optional[Decimal] = None
    monthly_rate: Optional[Decimal] = None
    description: Optional[str] = None
    features: Optional[List[str]] = Field(default_factory=list)
    specs: Optional[Dict[str, Any]] = Field(default_factory=dict)
    image_url: Optional[str] = None
    location_id: Optional[uuid.UUID] = None
    popularity_score: int = 0
    sort_order: int = 100

    @model_validator(mode="before")
    @classmethod
    def handle_aliases(cls, data: Any):
        if isinstance(data, dict):
            if "seating_capacity" in data and "seats" not in data:
                data["seats"] = data["seating_capacity"]
        return data


class VehicleCreate(VehicleBase):
    images: Optional[List[VehicleImageCreate]] = None


class VehicleUpdate(BaseSchema):
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    license_plate: Optional[str] = None
    category: Optional[VehicleCategoryEnum] = None
    status: Optional[VehicleStatus] = None
    fuel_type: Optional[FuelType] = None
    transmission: Optional[TransmissionType] = None
    seats: Optional[int] = None
    doors: Optional[int] = None
    suitcases: Optional[int] = None
    mileage: Optional[int] = None
    daily_rate: Optional[Decimal] = None
    weekly_rate: Optional[Decimal] = None
    monthly_rate: Optional[Decimal] = None
    description: Optional[str] = None
    features: Optional[List[str]] = None
    specs: Optional[Dict[str, Any]] = None
    image_url: Optional[str] = None
    location_id: Optional[uuid.UUID] = None
    popularity_score: Optional[int] = None
    sort_order: Optional[int] = None

    @model_validator(mode="before")
    @classmethod
    def handle_aliases(cls, data: Any):
        if isinstance(data, dict):
            if "seating_capacity" in data and "seats" not in data:
                data["seats"] = data["seating_capacity"]
        return data


class VehicleAvailabilityUpdate(BaseSchema):
    status: VehicleStatus


class VehicleRead(VehicleBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    images: List[VehicleImageRead] = Field(default_factory=list)

    @computed_field
    @property
    def brand(self) -> str:
        return self.make

    @computed_field
    @property
    def seating_capacity(self) -> int:
        return self.seats

    @computed_field
    @property
    def seating_capacity_label(self) -> str:
        if self.specs and isinstance(self.specs, dict) and self.specs.get("seating_capacity_label"):
            return str(self.specs["seating_capacity_label"])
        return f"{self.seats} Seater"

    @computed_field
    @property
    def is_bookable(self) -> bool:
        """Archived or under-maintenance vehicles must not be bookable!"""
        return self.status == VehicleStatus.AVAILABLE

    @computed_field
    @property
    def effective_weekly_rate(self) -> Decimal:
        return self.weekly_rate or (self.daily_rate * Decimal("6.00"))

    @computed_field
    @property
    def effective_monthly_rate(self) -> Decimal:
        return self.monthly_rate or (self.daily_rate * Decimal("22.00"))

    @computed_field
    @property
    def primary_image_url(self) -> Optional[str]:
        for img in self.images:
            if img.is_primary:
                return img.url
        return self.image_url or (self.images[0].url if self.images else None)


class VehicleDetailRead(VehicleRead):
    maintenance_records: List[VehicleMaintenanceRead] = Field(default_factory=list)
