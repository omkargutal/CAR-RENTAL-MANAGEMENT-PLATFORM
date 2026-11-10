from typing import Callable, List, Optional, Tuple
import uuid
from fastapi import Cookie, Depends, Header, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import decode_access_token
from app.modules.auth.repository import (
    EmailVerificationRepository,
    PasswordResetRepository,
    UserSessionRepository,
)
from app.modules.auth.service import AuthService
from app.modules.users.dependencies import get_audit_repository, get_user_service
from app.modules.users.models import User, UserRole
from app.modules.users.repository import AuditLogRepository
from app.modules.users.service import UserService

bearer_security = HTTPBearer(auto_error=False)


def get_session_repository(db: AsyncSession = Depends(get_db)) -> UserSessionRepository:
    return UserSessionRepository(db)


def get_reset_repository(db: AsyncSession = Depends(get_db)) -> PasswordResetRepository:
    return PasswordResetRepository(db)


def get_verification_repository(db: AsyncSession = Depends(get_db)) -> EmailVerificationRepository:
    return EmailVerificationRepository(db)


def get_auth_service(
    user_service: UserService = Depends(get_user_service),
    session_repo: UserSessionRepository = Depends(get_session_repository),
    reset_repo: PasswordResetRepository = Depends(get_reset_repository),
    verification_repo: EmailVerificationRepository = Depends(get_verification_repository),
    audit_repo: AuditLogRepository = Depends(get_audit_repository),
) -> AuthService:
    return AuthService(
        user_service=user_service,
        session_repo=session_repo,
        reset_repo=reset_repo,
        verification_repo=verification_repo,
        audit_repo=audit_repo,
    )


def extract_client_info(request: Request) -> Tuple[Optional[str], Optional[str]]:
    """Extract client IP and User-Agent headers safely."""
    ip_address = request.headers.get("X-Forwarded-For")
    if ip_address:
        ip_address = ip_address.split(",")[0].strip()
    else:
        ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("User-Agent")
    return ip_address, user_agent


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_security),
    user_service: UserService = Depends(get_user_service),
) -> User:
    if not credentials or not credentials.credentials:
        raise UnauthorizedError("Authentication credentials were not provided.")

    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise UnauthorizedError("Invalid or expired authentication token.")

    try:
        user_id = uuid.UUID(payload["sub"])
    except (ValueError, TypeError):
        raise UnauthorizedError("Malformed subject in token.")

    user = await user_service.get(user_id)
    if not user:
        raise UnauthorizedError("User matching this token does not exist.")
    if not user.is_active or user.is_deleted:
        raise ForbiddenError("User account is inactive or deleted.")

    return user


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_security),
    user_service: UserService = Depends(get_user_service),
) -> Optional[User]:
    if not credentials or not credentials.credentials:
        return None

    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        return None

    try:
        user_id = uuid.UUID(payload["sub"])
    except (ValueError, TypeError):
        return None

    user = await user_service.get(user_id)
    if not user or not user.is_active or user.is_deleted:
        return None

    return user


def require_roles(*allowed_roles: UserRole) -> Callable[[User], User]:
    """Dependency factory checking that current user possesses one of the specified roles."""
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise ForbiddenError(
                f"Access denied. Requires one of roles: {[r.value for r in allowed_roles]}."
            )
        return current_user
    return role_checker


# Role shortcut dependencies
require_admin = require_roles(UserRole.ADMIN)
require_staff_or_admin = require_roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
require_customer = require_roles(UserRole.CUSTOMER, UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN)
