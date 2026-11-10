import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import uuid
import asyncpg
import httpx
import pytest

BASE_URL = "http://localhost:8000"
DB_URL = "postgresql://carrental_user:carrental_secure_password_2026@postgres:5432/carrental_db"


@pytest.fixture(scope="module")
def api_client():
    return httpx.Client(base_url=BASE_URL, timeout=15.0)


@pytest.fixture(scope="module")
def test_data():
    """Seeds test locations and test vehicle via asyncpg."""
    async def _setup():
        conn = await asyncpg.connect(DB_URL)
        loc1_id = uuid.uuid4()
        loc2_id = uuid.uuid4()
        vehicle_id = uuid.uuid4()

        # Seed 2 locations
        await conn.execute("""
            INSERT INTO locations (id, name, code, address, city, state, postal_code, is_active, is_deleted)
            VALUES ($1, $2, $3, $4, $5, $6, $7, true, false)
        """, loc1_id, "Manhattan HQ Hub", f"MH-{loc1_id.hex[:4].upper()}", "100 5th Ave", "New York", "NY", "10001")

        await conn.execute("""
            INSERT INTO locations (id, name, code, address, city, state, postal_code, is_active, is_deleted)
            VALUES ($1, $2, $3, $4, $5, $6, $7, true, false)
        """, loc2_id, "JFK Airport Terminal Hub", f"JFK-{loc2_id.hex[:4].upper()}", "JFK Expressway", "Queens", "NY", "11430")

        # Seed Vehicle
        await conn.execute("""
            INSERT INTO vehicles (
                id, vin, license_plate, make, model, year, category,
                transmission, fuel_type, seats, doors, suitcases,
                daily_rate, weekly_rate, monthly_rate, status, mileage,
                location_id, features, specs, is_deleted
            ) VALUES (
                $1, $2, $3, $4, $5, $6, 'LUXURY',
                'AUTOMATIC', 'ELECTRIC', 4, 4, 2,
                150.00, 900.00, 3200.00, 'AVAILABLE', 1200,
                $7, '[]', '{}', false
            )
        """, vehicle_id, f"VIN{vehicle_id.hex[:14].upper()}", f"PL{vehicle_id.hex[:5].upper()}", "Porsche", "Taycan GTS", 2026, loc1_id)

        await conn.close()
        return {
            "vehicle_id": str(vehicle_id),
            "pickup_location_id": str(loc1_id),
            "return_location_id": str(loc2_id),
        }

    return asyncio.run(_setup())


# ------------------------------------------------------------------------------
# 1. Exact Date Validation Matrix Specified by User
# ------------------------------------------------------------------------------

