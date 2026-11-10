from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class WhatsAppSendResult(BaseModel):
    success: bool
    wamid: Optional[str] = None
    recipient: str
    status: str = "SENT"
    error_code: Optional[str] = None
    error_description: Optional[str] = None
    raw_response: Optional[Dict[str, Any]] = None


class WhatsAppTemplateComponent(BaseModel):
    type: str  # header, body, button
    sub_type: Optional[str] = None
    index: Optional[int] = None
    parameters: List[Dict[str, Any]] = Field(default_factory=list)


class WhatsAppGatewayProvider(ABC):
    """
    Provider-independent WhatsApp Business API interface.
    Default implementation connects to Meta WhatsApp Business Cloud API.
    """

    @abstractmethod
    async def send_text_message(
        self,
        to_phone: str,
        text: str,
        preview_url: bool = False,
    ) -> WhatsAppSendResult:
        """Send a plain text message to a user WhatsApp number."""
        pass

    @abstractmethod
    async def send_template_message(
        self,
        to_phone: str,
        template_name: str,
        language_code: str = "en_US",
        components: Optional[List[Dict[str, Any]]] = None,
    ) -> WhatsAppSendResult:
        """Send an approved WhatsApp message template."""
        pass

    @abstractmethod
    async def mark_message_as_read(self, wamid: str) -> bool:
        """Mark an inbound WhatsApp message as read."""
        pass

    @abstractmethod
    def verify_webhook_token(
        self,
        hub_mode: str,
        hub_token: str,
        hub_challenge: str,
        expected_token: str,
    ) -> Optional[str]:
        """Validate Meta webhook handshake and return challenge if valid."""
        pass

    @abstractmethod
    async def test_connection(self) -> Dict[str, Any]:
        """Test API connectivity using configured credentials."""
        pass
