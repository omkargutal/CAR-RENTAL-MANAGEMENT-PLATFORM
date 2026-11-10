from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid
from pydantic import BaseModel, Field


def mask_secret(val: Optional[str]) -> Optional[str]:
    if not val:
        return None
    val = val.strip()
    if len(val) <= 8:
        return "••••••••"
    return f"{val[:4]}••••••••{val[-4:]}"


def build_wa_link(phone: Optional[str], text: Optional[str]) -> Optional[str]:
    if not phone:
        return None
    digits = "".join(filter(str.isdigit, phone))
    if len(digits) == 10:
        digits = f"91{digits}"
    import urllib.parse

    greeting = urllib.parse.quote(text or "Hi! I am interested in booking a cab / tour with Swaraj Tours & Travel.")
    return f"https://wa.me/{digits}?text={greeting}"


class WhatsAppPublicConfig(BaseModel):
    floating_button_enabled: bool
    business_phone_number: Optional[str]
    display_phone_number: Optional[str]
    floating_button_greeting: str
    wa_me_url: Optional[str]


class NotificationPreferences(BaseModel):
    customer: Dict[str, bool] = Field(
        default_factory=lambda: {
            "booking_confirmation": True,
            "payment_success": True,
            "cancellation": True,
            "reminders": True,
        }
    )
    admin: Dict[str, bool] = Field(
        default_factory=lambda: {
            "new_booking": True,
            "payment_success": True,
            "cancellation": True,
            "human_support": True,
        }
    )


class WhatsAppConfigResponse(BaseModel):
    id: uuid.UUID
    phone_number_id: Optional[str]
    waba_id: Optional[str]
    business_phone_number: Optional[str]
    display_phone_number: Optional[str]
    verify_token: Optional[str]
    app_id: Optional[str]
    access_token_masked: Optional[str]
    app_secret_masked: Optional[str]
    has_access_token: bool
    has_app_secret: bool
    floating_button_enabled: bool
    floating_button_greeting: str
    status: str
    status_details: Optional[str]
    admin_notification_phone: Optional[str]
    notification_preferences: NotificationPreferences
    webhook_url: str
    wa_me_url: Optional[str]
    created_at: datetime
    updated_at: datetime


class WhatsAppConfigUpdate(BaseModel):
    phone_number_id: Optional[str] = None
    waba_id: Optional[str] = None
    business_phone_number: Optional[str] = None
    display_phone_number: Optional[str] = None
    access_token: Optional[str] = None
    verify_token: Optional[str] = None
    app_id: Optional[str] = None
    app_secret: Optional[str] = None
    floating_button_enabled: Optional[bool] = None
    floating_button_greeting: Optional[str] = None
    admin_notification_phone: Optional[str] = None
    notification_preferences: Optional[NotificationPreferences] = None


class WhatsAppTestMessageRequest(BaseModel):
    recipient_phone: str
    message: Optional[str] = "Hello from Swaraj Tours & Travel WhatsApp Platform! Your integration test was successful."


class WhatsAppManualReplyRequest(BaseModel):
    message: str


class WhatsAppMessageResponse(BaseModel):
    id: uuid.UUID
    conversation_id: uuid.UUID
    wamid: Optional[str]
    direction: str
    message_type: str
    sender_phone: str
    recipient_phone: str
    content: str
    template_name: Optional[str]
    status: str
    error_code: Optional[str]
    error_description: Optional[str]
    created_at: datetime


class WhatsAppConversationResponse(BaseModel):
    id: uuid.UUID
    phone_number: str
    customer_id: Optional[uuid.UUID]
    customer_name: Optional[str]
    status: str
    last_message_at: datetime
    unread_admin_count: int
    notes: Optional[str]
    last_message: Optional[WhatsAppMessageResponse] = None
    created_at: datetime


class WhatsAppConversationDetailResponse(WhatsAppConversationResponse):
    messages: List[WhatsAppMessageResponse] = []


class WhatsAppHandoverUpdate(BaseModel):
    status: str  # BOT, HUMAN_AGENT, CLOSED
    notes: Optional[str] = None


class WhatsAppConnectionTestResult(BaseModel):
    connected: bool
    status: str
    message: str
    phone_number_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
