from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, Query, Request, status

from app.common.schemas import ResponseEnvelope
from app.core.exceptions import ForbiddenError
from app.modules.auth.dependencies import (
    extract_client_info,
    get_current_user,
    require_admin,
    require_staff_or_admin,
)
from app.modules.users.dependencies import get_user_service
from app.modules.users.models import User, UserRole
from app.modules.users.schemas import (
    AuditLogRead,
    UserCreate,
    UserRead,
    UserRoleUpdate,
    UserStatusUpdate,
)
from app.modules.users.service import UserService

router = APIRouter(prefix="/users", tags=["Users & Administration"])


@router.get("", response_model=ResponseEnvelope[List[UserRead]])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    role: Optional[UserRole] = None,
    search: Optional[str] = None,
    current_user: User = Depends(require_staff_or_admin),
    service: UserService = Depends(get_user_service),
):
    users = await service.list_users(skip=skip, limit=limit, role=role, search=search)
    return ResponseEnvelope(data=[UserRead.model_validate(u) for u in users])


@router.post("", response_model=ResponseEnvelope[UserRead], status_code=status.HTTP_201_CREATED)
async def create_user_by_admin(
    payload: UserCreate,
    current_user: User = Depends(require_admin),
    service: UserService = Depends(get_user_service),
):
    user = await service.create_user(payload)
    return ResponseEnvelope(data=UserRead.model_validate(user), message="User created successfully.")


@router.get("/audit-logs", response_model=ResponseEnvelope[List[AuditLogRead]])
async def get_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    target_type: Optional[str] = None,
    current_user: User = Depends(require_admin),
    service: UserService = Depends(get_user_service),
):
    logs = await service.get_audit_logs(skip=skip, limit=limit, target_type=target_type)
    return ResponseEnvelope(data=[AuditLogRead.model_validate(l) for l in logs])


@router.get("/{user_id}", response_model=ResponseEnvelope[UserRead])
async def get_user(
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    service: UserService = Depends(get_user_service),
):
    # Customers can only view their own user account; Staff/Admin can view any
    if current_user.role == UserRole.CUSTOMER and current_user.id != user_id:
        raise ForbiddenError("You are only permitted to view your own profile.")

    user = await service.get_or_404(user_id)
    return ResponseEnvelope(data=UserRead.model_validate(user))


@router.patch("/{user_id}/role", response_model=ResponseEnvelope[UserRead])
async def change_user_role(
    user_id: uuid.UUID,
    payload: UserRoleUpdate,
    request: Request,
    current_user: User = Depends(require_admin),
    service: UserService = Depends(get_user_service),
):
    ip_address, _ = extract_client_info(request)
    updated = await service.admin_change_role(
        target_user_id=user_id,
        payload=payload,
        actor=current_user,
        ip_address=ip_address,
    )
    return ResponseEnvelope(
        data=UserRead.model_validate(updated),
        message=f"User role updated to {payload.role.value}.",
    )


@router.patch("/{user_id}/status", response_model=ResponseEnvelope[UserRead])
async def change_user_status(
    user_id: uuid.UUID,
    payload: UserStatusUpdate,
    request: Request,
    current_user: User = Depends(require_admin),
    service: UserService = Depends(get_user_service),
):
    ip_address, _ = extract_client_info(request)
    updated = await service.admin_change_status(
        target_user_id=user_id,
        payload=payload,
        actor=current_user,
        ip_address=ip_address,
    )
    return ResponseEnvelope(
        data=UserRead.model_validate(updated),
        message=f"User status updated to {'active' if payload.is_active else 'inactive'}.",
    )
