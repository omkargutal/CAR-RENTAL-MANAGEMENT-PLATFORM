from datetime import datetime
from typing import Generic, List, Optional, TypeVar
from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class BaseSchema(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )


class ResponseEnvelope(BaseSchema, Generic[T]):
    success: bool = True
    data: Optional[T] = None
    message: Optional[str] = None


class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1, description="Page number")
    page_size: int = Field(default=20, ge=1, le=100, description="Items per page")

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


class PaginatedResponse(BaseSchema, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int


class SystemHealthStatus(BaseSchema):
    status: str
    version: str
    environment: str
    database_connected: bool
    storage_connected: bool
    timestamp: datetime
