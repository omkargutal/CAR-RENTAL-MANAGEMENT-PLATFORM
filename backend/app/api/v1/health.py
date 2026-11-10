from datetime import datetime, timezone
from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from app.common.schemas import ResponseEnvelope, SystemHealthStatus
from app.core.config import settings
from app.core.database import check_database_connection
from app.integrations.storage_minio import get_storage_provider
from app.interfaces.storage import StorageProvider

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("", response_model=ResponseEnvelope[SystemHealthStatus])
async def get_system_health(
    storage: StorageProvider = Depends(get_storage_provider),
):
    db_ok = await check_database_connection()
    storage_ok = await storage.ping()
    overall = "healthy" if (db_ok and storage_ok) else "degraded"

    data = SystemHealthStatus(
        status=overall,
        version="1.0.0",
        environment=settings.ENVIRONMENT,
        database_connected=db_ok,
        storage_connected=storage_ok,
        timestamp=datetime.now(timezone.utc),
    )
    status_code = status.HTTP_200_OK if overall == "healthy" else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(
        status_code=status_code,
        content=ResponseEnvelope(data=data.model_dump(mode="json")).model_dump(mode="json"),
    )
