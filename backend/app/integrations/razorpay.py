import hashlib
import hmac
import uuid
from typing import Any, Dict, Optional
import httpx
from app.core.config import settings
from app.core.logging import logger
from app.interfaces.payment import (
    PaymentDetailsResult,
    PaymentGatewayProvider,
    PaymentOrderResult,
    RefundResult,
)


class RazorpayPaymentProvider(PaymentGatewayProvider):
    """
    Razorpay payment gateway integration provider.
    Supports Order Creation, HMAC SHA256 Signature Verification, Webhook Verification,
    and Gateway Refunds.
    """

    def __init__(
        self,
        key_id: Optional[str] = None,
        key_secret: Optional[str] = None,
        webhook_secret: Optional[str] = None,
        base_url: str = "https://api.razorpay.com/v1",
    ):
        self.key_id = key_id or settings.RAZORPAY_KEY_ID
        self.key_secret = key_secret or settings.RAZORPAY_KEY_SECRET
        self.webhook_secret = webhook_secret or settings.RAZORPAY_WEBHOOK_SECRET
        self.base_url = base_url.rstrip("/")

    def verify_payment_signature(
        self,
        order_id: str,
        payment_id: str,
        signature: str,
    ) -> bool:
        """
        Verifies Razorpay payment signature on backend.
        Razorpay calculates: HMAC-SHA256(order_id + "|" + razorpay_payment_id, secret)
        """
        if not order_id or not payment_id or not signature:
            return False
        
        msg = f"{order_id}|{payment_id}".encode("utf-8")
        expected_sig = hmac.new(
            self.key_secret.encode("utf-8"),
            msg,
            hashlib.sha256,
        ).hexdigest()

        is_valid = hmac.compare_digest(expected_sig, signature)
        if not is_valid:
            logger.warning(
                f"[Razorpay] Signature mismatch for order {order_id}, payment {payment_id}"
            )
        return is_valid

    def verify_webhook_signature(
        self,
        payload_bytes: bytes,
        signature: str,
    ) -> bool:
        """
        Verifies Razorpay webhook signature from 'X-Razorpay-Signature' header.
        Razorpay calculates: HMAC-SHA256(request_body, webhook_secret)
        """
        if not payload_bytes or not signature:
            return False

        expected_sig = hmac.new(
            self.webhook_secret.encode("utf-8"),
            payload_bytes,
            hashlib.sha256,
        ).hexdigest()

        is_valid = hmac.compare_digest(expected_sig, signature)
        if not is_valid:
            logger.warning("[Razorpay] Webhook signature mismatch")
        return is_valid

    def generate_signature(self, order_id: str, payment_id: str) -> str:
        """Utility for test suites or checkout simulation to sign payment payloads."""
        msg = f"{order_id}|{payment_id}".encode("utf-8")
        return hmac.new(
            self.key_secret.encode("utf-8"),
            msg,
            hashlib.sha256,
        ).hexdigest()

    def generate_webhook_signature(self, payload_bytes: bytes) -> str:
        """Utility for test suites to generate valid webhook signatures."""
        return hmac.new(
            self.webhook_secret.encode("utf-8"),
            payload_bytes,
            hashlib.sha256,
        ).hexdigest()

    async def create_order(
        self,
        amount_cents: int,
        currency: str = "INR",
        receipt: str = "",
        notes: Optional[Dict[str, Any]] = None,
    ) -> PaymentOrderResult:
        """Creates an order in Razorpay (or simulates in test mode)."""
        # If in test mode without outbound network access or mock test keys
        if "test" in self.key_id.lower() or "mock" in self.key_id.lower():
            order_id = f"order_rzp_{uuid.uuid4().hex[:14]}"
            logger.info(
                f"[Razorpay Test] Created order {order_id} for {amount_cents} cents (receipt: {receipt})"
            )
            return PaymentOrderResult(
                order_id=order_id,
                amount_cents=amount_cents,
                currency=currency,
                receipt=receipt,
                status="created",
                raw_response={
                    "id": order_id,
                    "entity": "order",
                    "amount": amount_cents,
                    "currency": currency,
                    "receipt": receipt,
                    "status": "created",
                    "notes": notes or {},
                    "mock": True,
                },
            )

        # Real Razorpay API Call
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{self.base_url}/orders",
                auth=(self.key_id, self.key_secret),
                json={
                    "amount": amount_cents,
                    "currency": currency,
                    "receipt": receipt,
                    "notes": notes or {},
                },
            )
            if resp.status_code not in (200, 201):
                logger.error(f"[Razorpay] Order creation failed: {resp.text}")
                resp.raise_for_status()

            data = resp.json()
            return PaymentOrderResult(
                order_id=data["id"],
                amount_cents=data["amount"],
                currency=data["currency"],
                receipt=data.get("receipt", receipt),
                status=data.get("status", "created"),
                raw_response=data,
            )

    async def fetch_payment(self, payment_id: str) -> PaymentDetailsResult:
        """Fetches payment details by payment ID."""
        if "test" in self.key_id.lower() or "mock" in self.key_id.lower() or payment_id.startswith("pay_sim_"):
            return PaymentDetailsResult(
                payment_id=payment_id,
                amount_cents=10000,
                currency="INR",
                status="captured",
                method="card",
                card_network="Visa",
                card_last4="4242",
                raw_response={"mock": True, "status": "captured"},
            )

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{self.base_url}/payments/{payment_id}",
                auth=(self.key_id, self.key_secret),
            )
            resp.raise_for_status()
            data = resp.json()
            card = data.get("card", {})
            return PaymentDetailsResult(
                payment_id=data["id"],
                order_id=data.get("order_id"),
                amount_cents=data["amount"],
                currency=data["currency"],
                status=data.get("status", "captured"),
                method=data.get("method"),
                card_network=card.get("network"),
                card_last4=card.get("last4"),
                upi_vpa=data.get("vpa"),
                email=data.get("email"),
                contact=data.get("contact"),
                raw_response=data,
            )

    async def refund_payment(
        self,
        payment_id: str,
        amount_cents: Optional[int] = None,
        notes: Optional[Dict[str, Any]] = None,
    ) -> RefundResult:
        """Issues refund for payment."""
        if "test" in self.key_id.lower() or "mock" in self.key_id.lower() or payment_id.startswith("pay_sim_"):
            rfnd_id = f"rfnd_rzp_{uuid.uuid4().hex[:14]}"
            logger.info(
                f"[Razorpay Test] Issued refund {rfnd_id} for payment {payment_id} (amount: {amount_cents})"
            )
            return RefundResult(
                refund_id=rfnd_id,
                payment_id=payment_id,
                amount_cents=amount_cents or 0,
                currency="INR",
                status="processed",
                raw_response={"id": rfnd_id, "status": "processed", "mock": True},
            )

        payload: Dict[str, Any] = {}
        if amount_cents is not None:
            payload["amount"] = amount_cents
        if notes:
            payload["notes"] = notes

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{self.base_url}/payments/{payment_id}/refund",
                auth=(self.key_id, self.key_secret),
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            return RefundResult(
                refund_id=data["id"],
                payment_id=data["payment_id"],
                amount_cents=data["amount"],
                currency=data["currency"],
                status=data.get("status", "processed"),
                raw_response=data,
            )


_razorpay_instance: Optional[RazorpayPaymentProvider] = None


def get_razorpay_provider() -> RazorpayPaymentProvider:
    global _razorpay_instance
    if _razorpay_instance is None:
        _razorpay_instance = RazorpayPaymentProvider()
    return _razorpay_instance
