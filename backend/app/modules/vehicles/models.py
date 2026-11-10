from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum
from typing import Any, Dict, List, Optional
import uuid
from sqlalchemy import Boolean, DateTime, Enum as SQLEnum, ForeignKey, Integer, JSON, Numeric, String, Text, Uuid, desc
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.common.models import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin


class VehicleStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    UNAVAILABLE = "UNAVAILABLE"
    RENTED = "RENTED"
    MAINTENANCE = "MAINTENANCE"
    RESERVED = "RESERVED"
    OUT_OF_SERVICE = "OUT_OF_SERVICE"
    ARCHIVED = "ARCHIVED"

    @classmethod
    def _missing_(cls, value: object):
        if isinstance(value, str):
            for member in cls:
                if member.value == value.upper():
                    return member
        return None


class VehicleCategoryEnum(str, Enum):
    ECONOMY = "ECONOMY"
    COMPACT = "COMPACT"
    SEDAN = "SEDAN"
    SUV = "SUV"
    LUXURY = "LUXURY"
    VAN = "VAN"
    TRUCK = "TRUCK"

    @classmethod
    def _missing_(cls, value: object):
        if isinstance(value, str):
            for member in cls:
                if member.value == value.upper():
                    return member
        return None


class FuelType(str, Enum):
    GASOLINE = "GASOLINE"
    DIESEL = "DIESEL"
    ELECTRIC = "ELECTRIC"
    HYBRID = "HYBRID"

    @classmethod
    def _missing_(cls, value: object):
        if isinstance(value, str):
            val_upper = value.upper()
            if val_upper in ("PETROL", "GAS"):
                return cls.GASOLINE
            for member in cls:
                if member.value == val_upper:
                    return member
        return None


class TransmissionType(str, Enum):
    AUTOMATIC = "AUTOMATIC"
    MANUAL = "MANUAL"

    @classmethod
    def _missing_(cls, value: object):
        if isinstance(value, str):
            for member in cls:
                if member.value == value.upper():
                    return member
        return None


class Vehicle(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "vehicles"

    vin: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    make: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    model: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    license_plate: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    category: Mapped[VehicleCategoryEnum] = mapped_column(
        SQLEnum(VehicleCategoryEnum, name="vehicle_category_enum", native_enum=True, values_callable=lambda obj: [e.value for e in obj]),
        default=VehicleCategoryEnum.SEDAN,
        nullable=False,
        index=True,
    )
    status: Mapped[VehicleStatus] = mapped_column(
        SQLEnum(VehicleStatus, name="vehicle_status_enum", native_enum=True, values_callable=lambda obj: [e.value for e in obj]),
        default=VehicleStatus.AVAILABLE,
        nullable=False,
        index=True,
    )
    fuel_type: Mapped[FuelType] = mapped_column(
        SQLEnum(FuelType, name="fuel_type_enum", native_enum=True, values_callable=lambda obj: [e.value for e in obj]),
        default=FuelType.GASOLINE,
        nullable=False,
    )
    transmission: Mapped[TransmissionType] = mapped_column(
        SQLEnum(TransmissionType, name="transmission_type_enum", native_enum=True, values_callable=lambda obj: [e.value for e in obj]),
        default=TransmissionType.AUTOMATIC,
        nullable=False,
    )
    seats: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    doors: Mapped[int] = mapped_column(Integer, default=4, nullable=False)
    suitcases: Mapped[int] = mapped_column(Integer, default=2, nullable=False)
    mileage: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Rates
    daily_rate: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    weekly_rate: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    monthly_rate: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)

    # Content & Media
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    features: Mapped[Optional[List[str]]] = mapped_column(JSON, default=list, nullable=True)
    specs: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, default=dict, nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    popularity_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=100, nullable=False, index=True)

    # Location Foreign Key
    location_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("locations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    # Relationships
    images: Mapped[List["VehicleImage"]] = relationship(
        "VehicleImage",
        back_populates="vehicle",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="VehicleImage.display_order",
    )
    maintenance_records: Mapped[List["VehicleMaintenanceRecord"]] = relationship(
        "VehicleMaintenanceRecord",
        back_populates="vehicle",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="desc(VehicleMaintenanceRecord.service_date)",
    )

    @property
    def brand(self) -> str:
        return self.make


class VehicleCategoryModel(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "vehicle_categories"

    name: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    icon: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )


class VehicleImage(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "vehicle_images"

    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    url: Mapped[str] = mapped_column(String(1000), nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    caption: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    vehicle: Mapped["Vehicle"] = relationship("Vehicle", back_populates="images")


class VehicleMaintenanceRecord(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "vehicle_maintenance_records"

    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    service_type: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cost: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    service_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    completed_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    performed_by: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    mileage_at_service: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    vehicle: Mapped["Vehicle"] = relationship("Vehicle", back_populates="maintenance_records")