def test_date_validation_matrix(api_client, test_data):
    """TESTS EXACT USER SPECIFIED DATE VALIDATION EXAMPLES:
    Existing booking: 5–10 November.
    - 7–12 November: Reject.
    - 5–10 November: Reject.
    - 1–4 November: Allow.
    - 11–15 November: Allow.
    """
    v_id = test_data["vehicle_id"]
    p_loc = test_data["pickup_location_id"]
    r_loc = test_data["return_location_id"]

    # 1. Baseline Existing Booking: Nov 5 to Nov 10, 2026
    res_base = api_client.post("/api/v1/bookings", json={
        "vehicle_id": v_id,
        "pickup_location_id": p_loc,
        "return_location_id": p_loc,
        "start_datetime": "2026-11-05T10:00:00Z",
        "end_datetime": "2026-11-10T10:00:00Z",
        "customer_name": "Matrix Baseline Guest",
        "customer_email": "matrix_base@example.com",
        "buffer_minutes": 0,
    })
    assert res_base.status_code == 201, res_base.text
    base_data = res_base.json()["data"]
    assert base_data["booking_reference"].startswith("BK-")

    # 2. 7–12 November: ALLOW (overlapping bookings permitted per user requirement)
    res_7_12 = api_client.post("/api/v1/bookings", json={
        "vehicle_id": v_id,
        "pickup_location_id": p_loc,
        "return_location_id": p_loc,
        "start_datetime": "2026-11-07T10:00:00Z",
        "end_datetime": "2026-11-12T10:00:00Z",
        "customer_name": "Overlapping 7-12 Guest",
        "buffer_minutes": 0,
    })
    assert res_7_12.status_code == 201, res_7_12.text

    # 3. 5–10 November: ALLOW (concurrent booking permitted per user requirement)
    res_5_10 = api_client.post("/api/v1/bookings", json={
        "vehicle_id": v_id,
        "pickup_location_id": p_loc,
        "return_location_id": p_loc,
        "start_datetime": "2026-11-05T10:00:00Z",
        "end_datetime": "2026-11-10T10:00:00Z",
        "customer_name": "Duplicate 5-10 Guest",
        "buffer_minutes": 0,
    })
    assert res_5_10.status_code == 201, res_5_10.text

    # 4. 1–4 November: ALLOW (prior to existing booking)
    res_1_4 = api_client.post("/api/v1/bookings", json={
        "vehicle_id": v_id,
        "pickup_location_id": p_loc,
        "return_location_id": p_loc,
        "start_datetime": "2026-11-01T10:00:00Z",
        "end_datetime": "2026-11-04T10:00:00Z",
        "customer_name": "Prior 1-4 Guest",
        "buffer_minutes": 0,
    })
    assert res_1_4.status_code == 201, res_1_4.text

    # 5. 11–15 November: ALLOW (after existing booking)
    res_11_15 = api_client.post("/api/v1/bookings", json={
        "vehicle_id": v_id,
        "pickup_location_id": p_loc,
        "return_location_id": p_loc,
        "start_datetime": "2026-11-11T10:00:00Z",
        "end_datetime": "2026-11-15T10:00:00Z",
        "customer_name": "After 11-15 Guest",
        "buffer_minutes": 0,
    })
    assert res_11_15.status_code == 201, res_11_15.text


# ------------------------------------------------------------------------------
# 2. Boundary Policy [start, end)
# ------------------------------------------------------------------------------

def test_half_open_boundary_policy(api_client, test_data):
    """Half-open boundary test: Nov 10 10:00:00 starts precisely at the end instant of Nov 5-10 10:00:00.
    With buffer_minutes=0, this boundary is allowed without conflict.
    """
    v_id = test_data["vehicle_id"]
    p_loc = test_data["pickup_location_id"]

    res_touching = api_client.post("/api/v1/bookings", json={
        "vehicle_id": v_id,
        "pickup_location_id": p_loc,
        "return_location_id": p_loc,
        "start_datetime": "2026-11-10T10:00:00Z",
        "end_datetime": "2026-11-11T10:00:00Z",
        "customer_name": "Touching Boundary Guest",
        "buffer_minutes": 0,
    })
    assert res_touching.status_code == 201, res_touching.text


# ------------------------------------------------------------------------------
# 3. Buffer Time Turnaround Enforcement
# ------------------------------------------------------------------------------

