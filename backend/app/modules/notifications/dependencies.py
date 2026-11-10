from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.integrations.notification_stub import get_notification_provider
from app.interfaces.notification import NotificationProvider
from app.modules.notifications.repository import NotificationRepository
from app.modules.notifications.service import NotificationService


def get_notification_repository(
    db: AsyncSession = Depends(get_db),
) -> NotificationRepository:
    return NotificationRepository(db)


def get_notification_service(
    repo: NotificationRepository = Depends(get_notification_repository),
    provider: NotificationProvider = Depends(get_notification_provider),
) -> NotificationService:
    return NotificationService(repo, provider)
