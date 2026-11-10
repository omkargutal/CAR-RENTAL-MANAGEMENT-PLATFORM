from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field
from app.modules.payments.models import PaymentMethod, PaymentStatus, PaymentType


class PaymentCreateIntent(BaseModel):
    booking_id: uuid.UUID
    amount: Decimal
    currency: str = "INR"
    payment_method: PaymentMethod = PaymentMethod.CREDIT_CARD


class PaymentIntentResponse(BaseModel):
    payment_id: uuid.UUID
    transaction_reference: str
    client_secret: Optional[str] = None
    amount: Decimal
    currency: str
    status: PaymentStatus


class PaymentOrderCreate(BaseModel):
    booking_id: uuid.UUID
    payment_type: PaymentType = PaymentType.FULL
    amount_cents: Optional[int] = Field(None, description="Optional custom amount in cents. If omitted, calculated from booking.")


class PaymentOrderResponse(BaseModel):
    order_id: str
    order_db_id: uuid.UUID
    booking_id: uuid.UUID
    amount_cents: int
    amount: Decimal
    currency: str
    key_id: str
    payment_type: str
    receipt_number: str
    status: str


class PaymentVerifyRequest(BaseModel):
    order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class PaymentVerifyResponse(BaseModel):
    payment_id: uuid.UUID
    transaction_reference: str
    status: str
    receipt_number: str
    booking_id: uuid.UUID
    booking_status: str
    amount: Decimal
    currency: str
    message: str


class PaymentFailureRequest(BaseModel):
    order_id: str
    error_code: Optional[str] = None
    error_description: Optional[str] = None
    error_source: Optional[str] = None


class PaymentRefundRequest(BaseModel):
    amount_cents: Optional[int] = Field(None, description="Amount in minor units (cents). If null, full refund is issued.")
    reason: str = Field(..., min_length=3, max_length=255)


class PaymentRefundResponse(BaseModel):
    refund_id: uuid.UUID
    refund_reference: str
    payment_id: uuid.UUID
    booking_id: uuid.UUID
    amount_cents: int
    amount: Decimal
    currency: str
    status: str
    gateway_refund_id: Optional[str] = None
    created_at: datetime


class PaymentReceiptItem(BaseModel):
    description: str
    amount: Decimal


class PaymentReceiptResponse(BaseModel):
    receipt_number: str
    payment_id: uuid.UUID
    order_reference: Optional[str] = None
    transaction_reference: str
    payment_method: str
    status: str
    date: datetime
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    booking_reference: str
    vehicle_name: str
    start_datetime: datetime
    end_datetime: datetime
    base_amount: Decimal
    deposit_amount: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    total_paid: Decimal
    currency: str
    line_items: List[PaymentReceiptItem]


class PaymentTransactionRead(BaseModel):
    id: uuid.UUID
    payment_id: Optional[uuid.UUID] = None
    order_id: Optional[uuid.UUID] = None
    booking_id: Optional[uuid.UUID] = None
    transaction_type: str
    amount_cents: int
    amount: Decimal
    currency: str
    status: str
    gateway_reference: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaymentRead(BaseModel):
    id: uuid.UUID
    booking_id: uuid.UUID
    order_id: Optional[uuid.UUID] = None
    transaction_reference: str
    provider: str
    amount: Decimal
    amount_cents: Optional[int] = None
    currency: str
    status: str
    payment_method: PaymentMethod
    receipt_number: Optional[str] = None
    payment_type: str
    gateway_order_id: Optional[str] = None
    gateway_payment_id: Optional[str] = None
    card_network: Optional[str] = None
    card_last4: Optional[str] = None
    upi_vpa: Optional[str] = None
    failure_reason: Optional[str] = None
    captured_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
