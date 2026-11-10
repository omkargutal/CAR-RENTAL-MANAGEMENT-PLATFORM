import uuid
from typing import Sequence
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.common.repositories import BaseRepository
from app.modules.reviews.models import Review


class ReviewRepository(BaseRepository[Review]):
    def __init__(self, db: AsyncSession):
        super().__init__(Review, db)

    async def list_by_vehicle(
        self, vehicle_id: uuid.UUID, skip: int = 0, limit: int = 50
    ) -> Sequence[Review]:
        stmt = (
            select(Review)
            .where(
                Review.vehicle_id == vehicle_id,
                Review.is_published == True,
                Review.is_deleted == False,
            )
            .order_by(Review.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()
