from typing import Any, List, Optional, Sequence
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.common.repositories import BaseRepository
from app.modules.locations.models import Location


class LocationRepository(BaseRepository[Location]):
    def __init__(self, db: AsyncSession):
        super().__init__(Location, db)

    async def get_by_code(self, code: str) -> Optional[Location]:
        stmt = select(Location).where(
            Location.code == code.upper(), Location.is_deleted == False
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list(
        self,
        *,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[List[Any]] = None,
    ) -> Sequence[Location]:
        stmt = select(Location).where(Location.is_deleted == False)
        if filters:
            for condition in filters:
                stmt = stmt.where(condition)
        stmt = stmt.order_by(desc(Location.created_at)).offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return result.scalars().all()
