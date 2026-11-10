from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Sequence
import uuid

from app.common.services import BaseService
from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.core.security import get_password_hash
from app.modules.users.models import AuditLog, User, UserRole
from app.modules.users.repository import AuditLogRepository, UserRepository
from app.modules.users.schemas import (
    UserAdminUpdate,
    UserCreate,
    UserDocumentsUpdate,
    UserProfileUpdate,
    UserRoleUpdate,
    UserStatusUpdate,
)


class UserService(BaseService[User]):
    def __init__(self, repository: UserRepository, audit_repo: Optional[AuditLogRepository] = None):
        super().__init__(repository)
        self.user_repo = repository
        self.audit_repo = audit_repo

    async def get_by_email(self, email: str) -> Optional[User]:
        return await self.user_repo.get_by_email(email)

    async def create_user(self, payload: UserCreate) -> User:
        existing = await self.user_repo.get_by_email(payload.email)
        if existing:
            raise ConflictError(f"User with email {payload.email} already exists.")

        user = User(
            email=payload.email.lower(),
            hashed_password=get_password_hash(payload.password),
            full_name=payload.full_name,
            role=payload.role,
            is_active=payload.is_active,
            phone_number=payload.phone_number,
            documents={},
            failed_login_attempts=0,
        )
        created_user = await self.user_repo.create(user)
        if self.audit_repo:
            await self.audit_repo.log_action(
                actor_id=created_user.id,
                action="user.registered",
                target_type="user",
                target_id=str(created_user.id),
                details={"email": created_user.email, "role": created_user.role.value},
            )
        return created_user

    async def update_profile(self, user_id: uuid.UUID, payload: UserProfileUpdate) -> User:
        """
        Customer profile update. Specifically prevents modifying roles, statuses, or credentials.
        """
        user = await self.get_or_404(user_id)
        if payload.full_name is not None:
            user.full_name = payload.full_name
        if payload.phone_number is not None:
            user.phone_number = payload.phone_number
        return await self.user_repo.update(user)

    async def update_documents(self, user_id: uuid.UUID, payload: UserDocumentsUpdate) -> User:
        """
        Allows customers to manage their own driving license details and uploaded verification docs.
        """
        user = await self.get_or_404(user_id)
        current_docs = dict(user.documents or {})
        for field, value in payload.model_dump(exclude_unset=True).items():
            if value is not None:
                current_docs[field] = value
        user.documents = current_docs
        return await self.user_repo.update(user)

    async def admin_change_role(
        self,
        target_user_id: uuid.UUID,
        payload: UserRoleUpdate,
        actor: User,
        ip_address: Optional[str] = None,
    ) -> User:
        """
        Admins can elevate or change a user's role.
        Enforces rule: Users cannot change their own role!
        """
        if actor.id == target_user_id:
            raise ForbiddenError("Administrators cannot change their own role.")

        user = await self.get_or_404(target_user_id)
        old_role = user.role.value
        user.role = payload.role
        updated_user = await self.user_repo.update(user)

        if self.audit_repo:
            await self.audit_repo.log_action(
                actor_id=actor.id,
                action="user.role_changed",
                target_type="user",
                target_id=str(target_user_id),
                details={
                    "old_role": old_role,
                    "new_role": payload.role.value,
                    "reason": payload.reason,
                },
                ip_address=ip_address,
            )

        return updated_user

    async def admin_change_status(
        self,
        target_user_id: uuid.UUID,
        payload: UserStatusUpdate,
        actor: User,
        ip_address: Optional[str] = None,
    ) -> User:
        """
        Activate or deactivate a user account with audit logging.
        Users cannot deactivate themselves.
        """
        if actor.id == target_user_id:
            raise ForbiddenError("Administrators cannot change their own active status.")

        user = await self.get_or_404(target_user_id)
        user.is_active = payload.is_active
        updated_user = await self.user_repo.update(user)

        if self.audit_repo:
            await self.audit_repo.log_action(
                actor_id=actor.id,
                action="user.status_changed",
                target_type="user",
                target_id=str(target_user_id),
                details={"is_active": payload.is_active, "reason": payload.reason},
                ip_address=ip_address,
            )

        return updated_user

    async def list_users(
        self,
        *,
        skip: int = 0,
        limit: int = 50,
        role: Optional[UserRole] = None,
        search: Optional[str] = None,
    ) -> Sequence[User]:
        return await self.user_repo.list_users(skip=skip, limit=limit, role=role, search=search)

    async def get_audit_logs(
        self,
        *,
        skip: int = 0,
        limit: int = 50,
        target_type: Optional[str] = None,
    ) -> Sequence[AuditLog]:
        if not self.audit_repo:
            return []
        return await self.audit_repo.list_recent_logs(skip=skip, limit=limit, target_type=target_type)
