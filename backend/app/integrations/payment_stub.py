import hashlib
import hmac
import uuid
from decimal import Decimal
from typing import Any, Dict, Optional
from app.core.logging import logger
from app.interfaces.payment import (
    PaymentDetailsResult,
    PaymentGatewayProvider,
    PaymentIntentResult,
    PaymentOrderResult,
    PaymentProvider,
    RefundResult,
)


class StubPaymentProvider(PaymentProvider):
    """
    Simulated payment provider for development and testing environments.
    """

    def __init__(self, key_secret: str = "stub_secret_key"):
        self.key_secret = key_secret
        self.webhook_secret = "stub_webhook_secret"

    async def create_order(
        self,
        amount_cents: int,
        currency: str = "INR",
        receipt: str = "",
        notes: Optional[Dict[str, Any]] = None,
    ) -> PaymentOrderResult:
        order_id = f"order_stub_{uuid.uuid4().hex[:14]}"
        logger.info(f"[StubPayment] Created order {order_id} for {amount_cents} cents")
        return PaymentOrderResult(
            order_id=order_id,
            amount_cents=amount_cents,
            currency=currency,
            receipt=receipt,
            status="created",
            raw_response={"id": order_id, "amount": amount_cents, "currency": currency, "mock": True},
        )

    def verify_payment_signature(
        self,
        order_id: str,
        payment_id: str,
        signature: str,
    ) -> bool:
        expected = hmac.new(
            self.key_secret.encode("utf-8"),
            f"{order_id}|{payment_id}".encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected, signature) or signature == "valid_mock_signature"

    def verify_webhook_signature(
        self,
        payload_bytes: bytes,
        signature: str,
    ) -> bool:
        expected = hmac.new(
            self.webhook_secret.encode("utf-8"),
            payload_bytes,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected, signature) or signature == "valid_mock_webhook_signature"

    async def fetch_payment(self, payment_id: str) -> PaymentDetailsResult:
        return PaymentDetailsResult(
            payment_id=payment_id,
            amount_cents=10000,
            currency="INR",
            status="captured",
            method="card",
            card_network="Visa",
            card_last4="4242",
            raw_response={"mock": True},
        )

    async def refund_payment(
        self,
        payment_id: str,
        amount_cents: Optional[int] = None,
        notes: Optional[Dict[str, Any]] = None,
    ) -> RefundResult:
        rfnd_id = f"rfnd_stub_{uuid.uuid4().hex[:14]}"
        return RefundResult(
            refund_id=rfnd_id,
            payment_id=payment_id,
            amount_cents=amount_cents or 0,
            currency="INR",
            status="processed",
            raw_response={"id": rfnd_id, "status": "processed", "mock": True},
        )

    async def create_payment_intent(
        self,
        amount: Decimal,
        currency: str = "INR",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> PaymentIntentResult:
        tx_id = f"pi_mock_{uuid.uuid4().hex[:16]}"
        logger.info(
            f"[StubPayment] Created payment intent {tx_id} for {amount} {currency}"
        )
        return PaymentIntentResult(
            transaction_id=tx_id,
            client_secret=f"{tx_id}_secret_{uuid.uuid4().hex[:8]}",
            status="requires_payment_method",
            amount=amount,
            currency=currency,
            raw_response={"mock": True, "created": True, "metadata": metadata or {}},
        )

    async def capture_payment(self, transaction_id: str) -> PaymentIntentResult:
        logger.info(f"[StubPayment] Captured payment {transaction_id}")
        return PaymentIntentResult(
            transaction_id=transaction_id,
            status="succeeded",
            amount=Decimal("0.00"),
            currency="INR",
            raw_response={"mock": True, "status": "succeeded"},
        )


_payment_instance: Optional[PaymentProvider] = None


def get_payment_provider() -> PaymentProvider:
    global _payment_instance
    if _payment_instance is None:
        _payment_instance = StubPaymentProvider()
    return _payment_instance
