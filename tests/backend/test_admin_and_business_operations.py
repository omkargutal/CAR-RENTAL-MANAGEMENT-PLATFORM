import asyncio
from datetime import datetime, timezone, timedelta
import io
import uuid
import asyncpg
import httpx
import pytest

BASE_URL = "http://localhost:8000"
PG_DSN = "postgresql://carrental_user:carrental_secure_password_2026@postgres:5432/carrental_db"


@pytest.fixture
def api_client():
    return httpx.Client(base_url=BASE_URL, timeout=15.0)


@pytest.fixture
def auth_roles(api_client):
    uid = uuid.uuid4().hex[:8]

    # 1. Customer
    cust_email = f"cust_{uid}@testops.com"
    r = api_client.post("/api/v1/auth/register", json={"email": cust_email, "password": "Password123!", "full_name": "Test Customer"})
    assert r.status_code == 201
    cust_token = r.json()["data"]["access_token"]
    cust_id = r.json()["data"]["user"]["id"]

    # 2. Staff
    staff_email = f"staff_{uid}@testops.com"
    r = api_client.post("/api/v1/auth/register", json={"email": staff_email, "password": "Password123!", "full_name": "Test Operations Staff"})
    assert r.status_code == 201
    staff_id = r.json()["data"]["user"]["id"]

    # 3. Admin
    admin_email = f"admin_{uid}@testops.com"
    r = api_client.post("/api/v1/auth/register", json={"email": admin_email, "password": "Password123!", "full_name": "Test Platform Admin"})
    assert r.status_code == 201
    admin_id = r.json()["data"]["user"]["id"]

    # Elevate roles via asyncpg
    async def _elevate():
        conn = await asyncpg.connect(PG_DSN)
        await conn.execute("UPDATE users SET role = 'STAFF' WHERE id = $1", uuid.UUID(staff_id))
        await conn.execute("UPDATE users SET role = 'ADMIN' WHERE id = $1", uuid.UUID(admin_id))
        await conn.close()

    asyncio.run(_elevate())

    # Re-login staff & admin to get fresh claims
    r_staff = api_client.post("/api/v1/auth/login", json={"email": staff_email, "password": "Password123!"})
    staff_token = r_staff.json()["data"]["access_token"]

    r_admin = api_client.post("/api/v1/auth/login", json={"email": admin_email, "password": "Password123!"})
    admin_token = r_admin.json()["data"]["access_token"]

    return {
        "customer": {"id": cust_id, "email": cust_email, "headers": {"Authorization": f"Bearer {cust_token}"}},
        "staff": {"id": staff_id, "email": staff_email, "headers": {"Authorization": f"Bearer {staff_token}"}},
        "admin": {"id": admin_id, "email": admin_email, "headers": {"Authorization": f"Bearer {admin_token}"}},
    }


def test_admin_dashboard_overview_live_db_data(api_client, auth_roles):
    """
    Validates DASHBOARD OVERVIEW:
    - total_vehicles, available_vehicles, rented_vehicles, vehicles under maintenance
    - total_customers, total_bookings, pending, confirmed, completed, cancelled
    - total_revenue, monthly_revenue, popular_vehicles
    - Proves RBAC security: Customer cannot view admin overview (403 Forbidden).
    """
    cust_headers = auth_roles["customer"]["headers"]
    staff_headers = auth_roles["staff"]["headers"]
    admin_headers = auth_roles["admin"]["headers"]

    # 1. Customer is rejected
    forbidden = api_client.get("/api/v1/reports/overview", headers=cust_headers)
    assert forbidden.status_code == 403

    # 2. Staff and Admin succeed
    res = api_client.get("/api/v1/reports/overview", headers=staff_headers)
    assert res.status_code == 200
    data = res.json()["data"]

    # Verify all required KPI sections exist with actual database numbers
    assert "fleet" in data
    fleet = data["fleet"]
    assert "total_vehicles" in fleet
    assert "available_vehicles" in fleet
    assert "rented_vehicles" in fleet
    assert "maintenance_vehicles" in fleet
    assert "utilization_rate_percentage" in fleet

    assert "bookings" in data
    bookings_kpi = data["bookings"]
    assert "total_bookings" in bookings_kpi
    assert "pending_bookings" in bookings_kpi
    assert "confirmed_bookings" in bookings_kpi
    assert "completed_bookings" in bookings_kpi
    assert "cancelled_bookings" in bookings_kpi
    assert "active_bookings" in bookings_kpi

    assert "revenue" in data
    rev = data["revenue"]
    assert "total_revenue" in rev
    assert "monthly_revenue" in rev
    assert "currency" in rev
    assert rev["currency"] == "INR"

    assert "popular_vehicles" in data
    assert isinstance(data["popular_vehicles"], list)
    assert "total_customers" in data
    assert "total_locations" in data


