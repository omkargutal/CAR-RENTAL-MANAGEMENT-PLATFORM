from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.modules.users.repository import AuditLogRepository, UserRepository
from app.modules.users.service import UserService


def get_user_repository(db: AsyncSession = Depends(get_db)) -> UserRepository:
    return UserRepository(db)


def get_audit_repository(db: AsyncSession = Depends(get_db)) -> AuditLogRepository:
    return AuditLogRepository(db)


def get_user_service(
    repo: UserRepository = Depends(get_user_repository),
    audit_repo: AuditLogRepository = Depends(get_audit_repository),
) -> UserService:
    return UserService(repo, audit_repo)