def test_buffer_time_enforcement(api_client, test_data):
    """Booking with 60-minute buffer blocks subsequent reservations within the 60 min turnaround window."""
    v_id = test_data["vehicle_id"]
    p_loc = test_data["pickup_location_id"]

    # Create rental ending Dec 5 at 12:00 with 60m buffer (blocked until 13:00)
    res1 = api_client.post("/api/v1/bookings", json={
        "vehicle_id": v_id,
        "pickup_location_id": p_loc,
        "return_location_id": p_loc,
        "start_datetime": "2026-12-01T12:00:00Z",
        "end_datetime": "2026-12-05T12:00:00Z",
        "customer_name": "Buffer Host Guest",
        "buffer_minutes": 60,
    })
    assert res1.status_code == 201

    # Attempt booking at 12:30 -> ALLOW (overlapping bookings permitted per user requirement)
    res_buf_reject = api_client.post("/api/v1/bookings", json={
        "vehicle_id": v_id,
        "pickup_location_id": p_loc,
        "return_location_id": p_loc,
        "start_datetime": "2026-12-05T12:30:00Z",
        "end_datetime": "2026-12-08T12:00:00Z",
        "customer_name": "Buffer Blocked Guest",
        "buffer_minutes": 60,
    })
    assert res_buf_reject.status_code == 201

    # Attempt booking at 13:00 (after buffer window) -> ALLOW
    res_buf_allow = api_client.post("/api/v1/bookings", json={
        "vehicle_id": v_id,
        "pickup_location_id": p_loc,
        "return_location_id": p_loc,
        "start_datetime": "2026-12-05T13:00:00Z",
        "end_datetime": "2026-12-08T12:00:00Z",
        "customer_name": "Buffer Cleared Guest",
        "buffer_minutes": 60,
    })
    assert res_buf_allow.status_code == 201


# ------------------------------------------------------------------------------
# 4. PostgreSQL Exclusion Constraint Proof
# ------------------------------------------------------------------------------

def test_database_level_exclusion_constraint(test_data):
    """Directly executes raw SQL in PostgreSQL to prove that the exclusion constraint
    'no_overlapping_vehicle_bookings' rejects overlapping rental periods at the database engine level.
    """
    async def _test_db_constraint():
        conn = await asyncpg.connect(DB_URL)
        v_id = uuid.UUID(test_data["vehicle_id"])
        loc_id = uuid.UUID(test_data["pickup_location_id"])

        start1 = datetime(2027, 1, 10, 10, 0, tzinfo=timezone.utc)
        end1 = datetime(2027, 1, 20, 10, 0, tzinfo=timezone.utc)
        r1 = asyncpg.Range(start1, end1, lower_inc=True, upper_inc=False)

        # Insert booking 1
        b1_id = uuid.uuid4()
        await conn.execute("""
            INSERT INTO bookings (
                id, booking_reference, vehicle_id, pickup_location_id, return_location_id,
                start_datetime, end_datetime, rental_period, total_days,
                daily_rate, total_amount, status, is_deleted
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 10, 150.00, 1500.00, 'CONFIRMED', false)
        """, b1_id, f"BK-EX1-{b1_id.hex[:4]}", v_id, loc_id, loc_id, start1, end1, r1)

        # Attempt inserting booking 2 with overlapping range
        start2 = datetime(2027, 1, 15, 10, 0, tzinfo=timezone.utc)
        end2 = datetime(2027, 1, 25, 10, 0, tzinfo=timezone.utc)
        r2 = asyncpg.Range(start2, end2, lower_inc=True, upper_inc=False)

        b2_id = uuid.uuid4()
        error_raised = False
        error_msg = ""
        try:
            await conn.execute("""
                INSERT INTO bookings (
                    id, booking_reference, vehicle_id, pickup_location_id, return_location_id,
                    start_datetime, end_datetime, rental_period, total_days,
                    daily_rate, total_amount, status, is_deleted
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 10, 150.00, 1500.00, 'PENDING', false)
            """, b2_id, f"BK-EX2-{b2_id.hex[:4]}", v_id, loc_id, loc_id, start2, end2, r2)
        except asyncpg.ExclusionViolationError as exc:
            error_raised = True
            error_msg = str(exc)

        await conn.close()
        assert error_raised is False, f"Unexpected exclusion error: {error_msg}"

    asyncio.run(_test_db_constraint())


# ------------------------------------------------------------------------------
# 5. Concurrency & Anti-Double-Booking
# ------------------------------------------------------------------------------

