import uuid
from typing import List, Optional
from fastapi import APIRouter, Cookie, Depends, File, Header, HTTPException, Request, Response, UploadFile, status

from app.common.schemas import ResponseEnvelope
from app.core.config import settings
from app.integrations.storage_minio import StorageProvider, get_storage_provider
from app.modules.auth.dependencies import (
    extract_client_info,
    get_auth_service,
    get_current_user,
)
from app.modules.auth.schemas import (
    ActionResponse,
    ChangePasswordRequest,
    EmailVerificationRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    SessionRead,
    Token,
)
from app.modules.auth.service import AuthService
from app.modules.users.dependencies import get_user_service
from app.modules.users.models import User
from app.modules.users.schemas import UserDocumentsUpdate, UserProfileUpdate, UserRead
from app.modules.users.service import UserService

router = APIRouter(prefix="/auth", tags=["Authentication & User Sessions"])


def set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=settings.REFRESH_COOKIE_NAME,
        value=refresh_token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        httponly=settings.REFRESH_COOKIE_HTTPONLY,
        secure=settings.REFRESH_COOKIE_SECURE,
        samesite=settings.REFRESH_COOKIE_SAMESITE,
        path="/api/v1/auth",
    )


def clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.REFRESH_COOKIE_NAME,
        path="/api/v1/auth",
    )


@router.post("/register", response_model=ResponseEnvelope[Token], status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    request: Request,
    response: Response,
    service: AuthService = Depends(get_auth_service),
):
    ip_address, user_agent = extract_client_info(request)
    token, raw_refresh_token, _ = await service.register(
        payload, ip_address=ip_address, user_agent=user_agent
    )
    set_refresh_cookie(response, raw_refresh_token)
    return ResponseEnvelope(data=token, message="Registration successful.")


@router.post("/login", response_model=ResponseEnvelope[Token])
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    service: AuthService = Depends(get_auth_service),
):
    ip_address, user_agent = extract_client_info(request)
    token, raw_refresh_token = await service.authenticate(
        payload, ip_address=ip_address, user_agent=user_agent
    )
    set_refresh_cookie(response, raw_refresh_token)
    return ResponseEnvelope(data=token, message="Login successful.")


@router.post("/refresh", response_model=ResponseEnvelope[Token])
async def refresh_session(
    request: Request,
    response: Response,
    body: Optional[RefreshTokenRequest] = None,
    carrental_refresh_token: Optional[str] = Cookie(None),
    service: AuthService = Depends(get_auth_service),
):
    # Support both HttpOnly cookie and optional request body
    token_str = (body.refresh_token if body and body.refresh_token else None) or carrental_refresh_token
    if not token_str:
        from app.core.exceptions import UnauthorizedError
        raise UnauthorizedError("No refresh token provided.")

    ip_address, user_agent = extract_client_info(request)
    token, new_refresh_token = await service.refresh_session(
        token_str, ip_address=ip_address, user_agent=user_agent
    )
    set_refresh_cookie(response, new_refresh_token)
    return ResponseEnvelope(data=token, message="Session refreshed successfully.")


@router.post("/logout", response_model=ResponseEnvelope[ActionResponse])
async def logout(
    response: Response,
    body: Optional[RefreshTokenRequest] = None,
    carrental_refresh_token: Optional[str] = Cookie(None),
    service: AuthService = Depends(get_auth_service),
):
    token_str = (body.refresh_token if body and body.refresh_token else None) or carrental_refresh_token
    await service.logout(token_str)
    clear_refresh_cookie(response)
    return ResponseEnvelope(data=ActionResponse(message="Logged out successfully."))


@router.post("/forgot-password", response_model=ResponseEnvelope[ForgotPasswordResponse])
async def forgot_password(
    payload: ForgotPasswordRequest,
    service: AuthService = Depends(get_auth_service),
):
    result = await service.forgot_password(payload)
    return ResponseEnvelope(data=result, message=result.message)


@router.post("/reset-password", response_model=ResponseEnvelope[ActionResponse])
async def reset_password(
    payload: ResetPasswordRequest,
    service: AuthService = Depends(get_auth_service),
):
    await service.reset_password(payload)
    return ResponseEnvelope(data=ActionResponse(message="Password has been reset successfully. Please log in with your new password."))


@router.post("/verify-email", response_model=ResponseEnvelope[ActionResponse])
async def verify_email(
    payload: EmailVerificationRequest,
    service: AuthService = Depends(get_auth_service),
):
    await service.verify_email(payload.token)
    return ResponseEnvelope(data=ActionResponse(message="Email verified successfully."))


@router.post("/resend-verification", response_model=ResponseEnvelope[ActionResponse])
async def resend_verification(
    payload: ResendVerificationRequest,
    service: AuthService = Depends(get_auth_service),
):
    return ResponseEnvelope(data=ActionResponse(message="If unverified, a verification link has been sent."))


@router.get("/me", response_model=ResponseEnvelope[UserRead])
async def get_me(
    current_user: User = Depends(get_current_user),
):
    return ResponseEnvelope(data=UserRead.model_validate(current_user))


@router.patch("/me", response_model=ResponseEnvelope[UserRead])
async def update_profile(
    payload: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
):
    updated = await user_service.update_profile(current_user.id, payload)
    return ResponseEnvelope(data=UserRead.model_validate(updated), message="Profile updated successfully.")


@router.post("/change-password", response_model=ResponseEnvelope[ActionResponse])
async def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    service: AuthService = Depends(get_auth_service),
):
    await service.change_password(current_user, payload)
    return ResponseEnvelope(data=ActionResponse(message="Password changed successfully."))


@router.post("/documents", response_model=ResponseEnvelope[UserRead])
async def update_documents(
    payload: UserDocumentsUpdate,
    current_user: User = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
):
    updated = await user_service.update_documents(current_user.id, payload)
    return ResponseEnvelope(data=UserRead.model_validate(updated), message="Documents updated successfully.")


@router.post("/avatar", response_model=ResponseEnvelope[UserRead])
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
    storage: StorageProvider = Depends(get_storage_provider),
):
    """Allows authenticated user to upload their own profile avatar image."""
    file_ext = (file.filename or "image.jpg").split(".")[-1].lower()
    if file_ext not in ["jpg", "jpeg", "png", "webp"]:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, and WebP images are supported.")

    storage_path = f"avatars/{current_user.id}_{uuid.uuid4().hex[:8]}.{file_ext}"
    public_url = await storage.upload_file(
        file_obj=file.file,
        path=storage_path,
        content_type=file.content_type or "image/jpeg",
    )
    current_docs = dict(current_user.documents or {})
    current_docs["avatar_url"] = public_url
    current_user.documents = current_docs
    updated = await user_service.user_repo.update(current_user)
    return ResponseEnvelope(data=UserRead.model_validate(updated), message="Avatar uploaded successfully.")


@router.get("/sessions", response_model=ResponseEnvelope[List[SessionRead]])
async def list_sessions(
    current_user: User = Depends(get_current_user),
    service: AuthService = Depends(get_auth_service),
):
    sessions = await service.list_sessions(current_user.id)
    return ResponseEnvelope(data=sessions)


@router.delete("/sessions/{session_id}", response_model=ResponseEnvelope[ActionResponse])
async def revoke_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    service: AuthService = Depends(get_auth_service),
):
    revoked = await service.revoke_session(session_id, current_user.id)
    return ResponseEnvelope(data=ActionResponse(message="Session revoked." if revoked else "Session not found."))