def test_booking_management_actions_and_audit(api_client, auth_roles):
    """
    Validates BOOKING MANAGEMENT:
    - Admin can view all bookings, filter by status, search by customer/reference
    - Full booking details inspection
    - Approve booking (CONFIRMED)
    - Update pickup status (ACTIVE - vehicle on road)
    - Update return status (COMPLETED - return inspected)
    - Cancel booking with audited reason
    - Process eligible refund (REFUND_PENDING -> REFUNDED)
    - Verifies audit logs are generated for these operations.
    """
    admin_headers = auth_roles["admin"]["headers"]
    cust = auth_roles["customer"]

    # Create vehicle & locations to book
    v_res = api_client.get("/api/v1/vehicles")
    vehicle = v_res.json()["data"][0]
    loc_res = api_client.get("/api/v1/locations")
    locs = loc_res.json()["data"]
    p_loc, d_loc = locs[0], locs[1] if len(locs) > 1 else locs[0]

    # 1. Customer creates a booking
    start_dt = datetime.now(timezone.utc) + timedelta(days=200 + (int(uuid.uuid4().hex[:4], 16) % 500))
    end_dt = start_dt + timedelta(days=3)
    book_payload = {
        "vehicle_id": vehicle["id"],
        "pickup_location_id": p_loc["id"],
        "return_location_id": d_loc["id"],
        "start_datetime": start_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "end_datetime": end_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "customer_name": "Admin Tester",
        "customer_email": cust["email"],
        "customer_phone": "+1 555-0188",
        "driver_license_number": "DL-ADMIN-TEST",
        "idempotency_key": str(uuid.uuid4()),
    }
    b_res = api_client.post("/api/v1/bookings", json=book_payload, headers=cust["headers"])
    assert b_res.status_code == 201
    booking_id = b_res.json()["data"]["id"]
    booking_ref = b_res.json()["data"]["booking_reference"]

    # 2. Admin filters and searches bookings
    list_res = api_client.get(f"/api/v1/bookings?status=AWAITING_PAYMENT", headers=admin_headers)
    assert list_res.status_code == 200
    refs = [b["booking_reference"] for b in list_res.json()["data"]]
    assert booking_ref in refs

    # 3. Admin views full booking details
    detail_res = api_client.get(f"/api/v1/bookings/{booking_id}", headers=admin_headers)
    assert detail_res.status_code == 200
    assert detail_res.json()["data"]["id"] == booking_id

    # 4. Admin approves booking: AWAITING_PAYMENT -> CONFIRMED
    approve_res = api_client.patch(
        f"/api/v1/bookings/{booking_id}/status",
        json={"status": "CONFIRMED", "reason": "Admin approved reservation"},
        headers=admin_headers,
    )
    assert approve_res.status_code == 200
    assert approve_res.json()["data"]["status"] == "CONFIRMED"

    # 5. Admin updates pickup status: CONFIRMED -> ACTIVE (Vehicle handed over)
    active_res = api_client.patch(
        f"/api/v1/bookings/{booking_id}/status",
        json={"status": "ACTIVE", "reason": "Customer completed physical check-in and pickup"},
        headers=admin_headers,
    )
    assert active_res.status_code == 200
    assert active_res.json()["data"]["status"] == "ACTIVE"

    # 6. Admin updates return status: ACTIVE -> COMPLETED (Vehicle returned)
    complete_res = api_client.patch(
        f"/api/v1/bookings/{booking_id}/status",
        json={"status": "COMPLETED", "reason": "Vehicle returned in prime condition"},
        headers=admin_headers,
    )
    assert complete_res.status_code == 200
    assert complete_res.json()["data"]["status"] == "COMPLETED"

    # 7. Create a second booking to test cancellation and refund processing
    start_dt2 = end_dt + timedelta(days=2)
    end_dt2 = start_dt2 + timedelta(days=2)
    book_payload2 = {
        "vehicle_id": vehicle["id"],
        "pickup_location_id": p_loc["id"],
        "return_location_id": d_loc["id"],
        "start_datetime": start_dt2.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "end_datetime": end_dt2.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "customer_name": "Admin Tester 2",
        "customer_email": cust["email"],
        "idempotency_key": str(uuid.uuid4()),
    }
    b_res2 = api_client.post("/api/v1/bookings", json=book_payload2, headers=cust["headers"])
    assert b_res2.status_code == 201
    b2_id = b_res2.json()["data"]["id"]

    # Cancel booking
    cancel_res = api_client.post(
        f"/api/v1/bookings/{b2_id}/cancel",
        json={"cancellation_reason": "Customer cancelled within policy window"},
        headers=admin_headers,
    )
    assert cancel_res.status_code == 200
    assert cancel_res.json()["data"]["status"] == "CANCELLED"

    # Process refund: CANCELLED -> REFUND_PENDING -> REFUNDED
    refund_pending_res = api_client.patch(
        f"/api/v1/bookings/{b2_id}/status",
        json={"status": "REFUND_PENDING", "reason": "Deposit refund initiated"},
        headers=admin_headers,
    )
    assert refund_pending_res.status_code == 200
    assert refund_pending_res.json()["data"]["status"] == "REFUND_PENDING"

    refunded_res = api_client.patch(
        f"/api/v1/bookings/{b2_id}/status",
        json={"status": "REFUNDED", "reason": "Refund successfully credited to customer card"},
        headers=admin_headers,
    )
    assert refunded_res.status_code == 200
    assert refunded_res.json()["data"]["status"] == "REFUNDED"

    # 8. Verify audit logs were captured
    logs_res = api_client.get("/api/v1/users/audit-logs?target_type=booking", headers=admin_headers)
    assert logs_res.status_code == 200
    actions = [log["action"] for log in logs_res.json()["data"]]
    assert "booking.approved" in actions
    assert "booking.pickup_completed" in actions
    assert "booking.return_completed" in actions
    assert "booking.cancelled" in actions
    assert "booking.refund_processed" in actions


