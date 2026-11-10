from datetime import datetime
import uuid
from typing import Optional
from app.common.schemas import BaseSchema
from app.modules.notifications.models import NotificationChannel, NotificationStatus


class NotificationBase(BaseSchema):
    recipient: str
    channel: NotificationChannel = NotificationChannel.EMAIL
    subject: str
    message: str


class NotificationCreate(NotificationBase):
    pass


class NotificationRead(NotificationBase):
    id: uuid.UUID
    status: NotificationStatus
    error_detail: Optional[str] = None
    created_at: datetime
    updated_at: datetime
