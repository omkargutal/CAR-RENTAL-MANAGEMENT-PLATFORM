import uuid
from typing import Any, Dict, List, Optional
from app.core.logging import logger
from app.interfaces.notification import NotificationProvider, NotificationResult


class StubNotificationProvider(NotificationProvider):
    """
    Simulated notification provider for development and testing environments.
    """

    async def send_email(
        self,
        recipient: str,
        subject: str,
        body_text: str,
        body_html: Optional[str] = None,
        attachments: Optional[List[Dict[str, Any]]] = None,
    ) -> NotificationResult:
        msg_id = f"msg_{uuid.uuid4().hex[:12]}"
        logger.info(
            f"[StubNotification] Email sent to {recipient}: '{subject}' (ID: {msg_id})"
        )
        return NotificationResult(
            success=True,
            message_id=msg_id,
            recipient=recipient,
            channel="email",
        )

    async def send_sms(
        self,
        phone_number: str,
        message: str,
    ) -> NotificationResult:
        msg_id = f"sms_{uuid.uuid4().hex[:12]}"
        logger.info(
            f"[StubNotification] SMS sent to {phone_number}: '{message}' (ID: {msg_id})"
        )
        return NotificationResult(
            success=True,
            message_id=msg_id,
            recipient=phone_number,
            channel="sms",
        )


_notification_instance: Optional[NotificationProvider] = None


def get_notification_provider() -> NotificationProvider:
    global _notification_instance
    if _notification_instance is None:
        _notification_instance = StubNotificationProvider()
    return _notification_instance
