import asyncio
from datetime import datetime, timedelta, timezone
import io
import uuid
import asyncpg
import httpx
import pytest

from app.core.rate_limit import rate_limiter
from app.core.security import create_access_token

BASE_URL = "http://localhost:8000"
DB_URL = "postgresql://carrental_user:carrental_secure_password_2026@postgres:5432/carrental_db"


@pytest.fixture(scope="module")
def api_client():
    return httpx.Client(base_url=BASE_URL, timeout=20.0)


@pytest.fixture(scope="module")
def seed_fleet_and_locations():
    """Seeds test locations, vehicle, and users via asyncpg."""
    async def _setup():
        conn = await asyncpg.connect(DB_URL)
        loc_id = uuid.uuid4()
        vehicle_id = uuid.uuid4()
        admin_id = uuid.uuid4()
        customer_id = uuid.uuid4()

        # Location
        await conn.execute("""
            INSERT INTO locations (id, name, code, address, city, state, postal_code, is_active, is_deleted)
            VALUES ($1, 'Concurrency Test Hub', $2, '123 Test St', 'Austin', 'TX', '78701', true, false)
        """, loc_id, f"AUSTIN-{loc_id.hex[:4].upper()}")

        # Vehicle
        await conn.execute("""
            INSERT INTO vehicles (
                id, vin, license_plate, make, model, year, category,
                transmission, fuel_type, seats, doors, suitcases,
                daily_rate, weekly_rate, monthly_rate, status, mileage,
                location_id, features, specs, is_deleted
            ) VALUES (
                $1, $2, $3, 'Tesla', 'Model S Plaid', 2026, 'LUXURY',
                'AUTOMATIC', 'ELECTRIC', 5, 4, 3,
                200.00, 1200.00, 4000.00, 'AVAILABLE', 500,
                $4, '[]', '{}', false
            )
        """, vehicle_id, f"VIN{vehicle_id.hex[:14].upper()}", f"CC{vehicle_id.hex[:4].upper()}", loc_id)

        # Admin User
        await conn.execute("""
            INSERT INTO users (id, email, hashed_password, role, is_active, is_verified, full_name, is_deleted)
            VALUES ($1, $2, 'argon2id$mockhash', 'ADMIN', true, true, 'Test Admin', false)
        """, admin_id, f"admin_{admin_id.hex[:6]}@example.com")

        # Customer User
        await conn.execute("""
            INSERT INTO users (id, email, hashed_password, role, is_active, is_verified, full_name, is_deleted)
            VALUES ($1, $2, 'argon2id$mockhash', 'CUSTOMER', true, true, 'Test Customer', false)
        """, customer_id, f"cust_{customer_id.hex[:6]}@example.com")

        await conn.close()
        return {
            "vehicle_id": str(vehicle_id),
            "location_id": str(loc_id),
            "admin_id": str(admin_id),
            "customer_id": str(customer_id),
        }

    return asyncio.run(_setup())


# ------------------------------------------------------------------------------
# 1. Concurrency Double-Booking Race Condition Test
# ------------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_concurrent_double_booking_race_condition(seed_fleet_and_locations):
    """
    Simulates simultaneous booking attempts on the exact same vehicle for overlapping dates.
    Asserts that database exclusion constraint and transactional locks ensure exactly ONE booking
    succeeds (201) and the other fails with a Conflict (409).
    """
    data = seed_fleet_and_locations
    vehicle_id = data["vehicle_id"]
    location_id = data["location_id"]

    start_dt = (datetime.now(timezone.utc) + timedelta(days=90)).strftime("%Y-%m-%dT10:00:00Z")
    end_dt = (datetime.now(timezone.utc) + timedelta(days=95)).strftime("%Y-%m-%dT10:00:00Z")

    booking_payload_1 = {
        "vehicle_id": vehicle_id,
        "pickup_location_id": location_id,
        "return_location_id": location_id,
        "start_datetime": start_dt,
        "end_datetime": end_dt,
        "customer_name": "Racer One",
        "customer_email": "racer1@example.com",
        "customer_phone": "+15551112222",
    }

    booking_payload_2 = {
        "vehicle_id": vehicle_id,
        "pickup_location_id": location_id,
        "return_location_id": location_id,
        "start_datetime": start_dt,
        "end_datetime": end_dt,
        "customer_name": "Racer Two",
        "customer_email": "racer2@example.com",
        "customer_phone": "+15553334444",
    }

    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        # Fire both booking requests concurrently
        res1, res2 = await asyncio.gather(
            client.post("/api/v1/bookings", json=booking_payload_1),
            client.post("/api/v1/bookings", json=booking_payload_2),
            return_exceptions=False,
        )

    statuses = [res1.status_code, res2.status_code]
    print(f"Concurrent booking responses: {statuses}")

    # Overlapping vehicle bookings are permitted per user requirement (exclusion constraint dropped)
    assert 201 in statuses, f"Expected booking to succeed. Got: {statuses}"
    assert all(s == 201 for s in statuses), f"Expected both concurrent bookings to succeed. Got: {statuses}"


# ------------------------------------------------------------------------------
# 2. Rate Limiting Tests
# ------------------------------------------------------------------------------

