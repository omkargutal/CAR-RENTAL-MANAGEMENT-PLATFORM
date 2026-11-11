import uuid
from typing import Optional
from app.common.services import BaseService
from app.interfaces.notification import NotificationProvider
from app.modules.notifications.models import (
    Notification,
    NotificationChannel,
    NotificationStatus,
)
from app.modules.notifications.repository import NotificationRepository
from app.modules.notifications.schemas import NotificationCreate


class NotificationService(BaseService[Notification]):
    def __init__(
        self,
        repository: NotificationRepository,
        provider: NotificationProvider,
    ):
        super().__init__(repository)
        self.notif_repo = repository
        self.provider = provider

    async def send_notification(self, payload: NotificationCreate) -> Notification:
        notif = Notification(
            recipient=payload.recipient,
            channel=payload.channel,
            subject=payload.subject,
            message=payload.message,
            link_url=payload.link_url,
            is_read=False,
            status=NotificationStatus.PENDING,
        )
        saved = await self.notif_repo.create(notif)

        if payload.channel == NotificationChannel.EMAIL:
            res = await self.provider.send_email(
                recipient=payload.recipient,
                subject=payload.subject,
                body_text=payload.message,
            )
        elif payload.channel == NotificationChannel.SMS:
            res = await self.provider.send_sms(
                phone_number=payload.recipient,
                message=payload.message,
            )
        else:
            # in_app
            res = None

        if res is None or res.success:
            saved.status = NotificationStatus.SENT
        else:
            saved.status = NotificationStatus.FAILED
            saved.error_detail = res.error

        return await self.notif_repo.update(saved)

    async def get_unread_count(self, recipient: str) -> int:
        return await self.notif_repo.count_unread_by_recipient(recipient)

    async def mark_as_read(self, notification_id: uuid.UUID) -> Optional[Notification]:
        return await self.notif_repo.mark_as_read(notification_id)

    async def mark_all_as_read(self, recipient: str) -> int:
        return await self.notif_repo.mark_all_as_read(recipient)

