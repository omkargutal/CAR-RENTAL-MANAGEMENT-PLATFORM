from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.modules.customers.repository import CustomerRepository
from app.modules.customers.service import CustomerService


def get_customer_repository(
    db: AsyncSession = Depends(get_db),
) -> CustomerRepository:
    return CustomerRepository(db)


def get_customer_service(
    repo: CustomerRepository = Depends(get_customer_repository),
) -> CustomerService:
    return CustomerService(repo)
