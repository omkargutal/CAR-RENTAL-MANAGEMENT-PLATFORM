from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from app.common.schemas import ResponseEnvelope
from app.modules.notifications.dependencies import get_notification_service
from app.modules.notifications.schemas import NotificationCreate, NotificationRead
from app.modules.notifications.service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=ResponseEnvelope[List[NotificationRead]])
async def list_notifications(
    recipient: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    service: NotificationService = Depends(get_notification_service),
):
    if recipient:
        notifications = await service.notif_repo.list_by_recipient(recipient, skip=skip, limit=limit)
    else:
        notifications = await service.list(skip=skip, limit=limit)
    return ResponseEnvelope(data=[NotificationRead.model_validate(n) for n in notifications])


@router.post("", response_model=ResponseEnvelope[NotificationRead], status_code=status.HTTP_201_CREATED)
async def send_notification(
    payload: NotificationCreate,
    service: NotificationService = Depends(get_notification_service),
):
    notif = await service.send_notification(payload)
    return ResponseEnvelope(data=NotificationRead.model_validate(notif))