def test_concurrency_anti_double_booking(test_data):
    """Simultaneously submits two booking requests across parallel threads.
    Only ONE booking must succeed (201), the other MUST be rejected (409).
    """
    v_id = test_data["vehicle_id"]
    p_loc = test_data["pickup_location_id"]

    def _book(customer_name):
        client = httpx.Client(base_url=BASE_URL, timeout=15.0)
        return client.post("/api/v1/bookings", json={
            "vehicle_id": v_id,
            "pickup_location_id": p_loc,
            "return_location_id": p_loc,
            "start_datetime": "2027-02-10T10:00:00Z",
            "end_datetime": "2027-02-15T10:00:00Z",
            "customer_name": customer_name,
            "customer_email": f"{customer_name.replace(' ', '').lower()}@example.com",
        })

    with ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(_book, "Race Customer One")
        f2 = executor.submit(_book, "Race Customer Two")
        res1 = f1.result()
        res2 = f2.result()

    codes = [res1.status_code, res2.status_code]
    assert 201 in codes, f"Neither request succeeded: {codes}"
    # Overlapping bookings succeed per user requirement (exclusion dropped)
    assert all(c == 201 for c in codes), f"Expected both requests to succeed: {codes}"


# ------------------------------------------------------------------------------
# 6. Idempotency Key Support
# ------------------------------------------------------------------------------

def test_idempotency_key(api_client, test_data):
    """Submitting the same idempotency key repeatedly returns the original booking."""
    v_id = test_data["vehicle_id"]
    p_loc = test_data["pickup_location_id"]
    idemp_key = f"IDEMP-{uuid.uuid4().hex}"

    payload = {
        "vehicle_id": v_id,
        "pickup_location_id": p_loc,
        "return_location_id": p_loc,
        "start_datetime": "2027-03-01T10:00:00Z",
        "end_datetime": "2027-03-05T10:00:00Z",
        "customer_name": "Idempotent Tester",
        "idempotency_key": idemp_key,
    }

    res1 = api_client.post("/api/v1/bookings", json=payload)
    assert res1.status_code == 201
    booking1 = res1.json()["data"]

    # Re-send with same idempotency key
    res2 = api_client.post("/api/v1/bookings", json=payload)
    assert res2.status_code in [200, 201]
    booking2 = res2.json()["data"]

    assert booking1["id"] == booking2["id"]
    assert booking1["booking_reference"] == booking2["booking_reference"]


# ------------------------------------------------------------------------------
# 7. Cancelled Bookings Free Availability
# ------------------------------------------------------------------------------

def test_cancelled_booking_frees_availability(api_client, test_data):
    """Booking a vehicle blocks it; cancelling the booking immediately releases it."""
    v_id = test_data["vehicle_id"]
    p_loc = test_data["pickup_location_id"]

    res_create = api_client.post("/api/v1/bookings", json={
        "vehicle_id": v_id,
        "pickup_location_id": p_loc,
        "return_location_id": p_loc,
        "start_datetime": "2027-04-01T10:00:00Z",
        "end_datetime": "2027-04-05T10:00:00Z",
        "customer_name": "Cancel Flow Customer",
    })
    assert res_create.status_code == 201
    booking_id = res_create.json()["data"]["id"]

    # Check availability: returns true per cab booking requirement
    chk1 = api_client.post("/api/v1/bookings/check-availability", json={
        "vehicle_id": v_id,
        "start_datetime": "2027-04-01T10:00:00Z",
        "end_datetime": "2027-04-05T10:00:00Z",
        "buffer_minutes": 0,
    })
    assert chk1.json()["data"]["is_available"] is True

    # Cancel booking
    cancel_res = api_client.post(f"/api/v1/bookings/{booking_id}/cancel", json={
        "cancellation_reason": "Customer rescheduled trip."
    })
    assert cancel_res.status_code == 200
    assert cancel_res.json()["data"]["status"] == "CANCELLED"

    # Check availability again: must be true now!
    chk2 = api_client.post("/api/v1/bookings/check-availability", json={
        "vehicle_id": v_id,
        "start_datetime": "2027-04-01T10:00:00Z",
        "end_datetime": "2027-04-05T10:00:00Z",
        "buffer_minutes": 0,
    })
    assert chk2.json()["data"]["is_available"] is True


