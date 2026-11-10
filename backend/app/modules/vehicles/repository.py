from decimal import Decimal
from typing import Any, Dict, List, Optional, Sequence
import uuid
from sqlalchemy import asc, desc, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.common.repositories import BaseRepository
from app.modules.vehicles.models import (
    FuelType,
    TransmissionType,
    Vehicle,
    VehicleCategoryEnum,
    VehicleCategoryModel,
    VehicleImage,
    VehicleMaintenanceRecord,
    VehicleStatus,
)


class VehicleRepository(BaseRepository[Vehicle]):
    def __init__(self, db: AsyncSession):
        super().__init__(Vehicle, db)

    async def get_by_vin(self, vin: str) -> Optional[Vehicle]:
        stmt = select(Vehicle).where(Vehicle.vin == vin.upper(), Vehicle.is_deleted == False)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_license_plate(self, plate: str) -> Optional[Vehicle]:
        stmt = select(Vehicle).where(
            Vehicle.license_plate == plate.upper(), Vehicle.is_deleted == False
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_detail(self, vehicle_id: uuid.UUID) -> Optional[Vehicle]:
        stmt = (
            select(Vehicle)
            .where(Vehicle.id == vehicle_id, Vehicle.is_deleted == False)
            .options(
                selectinload(Vehicle.images),
                selectinload(Vehicle.maintenance_records),
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id_for_update(self, vehicle_id: uuid.UUID) -> Optional[Vehicle]:
        stmt = (
            select(Vehicle)
            .where(Vehicle.id == vehicle_id, Vehicle.is_deleted == False)
            .with_for_update()
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def search_and_filter(
        self,
        *,
        skip: int = 0,
        limit: int = 50,
        min_price: Optional[Decimal] = None,
        max_price: Optional[Decimal] = None,
        category: Optional[VehicleCategoryEnum] = None,
        brand: Optional[str] = None,
        fuel_type: Optional[FuelType] = None,
        transmission: Optional[TransmissionType] = None,
        seats: Optional[int] = None,
        location_id: Optional[uuid.UUID] = None,
        available_only: bool = False,
        exclude_archived: bool = True,
        sort_by: str = "popularity",
        search: Optional[str] = None,
    ) -> Sequence[Vehicle]:
        stmt = (
            select(Vehicle)
            .where(Vehicle.is_deleted == False)
            .options(selectinload(Vehicle.images))
        )

        # Filters
        if exclude_archived:
            stmt = stmt.where(Vehicle.status != VehicleStatus.ARCHIVED)

        if available_only:
            # Rule: Archived or under-maintenance vehicles must not be bookable!
            stmt = stmt.where(Vehicle.status == VehicleStatus.AVAILABLE)

        if min_price is not None:
            stmt = stmt.where(Vehicle.daily_rate >= min_price)

        if max_price is not None:
            stmt = stmt.where(Vehicle.daily_rate <= max_price)

        if category is not None:
            stmt = stmt.where(Vehicle.category == category)

        if brand:
            stmt = stmt.where(Vehicle.make.ilike(f"%{brand}%"))

        if fuel_type is not None:
            stmt = stmt.where(Vehicle.fuel_type == fuel_type)

        if transmission is not None:
            stmt = stmt.where(Vehicle.transmission == transmission)

        if seats is not None:
            stmt = stmt.where(Vehicle.seats >= seats)

        if location_id is not None:
            stmt = stmt.where(Vehicle.location_id == location_id)

        if search:
            search_pattern = f"%{search.lower()}%"
            stmt = stmt.where(
                (Vehicle.make.ilike(search_pattern))
                | (Vehicle.model.ilike(search_pattern))
                | (Vehicle.vin.ilike(search_pattern))
                | (Vehicle.license_plate.ilike(search_pattern))
            )

        # Sorting
        if sort_by == "price_asc":
            stmt = stmt.order_by(asc(Vehicle.daily_rate), asc(Vehicle.sort_order), asc(Vehicle.seats))
        elif sort_by == "price_desc":
            stmt = stmt.order_by(desc(Vehicle.daily_rate), asc(Vehicle.sort_order), asc(Vehicle.seats))
        elif sort_by == "newest":
            stmt = stmt.order_by(desc(Vehicle.year), asc(Vehicle.sort_order), asc(Vehicle.seats))
        elif sort_by == "popularity":
            stmt = stmt.order_by(asc(Vehicle.sort_order), desc(Vehicle.popularity_score), asc(Vehicle.seats))
        elif sort_by in ("capacity", "capacity_asc"):
            stmt = stmt.order_by(asc(Vehicle.sort_order), asc(Vehicle.seats), desc(Vehicle.created_at))
        else:
            # Default sequence: strictly follow required seating capacity sequence via sort_order
            stmt = stmt.order_by(asc(Vehicle.sort_order), asc(Vehicle.seats), desc(Vehicle.created_at))

        stmt = stmt.offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def count_filtered(
        self,
        *,
        min_price: Optional[Decimal] = None,
        max_price: Optional[Decimal] = None,
        category: Optional[VehicleCategoryEnum] = None,
        brand: Optional[str] = None,
        fuel_type: Optional[FuelType] = None,
        transmission: Optional[TransmissionType] = None,
        seats: Optional[int] = None,
        location_id: Optional[uuid.UUID] = None,
        available_only: bool = False,
        exclude_archived: bool = True,
        search: Optional[str] = None,
    ) -> int:
        stmt = select(func.count(Vehicle.id)).where(Vehicle.is_deleted == False)

        if exclude_archived:
            stmt = stmt.where(Vehicle.status != VehicleStatus.ARCHIVED)
        if available_only:
            stmt = stmt.where(Vehicle.status == VehicleStatus.AVAILABLE)
        if min_price is not None:
            stmt = stmt.where(Vehicle.daily_rate >= min_price)
        if max_price is not None:
            stmt = stmt.where(Vehicle.daily_rate <= max_price)
        if category is not None:
            stmt = stmt.where(Vehicle.category == category)
        if brand:
            stmt = stmt.where(Vehicle.make.ilike(f"%{brand}%"))
        if fuel_type is not None:
            stmt = stmt.where(Vehicle.fuel_type == fuel_type)
        if transmission is not None:
            stmt = stmt.where(Vehicle.transmission == transmission)
        if seats is not None:
            stmt = stmt.where(Vehicle.seats >= seats)
        if location_id is not None:
            stmt = stmt.where(Vehicle.location_id == location_id)
        if search:
            search_pattern = f"%{search.lower()}%"
            stmt = stmt.where(
                (Vehicle.make.ilike(search_pattern))
                | (Vehicle.model.ilike(search_pattern))
            )

        result = await self.db.execute(stmt)
        return result.scalar_one() or 0

    async def archive(self, vehicle_id: uuid.UUID) -> Optional[Vehicle]:
        vehicle = await self.get_by_id(vehicle_id)
        if vehicle:
            vehicle.status = VehicleStatus.ARCHIVED
            await self.db.commit()
            await self.db.refresh(vehicle)
        return vehicle


class VehicleImageRepository(BaseRepository[VehicleImage]):
    def __init__(self, db: AsyncSession):
        super().__init__(VehicleImage, db)

    async def add_image(
        self,
        *,
        vehicle_id: uuid.UUID,
        url: str,
        is_primary: bool = False,
        display_order: int = 0,
        caption: Optional[str] = None,
    ) -> VehicleImage:
        if is_primary:
            # Unset existing primary images
            await self.db.execute(
                update(VehicleImage)
                .where(VehicleImage.vehicle_id == vehicle_id)
                .values(is_primary=False)
            )

        img = VehicleImage(
            vehicle_id=vehicle_id,
            url=url,
            is_primary=is_primary,
            display_order=display_order,
            caption=caption,
        )
        self.db.add(img)
        await self.db.commit()
        await self.db.refresh(img)
        return img

    async def set_primary(self, image_id: uuid.UUID, vehicle_id: uuid.UUID) -> Optional[VehicleImage]:
        await self.db.execute(
            update(VehicleImage)
            .where(VehicleImage.vehicle_id == vehicle_id)
            .values(is_primary=False)
        )
        img = await self.get_by_id(image_id)
        if img:
            img.is_primary = True
            await self.db.commit()
            await self.db.refresh(img)
        return img


class VehicleMaintenanceRepository(BaseRepository[VehicleMaintenanceRecord]):
    def __init__(self, db: AsyncSession):
        super().__init__(VehicleMaintenanceRecord, db)

    async def list_for_vehicle(self, vehicle_id: uuid.UUID) -> Sequence[VehicleMaintenanceRecord]:
        stmt = (
            select(VehicleMaintenanceRecord)
            .where(VehicleMaintenanceRecord.vehicle_id == vehicle_id)
            .order_by(desc(VehicleMaintenanceRecord.service_date))
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()


class VehicleCategoryRepository(BaseRepository[VehicleCategoryModel]):
    def __init__(self, db: AsyncSession):
        super().__init__(VehicleCategoryModel, db)

    async def list_active(self) -> Sequence[VehicleCategoryModel]:
        stmt = (
            select(VehicleCategoryModel)
            .where(VehicleCategoryModel.is_active == True)
            .order_by(asc(VehicleCategoryModel.display_order), asc(VehicleCategoryModel.name))
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_by_slug(self, slug: str) -> Optional[VehicleCategoryModel]:
        stmt = select(VehicleCategoryModel).where(VehicleCategoryModel.slug == slug.lower())
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
