from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
import uuid
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.common.models import Base, UUIDPrimaryKeyMixin


class ConversationStatus(str, Enum):
    BOT = "BOT"
    HUMAN_AGENT = "HUMAN_AGENT"
    CLOSED = "CLOSED"


class MessageDirection(str, Enum):
    INBOUND = "INBOUND"
    OUTBOUND = "OUTBOUND"


class MessageDeliveryStatus(str, Enum):
    PENDING = "PENDING"
    SENT = "SENT"
    DELIVERED = "DELIVERED"
    READ = "READ"
    FAILED = "FAILED"


class IntegrationStatus(str, Enum):
    NOT_CONFIGURED = "NOT_CONFIGURED"
    INCOMPLETE = "INCOMPLETE"
    CONNECTED = "CONNECTED"
    ERROR = "ERROR"


class WhatsAppConfig(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "whatsapp_config"

    phone_number_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    waba_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    business_phone_number: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    display_phone_number: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    access_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    verify_token: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    app_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    app_secret: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)

    floating_button_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    floating_button_greeting: Mapped[str] = mapped_column(
        Text,
        default="Hi! I am interested in booking a cab / tour with Swaraj Tours & Travel.",
        nullable=False,
    )

    status: Mapped[str] = mapped_column(String(32), default=IntegrationStatus.NOT_CONFIGURED.value, nullable=False)
    status_details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    admin_notification_phone: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    notification_preferences: Mapped[Dict[str, Any]] = mapped_column(
        JSONB,
        default=lambda: {
            "customer": {
                "booking_confirmation": True,
                "payment_success": True,
                "cancellation": True,
                "reminders": True,
            },
            "admin": {
                "new_booking": True,
                "payment_success": True,
                "cancellation": True,
                "human_support": True,
            },
        },
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class WhatsAppConversation(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "whatsapp_conversations"

    phone_number: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    customer_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("customers.id", ondelete="SET NULL"), nullable=True
    )
    customer_name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default=ConversationStatus.BOT.value, nullable=False)
    last_message_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    unread_admin_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    messages: Mapped[List["WhatsAppMessage"]] = relationship(
        "WhatsAppMessage", back_populates="conversation", cascade="all, delete-orphan", order_by="WhatsAppMessage.created_at"
    )


class WhatsAppMessage(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "whatsapp_messages"

    conversation_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("whatsapp_conversations.id", ondelete="CASCADE"), index=True, nullable=False
    )
    wamid: Mapped[Optional[str]] = mapped_column(String(128), unique=True, index=True, nullable=True)
    direction: Mapped[str] = mapped_column(String(16), nullable=False)  # INBOUND, OUTBOUND
    message_type: Mapped[str] = mapped_column(String(32), default="TEXT", nullable=False)
    sender_phone: Mapped[str] = mapped_column(String(32), nullable=False)
    recipient_phone: Mapped[str] = mapped_column(String(32), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    template_name: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default=MessageDeliveryStatus.SENT.value, nullable=False)
    error_code: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    error_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    raw_payload: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    conversation: Mapped["WhatsAppConversation"] = relationship("WhatsAppConversation", back_populates="messages")


class WhatsAppTemplate(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "whatsapp_templates"

    name: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    category: Mapped[str] = mapped_column(String(32), default="UTILITY", nullable=False)
    language: Mapped[str] = mapped_column(String(16), default="en_US", nullable=False)
    body_template: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="APPROVED", nullable=False)
    example_parameters: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