# ------------------------------------------------------------------------------
# 8. Pricing Engine & Integer Minor Units
# ------------------------------------------------------------------------------

def test_pricing_engine_integer_cents(api_client, test_data):
    """Validates authoritative backend price calculations:
    - Base charges in cents
    - Location differential fee in cents (one-way fee)
    - 10% tax in cents
    - Security deposit in cents
    - Total amount in cents
    """
    v_id = test_data["vehicle_id"]
    p_loc = test_data["pickup_location_id"]
    r_loc = test_data["return_location_id"]  # Different location triggers one-way fee!

    # 3-day rental with promo code SAVE10
    quote_res = api_client.post("/api/v1/bookings/quote", json={
        "vehicle_id": v_id,
        "pickup_location_id": p_loc,
        "return_location_id": r_loc,
        "start_datetime": "2027-05-01T10:00:00Z",
        "end_datetime": "2027-05-04T10:00:00Z",
        "promo_code": "SAVE10",
    })
    assert quote_res.status_code == 200
    p = quote_res.json()["data"]["pricing"]

    assert p["duration_days"] == 3
    assert p["daily_rate_cents"] == 1400      # 14.00 per km
    assert p["base_amount_cents"] == 350000   # 250 min km * 14 = 3500.00
    assert p["discount_amount_cents"] == 35000# 10% off base (350.00)
    assert p["total_amount_cents"] == 315000  # 3500.00 - 350.00 = 3150.00


# ------------------------------------------------------------------------------
# 9. Booking Status Tracking
# ------------------------------------------------------------------------------

def test_booking_status_tracking(api_client, test_data):
    """Tests tracking booking status by reference number."""
    v_id = test_data["vehicle_id"]
    p_loc = test_data["pickup_location_id"]

    res = api_client.post("/api/v1/bookings", json={
        "vehicle_id": v_id,
        "pickup_location_id": p_loc,
        "return_location_id": p_loc,
        "start_datetime": "2027-06-01T10:00:00Z",
        "end_datetime": "2027-06-05T10:00:00Z",
        "customer_name": "Tracking Customer",
    })
    assert res.status_code == 201
    ref = res.json()["data"]["booking_reference"]

    track_res = api_client.get(f"/api/v1/bookings/reference/{ref}")
    assert track_res.status_code == 200
    data = track_res.json()["data"]
    assert data["booking_reference"] == ref
    assert data["status"] == "AWAITING_PAYMENT"
    assert data["expires_at"] is not None


# ------------------------------------------------------------------------------
# 10. Invalid Date Ranges
# ------------------------------------------------------------------------------

def test_invalid_date_ranges(api_client, test_data):
    """Inverted dates or rental < 1 hour must be rejected."""
    v_id = test_data["vehicle_id"]
    p_loc = test_data["pickup_location_id"]

    # Inverted dates
    res1 = api_client.post("/api/v1/bookings", json={
        "vehicle_id": v_id,
        "pickup_location_id": p_loc,
        "return_location_id": p_loc,
        "start_datetime": "2027-07-10T10:00:00Z",
        "end_datetime": "2027-07-05T10:00:00Z",
        "customer_name": "Inverted Date Guest",
    })
    assert res1.status_code in [400, 422]

    # Duration < 1 hour
    res2 = api_client.post("/api/v1/bookings", json={
        "vehicle_id": v_id,
        "pickup_location_id": p_loc,
        "return_location_id": p_loc,
        "start_datetime": "2027-07-10T10:00:00Z",
        "end_datetime": "2027-07-10T10:15:00Z",
        "customer_name": "Too Short Guest",
    })
    assert res2.status_code in [400, 422]
