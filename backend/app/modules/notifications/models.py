from enum import Enum
from sqlalchemy import Enum as SQLEnum, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.common.models import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin


class NotificationChannel(str, Enum):
    EMAIL = "email"
    SMS = "sms"
    IN_APP = "in_app"


class NotificationStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"


class Notification(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "notifications"

    recipient: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    channel: Mapped[NotificationChannel] = mapped_column(
        SQLEnum(NotificationChannel, name="notification_channel_enum"),
        default=NotificationChannel.EMAIL,
        nullable=False,
    )
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[NotificationStatus] = mapped_column(
        SQLEnum(NotificationStatus, name="notification_status_enum"),
        default=NotificationStatus.PENDING,
        nullable=False,
        index=True,
    )
    error_detail: Mapped[str | None] = mapped_column(Text, nullable=True)
