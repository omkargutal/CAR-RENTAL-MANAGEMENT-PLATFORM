from typing import Any, Generic, List, Optional, Sequence, Type, TypeVar
import uuid
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.common.models import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """
    Standard generic repository providing decoupled data-access patterns.
    Keeps all SQLAlchemy queries outside of services and API routes.
    """
    def __init__(self, model: Type[ModelType], db: AsyncSession):
        self.model = model
        self.db = db

    async def get_by_id(self, id: Any) -> Optional[ModelType]:
        stmt = select(self.model).where(self.model.id == id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list(
        self,
        *,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[List[Any]] = None,
    ) -> Sequence[ModelType]:
        stmt = select(self.model)
        if filters:
            for condition in filters:
                stmt = stmt.where(condition)
        if hasattr(self.model, "created_at"):
            stmt = stmt.order_by(self.model.created_at.desc())
        stmt = stmt.offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def count(self, filters: Optional[List[Any]] = None) -> int:
        stmt = select(func.count()).select_from(self.model)
        if filters:
            for condition in filters:
                stmt = stmt.where(condition)
        result = await self.db.execute(stmt)
        return result.scalar_one() or 0

    async def create(self, instance: ModelType) -> ModelType:
        self.db.add(instance)
        await self.db.commit()
        await self.db.refresh(instance)
        return instance

    async def update(self, instance: ModelType) -> ModelType:
        await self.db.commit()
        await self.db.refresh(instance)
        return instance

    async def delete(self, instance: ModelType) -> None:
        await self.db.delete(instance)
        await self.db.commit()
