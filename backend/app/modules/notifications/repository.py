from typing import Sequence
from sqlalchemy import select
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
