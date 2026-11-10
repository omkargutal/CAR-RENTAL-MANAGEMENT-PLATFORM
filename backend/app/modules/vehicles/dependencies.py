from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.integrations.storage_minio import get_storage_provider
from app.interfaces.storage import StorageProvider
from app.modules.users.dependencies import get_audit_repository
from app.modules.users.repository import AuditLogRepository
from app.modules.vehicles.repository import (
    VehicleCategoryRepository,
    VehicleImageRepository,
    VehicleMaintenanceRepository,
    VehicleRepository,
)
from app.modules.vehicles.service import VehicleService


def get_vehicle_repository(db: AsyncSession = Depends(get_db)) -> VehicleRepository:
    return VehicleRepository(db)


def get_vehicle_image_repository(db: AsyncSession = Depends(get_db)) -> VehicleImageRepository:
    return VehicleImageRepository(db)


def get_vehicle_maintenance_repository(db: AsyncSession = Depends(get_db)) -> VehicleMaintenanceRepository:
    return VehicleMaintenanceRepository(db)


def get_vehicle_category_repository(db: AsyncSession = Depends(get_db)) -> VehicleCategoryRepository:
    return VehicleCategoryRepository(db)


def get_vehicle_service(
    repo: VehicleRepository = Depends(get_vehicle_repository),
    image_repo: VehicleImageRepository = Depends(get_vehicle_image_repository),
    maint_repo: VehicleMaintenanceRepository = Depends(get_vehicle_maintenance_repository),
    cat_repo: VehicleCategoryRepository = Depends(get_vehicle_category_repository),
    storage: StorageProvider = Depends(get_storage_provider),
    audit_repo: AuditLogRepository = Depends(get_audit_repository),
) -> VehicleService:
    return VehicleService(
        repository=repo,
        image_repo=image_repo,
        maintenance_repo=maint_repo,
        category_repo=cat_repo,
        storage_provider=storage,
        audit_repo=audit_repo,
    )
