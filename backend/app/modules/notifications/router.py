from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.common.schemas import ResponseEnvelope
from app.modules.auth.dependencies import get_current_user, get_current_user_optional
from app.modules.notifications.dependencies import get_notification_service
from app.modules.notifications.schemas import NotificationCreate, NotificationRead, UnreadCountResponse
from app.modules.notifications.service import NotificationService
from app.modules.users.models import User

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/unread-count", response_model=ResponseEnvelope[UnreadCountResponse])
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service),
):
    """Returns the count of unread notifications for the authenticated customer."""
    count = await service.get_unread_count(current_user.email)
    return ResponseEnvelope(data=UnreadCountResponse(unread_count=count))


@router.get("", response_model=ResponseEnvelope[List[NotificationRead]])
async def list_notifications(
    recipient: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: Optional[User] = Depends(get_current_user_optional),
    service: NotificationService = Depends(get_notification_service),
):
    """
    Lists notifications. For authenticated customers, strictly isolates data
    so customers only receive their own notifications.
    """
    effective_recipient = current_user.email if current_user else recipient
    if effective_recipient:
        notifications = await service.notif_repo.list_by_recipient(effective_recipient, skip=skip, limit=limit)
    else:
        # Unauthenticated calls without recipient receive an empty list to prevent data leaks
        notifications = []
    return ResponseEnvelope(data=[NotificationRead.model_validate(n) for n in notifications])


@router.patch("/{notification_id}/read", response_model=ResponseEnvelope[NotificationRead])
async def mark_notification_read(
    notification_id: uuid.UUID,
    current_user: Optional[User] = Depends(get_current_user_optional),
    service: NotificationService = Depends(get_notification_service),
):
    """Marks a single notification as read."""
    notif = await service.mark_as_read(notification_id)
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")
    return ResponseEnvelope(data=NotificationRead.model_validate(notif))


@router.post("/mark-all-read", response_model=ResponseEnvelope[dict])
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service),
):
    """Marks all unread notifications for the authenticated customer as read."""
    count = await service.mark_all_as_read(current_user.email)
    return ResponseEnvelope(data={"marked_count": count})


@router.post("", response_model=ResponseEnvelope[NotificationRead], status_code=status.HTTP_201_CREATED)
async def send_notification(
    payload: NotificationCreate,
    service: NotificationService = Depends(get_notification_service),
):
    notif = await service.send_notification(payload)
    return ResponseEnvelope(data=NotificationRead.model_validate(notif))

