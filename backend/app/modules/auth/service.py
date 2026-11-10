from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple
import uuid

from app.core.config import settings
from app.core.exceptions import BadRequestError, ConflictError, ForbiddenError, NotFoundError, UnauthorizedError
from app.core.security import (
    create_access_token,
    generate_secure_token,
    get_password_hash,
    hash_token,
    verify_password,
)
from app.modules.auth.repository import (
    EmailVerificationRepository,
    PasswordResetRepository,
    UserSessionRepository,
)
from app.modules.auth.schemas import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    SessionRead,
    Token,
)
from app.modules.users.models import User, UserRole
from app.modules.users.repository import AuditLogRepository, UserRepository
from app.modules.users.schemas import UserCreate, UserRead
from app.modules.users.service import UserService


class AuthService:
    def __init__(
        self,
        user_service: UserService,
        session_repo: UserSessionRepository,
        reset_repo: PasswordResetRepository,
        verification_repo: EmailVerificationRepository,
        audit_repo: Optional[AuditLogRepository] = None,
    ):
        self.user_service = user_service
        self.session_repo = session_repo
        self.reset_repo = reset_repo
        self.verification_repo = verification_repo
        self.audit_repo = audit_repo

    async def _create_user_session(
        self,
        user_id: uuid.UUID,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Tuple[str, datetime]:
        """Generate high-entropy refresh token and store SHA-256 hash in database."""
        raw_refresh_token = generate_secure_token(32)
        token_hash = hash_token(raw_refresh_token)
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        await self.session_repo.create_session(
            user_id=user_id,
            refresh_token_hash=token_hash,
            expires_at=expires_at,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        return raw_refresh_token, expires_at

    async def authenticate(
        self,
        credentials: LoginRequest,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Tuple[Token, str]:
        user = await self.user_service.get_by_email(credentials.email)
        now = datetime.now(timezone.utc)

        # Check account lockout before verifying credentials
        if user and user.locked_until and user.locked_until > now:
            remaining = int((user.locked_until - now).total_seconds() // 60) + 1
            raise UnauthorizedError(
                f"Account is temporarily locked due to multiple failed login attempts. "
                f"Please try again in {remaining} minute(s)."
            )

        if not user or not verify_password(credentials.password, user.hashed_password):
            if user:
                await self.user_service.user_repo.increment_failed_login(
                    user,
                    max_attempts=settings.LOGIN_MAX_FAILED_ATTEMPTS,
                    lockout_minutes=settings.LOGIN_LOCKOUT_MINUTES,
                )
            raise UnauthorizedError("Incorrect email or password.")

        if not user.is_active:
            raise UnauthorizedError("User account is inactive. Please contact support.")

        # Successful credential check: reset failed attempts
        await self.user_service.user_repo.reset_failed_login(user)

        # Generate short-lived JWT access token
        access_token_str = create_access_token(
            subject=str(user.id),
            extra_claims={"email": user.email, "role": user.role.value},
        )

        # Generate secure refresh token session
        raw_refresh_token, _ = await self._create_user_session(
            user.id, ip_address=ip_address, user_agent=user_agent
        )

        if self.audit_repo:
            await self.audit_repo.log_action(
                actor_id=user.id,
                action="auth.login",
                target_type="user",
                target_id=str(user.id),
                details={"email": user.email},
                ip_address=ip_address,
            )

        token_response = Token(
            access_token=access_token_str,
            token_type="bearer",
            expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
            refresh_token=raw_refresh_token,
            user=UserRead.model_validate(user),
        )
        return token_response, raw_refresh_token

    async def register(
        self,
        payload: RegisterRequest,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Tuple[Token, str, str]:
        created_user = await self.user_service.create_user(
            UserCreate(
                email=payload.email,
                password=payload.password,
                full_name=payload.full_name,
                role=UserRole.CUSTOMER,
                phone_number=payload.phone_number,
            )
        )

        # Create email verification token
        raw_verify_token = generate_secure_token(32)
        verify_token_hash = hash_token(raw_verify_token)
        verify_expiry = datetime.now(timezone.utc) + timedelta(
            hours=settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS
        )
        await self.verification_repo.create_token(
            user_id=created_user.id,
            token_hash=verify_token_hash,
            expires_at=verify_expiry,
        )

        # Generate tokens and initial session
        access_token_str = create_access_token(
            subject=str(created_user.id),
            extra_claims={"email": created_user.email, "role": created_user.role.value},
        )
        raw_refresh_token, _ = await self._create_user_session(
            created_user.id, ip_address=ip_address, user_agent=user_agent
        )

        token_response = Token(
            access_token=access_token_str,
            token_type="bearer",
            expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
            refresh_token=raw_refresh_token,
            user=UserRead.model_validate(created_user),
        )
        return token_response, raw_refresh_token, raw_verify_token

    async def refresh_session(
        self,
        refresh_token_str: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Tuple[Token, str]:
        token_hash = hash_token(refresh_token_str)
        session = await self.session_repo.get_active_session_by_hash(token_hash)
        if not session:
            raise UnauthorizedError("Invalid or expired session. Please log in again.")

        user = await self.user_service.get(session.user_id)
        if not user or not user.is_active or user.is_deleted:
            raise UnauthorizedError("User account is disabled or no longer exists.")

        # Rotate refresh token: revoke current session
        await self.session_repo.revoke_session_by_hash(token_hash)

        # Issue new access token and rotated refresh token
        new_access_token = create_access_token(
            subject=str(user.id),
            extra_claims={"email": user.email, "role": user.role.value},
        )
        new_refresh_token, _ = await self._create_user_session(
            user.id, ip_address=ip_address, user_agent=user_agent
        )

        token_response = Token(
            access_token=new_access_token,
            token_type="bearer",
            expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
            refresh_token=new_refresh_token,
            user=UserRead.model_validate(user),
        )
        return token_response, new_refresh_token

    async def logout(self, refresh_token_str: Optional[str]) -> bool:
        if not refresh_token_str:
            return True
        token_hash = hash_token(refresh_token_str)
        return await self.session_repo.revoke_session_by_hash(token_hash)

    async def forgot_password(self, payload: ForgotPasswordRequest) -> ForgotPasswordResponse:
        user = await self.user_service.get_by_email(payload.email)
        raw_token: Optional[str] = None
        if user and user.is_active:
            raw_token = generate_secure_token(32)
            token_hash = hash_token(raw_token)
            expires_at = datetime.now(timezone.utc) + timedelta(
                minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES
            )
            await self.reset_repo.create_token(
                user_id=user.id, token_hash=token_hash, expires_at=expires_at
            )
            if self.audit_repo:
                await self.audit_repo.log_action(
                    actor_id=user.id,
                    action="auth.password_reset_requested",
                    target_type="user",
                    target_id=str(user.id),
                    details={"email": user.email},
                )

        return ForgotPasswordResponse(
            message="If an account with that email exists, password reset instructions have been sent.",
            reset_token=raw_token if settings.ENVIRONMENT == "development" else None,
        )

    async def reset_password(self, payload: ResetPasswordRequest) -> None:
        token_hash = hash_token(payload.token)
        token_record = await self.reset_repo.get_valid_token(token_hash)
        if not token_record:
            raise BadRequestError("Invalid or expired password reset token.")

        user = await self.user_service.get(token_record.user_id)
        if not user:
            raise NotFoundError("User not found.")

        # Set new Argon2 password
        user.hashed_password = get_password_hash(payload.new_password)
        await self.user_service.user_repo.update(user)

        # Mark token as used
        await self.reset_repo.mark_as_used(token_record)

        # Security: Revoke all existing sessions so old devices are invalidated
        await self.session_repo.revoke_all_user_sessions(user.id)

        if self.audit_repo:
            await self.audit_repo.log_action(
                actor_id=user.id,
                action="auth.password_reset_completed",
                target_type="user",
                target_id=str(user.id),
            )

    async def verify_email(self, token_str: str) -> None:
        token_hash = hash_token(token_str)
        token_record = await self.verification_repo.get_valid_token(token_hash)
        if not token_record:
            raise BadRequestError("Invalid or expired email verification token.")

        user = await self.user_service.get(token_record.user_id)
        if not user:
            raise NotFoundError("User not found.")

        user.is_verified = True
        await self.user_service.user_repo.update(user)
        await self.verification_repo.mark_as_used(token_record)

        if self.audit_repo:
            await self.audit_repo.log_action(
                actor_id=user.id,
                action="auth.email_verified",
                target_type="user",
                target_id=str(user.id),
            )

    async def change_password(self, user: User, payload: ChangePasswordRequest) -> None:
        if not verify_password(payload.old_password, user.hashed_password):
            raise BadRequestError("Current password does not match.")

        user.hashed_password = get_password_hash(payload.new_password)
        await self.user_service.user_repo.update(user)

        # Revoke other sessions for security
        await self.session_repo.revoke_all_user_sessions(user.id)

        if self.audit_repo:
            await self.audit_repo.log_action(
                actor_id=user.id,
                action="auth.password_changed",
                target_type="user",
                target_id=str(user.id),
            )

    async def list_sessions(self, user_id: uuid.UUID) -> List[SessionRead]:
        sessions = await self.session_repo.list_user_sessions(user_id)
        return [
            SessionRead(
                id=s.id,
                ip_address=s.ip_address,
                user_agent=s.user_agent,
                is_revoked=s.is_revoked,
                created_at=s.created_at,
                expires_at=s.expires_at,
            )
            for s in sessions
        ]

    async def revoke_session(self, session_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        return await self.session_repo.revoke_session_by_id(session_id, user_id)
