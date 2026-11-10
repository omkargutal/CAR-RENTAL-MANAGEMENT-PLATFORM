from typing import Any, Generic, List, Optional, Sequence, TypeVar
from app.common.repositories import BaseRepository
from app.core.exceptions import NotFoundError

ModelType = TypeVar("ModelType")


class BaseService(Generic[ModelType]):
    """
    Standard base service layer encapsulating business transactions, validations,
    and business rule enforcement.
    """
    def __init__(self, repository: BaseRepository[ModelType]):
        self.repository = repository

    async def get_or_404(self, id: Any) -> ModelType:
        item = await self.repository.get_by_id(id)
        if not item:
            raise NotFoundError(f"{self.repository.model.__name__} with ID {id} was not found.")
        return item

    async def get(self, id: Any) -> Optional[ModelType]:
        return await self.repository.get_by_id(id)

    async def list(self, skip: int = 0, limit: int = 100) -> Sequence[ModelType]:
        return await self.repository.list(skip=skip, limit=limit)
