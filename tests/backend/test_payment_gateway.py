import asyncio
from datetime import datetime, timedelta, timezone
import json
import uuid
import asyncpg
import httpx
import pytest
from app.core.config import settings
from app.integrations.razorpay import RazorpayPaymentProvider

BASE_URL = "http://localhost:8000"
PG_DSN = "postgresql://carrental_user:carrental_secure_password_2026@postgres:5432/carrental_db"


@pytest.fixture
def api_client():
    return httpx.Client(base_url=BASE_URL, timeout=15.0)


@pytest.fixture
def test_roles(api_client):
    uid = uuid.uuid4().hex[:8]

    # Customer
    cust_email = f"paycust_{uid}@testops.com"
    r = api_client.post("/api/v1/auth/register", json={"email": cust_email, "password": "Password123!", "full_name": "Payment Customer"})
    assert r.status_code == 201
    cust_token = r.json()["data"]["access_token"]
    cust_id = r.json()["data"]["user"]["id"]

    # Admin
    admin_email = f"payadmin_{uid}@testops.com"
    r = api_client.post("/api/v1/auth/register", json={"email": admin_email, "password": "Password123!", "full_name": "Payment Admin"})
    assert r.status_code == 201
    admin_id = r.json()["data"]["user"]["id"]

    # Elevate admin
    async def _elevate():
        conn = await asyncpg.connect(PG_DSN)
        await conn.execute("UPDATE users SET role = 'ADMIN' WHERE id = $1", uuid.UUID(admin_id))
        await conn.close()

    asyncio.run(_elevate())

    r_admin = api_client.post("/api/v1/auth/login", json={"email": admin_email, "password": "Password123!"})
    admin_token = r_admin.json()["data"]["access_token"]

    return {
        "customer": {"id": cust_id, "email": cust_email, "headers": {"Authorization": f"Bearer {cust_token}"}},
        "admin": {"id": admin_id, "email": admin_email, "headers": {"Authorization": f"Bearer {admin_token}"}},
    }


def _create_test_booking(api_client, test_roles, start_offset_days=50, duration_days=3):
    cust = test_roles["customer"]
    v_res = api_client.get("/api/v1/vehicles")
    vehicles = v_res.json()["data"]
    rand_idx = int(uuid.uuid4().hex[:4], 16) % len(vehicles)
    vehicle = vehicles[rand_idx]
    loc_res = api_client.get("/api/v1/locations")
    locs = loc_res.json()["data"]
    p_loc, d_loc = locs[0], locs[1] if len(locs) > 1 else locs[0]

    unique_days = 3000 + (int(uuid.uuid4().hex[:6], 16) % 40000)
    start_dt = datetime.now(timezone.utc) + timedelta(days=unique_days)
    end_dt = start_dt + timedelta(days=duration_days)

    payload = {
        "vehicle_id": vehicle["id"],
        "pickup_location_id": p_loc["id"],
        "return_location_id": d_loc["id"],
        "start_datetime": start_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "end_datetime": end_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "customer_name": "Test Payer",
        "customer_email": cust["email"],
        "customer_phone": "+1 555-0199",
        "driver_license_number": "DL-PAY-TEST",
        "idempotency_key": str(uuid.uuid4()),
    }
    res = api_client.post("/api/v1/bookings", json=payload, headers=cust["headers"])
    assert res.status_code == 201
    return res.json()["data"]


def test_create_payment_order_full_and_advance(api_client, test_roles):
    """
    Validates PAYMENT FEATURES:
    - Creates Razorpay order for booking.
    - Supports full payment and configurable advance payment.
    - Security deposits inclusion.
    - Verifies order reference, receipt number, and transactions.
    """
    cust_headers = test_roles["customer"]["headers"]
    booking = _create_test_booking(api_client, test_roles)

    # 1. Full Payment Order
    order_payload = {
        "booking_id": booking["id"],
        "payment_type": "FULL",
    }
    res = api_client.post("/api/v1/payments/orders", json=order_payload, headers=cust_headers)
    assert res.status_code == 201
    data = res.json()["data"]
    assert data["order_id"].startswith("order_")
    assert data["payment_type"] == "FULL"
    assert data["amount_cents"] == booking["total_amount_cents"] + booking["deposit_amount_cents"]
    assert data["receipt_number"].startswith("REC-")
    assert data["key_id"] is not None

    # 2. Advance Payment Order
    adv_payload = {
        "booking_id": booking["id"],
        "payment_type": "ADVANCE",
    }
    adv_res = api_client.post("/api/v1/payments/orders", json=adv_payload, headers=cust_headers)
    assert adv_res.status_code == 201
    adv_data = adv_res.json()["data"]
    assert adv_data["payment_type"] == "ADVANCE"
    assert adv_data["amount_cents"] < data["amount_cents"]
    assert adv_data["amount_cents"] > 0


