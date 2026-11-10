from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.modules.whatsapp.service import WhatsAppService


def get_whatsapp_service(db: AsyncSession = Depends(get_db)) -> WhatsAppService:
    return WhatsAppService(db)
