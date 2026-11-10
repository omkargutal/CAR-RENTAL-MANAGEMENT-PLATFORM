from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Sequence
import uuid
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.repositories import BaseRepository
from app.modules.users.models import AuditLog, User, UserRole


class UserRepository(BaseRepository[User]):
    def __init__(self, db: AsyncSession):
        super().__init__(User, db)

    async def get_by_email(self, email: str) -> Optional[User]:
        stmt = select(User).where(User.email == email.lower(), User.is_deleted == False)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_users(
        self,
        *,
        skip: int = 0,
        limit: int = 50,
        role: Optional[UserRole] = None,
        search: Optional[str] = None,
    ) -> Sequence[User]:
        stmt = select(User).where(User.is_deleted == False)
        if role:
            stmt = stmt.where(User.role == role)
        if search:
            search_term = f"%{search.lower()}%"
            stmt = stmt.where(
                (User.email.ilike(search_term)) | (User.full_name.ilike(search_term))
            )
        stmt = stmt.order_by(desc(User.created_at)).offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def increment_failed_login(self, user: User, max_attempts: int, lockout_minutes: int) -> User:
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= max_attempts:
            from datetime import timedelta
            user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=lockout_minutes)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def reset_failed_login(self, user: User) -> User:
        if user.failed_login_attempts > 0 or user.locked_until is not None:
            user.failed_login_attempts = 0
            user.locked_until = None
            await self.db.commit()
            await self.db.refresh(user)
        return user


class AuditLogRepository(BaseRepository[AuditLog]):
    def __init__(self, db: AsyncSession):
        super().__init__(AuditLog, db)

    async def log_action(
        self,
        *,
        actor_id: Optional[uuid.UUID],
        action: str,
        target_type: str,
        target_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
    ) -> AuditLog:
        log_entry = AuditLog(
            actor_id=actor_id,
            action=action,
            target_type=target_type,
            target_id=str(target_id) if target_id else None,
            details=details,
            ip_address=ip_address,
        )
        self.db.add(log_entry)
        await self.db.commit()
        await self.db.refresh(log_entry)
        return log_entry

    async def list_recent_logs(
        self,
        *,
        skip: int = 0,
        limit: int = 50,
        target_type: Optional[str] = None,
        actor_id: Optional[uuid.UUID] = None,
    ) -> Sequence[AuditLog]:
        stmt = select(AuditLog)
        if target_type:
            stmt = stmt.where(AuditLog.target_type == target_type)
        if actor_id:
            stmt = stmt.where(AuditLog.actor_id == actor_id)
        stmt = stmt.order_by(desc(AuditLog.created_at)).offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return result.scalars().all()
