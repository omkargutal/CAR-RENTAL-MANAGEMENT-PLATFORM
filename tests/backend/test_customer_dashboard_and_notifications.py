import uuid
from datetime import datetime, timedelta, timezone
import httpx
import pytest

BASE_URL = "http://localhost:8000"


@pytest.fixture
def api_client():
    return httpx.Client(base_url=BASE_URL, timeout=15.0)


def create_customer(api_client, email=None):
    if not email:
        email = f"cust_{uuid.uuid4().hex[:8]}@example.com"
    pwd = "SecurePassword123!"
    res = api_client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": pwd,
            "full_name": "Test Customer",
            "phone_number": "+919876543210",
        },
    )
    assert res.status_code == 201, res.text
    token = res.json()["data"]["access_token"]
    user = res.json()["data"]["user"]
    return {
        "email": email,
        "token": token,
        "headers": {"Authorization": f"Bearer {token}"},
        "user": user,
    }


def test_check_email_privacy(api_client):
    """Test that check-email verifies existence without leaking personal information."""
    non_existent = f"unknown_{uuid.uuid4().hex[:8]}@example.com"
    res1 = api_client.post("/api/v1/auth/check-email", json={"email": non_existent})
    assert res1.status_code == 200
    data1 = res1.json()["data"]
    assert data1["exists"] is False
    assert data1["email"] == non_existent.lower()
    assert "full_name" not in data1
    assert "phone_number" not in data1

    # Now create customer and check again
    cust = create_customer(api_client)
    res2 = api_client.post("/api/v1/auth/check-email", json={"email": cust["email"]})
    assert res2.status_code == 200
    data2 = res2.json()["data"]
    assert data2["exists"] is True
    assert data2["email"] == cust["email"].lower()
    # Confirm zero sensitive data leakage
    assert "password" not in data2
    assert "user" not in data2
    assert "id" not in data2


def test_new_customer_kpis_are_zero(api_client):
    """A new customer with zero bookings must have all KPIs at 0 / 0.0."""
    cust = create_customer(api_client)
    res = api_client.get("/api/v1/bookings/my-stats", headers=cust["headers"])
    assert res.status_code == 200
    stats = res.json()["data"]
    assert stats["total_bookings"] == 0
    assert stats["upcoming_trips"] == 0
    assert stats["completed_trips"] == 0
    assert stats["cancelled_bookings"] == 0
    assert float(stats["total_amount_spent"]) == 0.0


def test_customer_booking_and_kpi_updates(api_client):
    """Verify booking creation, masked Aadhaar, KPI increment, and customer isolation."""
    cust_a = create_customer(api_client)
    cust_b = create_customer(api_client)

    # 1. Fetch available vehicles
    v_res = api_client.get("/api/v1/vehicles")
    assert v_res.status_code == 200
    vehicles_data = v_res.json()["data"]
    vehicles = vehicles_data if isinstance(vehicles_data, list) else vehicles_data.get("items", [])
    assert len(vehicles) > 0
    vehicle = vehicles[0]

    # Fetch locations
    loc_res = api_client.get("/api/v1/locations")
    assert loc_res.status_code == 200
    locations = loc_res.json()["data"]
    loc_id = locations[0]["id"]

    start = datetime.now(timezone.utc) + timedelta(days=2)
    end = start + timedelta(hours=6)

    booking_payload = {
        "vehicle_id": vehicle["id"],
        "pickup_location_id": loc_id,
        "return_location_id": loc_id,
        "start_datetime": start.isoformat(),
        "end_datetime": end.isoformat(),
        "pickup_address": "Koregaon Park, Pune",
        "drop_address": "Pune International Airport, Terminal 2",
        "service_type": "AIRPORT_TRANSFER",
        "customer_name": "Rahul Sharma",
        "customer_email": cust_a["email"],
        "customer_phone": "+919876543210",
        "driver_license_number": "987654321098",  # Aadhaar detail
    }

    # Book as Customer A
    book_res = api_client.post("/api/v1/bookings", json=booking_payload, headers=cust_a["headers"])
    assert book_res.status_code == 201, book_res.text
    booking_data = book_res.json()["data"]

    # Verify reference number and Aadhaar masking
    assert booking_data["booking_reference"].startswith("BK-")
    assert booking_data["driver_license_number"] == "••••-••••-1098"

    # Verify Customer A KPIs updated
    stats_a = api_client.get("/api/v1/bookings/my-stats", headers=cust_a["headers"]).json()["data"]
    assert stats_a["total_bookings"] == 1
    assert stats_a["upcoming_trips"] == 1
    assert stats_a["completed_trips"] == 0
    assert stats_a["cancelled_bookings"] == 0

    # Verify Customer B KPIs remain 0 (data isolation)
    stats_b = api_client.get("/api/v1/bookings/my-stats", headers=cust_b["headers"]).json()["data"]
    assert stats_b["total_bookings"] == 0
    assert stats_b["upcoming_trips"] == 0

    # Verify Customer A sees booking in my-bookings, Customer B does not
    my_bookings_a_data = api_client.get("/api/v1/bookings/my-bookings", headers=cust_a["headers"]).json()["data"]
    my_bookings_a = my_bookings_a_data if isinstance(my_bookings_a_data, list) else my_bookings_a_data.get("items", [])
    assert len(my_bookings_a) == 1
    assert my_bookings_a[0]["booking_reference"] == booking_data["booking_reference"]

    my_bookings_b_data = api_client.get("/api/v1/bookings/my-bookings", headers=cust_b["headers"]).json()["data"]
    my_bookings_b = my_bookings_b_data if isinstance(my_bookings_b_data, list) else my_bookings_b_data.get("items", [])
    assert len(my_bookings_b) == 0


