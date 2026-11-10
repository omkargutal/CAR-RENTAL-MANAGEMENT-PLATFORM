from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid
from pydantic import EmailStr, Field

from app.common.schemas import BaseSchema
from app.modules.users.models import UserRole


class UserBase(BaseSchema):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=255)
    role: UserRole = UserRole.CUSTOMER
    is_active: bool = True
    phone_number: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, description="Plaintext password to be hashed with Argon2id")


class UserProfileUpdate(BaseSchema):
    """Safe update payload for customers to update their own profile (prevents role elevation)."""
    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    phone_number: Optional[str] = None


class UserDocumentsUpdate(BaseSchema):
    """Payload for customer to update driving documents and license details."""
    driver_license_number: Optional[str] = Field(None, max_length=50)
    driver_license_state: Optional[str] = Field(None, max_length=50)
    driver_license_country: Optional[str] = Field(None, max_length=50)
    driver_license_expiry: Optional[str] = None
    document_urls: Optional[List[str]] = None


class UserRoleUpdate(BaseSchema):
    """Administrative payload to change a user's role with mandatory audit logging."""
    role: UserRole
    reason: Optional[str] = Field(None, description="Administrative justification for audit trail")


class UserStatusUpdate(BaseSchema):
    """Administrative payload to activate/deactivate an account with mandatory audit logging."""
    is_active: bool
    reason: Optional[str] = Field(None, description="Administrative justification for audit trail")


class UserAdminUpdate(BaseSchema):
    """Administrative full update schema."""
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None


class UserRead(UserBase):
    id: uuid.UUID
    is_verified: bool
    documents: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime


class AuditLogRead(BaseSchema):
    id: uuid.UUID
    actor_id: Optional[uuid.UUID] = None
    action: str
    target_type: str
    target_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    created_at: datetime
