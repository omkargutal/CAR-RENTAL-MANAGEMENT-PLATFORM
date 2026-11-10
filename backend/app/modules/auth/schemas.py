from datetime import datetime
from typing import Optional
import uuid
from pydantic import EmailStr, Field

from app.common.schemas import BaseSchema
from app.modules.users.schemas import UserRead


class LoginRequest(BaseSchema):
    email: EmailStr
    password: str = Field(..., min_length=1)


class RegisterRequest(BaseSchema):
    email: EmailStr
    password: str = Field(..., min_length=8, description="Minimum 8 characters")
    full_name: str = Field(..., min_length=2, max_length=255)
    phone_number: Optional[str] = None


class Token(BaseSchema):
    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int
    refresh_token: Optional[str] = None
    user: UserRead


class TokenPayload(BaseSchema):
    sub: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    type: Optional[str] = None
    exp: Optional[int] = None


class RefreshTokenRequest(BaseSchema):
    refresh_token: Optional[str] = Field(None, description="Optional refresh token string if not supplied in cookie")


class ForgotPasswordRequest(BaseSchema):
    email: EmailStr


class ForgotPasswordResponse(BaseSchema):
    message: str
    reset_token: Optional[str] = Field(
        None, description="Reset token provided directly in development mode for easy testing"
    )


class ResetPasswordRequest(BaseSchema):
    token: str = Field(..., min_length=10, description="Secure reset token received via email/link")
    new_password: str = Field(..., min_length=8, description="New password (minimum 8 characters)")


class EmailVerificationRequest(BaseSchema):
    token: str = Field(..., min_length=10, description="Verification token received via email")


class ResendVerificationRequest(BaseSchema):
    email: EmailStr


class ChangePasswordRequest(BaseSchema):
    old_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)


class SessionRead(BaseSchema):
    id: uuid.UUID
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    is_revoked: bool
    created_at: datetime
    expires_at: datetime
    is_current: bool = False


class ActionResponse(BaseSchema):
    success: bool = True
    message: str
