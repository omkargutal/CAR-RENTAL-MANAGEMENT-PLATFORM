from abc import ABC, abstractmethod
from decimal import Decimal
from typing import Any, Dict, Optional
from pydantic import BaseModel


class PaymentOrderResult(BaseModel):
    order_id: str
    amount_cents: int
    currency: str
    receipt: str
    status: str
    raw_response: Optional[Dict[str, Any]] = None


class PaymentDetailsResult(BaseModel):
    payment_id: str
    order_id: Optional[str] = None
    amount_cents: int
    currency: str
    status: str
    method: Optional[str] = None
    card_network: Optional[str] = None
    card_last4: Optional[str] = None
    upi_vpa: Optional[str] = None
    email: Optional[str] = None
    contact: Optional[str] = None
    raw_response: Optional[Dict[str, Any]] = None


class RefundResult(BaseModel):
    refund_id: str
    payment_id: str
    amount_cents: int
    currency: str
    status: str
    raw_response: Optional[Dict[str, Any]] = None


class PaymentIntentResult(BaseModel):
    transaction_id: str
    client_secret: Optional[str] = None
    status: str
    amount: Decimal
    currency: str
    raw_response: Optional[Dict[str, Any]] = None


class PaymentGatewayProvider(ABC):
    """
    Provider-independent payment gateway interface (Razorpay, Stripe, Adyen, etc.).
    Keeps payment provider logic decoupled from domain business logic.
    """

    @abstractmethod
    async def create_order(
        self,
        amount_cents: int,
        currency: str = "INR",
        receipt: str = "",
        notes: Optional[Dict[str, Any]] = None,
    ) -> PaymentOrderResult:
        """Creates a payment order on the gateway."""
        pass

    @abstractmethod
    def verify_payment_signature(
        self,
        order_id: str,
        payment_id: str,
        signature: str,
    ) -> bool:
        """Verifies backend payment signature from gateway checkout."""
        pass

    @abstractmethod
    def verify_webhook_signature(
        self,
        payload_bytes: bytes,
        signature: str,
    ) -> bool:
        """Verifies backend webhook signature from gateway."""
        pass

    @abstractmethod
    async def fetch_payment(self, payment_id: str) -> PaymentDetailsResult:
        """Fetches payment details by gateway payment ID."""
        pass

    @abstractmethod
    async def refund_payment(
        self,
        payment_id: str,
        amount_cents: Optional[int] = None,
        notes: Optional[Dict[str, Any]] = None,
    ) -> RefundResult:
        """Issues full or partial refund for a captured payment."""
        pass


class PaymentProvider(PaymentGatewayProvider):
    """
    Backwards-compatible interface alias for existing callers.
    """
    async def create_payment_intent(
        self,
        amount: Decimal,
        currency: str = "INR",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> PaymentIntentResult:
        order = await self.create_order(
            amount_cents=int(amount * 100),
            currency=currency,
            notes=metadata,
        )
        return PaymentIntentResult(
            transaction_id=order.order_id,
            status=order.status,
            amount=amount,
            currency=currency,
            raw_response=order.raw_response,
        )

    async def capture_payment(self, transaction_id: str) -> PaymentIntentResult:
        details = await self.fetch_payment(transaction_id)
        return PaymentIntentResult(
            transaction_id=details.payment_id,
            status=details.status,
            amount=Decimal(details.amount_cents) / Decimal(100),
            currency=details.currency,
            raw_response=details.raw_response,
        )