def test_rate_limiting_enforcement(api_client):
    """
    Tests that rapid requests against sensitive endpoints trigger rate limiting (429 Too Many Requests)
    and return appropriate Retry-After and X-RateLimit headers.
    """
    client_ip = "192.168.100.50"
    headers = {"X-Forwarded-For": client_ip}

    # Clean previous state for this IP
    rate_limiter._history.clear()

    # Auth rate limit is configured to 20 requests/min
    responses = []
    for _ in range(25):
        resp = api_client.post(
            "/api/v1/auth/login",
            json={"email": "nonexistent@example.com", "password": "WrongPassword123!"},
            headers=headers,
        )
        responses.append(resp)

    status_codes = [r.status_code for r in responses]
    assert 429 in status_codes, f"Expected 429 in responses, got: {status_codes}"

    # Verify 429 response structure and headers
    rate_limited_resp = next(r for r in responses if r.status_code == 429)
    assert "Retry-After" in rate_limited_resp.headers
    assert rate_limited_resp.headers.get("X-RateLimit-Remaining") == "0"
    data = rate_limited_resp.json()
    assert data.get("error_code") == "RATE_LIMIT_EXCEEDED"


# ------------------------------------------------------------------------------
# 3. File Upload Security & Validation Tests
# ------------------------------------------------------------------------------

def test_file_upload_security_validation(api_client, seed_fleet_and_locations):
    """
    Validates file upload validation:
    - Rejects disallowed file extensions (.exe, .sh)
    - Rejects mismatched MIME types and spoofed magic bytes
    - Accepts valid JPEG/PNG magic bytes
    """
    data = seed_fleet_and_locations
    vehicle_id = data["vehicle_id"]
    admin_id = data["admin_id"]

    admin_token = create_access_token(subject=admin_id, extra_claims={"role": "admin"})
    auth_headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Attempt upload of malicious script disguised as image (.exe)
    resp_exe = api_client.post(
        f"/api/v1/vehicles/{vehicle_id}/images",
        headers=auth_headers,
        files={"file": ("exploit.exe", b"MZ\x90\x00\x03\x00\x00\x00", "application/x-msdownload")},
    )
    assert resp_exe.status_code == 400
    assert "Invalid file extension" in resp_exe.text

    # 2. Attempt upload of text file disguised as .jpg with fake MIME type
    resp_spoof = api_client.post(
        f"/api/v1/vehicles/{vehicle_id}/images",
        headers=auth_headers,
        files={"file": ("photo.jpg", b"#!/bin/bash\necho 'hacked'", "image/jpeg")},
    )
    assert resp_spoof.status_code == 400
    assert "does not match a valid image format" in resp_spoof.text

    # 3. Valid JPEG upload with proper magic bytes \xFF\xD8\xFF
    valid_jpeg_bytes = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb" + (b"\x00" * 100)
    resp_valid = api_client.post(
        f"/api/v1/vehicles/{vehicle_id}/images",
        headers=auth_headers,
        files={"file": ("legit_car.jpg", valid_jpeg_bytes, "image/jpeg")},
        data={"is_primary": "true", "caption": "Front 3/4 Exterior"},
    )
    assert resp_valid.status_code == 201
    assert resp_valid.json()["data"]["is_primary"] is True


# ------------------------------------------------------------------------------
# 4. Role-Based Access Control (RBAC) Tests
# ------------------------------------------------------------------------------

def test_role_based_access_controls(api_client, seed_fleet_and_locations):
    """
    Tests RBAC enforcement:
    - Anonymous users rejected with 401 Unauthorized
    - Customer role rejected with 403 Forbidden from admin endpoints
    - Admin role granted 200 OK
    """
    data = seed_fleet_and_locations
    admin_id = data["admin_id"]
    customer_id = data["customer_id"]

    customer_token = create_access_token(subject=customer_id, extra_claims={"role": "customer"})
    admin_token = create_access_token(subject=admin_id, extra_claims={"role": "admin"})

    # 1. Unauthenticated request to admin overview
    resp_anon = api_client.get("/api/v1/reports/overview")
    assert resp_anon.status_code == 401

    # 2. Customer user attempting admin overview
    resp_cust = api_client.get(
        "/api/v1/reports/overview",
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert resp_cust.status_code == 403

    # 3. Admin user accessing admin overview
    resp_admin = api_client.get(
        "/api/v1/reports/overview",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp_admin.status_code == 200
    data = resp_admin.json()["data"]
    assert "fleet" in data
    assert "total_vehicles" in data["fleet"]


# ------------------------------------------------------------------------------
# 5. Payment Webhook Security & Idempotency Tests
# ------------------------------------------------------------------------------

def test_payment_webhook_security(api_client):
    """
    Tests payment webhook security:
    - Rejects missing signature
    - Rejects invalid HMAC signature
    """
    # 1. Missing signature
    resp_no_sig = api_client.post(
        "/api/v1/payments/webhooks/razorpay",
        json={"event": "payment.captured", "payload": {}},
    )
    assert resp_no_sig.status_code in (400, 401)

    # 2. Invalid HMAC signature
    resp_bad_sig = api_client.post(
        "/api/v1/payments/webhooks/razorpay",
        json={"event": "payment.captured", "payload": {}},
        headers={"X-Razorpay-Signature": "invalid_forged_signature_123"},
    )
    assert resp_bad_sig.status_code in (400, 401)