def test_notification_flow_and_isolation(api_client):
    """Test notification generation on booking, unread count, read marking, and user isolation."""
    cust_a = create_customer(api_client)
    cust_b = create_customer(api_client)

    # Initially Customer A has 0 unread notifications
    count_res = api_client.get("/api/v1/notifications/unread-count", headers=cust_a["headers"])
    assert count_res.status_code == 200
    assert count_res.json()["data"]["unread_count"] == 0

    # Trigger booking creation which auto-generates a notification
    v_res = api_client.get("/api/v1/vehicles")
    vehicles_data = v_res.json()["data"]
    vehicle = (vehicles_data if isinstance(vehicles_data, list) else vehicles_data.get("items", []))[0]
    loc_res = api_client.get("/api/v1/locations")
    loc_id = loc_res.json()["data"][0]["id"]
    start = datetime.now(timezone.utc) + timedelta(days=1)
    end = start + timedelta(hours=4)

    book_res = api_client.post(
        "/api/v1/bookings",
        json={
            "vehicle_id": vehicle["id"],
            "pickup_location_id": loc_id,
            "return_location_id": loc_id,
            "start_datetime": start.isoformat(),
            "end_datetime": end.isoformat(),
            "pickup_address": "Baner, Pune",
            "drop_address": "Mumbai Airport T2",
            "service_type": "OUTSTATION",
            "customer_name": "Test Cust",
            "customer_email": cust_a["email"],
            "customer_phone": "+919876543210",
        },
        headers=cust_a["headers"],
    )
    assert book_res.status_code == 201

    # Check unread count for Customer A
    count_res_after = api_client.get("/api/v1/notifications/unread-count", headers=cust_a["headers"])
    assert count_res_after.status_code == 200
    assert count_res_after.json()["data"]["unread_count"] >= 1

    # List notifications
    notifs_res = api_client.get("/api/v1/notifications", headers=cust_a["headers"])
    assert notifs_res.status_code == 200
    notifs_data = notifs_res.json()["data"]
    notifs = notifs_data if isinstance(notifs_data, list) else notifs_data.get("items", [])
    assert len(notifs) >= 1
    notif = notifs[0]
    assert notif["is_read"] is False
    assert "/bookings?ref=" in notif.get("link_url", "")

    # Customer B does not see Customer A's notifications
    notifs_b_data = api_client.get("/api/v1/notifications", headers=cust_b["headers"]).json()["data"]
    notifs_b = notifs_b_data if isinstance(notifs_b_data, list) else notifs_b_data.get("items", [])
    assert len(notifs_b) == 0

    # Mark as read
    patch_res = api_client.patch(f"/api/v1/notifications/{notif['id']}/read", headers=cust_a["headers"])
    assert patch_res.status_code == 200
    assert patch_res.json()["data"]["is_read"] is True

    # Mark all read endpoint test
    mark_all_res = api_client.post("/api/v1/notifications/mark-all-read", headers=cust_a["headers"])
    assert mark_all_res.status_code == 200

    # Unread count should now be 0
    final_count = api_client.get("/api/v1/notifications/unread-count", headers=cust_a["headers"]).json()["data"]["unread_count"]
    assert final_count == 0