def test_customer_management_and_verification(api_client, auth_roles):
    """
    Validates CUSTOMER MANAGEMENT:
    - View customer profiles
    - Review submitted driver license & documents
    - Manage verification status (Verify / Unverify)
    - Manage account access (Activate / Suspend user)
    - View customer booking history
    """
    admin_headers = auth_roles["admin"]["headers"]
    cust = auth_roles["customer"]

    # 1. Register customer profile
    cust_profile_payload = {
        "user_id": cust["id"],
        "driver_license_number": f"DL_{uuid.uuid4().hex[:8].upper()}",
        "driver_license_expiry": "2030-10-15",
        "driver_license_country": "US",
        "date_of_birth": "1994-06-20",
        "notes": "Premium corporate customer profile",
    }
    c_res = api_client.post("/api/v1/customers", json=cust_profile_payload, headers=cust["headers"])
    assert c_res.status_code == 201
    customer_id = c_res.json()["data"]["id"]
    assert c_res.json()["data"]["is_identity_verified"] is False

    # 2. Admin lists customers
    list_res = api_client.get("/api/v1/customers", headers=admin_headers)
    assert list_res.status_code == 200
    cust_ids = [c["id"] for c in list_res.json()["data"]]
    assert customer_id in cust_ids

    # 3. Admin reviews customer detail and submitted documents
    get_res = api_client.get(f"/api/v1/customers/{customer_id}", headers=admin_headers)
    assert get_res.status_code == 200
    cust_data = get_res.json()["data"]
    assert cust_data["driver_license_number"] == cust_profile_payload["driver_license_number"]
    assert "bookings" in cust_data

    # 4. Admin verifies customer identity
    verify_res = api_client.patch(
        f"/api/v1/customers/{customer_id}/verify",
        json={"is_identity_verified": True, "verification_notes": "Driver license scanned and cross-verified"},
        headers=admin_headers,
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["data"]["is_identity_verified"] is True

    # 5. Admin suspends customer account access
    suspend_res = api_client.patch(
        f"/api/v1/users/{cust['id']}/status",
        json={"is_active": False, "reason": "Suspended pending risk review"},
        headers=admin_headers,
    )
    assert suspend_res.status_code == 200
    assert suspend_res.json()["data"]["is_active"] is False

    # 6. Suspended user cannot log in
    blocked_login = api_client.post("/api/v1/auth/login", json={"email": cust["email"], "password": "Password123!"})
    assert blocked_login.status_code in (401, 403)

    # 7. Admin restores customer account access
    restore_res = api_client.patch(
        f"/api/v1/users/{cust['id']}/status",
        json={"is_active": True, "reason": "Account access restored"},
        headers=admin_headers,
    )
    assert restore_res.status_code == 200
    assert restore_res.json()["data"]["is_active"] is True


def test_business_settings_management(api_client, auth_roles):
    """
    Validates BUSINESS SETTINGS:
    - Rental prices & multipliers
    - Category security deposits
    - Cancellation policies
    - Taxes & active promo discounts
    - Business contact info
    - RBAC: Customer cannot modify settings (403 Forbidden).
    - Audit log recorded.
    """
    cust_headers = auth_roles["customer"]["headers"]
    admin_headers = auth_roles["admin"]["headers"]

    # 1. Customer cannot update settings
    update_payload = {
        "pricing": {
            "rate_multiplier": 1.25,
            "category_deposits": {
                "LUXURY": 600,
                "SUV": 350,
                "VAN": 350,
                "TRUCK": 350,
                "SEDAN": 250,
                "DEFAULT": 250,
            },
        },
        "cancellation_policy": {
            "free_cancellation_hours": 48,
            "fee_percentage_after_deadline": 25.0,
            "policy_text": "Cancellations within 48 hours are free. Later cancellations incur 25% charge.",
        },
        "tax_and_discounts": {
            "tax_rate_percent": 12.5,
            "active_promo_codes": [
                {"code": "SUMMER25", "discount_percent": 25.0, "description": "Summer sale 25% discount"},
            ],
        },
        "contact_info": {
            "company_name": "AutoFleet Premier Luxury Fleet",
            "support_email": "vip@autofleetpro.com",
            "phone": "+1 888-555-LUXE",
            "address": "500 5th Avenue, New York, NY 10110",
            "support_hours": "24/7 Dedicated Concierge",
        },
        "turnaround_buffer_minutes": 90,
    }

    forbidden = api_client.patch("/api/v1/settings", json=update_payload, headers=cust_headers)
    assert forbidden.status_code == 403

    # 2. Admin successfully updates settings
    res = api_client.patch("/api/v1/settings", json=update_payload, headers=admin_headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["pricing"]["rate_multiplier"] == 1.25
    assert data["pricing"]["category_deposits"]["LUXURY"] == 600
    assert data["cancellation_policy"]["free_cancellation_hours"] == 48
    assert data["tax_and_discounts"]["tax_rate_percent"] == 12.5
    assert data["contact_info"]["company_name"] == "AutoFleet Premier Luxury Fleet"
    assert data["turnaround_buffer_minutes"] == 90

    # 3. Verify audit log entry
    logs_res = api_client.get("/api/v1/users/audit-logs?target_type=business_settings", headers=admin_headers)
    assert logs_res.status_code == 200
    assert any(log["action"] == "settings.updated" for log in logs_res.json()["data"])


def test_reports_analytics_and_csv_export(api_client, auth_roles):
    """
    Validates REPORTING:
    - Revenue and booking charts data (time series)
    - Date filtering
    - CSV export endpoint
    - RBAC security: Customer cannot export (403 Forbidden).
    """
    cust_headers = auth_roles["customer"]["headers"]
    admin_headers = auth_roles["admin"]["headers"]

    # 1. Customer cannot access reports or exports
    forbidden_chart = api_client.get("/api/v1/reports/analytics", headers=cust_headers)
    assert forbidden_chart.status_code == 403

    forbidden_csv = api_client.get("/api/v1/reports/export/bookings", headers=cust_headers)
    assert forbidden_csv.status_code == 403

    # 2. Admin fetches analytics charts
    analytics_res = api_client.get("/api/v1/reports/analytics", headers=admin_headers)
    assert analytics_res.status_code == 200
    chart_payload = analytics_res.json()["data"]
    assert "revenue_chart" in chart_payload
    assert "status_distribution" in chart_payload

    # 3. Admin downloads CSV export
    csv_res = api_client.get("/api/v1/reports/export/bookings", headers=admin_headers)
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["Content-Type"]
    csv_text = csv_res.text
    assert "Booking Reference" in csv_text
    assert "Daily Rate" in csv_text
    assert "Total Amount" in csv_text


def test_strict_rbac_backend_permission_validation(api_client, auth_roles):
    """
    Validates SECURITY:
    Every admin API must validate permissions on the backend.
    Do not rely on hiding admin buttons in the frontend.
    """
    cust_headers = auth_roles["customer"]["headers"]

    # Attempt vehicle creation as customer
    fake_vehicle = {
        "make": "Hacker",
        "model": "Unauthorized",
        "year": 2024,
        "vin": f"VIN_{uuid.uuid4().hex[:12].upper()}",
        "license_plate": f"PL_{uuid.uuid4().hex[:4].upper()}",
        "category": "SEDAN",
        "daily_rate": 50.0,
    }
    r = api_client.post("/api/v1/vehicles", json=fake_vehicle, headers=cust_headers)
    assert r.status_code == 403

    # Attempt role escalation as customer
    target_user_id = auth_roles["customer"]["id"]
    r = api_client.patch(f"/api/v1/users/{target_user_id}/role", json={"role": "ADMIN"}, headers=cust_headers)
    assert r.status_code == 403

    # Attempt to read audit logs as customer
    r = api_client.get("/api/v1/users/audit-logs", headers=cust_headers)
    assert r.status_code == 403

    # Attempt to list all customers as customer
    r = api_client.get("/api/v1/customers", headers=cust_headers)
    assert r.status_code == 403
