import uuid
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.common.repositories import BaseRepository
from app.modules.customers.models import Customer


class CustomerRepository(BaseRepository[Customer]):
    def __init__(self, db: AsyncSession):
        super().__init__(Customer, db)

    async def get_by_user_id(self, user_id: uuid.UUID) -> Optional[Customer]:
        stmt = select(Customer).where(
            Customer.user_id == user_id, Customer.is_deleted == False
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_license(self, license_number: str) -> Optional[Customer]:
        stmt = select(Customer).where(
            Customer.driver_license_number == license_number,
            Customer.is_deleted == False,
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
