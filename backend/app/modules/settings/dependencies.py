from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.modules.settings.service import BusinessSettingsService


async def get_settings_service(db: AsyncSession = Depends(get_db)) -> BusinessSettingsService:
    return BusinessSettingsService(db)