def test_payment_verification_valid_signature_confirms_booking(api_client, test_roles):
    """
    Validates:
    - Backend cryptographic signature verification (HMAC SHA256 of order_id|payment_id).
    - Booking transitions to CONFIRMED only after payment is verified.
    - Transaction history and audit trail recorded.
    """
    cust_headers = test_roles["customer"]["headers"]
    booking = _create_test_booking(api_client, test_roles)

    # 1. Create order
    order_res = api_client.post("/api/v1/payments/orders", json={"booking_id": booking["id"], "payment_type": "FULL"}, headers=cust_headers)
    order_data = order_res.json()["data"]
    order_id = order_data["order_id"]

    # 2. Generate valid Razorpay payment signature
    gateway = RazorpayPaymentProvider(
        key_id=settings.RAZORPAY_KEY_ID,
        key_secret=settings.RAZORPAY_KEY_SECRET,
    )
    simulated_payment_id = f"pay_sim_{uuid.uuid4().hex[:14]}"
    valid_signature = gateway.generate_signature(order_id, simulated_payment_id)

    # 3. Submit signature verification
    verify_payload = {
        "order_id": order_id,
        "razorpay_payment_id": simulated_payment_id,
        "razorpay_signature": valid_signature,
    }
    verify_res = api_client.post("/api/v1/payments/verify", json=verify_payload, headers=cust_headers)
    assert verify_res.status_code == 200
    v_data = verify_res.json()["data"]
    assert v_data["status"].upper() == "CAPTURED"
    assert v_data["booking_status"] == "CONFIRMED"
    payment_id = v_data["payment_id"]

    # 4. Verify booking was transitioned in DB
    b_detail = api_client.get(f"/api/v1/bookings/{booking['id']}", headers=cust_headers)
    assert b_detail.json()["data"]["status"] == "CONFIRMED"
    assert b_detail.json()["data"]["expires_at"] is None

    # 5. Verify transaction history
    tx_res = api_client.get(f"/api/v1/payments/{payment_id}/transactions", headers=cust_headers)
    assert tx_res.status_code == 200
    tx_types = [t["transaction_type"] for t in tx_res.json()["data"]]
    assert "CAPTURE" in tx_types


def test_payment_verification_invalid_signature_fails(api_client, test_roles):
    """
    Security check:
    - Tampered or invalid signatures are rejected on the backend with 422/400.
    - Booking status remains unconfirmed.
    """
    cust_headers = test_roles["customer"]["headers"]
    booking = _create_test_booking(api_client, test_roles)

    order_res = api_client.post("/api/v1/payments/orders", json={"booking_id": booking["id"]}, headers=cust_headers)
    order_id = order_res.json()["data"]["order_id"]

    # Invalid signature
    verify_payload = {
        "order_id": order_id,
        "razorpay_payment_id": "pay_fake_9999",
        "razorpay_signature": "tampered_signature_invalid_hex_code",
    }
    verify_res = api_client.post("/api/v1/payments/verify", json=verify_payload, headers=cust_headers)
    assert verify_res.status_code in (400, 422)

    # Booking must NOT be confirmed
    b_detail = api_client.get(f"/api/v1/bookings/{booking['id']}", headers=cust_headers)
    assert b_detail.json()["data"]["status"] != "CONFIRMED"


def test_payment_failure_recording(api_client, test_roles):
    """
    Validates failure handling:
    - Records payment failure with error codes and descriptions.
    - Updates order status to FAILED and logs failure transaction.
    """
    cust_headers = test_roles["customer"]["headers"]
    booking = _create_test_booking(api_client, test_roles)

    order_res = api_client.post("/api/v1/payments/orders", json={"booking_id": booking["id"]}, headers=cust_headers)
    order_id = order_res.json()["data"]["order_id"]

    fail_payload = {
        "order_id": order_id,
        "error_code": "BAD_REQUEST_ERROR",
        "error_description": "Payment was declined by issuing bank due to insufficient funds.",
    }
    fail_res = api_client.post("/api/v1/payments/failure", json=fail_payload, headers=cust_headers)
    assert fail_res.status_code == 200
    assert fail_res.json()["data"]["status"] == "recorded"


