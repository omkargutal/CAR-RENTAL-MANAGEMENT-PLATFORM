from typing import Optional, Sequence
import uuid
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.common.repositories import BaseRepository
from app.modules.notifications.models import Notification


class NotificationRepository(BaseRepository[Notification]):
    def __init__(self, db: AsyncSession):
        super().__init__(Notification, db)

    async def list_by_recipient(
        self, recipient: str, skip: int = 0, limit: int = 50
    ) -> Sequence[Notification]:
        stmt = (
            select(Notification)
            .where(
                Notification.recipient == recipient,
                Notification.is_deleted == False,
            )
            .order_by(Notification.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def count_unread_by_recipient(self, recipient: str) -> int:
        stmt = (
            select(func.count())
            .select_from(Notification)
            .where(
                Notification.recipient == recipient,
                Notification.is_read == False,
                Notification.is_deleted == False,
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar() or 0

    async def mark_as_read(self, notification_id: uuid.UUID) -> Optional[Notification]:
        notif = await self.get_by_id(notification_id)
        if notif:
            notif.is_read = True
            await self.db.commit()
            await self.db.refresh(notif)
        return notif

    async def mark_all_as_read(self, recipient: str) -> int:
        stmt = (
            update(Notification)
            .where(
                Notification.recipient == recipient,
                Notification.is_read == False,
                Notification.is_deleted == False,
            )
            .values(is_read=True)
        )
        result = await self.db.execute(stmt)
        await self.db.commit()
        return result.rowcount

