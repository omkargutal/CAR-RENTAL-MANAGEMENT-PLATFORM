# Payment Gateway Integration Guide

This document describes the payment processing architecture, provider interfaces, webhook handling, and cryptographic verification implemented in the AutoFleet Car Rental Platform.

---

## 1. Provider-Independent Architecture

Payment functionality is abstracted behind the abstract base class `PaymentGateway` defined in `backend/app/modules/payments/interfaces.py`:

```python
class PaymentGateway(ABC):
    @abstractmethod
    async def create_order(self, amount: Decimal, currency: str, receipt: str, notes: dict) -> PaymentOrderResponse:
        ...

    @abstractmethod
    def verify_payment_signature(self, order_id: str, payment_id: str, signature: str) -> bool:
        ...

    @abstractmethod
    def verify_webhook_signature(self, payload: bytes, signature: str) -> bool:
        ...

    @abstractmethod
    async def refund(self, payment_id: str, amount: Decimal) -> RefundResponse:
        ...
```

The primary active implementation is `RazorpayPaymentGateway` (`backend/app/integrations/razorpay.py`), with extensible support for Stripe and other providers.

---

## 2. Payment Lifecycle Workflow

1. **Order Creation (`POST /api/v1/payments/orders`)**:
   - The customer initiates payment for a booking.
   - The backend validates booking status and creates an internal `payment_orders` record.
   - The backend interacts with Razorpay to register an order and receives `gateway_order_id` (e.g. `order_xyz`).
   - The client receives the order ID, amount in cents, currency, and public Razorpay Key ID.

2. **Client-Side Checkout**:
   - The frontend opens Razorpay Checkout modal with the order parameters.
   - The customer enters credit card, UPI, net banking, or wallet credentials directly inside Razorpay's secure frame (PCI DSS compliant; no sensitive card data touches our backend).

3. **Signature Verification (`POST /api/v1/payments/verify`)**:
   - Upon successful payment in the modal, Razorpay returns `razorpay_payment_id`, `razorpay_order_id`, and `razorpay_signature`.
   - The backend computes an HMAC SHA256 signature of `${razorpay_order_id}|${razorpay_payment_id}` using `RAZORPAY_KEY_SECRET`.
   - If the signature matches:
     - The booking status transitions to `CONFIRMED`.
     - A `payment_transactions` record is logged with payment method and last 4 digits (if card).
     - Customer confirmation notifications are triggered.

4. **Asynchronous Webhook Processing (`POST /api/v1/payments/webhook`)**:
   - Webhooks handle background reconciliation (e.g. payment authorized, payment captured, payment failed, refund processed).
   - Webhooks are cryptographically authenticated using `RAZORPAY_WEBHOOK_SECRET` via `X-Razorpay-Signature`.
   - Webhook processing is idempotent: duplicate webhook deliveries are safely ignored.

---

## 3. Environment Configuration

To configure Razorpay in `.env`:
```ini
PAYMENT_PROVIDER=razorpay
RAZORPAY_KEY_ID=rzp_live_your_actual_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
RAZORPAY_CURRENCY=INR
```
For local testing or development, test mode keys (`rzp_test_...`) can be used safely.
