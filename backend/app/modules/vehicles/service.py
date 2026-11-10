from datetime import datetime, timezone
from decimal import Decimal
import io
from typing import Any, BinaryIO, Dict, List, Optional, Sequence, Tuple
import uuid

from app.common.services import BaseService
from app.core.exceptions import BadRequestError, ConflictError, NotFoundError
from app.interfaces.storage import StorageProvider
from app.modules.users.repository import AuditLogRepository
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
from app.modules.vehicles.repository import (
    VehicleCategoryRepository,
    VehicleImageRepository,
    VehicleMaintenanceRepository,
    VehicleRepository,
)
from app.modules.vehicles.schemas import (
    VehicleCategoryCreate,
    VehicleCreate,
    VehicleMaintenanceCreate,
    VehicleMaintenanceUpdate,
    VehiclePricingUpdate,
    VehicleUpdate,
)


class VehicleService(BaseService[Vehicle]):
    def __init__(
        self,
        repository: VehicleRepository,
        image_repo: VehicleImageRepository,
        maintenance_repo: VehicleMaintenanceRepository,
        category_repo: VehicleCategoryRepository,
        storage_provider: StorageProvider,
        audit_repo: Optional[AuditLogRepository] = None,
    ):
        super().__init__(repository)
        self.vehicle_repo = repository
        self.image_repo = image_repo
        self.maintenance_repo = maintenance_repo
        self.category_repo = category_repo
        self.storage = storage_provider
        self.audit_repo = audit_repo

    async def get_detail(self, vehicle_id: uuid.UUID) -> Vehicle:
        vehicle = await self.vehicle_repo.get_detail(vehicle_id)
        if not vehicle:
            raise NotFoundError(f"Vehicle with id {vehicle_id} not found.")
        return vehicle

    async def search_catalog(
        self,
        *,
        skip: int = 0,
        limit: int = 20,
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
    ) -> Tuple[Sequence[Vehicle], int]:
        vehicles = await self.vehicle_repo.search_and_filter(
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
            exclude_archived=exclude_archived,
            sort_by=sort_by,
            search=search,
        )
        total = await self.vehicle_repo.count_filtered(
            min_price=min_price,
            max_price=max_price,
            category=category,
            brand=brand,
            fuel_type=fuel_type,
            transmission=transmission,
            seats=seats,
            location_id=location_id,
            available_only=available_only,
            exclude_archived=exclude_archived,
            search=search,
        )
        return vehicles, total

    async def create_vehicle(
        self, payload: VehicleCreate, actor_id: Optional[uuid.UUID] = None
    ) -> Vehicle:
        existing_vin = await self.vehicle_repo.get_by_vin(payload.vin)
        if existing_vin:
            raise ConflictError(f"Vehicle with VIN {payload.vin} already exists.")

        existing_plate = await self.vehicle_repo.get_by_license_plate(payload.license_plate)
        if existing_plate:
            raise ConflictError(f"Vehicle with license plate {payload.license_plate} already exists.")

        weekly = payload.weekly_rate or (payload.daily_rate * Decimal("6.00"))
        monthly = payload.monthly_rate or (payload.daily_rate * Decimal("22.00"))

        location_id = payload.location_id
        if not location_id:
            from sqlalchemy import select
            from app.modules.locations.models import Location
            loc_stmt = select(Location.id).where(Location.is_active == True).limit(1)
            res = await self.vehicle_repo.db.execute(loc_stmt)
            location_id = res.scalar_one_or_none()
            if not location_id:
                default_loc = Location(
                    name="Headquarters Fleet Hub",
                    code="HQ-DEFAULT",
                    address="100 Enterprise Way",
                    city="New York",
                    state="NY",
                    country="US",
                    postal_code="10001",
                    is_active=True,
                )
                self.vehicle_repo.db.add(default_loc)
                await self.vehicle_repo.db.commit()
                await self.vehicle_repo.db.refresh(default_loc)
                location_id = default_loc.id

        vehicle = Vehicle(
            vin=payload.vin.upper(),
            make=payload.make,
            model=payload.model,
            year=payload.year,
            license_plate=payload.license_plate.upper(),
            category=payload.category,
            status=payload.status,
            fuel_type=payload.fuel_type,
            transmission=payload.transmission,
            seats=payload.seats,
            doors=payload.doors,
            suitcases=payload.suitcases,
            mileage=payload.mileage,
            daily_rate=payload.daily_rate,
            weekly_rate=weekly,
            monthly_rate=monthly,
            description=payload.description,
            features=payload.features,
            specs=payload.specs,
            image_url=payload.image_url,
            location_id=location_id,
            sort_order=payload.sort_order if getattr(payload, "sort_order", None) is not None else 100,
        )
        created = await self.vehicle_repo.create(vehicle)

        # Create initial images if supplied
        if payload.images:
            for idx, img_in in enumerate(payload.images):
                await self.image_repo.add_image(
                    vehicle_id=created.id,
                    url=img_in.url,
                    is_primary=img_in.is_primary or (idx == 0 and not created.image_url),
                    display_order=img_in.display_order or idx,
                    caption=img_in.caption,
                )

        if self.audit_repo:
            await self.audit_repo.log_action(
                actor_id=actor_id,
                action="vehicle.created",
                target_type="vehicle",
                target_id=str(created.id),
                details={"make": created.make, "model": created.model, "vin": created.vin},
            )

        return await self.get_detail(created.id)

    async def update_vehicle(
        self,
        vehicle_id: uuid.UUID,
        payload: VehicleUpdate,
        actor_id: Optional[uuid.UUID] = None,
    ) -> Vehicle:
        vehicle = await self.get_or_404(vehicle_id)

        update_data = payload.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if field == "license_plate" and value:
                value = value.upper()
            setattr(vehicle, field, value)

        updated = await self.vehicle_repo.update(vehicle)

        if self.audit_repo:
            await self.audit_repo.log_action(
                actor_id=actor_id,
                action="vehicle.updated",
                target_type="vehicle",
                target_id=str(vehicle_id),
                details=update_data,
            )

        return await self.get_detail(updated.id)

    async def update_availability(
        self,
        vehicle_id: uuid.UUID,
        status: VehicleStatus,
        actor_id: Optional[uuid.UUID] = None,
    ) -> Vehicle:
        """Admin-controlled availability toggle (e.g. AVAILABLE, UNAVAILABLE, MAINTENANCE).
        Decoupled from booking schedules and customer actions.
        """
        vehicle = await self.get_or_404(vehicle_id)
        old_status = vehicle.status
        vehicle.status = status

        updated = await self.vehicle_repo.update(vehicle)

        if self.audit_repo:
            await self.audit_repo.log_action(
                actor_id=actor_id,
                action="vehicle.availability_changed",
                target_type="vehicle",
                target_id=str(vehicle_id),
                details={
                    "old_status": old_status.value if hasattr(old_status, "value") else str(old_status),
                    "new_status": status.value if hasattr(status, "value") else str(status),
                },
            )

        return await self.get_detail(updated.id)

    async def archive_vehicle(
        self, vehicle_id: uuid.UUID, actor_id: Optional[uuid.UUID] = None
    ) -> Vehicle:
        vehicle = await self.vehicle_repo.archive(vehicle_id)
        if not vehicle:
            raise NotFoundError(f"Vehicle with id {vehicle_id} not found.")

        if self.audit_repo:
            await self.audit_repo.log_action(
                actor_id=actor_id,
                action="vehicle.archived",
                target_type="vehicle",
                target_id=str(vehicle_id),
            )
        return vehicle

    async def update_pricing(
        self,
        vehicle_id: uuid.UUID,
        payload: VehiclePricingUpdate,
        actor_id: Optional[uuid.UUID] = None,
    ) -> Vehicle:
        vehicle = await self.get_or_404(vehicle_id)
        vehicle.daily_rate = payload.daily_rate
        vehicle.weekly_rate = payload.weekly_rate or (payload.daily_rate * Decimal("6.00"))
        vehicle.monthly_rate = payload.monthly_rate or (payload.daily_rate * Decimal("22.00"))

        updated = await self.vehicle_repo.update(vehicle)

        if self.audit_repo:
            await self.audit_repo.log_action(
                actor_id=actor_id,
                action="vehicle.pricing_updated",
                target_type="vehicle",
                target_id=str(vehicle_id),
                details={
                    "daily": str(vehicle.daily_rate),
                    "weekly": str(vehicle.weekly_rate),
                    "monthly": str(vehicle.monthly_rate),
                },
            )
        return updated

    async def upload_vehicle_image(
        self,
        vehicle_id: uuid.UUID,
        file_obj: BinaryIO,
        filename: str,
        content_type: str = "image/jpeg",
        is_primary: bool = False,
        caption: Optional[str] = None,
    ) -> VehicleImage:
        vehicle = await self.get_or_404(vehicle_id)

        # 1. Validate file extension
        allowed_extensions = {"jpg", "jpeg", "png", "webp"}
        ext = filename.split(".")[-1].lower() if "." in filename else ""
        if ext not in allowed_extensions:
            raise BadRequestError(
                f"Invalid file extension '.{ext}'. Allowed extensions: {', '.join(allowed_extensions)}"
            )

        # 2. Validate MIME type
        allowed_mime_types = {"image/jpeg", "image/png", "image/webp"}
        if content_type.lower() not in allowed_mime_types:
            raise BadRequestError(
                f"Invalid MIME type '{content_type}'. Allowed types: {', '.join(allowed_mime_types)}"
            )

        # 3. Read header bytes for magic number validation and check file size
        max_size_bytes = 5 * 1024 * 1024  # 5 MB
        file_obj.seek(0, io.SEEK_END)
        file_size = file_obj.tell()
        file_obj.seek(0)

        if file_size == 0:
            raise BadRequestError("Uploaded file is empty.")
        if file_size > max_size_bytes:
            raise BadRequestError(
                f"File size ({file_size / (1024*1024):.2f} MB) exceeds maximum allowed limit of 5 MB."
            )

        header = file_obj.read(16)
        file_obj.seek(0)

        is_valid_magic = False
        if header.startswith(b"\xff\xd8\xff"):  # JPEG
            is_valid_magic = True
        elif header.startswith(b"\x89PNG\r\n\x1a\n"):  # PNG
            is_valid_magic = True
        elif header.startswith(b"RIFF") and len(header) >= 12 and header[8:12] == b"WEBP":  # WEBP
            is_valid_magic = True

        if not is_valid_magic:
            raise BadRequestError(
                "File content does not match a valid image format (JPEG, PNG, WEBP)."
            )

        destination_path = f"vehicles/{vehicle_id}/{uuid.uuid4().hex}.{ext}"

        # Upload via provider-independent storage interface
        public_url = await self.storage.upload_file(
            file_obj=file_obj,
            destination_path=destination_path,
            content_type=content_type,
        )

        image = await self.image_repo.add_image(
            vehicle_id=vehicle.id,
            url=public_url,
            is_primary=is_primary,
            caption=caption,
        )

        if is_primary or not vehicle.image_url:
            vehicle.image_url = public_url
            await self.vehicle_repo.update(vehicle)

        return image

    async def set_primary_image(self, vehicle_id: uuid.UUID, image_id: uuid.UUID) -> VehicleImage:
        vehicle = await self.get_or_404(vehicle_id)
        img = await self.image_repo.set_primary(image_id, vehicle.id)
        if not img:
            raise NotFoundError(f"Image {image_id} not found.")

        vehicle.image_url = img.url
        await self.vehicle_repo.update(vehicle)
        return img

    async def delete_image(self, image_id: uuid.UUID) -> bool:
        img = await self.image_repo.get_by_id(image_id)
        if not img:
            raise NotFoundError(f"Image {image_id} not found.")

        # Attempt to delete file from object storage
        try:
            parsed_path = img.url.split("/")[-1]
            await self.storage.delete_file(f"vehicles/{img.vehicle_id}/{parsed_path}")
        except Exception:
            pass

        await self.image_repo.delete(img)
        return True

    async def add_maintenance_record(
        self,
        vehicle_id: uuid.UUID,
        payload: VehicleMaintenanceCreate,
        actor_id: Optional[uuid.UUID] = None,
    ) -> VehicleMaintenanceRecord:
        vehicle = await self.get_or_404(vehicle_id)

        record = VehicleMaintenanceRecord(
            vehicle_id=vehicle.id,
            service_type=payload.service_type,
            description=payload.description,
            cost=payload.cost,
            service_date=payload.service_date,
            performed_by=payload.performed_by,
            mileage_at_service=payload.mileage_at_service or vehicle.mileage,
            is_completed=False,
        )
        self.maintenance_repo.db.add(record)
        await self.maintenance_repo.db.commit()
        await self.maintenance_repo.db.refresh(record)

        # Important Rule: Under-maintenance vehicles must not be bookable!
        if payload.set_vehicle_in_maintenance:
            vehicle.status = VehicleStatus.MAINTENANCE
            await self.vehicle_repo.update(vehicle)

        if self.audit_repo:
            await self.audit_repo.log_action(
                actor_id=actor_id,
                action="vehicle.maintenance_scheduled",
                target_type="vehicle",
                target_id=str(vehicle.id),
                details={"service_type": payload.service_type},
            )

        return record

    async def update_maintenance_record(
        self,
        record_id: uuid.UUID,
        payload: VehicleMaintenanceUpdate,
        actor_id: Optional[uuid.UUID] = None,
    ) -> VehicleMaintenanceRecord:
        record = await self.maintenance_repo.get_by_id(record_id)
        if not record:
            raise NotFoundError(f"Maintenance record with id {record_id} not found.")

        update_data = payload.model_dump(exclude_unset=True)
        set_available = update_data.pop("set_vehicle_available", None)

        for field, value in update_data.items():
            setattr(record, field, value)

        await self.maintenance_repo.update(record)

        # Restore vehicle availability if maintenance completed
        if set_available or (record.is_completed and set_available is not False):
            vehicle = await self.vehicle_repo.get_by_id(record.vehicle_id)
            if vehicle and vehicle.status == VehicleStatus.MAINTENANCE:
                vehicle.status = VehicleStatus.AVAILABLE
                await self.vehicle_repo.update(vehicle)

        return record

    async def list_maintenance_records(
        self, vehicle_id: uuid.UUID
    ) -> Sequence[VehicleMaintenanceRecord]:
        await self.get_or_404(vehicle_id)
        return await self.maintenance_repo.list_for_vehicle(vehicle_id)

    async def list_categories(self) -> Sequence[VehicleCategoryModel]:
        categories = await self.category_repo.list_active()
        if not categories:
            defaults = [
                ("Sedan", "sedan", "Comfortable sedans for city and outstation travel"),
                ("SUV", "suv", "Spacious crossovers and adventure SUVs"),
                ("Van / MUV / Coach", "van", "Family MUVs, Tempo Travellers, and luxury tour coaches"),
                ("Luxury", "luxury", "Prestige, executive and high-performance vehicles"),
            ]
            for order, (name, slug, desc) in enumerate(defaults):
                cat = VehicleCategoryModel(
                    name=name,
                    slug=slug,
                    description=desc,
                    display_order=order,
                    is_active=True,
                )
                self.category_repo.db.add(cat)
            await self.category_repo.db.commit()
            categories = await self.category_repo.list_active()
        return categories

    async def create_category(self, payload: VehicleCategoryCreate) -> VehicleCategoryModel:
        existing_slug = await self.category_repo.get_by_slug(payload.slug)
        if existing_slug:
            raise ConflictError(f"Category with slug '{payload.slug}' already exists.")

        from sqlalchemy import select
        name_stmt = select(VehicleCategoryModel).where(VehicleCategoryModel.name == payload.name)
        res = await self.category_repo.db.execute(name_stmt)
        if res.scalar_one_or_none():
            raise ConflictError(f"Category with name '{payload.name}' already exists.")

        cat = VehicleCategoryModel(
            name=payload.name,
            slug=payload.slug.lower(),
            description=payload.description,
            icon=payload.icon,
            display_order=payload.display_order,
            is_active=payload.is_active,
        )
        return await self.category_repo.create(cat)

    async def get_rental_history(self, vehicle_id: uuid.UUID) -> List[Dict[str, Any]]:
        await self.get_or_404(vehicle_id)
        from sqlalchemy import text
        stmt = text(
            "SELECT id, booking_reference, start_datetime, end_datetime, total_days, total_amount, status, created_at "
            "FROM bookings WHERE vehicle_id = :vid ORDER BY start_datetime DESC LIMIT 50"
        )
        res = await self.vehicle_repo.db.execute(stmt, {"vid": vehicle_id})
        rows = res.mappings().all()
        return [dict(r) for r in rows]