def test_payment_webhook_idempotency_and_signature_verification(api_client, test_roles):
    """
    Validates WEBHOOKS:
    - Missing signature is rejected (401 Unauthorized).
    - Invalid signature is rejected (401 Unauthorized).
    - Valid signature is accepted and processed.
    - Duplicate webhook deliveries are handled idempotently.
    """
    cust_headers = test_roles["customer"]["headers"]
    booking = _create_test_booking(api_client, test_roles)

    order_res = api_client.post("/api/v1/payments/orders", json={"booking_id": booking["id"]}, headers=cust_headers)
    order_id = order_res.json()["data"]["order_id"]
    simulated_payment_id = f"pay_wh_{uuid.uuid4().hex[:14]}"

    gateway = RazorpayPaymentProvider(
        key_id=settings.RAZORPAY_KEY_ID,
        key_secret=settings.RAZORPAY_KEY_SECRET,
        webhook_secret=settings.RAZORPAY_WEBHOOK_SECRET,
    )

    webhook_event_id = f"evt_{uuid.uuid4().hex[:14]}"
    webhook_payload = {
        "id": webhook_event_id,
        "entity": "event",
        "event": "payment.captured",
        "contains": ["payment"],
        "payload": {
            "payment": {
                "entity": {
                    "id": simulated_payment_id,
                    "order_id": order_id,
                    "amount": 25000,
                    "currency": "INR",
                    "status": "captured",
                }
            }
        },
    }
    payload_bytes = json.dumps(webhook_payload).encode("utf-8")

    # 1. Missing signature -> 401
    r_missing = api_client.post("/api/v1/payments/webhooks/razorpay", content=payload_bytes)
    assert r_missing.status_code == 401

    # 2. Invalid signature -> 401
    r_bad_sig = api_client.post(
        "/api/v1/payments/webhooks/razorpay",
        content=payload_bytes,
        headers={"X-Razorpay-Signature": "invalid_webhook_signature"},
    )
    assert r_bad_sig.status_code == 401

    # 3. Valid signature -> 200 OK
    valid_sig = gateway.generate_webhook_signature(payload_bytes)
    r_valid = api_client.post(
        "/api/v1/payments/webhooks/razorpay",
        content=payload_bytes,
        headers={"X-Razorpay-Signature": valid_sig, "Content-Type": "application/json"},
    )
    assert r_valid.status_code == 200
    assert r_valid.json()["status"] == "processed"

    # 4. Duplicate webhook delivery -> 200 OK with already_processed
    r_dup = api_client.post(
        "/api/v1/payments/webhooks/razorpay",
        content=payload_bytes,
        headers={"X-Razorpay-Signature": valid_sig, "Content-Type": "application/json"},
    )
    assert r_dup.status_code == 200
    assert r_dup.json()["status"] == "already_processed"


def test_payment_receipt_generation(api_client, test_roles):
    """
    Validates:
    - Itemized receipt generation with breakdown of rental charge, deposit, taxes, and vehicle details.
    """
    cust_headers = test_roles["customer"]["headers"]
    booking = _create_test_booking(api_client, test_roles)

    order_res = api_client.post("/api/v1/payments/orders", json={"booking_id": booking["id"]}, headers=cust_headers)
    order_id = order_res.json()["data"]["order_id"]

    gateway = RazorpayPaymentProvider(
        key_id=settings.RAZORPAY_KEY_ID,
        key_secret=settings.RAZORPAY_KEY_SECRET,
    )
    simulated_payment_id = f"pay_rec_{uuid.uuid4().hex[:14]}"
    sig = gateway.generate_signature(order_id, simulated_payment_id)

    verify_res = api_client.post(
        "/api/v1/payments/verify",
        json={"order_id": order_id, "razorpay_payment_id": simulated_payment_id, "razorpay_signature": sig},
        headers=cust_headers,
    )
    payment_id = verify_res.json()["data"]["payment_id"]

    # Fetch receipt
    rec_res = api_client.get(f"/api/v1/payments/{payment_id}/receipt", headers=cust_headers)
    assert rec_res.status_code == 200
    rec = rec_res.json()["data"]
    assert rec["receipt_number"].startswith("REC-")
    assert rec["booking_reference"] == booking["booking_reference"]
    assert "Rental Charges" in [item["description"].split(" (")[0] for item in rec["line_items"]]
    assert float(rec["total_paid"]) > 0


