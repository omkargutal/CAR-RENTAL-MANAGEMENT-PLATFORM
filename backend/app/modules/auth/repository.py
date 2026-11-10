from datetime import datetime, timezone
from typing import List, Optional, Sequence
import uuid
from sqlalchemy import desc, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.repositories import BaseRepository
from app.modules.users.models import EmailVerificationToken, PasswordResetToken, UserSession


class UserSessionRepository(BaseRepository[UserSession]):
    def __init__(self, db: AsyncSession):
        super().__init__(UserSession, db)

    async def create_session(
        self,
        *,
        user_id: uuid.UUID,
        refresh_token_hash: str,
        expires_at: datetime,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> UserSession:
        session = UserSession(
            user_id=user_id,
            refresh_token_hash=refresh_token_hash,
            expires_at=expires_at,
            ip_address=ip_address,
            user_agent=user_agent,
            is_revoked=False,
        )
        self.db.add(session)
        await self.db.commit()
        await self.db.refresh(session)
        return session

    async def get_active_session_by_hash(self, token_hash: str) -> Optional[UserSession]:
        now = datetime.now(timezone.utc)
        stmt = (
            select(UserSession)
            .where(
                UserSession.refresh_token_hash == token_hash,
                UserSession.is_revoked == False,
                UserSession.expires_at > now,
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def revoke_session_by_hash(self, token_hash: str) -> bool:
        stmt = (
            update(UserSession)
            .where(UserSession.refresh_token_hash == token_hash)
            .values(is_revoked=True)
        )
        result = await self.db.execute(stmt)
        await self.db.commit()
        return result.rowcount > 0

    async def revoke_session_by_id(self, session_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        stmt = (
            update(UserSession)
            .where(UserSession.id == session_id, UserSession.user_id == user_id)
            .values(is_revoked=True)
        )
        result = await self.db.execute(stmt)
        await self.db.commit()
        return result.rowcount > 0

    async def revoke_all_user_sessions(self, user_id: uuid.UUID) -> int:
        stmt = (
            update(UserSession)
            .where(UserSession.user_id == user_id, UserSession.is_revoked == False)
            .values(is_revoked=True)
        )
        result = await self.db.execute(stmt)
        await self.db.commit()
        return result.rowcount

    async def list_user_sessions(self, user_id: uuid.UUID) -> Sequence[UserSession]:
        stmt = (
            select(UserSession)
            .where(UserSession.user_id == user_id)
            .order_by(desc(UserSession.created_at))
            .limit(20)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()


class PasswordResetRepository(BaseRepository[PasswordResetToken]):
    def __init__(self, db: AsyncSession):
        super().__init__(PasswordResetToken, db)

    async def create_token(
        self, *, user_id: uuid.UUID, token_hash: str, expires_at: datetime
    ) -> PasswordResetToken:
        token = PasswordResetToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
            is_used=False,
        )
        self.db.add(token)
        await self.db.commit()
        await self.db.refresh(token)
        return token

    async def get_valid_token(self, token_hash: str) -> Optional[PasswordResetToken]:
        now = datetime.now(timezone.utc)
        stmt = select(PasswordResetToken).where(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.is_used == False,
            PasswordResetToken.expires_at > now,
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def mark_as_used(self, token: PasswordResetToken) -> None:
        token.is_used = True
        await self.db.commit()


class EmailVerificationRepository(BaseRepository[EmailVerificationToken]):
    def __init__(self, db: AsyncSession):
        super().__init__(EmailVerificationToken, db)

    async def create_token(
        self, *, user_id: uuid.UUID, token_hash: str, expires_at: datetime
    ) -> EmailVerificationToken:
        token = EmailVerificationToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
            is_used=False,
        )
        self.db.add(token)
        await self.db.commit()
        await self.db.refresh(token)
        return token

    async def get_valid_token(self, token_hash: str) -> Optional[EmailVerificationToken]:
        now = datetime.now(timezone.utc)
        stmt = select(EmailVerificationToken).where(
            EmailVerificationToken.token_hash == token_hash,
            EmailVerificationToken.is_used == False,
            EmailVerificationToken.expires_at > now,
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def mark_as_used(self, token: EmailVerificationToken) -> None:
        token.is_used = True
        await self.db.commit()
