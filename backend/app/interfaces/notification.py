from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class NotificationResult(BaseModel):
    success: bool
    message_id: Optional[str] = None
    recipient: str
    channel: str
    error: Optional[str] = None


class NotificationProvider(ABC):
    """
    Provider-independent notification interface (Email, SMS, Push, Mock)
    """

    @abstractmethod
    async def send_email(
        self,
        recipient: str,
        subject: str,
        body_text: str,
        body_html: Optional[str] = None,
        attachments: Optional[List[Dict[str, Any]]] = None,
    ) -> NotificationResult:
        pass

    @abstractmethod
    async def send_sms(
        self,
        phone_number: str,
        message: str,
    ) -> NotificationResult:
        pass