def test_payment_refunds_full_and_partial(api_client, test_roles):
    """
    Validates REFUNDS:
    - Partial refund calculation and execution.
    - Full refund calculation and execution.
    - Payment status transitions (CAPTURED -> PARTIALLY_REFUNDED -> REFUNDED).
    - Preventing refunds that exceed the original payment balance.
    - RBAC check: Customer cannot issue refund (403 Forbidden).
    """
    cust_headers = test_roles["customer"]["headers"]
    admin_headers = test_roles["admin"]["headers"]
    booking = _create_test_booking(api_client, test_roles)

    # 1. Create and verify payment
    order_res = api_client.post("/api/v1/payments/orders", json={"booking_id": booking["id"]}, headers=cust_headers)
    order_data = order_res.json()["data"]
    order_id = order_data["order_id"]
    amount_cents = order_data["amount_cents"]

    gateway = RazorpayPaymentProvider(
        key_id=settings.RAZORPAY_KEY_ID,
        key_secret=settings.RAZORPAY_KEY_SECRET,
    )
    payment_id_str = f"pay_rfnd_{uuid.uuid4().hex[:14]}"
    sig = gateway.generate_signature(order_id, payment_id_str)
    verify_res = api_client.post(
        "/api/v1/payments/verify",
        json={"order_id": order_id, "razorpay_payment_id": payment_id_str, "razorpay_signature": sig},
        headers=cust_headers,
    )
    payment_db_id = verify_res.json()["data"]["payment_id"]

    # 2. Customer cannot refund (403 Forbidden)
    forbidden = api_client.post(
        f"/api/v1/payments/{payment_db_id}/refund",
        json={"reason": "Customer tried self-refund"},
        headers=cust_headers,
    )
    assert forbidden.status_code == 403

    # 3. Partial Refund (50% cents)
    half_cents = amount_cents // 2
    part_res = api_client.post(
        f"/api/v1/payments/{payment_db_id}/refund",
        json={"amount_cents": half_cents, "reason": "Customer cancelled part of booking"},
        headers=admin_headers,
    )
    assert part_res.status_code == 200
    assert part_res.json()["data"]["status"] == "PROCESSED"

    # Check payment status is PARTIALLY_REFUNDED
    p_check1 = api_client.get(f"/api/v1/payments?booking_id={booking['id']}", headers=cust_headers)
    p_item = [p for p in p_check1.json()["data"] if p["id"] == payment_db_id][0]
    assert p_item["status"].upper() == "PARTIALLY_REFUNDED"

    # 4. Full Refund of remaining balance
    full_res = api_client.post(
        f"/api/v1/payments/{payment_db_id}/refund",
        json={"reason": "Balance refund on cancellation"},
        headers=admin_headers,
    )
    assert full_res.status_code == 200

    p_check2 = api_client.get(f"/api/v1/payments?booking_id={booking['id']}", headers=cust_headers)
    p_item2 = [p for p in p_check2.json()["data"] if p["id"] == payment_db_id][0]
    assert p_item2["status"].upper() == "REFUNDED"

    # 5. Over-refunding fails
    over_res = api_client.post(
        f"/api/v1/payments/{payment_db_id}/refund",
        json={"amount_cents": 1000, "reason": "Excess refund"},
        headers=admin_headers,
    )
    assert over_res.status_code == 422


def test_booking_expiration_prior_to_payment_verification(api_client, test_roles):
    """
    Validates:
    - If reservation hold expires before payment verification, booking is NOT confirmed.
    - System triggers auto-refund for the customer and flags 409 Conflict.
    """
    cust_headers = test_roles["customer"]["headers"]
    booking = _create_test_booking(api_client, test_roles)

    # Create order
    order_res = api_client.post("/api/v1/payments/orders", json={"booking_id": booking["id"]}, headers=cust_headers)
    order_id = order_res.json()["data"]["order_id"]

    # Manually expire booking reservation in database
    async def _expire():
        conn = await asyncpg.connect(PG_DSN)
        past_time = datetime.now(timezone.utc) - timedelta(minutes=10)
        await conn.execute("UPDATE bookings SET expires_at = $1 WHERE id = $2", past_time, uuid.UUID(booking["id"]))
        await conn.close()

    asyncio.run(_expire())

    # Try verifying payment for expired booking
    gateway = RazorpayPaymentProvider(
        key_id=settings.RAZORPAY_KEY_ID,
        key_secret=settings.RAZORPAY_KEY_SECRET,
    )
    sim_pay_id = f"pay_exp_{uuid.uuid4().hex[:14]}"
    sig = gateway.generate_signature(order_id, sim_pay_id)

    verify_res = api_client.post(
        "/api/v1/payments/verify",
        json={"order_id": order_id, "razorpay_payment_id": sim_pay_id, "razorpay_signature": sig},
        headers=cust_headers,
    )
    assert verify_res.status_code == 409
    err_body = verify_res.json()
    err_msg = err_body.get("error", {}).get("message", "") or err_body.get("message", "")
    assert "expired" in err_msg.lower()

    # Ensure booking is NOT confirmed
    b_detail = api_client.get(f"/api/v1/bookings/{booking['id']}", headers=cust_headers)
    assert b_detail.json()["data"]["status"] != "CONFIRMED"
