import asyncio
import io
import uuid
import asyncpg
import httpx
import pytest

BASE_URL = "http://localhost:8000"


@pytest.fixture
def api_client():
    return httpx.Client(base_url=BASE_URL, timeout=15.0)


@pytest.fixture
def auth_tokens(api_client):
    # Register customer
    cust_email = f"fleet_cust_{uuid.uuid4().hex[:8]}@example.com"
    r = api_client.post("/api/v1/auth/register", json={"email": cust_email, "password": "Password123!", "full_name": "Fleet Customer"})
    assert r.status_code == 201
    cust_token = r.json()["data"]["access_token"]
    cust_id = r.json()["data"]["user"]["id"]

    # Register admin
    admin_email = f"fleet_admin_{uuid.uuid4().hex[:8]}@example.com"
    r = api_client.post("/api/v1/auth/register", json={"email": admin_email, "password": "AdminPassword123!", "full_name": "Fleet Admin"})
    assert r.status_code == 201
    admin_id = r.json()["data"]["user"]["id"]

    # Elevate admin to ADMIN via direct asyncpg
    async def _elevate():
        conn = await asyncpg.connect("postgresql://carrental_user:carrental_secure_password_2026@postgres:5432/carrental_db")
        await conn.execute("UPDATE users SET role = 'ADMIN' WHERE id = $1", uuid.UUID(admin_id))
        await conn.close()
    asyncio.run(_elevate())

    # Re-login admin
    r = api_client.post("/api/v1/auth/login", json={"email": admin_email, "password": "AdminPassword123!"})
    assert r.status_code == 200
    admin_token = r.json()["data"]["access_token"]


    return {
        "customer_headers": {"Authorization": f"Bearer {cust_token}"},
        "admin_headers": {"Authorization": f"Bearer {admin_token}"},
        "admin_id": admin_id,
        "customer_id": cust_id,
    }


def test_locations_crud(api_client, auth_tokens):
    admin_headers = auth_tokens["admin_headers"]
    cust_headers = auth_tokens["customer_headers"]

    code = f"LOC_{uuid.uuid4().hex[:6].upper()}"
    payload = {
        "name": "Downtown Central Hub",
        "code": code,
        "address": "100 Main St",
        "city": "Metropolis",
        "state": "NY",
        "country": "US",
        "postal_code": "10001",
        "phone": "+1-555-0199",
        "email": "downtown@carrental.com",
        "is_active": True,
    }

    # 1. Customer cannot create location
    forbidden = api_client.post("/api/v1/locations", json=payload, headers=cust_headers)
    assert forbidden.status_code == 403

    # 2. Admin can create location
    res = api_client.post("/api/v1/locations", json=payload, headers=admin_headers)
    assert res.status_code == 201
    loc_data = res.json()["data"]
    loc_id = loc_data["id"]
    assert loc_data["code"] == code

    # 3. Public can list locations
    list_res = api_client.get("/api/v1/locations")
    assert list_res.status_code == 200
    codes = [loc["code"] for loc in list_res.json()["data"]]
    assert code in codes

    # 4. Admin can update location
    patch_res = api_client.patch(
        f"/api/v1/locations/{loc_id}",
        json={"name": "Downtown Premier Hub", "city": "Metropolis Central"},
        headers=admin_headers,
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["data"]["name"] == "Downtown Premier Hub"


def test_vehicle_category_management(api_client, auth_tokens):
    admin_headers = auth_tokens["admin_headers"]
    cust_headers = auth_tokens["customer_headers"]

    # 1. List categories
    cats = api_client.get("/api/v1/vehicles/categories")
    assert cats.status_code == 200
    assert len(cats.json()["data"]) >= 4

    # 2. Customer cannot create custom category
    cat_code = f"hypercar_{uuid.uuid4().hex[:4]}"
    cat_name = f"Hypercars_{uuid.uuid4().hex[:4]}"
    forbidden = api_client.post(
        "/api/v1/vehicles/categories",
        json={"code": cat_code, "name": cat_name, "description": "Top-tier hypercars"},
        headers=cust_headers,
    )
    assert forbidden.status_code == 403

    # 3. Admin can create custom category
    created = api_client.post(
        "/api/v1/vehicles/categories",
        json={"code": cat_code, "name": cat_name, "description": "Top-tier hypercars"},
        headers=admin_headers,
    )
    assert created.status_code == 201
    assert created.json()["data"]["code"] == cat_code


def test_vehicle_creation_and_details(api_client, auth_tokens):
    admin_headers = auth_tokens["admin_headers"]
    cust_headers = auth_tokens["customer_headers"]

    # First get or create a location
    loc_code = f"LOC_{uuid.uuid4().hex[:6].upper()}"
    loc_res = api_client.post(
        "/api/v1/locations",
        json={
            "name": "Airport Hub",
            "code": loc_code,
            "address": "1 Airport Way",
            "city": "Metro",
            "state": "CA",
            "country": "US",
            "postal_code": "90210",
        },
        headers=admin_headers,
    )
    loc_id = loc_res.json()["data"]["id"]

    vin = f"1HGCR2F83HA{uuid.uuid4().hex[:6].upper()}"
    plate = f"FL-{uuid.uuid4().hex[:5].upper()}"
    vehicle_payload = {
        "make": "Porsche",
        "model": "Taycan Turbo S",
        "year": 2024,
        "license_plate": plate,
        "vin": vin,
        "category": "LUXURY",
        "fuel_type": "ELECTRIC",
        "transmission": "AUTOMATIC",
        "seating_capacity": 4,
        "doors": 4,
        "suitcases": 2,
        "mileage": 1200,
        "daily_rate": 280.00,
        "weekly_rate": 1680.00,
        "monthly_rate": 5600.00,
        "description": "High-performance electric sports saloon with breathtaking launch control.",
        "features": ["Apple CarPlay", "Burmester 3D Sound", "Panoramic Glass Roof", "Adaptive Cruise"],
        "specs": {"horsepower": 750, "range_miles": 278, "top_speed_mph": 161},
        "location_id": loc_id,
        "popularity_score": 95,
    }

    # 1. Customer cannot create vehicle
    forbidden = api_client.post("/api/v1/vehicles", json=vehicle_payload, headers=cust_headers)
    assert forbidden.status_code == 403

    # 2. Admin creates vehicle
    create_res = api_client.post("/api/v1/vehicles", json=vehicle_payload, headers=admin_headers)
    assert create_res.status_code == 201
    veh_data = create_res.json()["data"]
    vehicle_id = veh_data["id"]

    assert veh_data["make"] == "Porsche"
    assert veh_data["model"] == "Taycan Turbo S"
    assert float(veh_data["daily_rate"]) == 280.00
    assert veh_data["is_bookable"] is True
    assert "Burmester 3D Sound" in veh_data["features"]
    assert veh_data["specs"]["horsepower"] == 750

    # 3. Public can get vehicle details
    detail_res = api_client.get(f"/api/v1/vehicles/{vehicle_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()["data"]
    assert detail["id"] == vehicle_id
    assert detail["is_bookable"] is True
    assert float(detail["effective_weekly_rate"]) == 1680.00
    assert float(detail["effective_monthly_rate"]) == 5600.00

    # 4. Update vehicle specifications
    update_res = api_client.patch(
        f"/api/v1/vehicles/{vehicle_id}",
        json={"mileage": 1850, "features": ["Apple CarPlay", "Burmester 3D Sound", "Track Pace"]},
        headers=admin_headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["data"]["mileage"] == 1850
    assert "Track Pace" in update_res.json()["data"]["features"]


def test_vehicle_catalog_filtering_and_sorting(api_client, auth_tokens):
    admin_headers = auth_tokens["admin_headers"]

    # Create location
    loc_res = api_client.post(
        "/api/v1/locations",
        json={
            "name": "Filter Test Station",
            "code": f"FLT_{uuid.uuid4().hex[:5].upper()}",
            "address": "404 Test Blvd",
            "city": "Filterville",
            "state": "NV",
            "postal_code": "89101",
        },
        headers=admin_headers,
    )
    loc_id = loc_res.json()["data"]["id"]

    # Seed 3 distinct vehicles
    # Vehicle A: Economy Gas (Toyota Corolla, $45/day, 5 seats, 2022)
    api_client.post(
        "/api/v1/vehicles",
        json={
            "make": "Toyota",
            "model": "Corolla SE",
            "year": 2022,
            "license_plate": f"FLT-{uuid.uuid4().hex[:4].upper()}",
            "vin": f"VIN{uuid.uuid4().hex[:12].upper()}",
            "category": "ECONOMY",
            "fuel_type": "PETROL",
            "transmission": "AUTOMATIC",
            "seating_capacity": 5,
            "daily_rate": 45.00,
            "location_id": loc_id,
            "popularity_score": 70,
        },
        headers=admin_headers,
    )

    # Vehicle B: Luxury Electric (Lucid Air, $250/day, 5 seats, 2024)
    api_client.post(
        "/api/v1/vehicles",
        json={
            "make": "Lucid",
            "model": "Air Grand Touring",
            "year": 2024,
            "license_plate": f"FLT-{uuid.uuid4().hex[:4].upper()}",
            "vin": f"VIN{uuid.uuid4().hex[:12].upper()}",
            "category": "LUXURY",
            "fuel_type": "ELECTRIC",
            "transmission": "AUTOMATIC",
            "seating_capacity": 5,
            "daily_rate": 250.00,
            "location_id": loc_id,
            "popularity_score": 98,
        },
        headers=admin_headers,
    )

    # Vehicle C: Large SUV Diesel (Cadillac Escalade, $180/day, 7 seats, 2023)
    api_client.post(
        "/api/v1/vehicles",
        json={
            "make": "Cadillac",
            "model": "Escalade ESV",
            "year": 2023,
            "license_plate": f"FLT-{uuid.uuid4().hex[:4].upper()}",
            "vin": f"VIN{uuid.uuid4().hex[:12].upper()}",
            "category": "SUV",
            "fuel_type": "DIESEL",
            "transmission": "AUTOMATIC",
            "seating_capacity": 7,
            "daily_rate": 180.00,
            "location_id": loc_id,
            "popularity_score": 85,
        },
        headers=admin_headers,
    )

    # Filter 1: Brand = Toyota
    r = api_client.get("/api/v1/vehicles?brand=Toyota")
    assert r.status_code == 200
    items = r.json()["data"]
    assert all(v["make"].lower() == "toyota" for v in items)
    assert any(v["model"] == "Corolla SE" for v in items)

    # Filter 2: Category = LUXURY
    r = api_client.get("/api/v1/vehicles?category=LUXURY")
    assert r.status_code == 200
    assert any(v["model"] == "Air Grand Touring" for v in r.json()["data"])
    assert not any(v["model"] == "Corolla SE" for v in r.json()["data"])

    # Filter 3: Fuel Type = ELECTRIC
    r = api_client.get("/api/v1/vehicles?fuel_type=ELECTRIC")
    assert r.status_code == 200
    assert all(v["fuel_type"].upper() == "ELECTRIC" for v in r.json()["data"])

    # Filter 4: Seating Capacity >= 7
    r = api_client.get("/api/v1/vehicles?seats=7")
    assert r.status_code == 200
    assert all(v["seating_capacity"] >= 7 for v in r.json()["data"])
    assert any(v["model"] == "Escalade ESV" for v in r.json()["data"])

    # Filter 5: Price Range $100 to $200
    r = api_client.get("/api/v1/vehicles?min_price=100&max_price=200")
    assert r.status_code == 200
    for v in r.json()["data"]:
        assert 100 <= float(v["daily_rate"]) <= 200

    # Sorting 1: price_asc
    r = api_client.get("/api/v1/vehicles?sort_by=price_asc&limit=10")
    assert r.status_code == 200
    prices = [float(v["daily_rate"]) for v in r.json()["data"]]
    assert prices == sorted(prices)

    # Sorting 2: price_desc
    r = api_client.get("/api/v1/vehicles?sort_by=price_desc&limit=10")
    assert r.status_code == 200
    prices = [float(v["daily_rate"]) for v in r.json()["data"]]
    assert prices == sorted(prices, reverse=True)

    # Sorting 3: popularity
    r = api_client.get("/api/v1/vehicles?sort_by=popularity&limit=10")
    assert r.status_code == 200
    pop = [v["popularity_score"] for v in r.json()["data"]]
    assert pop == sorted(pop, reverse=True)


def test_maintenance_and_archive_bookability_rules(api_client, auth_tokens):
    """
    CRITICAL BUSINESS RULE:
    Archived or under-maintenance vehicles MUST NOT be bookable!
    """
    admin_headers = auth_tokens["admin_headers"]

    # Create vehicle for maintenance test
    veh_res = api_client.post(
        "/api/v1/vehicles",
        json={
            "make": "BMW",
            "model": "M5 Competition",
            "year": 2023,
            "license_plate": f"MNT-{uuid.uuid4().hex[:4].upper()}",
            "vin": f"VIN{uuid.uuid4().hex[:12].upper()}",
            "category": "LUXURY",
            "fuel_type": "PETROL",
            "transmission": "AUTOMATIC",
            "seating_capacity": 5,
            "daily_rate": 220.00,
        },
        headers=admin_headers,
    )
    v_id = veh_res.json()["data"]["id"]

    # Initial state: AVAILABLE and is_bookable is True
    detail = api_client.get(f"/api/v1/vehicles/{v_id}").json()["data"]
    assert detail["status"].upper() == "AVAILABLE"
    assert detail["is_bookable"] is True

    # 1. Schedule maintenance -> Vehicle switches to MAINTENANCE, is_bookable becomes False
    maint_res = api_client.post(
        f"/api/v1/vehicles/{v_id}/maintenance",
        json={
            "maintenance_type": "BRAKE_SERVICE",
            "description": "Ceramic brake pads replacement and sensor alignment",
            "cost": 1450.00,
            "service_provider": "BMW Service Center",
            "start_date": "2026-11-05T09:00:00Z",
        },
        headers=admin_headers,
    )
    assert maint_res.status_code == 201
    m_record = maint_res.json()["data"]
    record_id = m_record["id"]

    # Verify vehicle detail status is MAINTENANCE and is_bookable is False
    v_after_maint = api_client.get(f"/api/v1/vehicles/{v_id}").json()["data"]
    assert v_after_maint["status"].upper() == "MAINTENANCE"
    assert v_after_maint["is_bookable"] is False

    # Verify available_only=True excludes this vehicle
    avail_catalog = api_client.get("/api/v1/vehicles?available_only=true").json()["data"]
    assert not any(v["id"] == v_id for v in avail_catalog)

    # 2. Complete maintenance -> Vehicle restored to AVAILABLE and is_bookable returns True
    comp_res = api_client.patch(
        f"/api/v1/vehicles/maintenance/{record_id}",
        json={
            "status": "COMPLETED",
            "notes": "Work completed and safety inspection passed.",
            "end_date": "2026-11-06T14:00:00Z",
        },
        headers=admin_headers,
    )
    assert comp_res.status_code == 200

    v_restored = api_client.get(f"/api/v1/vehicles/{v_id}").json()["data"]
    assert v_restored["status"].upper() == "AVAILABLE"
    assert v_restored["is_bookable"] is True

    # 3. Archive vehicle -> status becomes ARCHIVED and is_bookable becomes False
    arch_res = api_client.post(f"/api/v1/vehicles/{v_id}/archive", headers=admin_headers)
    assert arch_res.status_code == 200
    assert arch_res.json()["data"]["status"].upper() == "ARCHIVED"
    assert arch_res.json()["data"]["is_bookable"] is False

    # Default catalog query does NOT return archived vehicles
    default_catalog = api_client.get("/api/v1/vehicles").json()["data"]
    assert not any(v["id"] == v_id for v in default_catalog)

    # Admin with include_archived=true can see it
    admin_catalog = api_client.get("/api/v1/vehicles?include_archived=true").json()["data"]
    assert any(v["id"] == v_id for v in admin_catalog)


def test_vehicle_image_upload_and_pricing(api_client, auth_tokens):
    admin_headers = auth_tokens["admin_headers"]

    # Create vehicle
    v = api_client.post(
        "/api/v1/vehicles",
        json={
            "make": "Audi",
            "model": "RS e-tron GT",
            "year": 2024,
            "license_plate": f"IMG-{uuid.uuid4().hex[:4].upper()}",
            "vin": f"VIN{uuid.uuid4().hex[:12].upper()}",
            "category": "LUXURY",
            "fuel_type": "ELECTRIC",
            "transmission": "AUTOMATIC",
            "seating_capacity": 4,
            "daily_rate": 260.00,
        },
        headers=admin_headers,
    ).json()["data"]
    v_id = v["id"]

    # 1. Upload mock vehicle image (provider-independent storage abstraction)
    image_bytes = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xdb"
    files = {"file": ("front_angle.jpg", io.BytesIO(image_bytes), "image/jpeg")}
    data = {"is_primary": "true", "caption": "Front 3/4 Exterior Angle"}

    upload_res = api_client.post(f"/api/v1/vehicles/{v_id}/images", files=files, data=data, headers=admin_headers)
    assert upload_res.status_code == 201
    img1 = upload_res.json()["data"]
    img1_id = img1["id"]
    assert img1["is_primary"] is True
    assert img1["caption"] == "Front 3/4 Exterior Angle"

    # 2. Upload second image as non-primary
    files2 = {"file": ("interior.jpg", io.BytesIO(image_bytes), "image/jpeg")}
    upload_res2 = api_client.post(f"/api/v1/vehicles/{v_id}/images", files=files2, data={"is_primary": "false", "caption": "Cockpit View"}, headers=admin_headers)
    assert upload_res2.status_code == 201
    img2 = upload_res2.json()["data"]
    img2_id = img2["id"]
    assert img2["is_primary"] is False

    # Verify vehicle details now contain both images
    detail = api_client.get(f"/api/v1/vehicles/{v_id}").json()["data"]
    assert len(detail["images"]) == 2
    assert detail["primary_image_url"] is not None

    # 3. Switch primary image to img2
    set_primary = api_client.patch(f"/api/v1/vehicles/{v_id}/images/{img2_id}/primary", headers=admin_headers)
    assert set_primary.status_code == 200
    assert set_primary.json()["data"]["is_primary"] is True

    # 4. Delete image 1
    del_res = api_client.delete(f"/api/v1/vehicles/images/{img1_id}", headers=admin_headers)
    assert del_res.status_code == 200

    detail_after = api_client.get(f"/api/v1/vehicles/{v_id}").json()["data"]
    assert len(detail_after["images"]) == 1

    # 5. Pricing Management: Update rates
    pricing_res = api_client.put(
        f"/api/v1/vehicles/{v_id}/pricing",
        json={"daily_rate": 290.00, "weekly_rate": 1740.00, "monthly_rate": 5800.00},
        headers=admin_headers,
    )
    assert pricing_res.status_code == 200
    updated_pricing = pricing_res.json()["data"]
    assert float(updated_pricing["daily_rate"]) == 290.00
    assert float(updated_pricing["weekly_rate"]) == 1740.00
    assert float(updated_pricing["monthly_rate"]) == 5800.00

    # 6. Rental History endpoint
    history_res = api_client.get(f"/api/v1/vehicles/{v_id}/rental-history", headers=admin_headers)
    assert history_res.status_code == 200
    assert isinstance(history_res.json()["data"], list)


def test_admin_exclusive_vehicle_availability_control(api_client, auth_tokens):
    """Business Logic Validation:
    1. Admin has exclusive control to toggle vehicle availability: AVAILABLE, UNAVAILABLE, MAINTENANCE.
    2. Non-admin / customer is forbidden (403) from changing availability status.
    3. When status is UNAVAILABLE or MAINTENANCE, customer bookings are blocked (409 Conflict).
    4. When status is AVAILABLE, multiple customer bookings for overlapping dates succeed without restriction.
    5. Bookings never alter the vehicle's availability status.
    """
    admin_headers = auth_tokens["admin_headers"]
    cust_headers = auth_tokens["customer_headers"]

    # 1. Create a fresh vehicle for testing
    loc_res = api_client.get("/api/v1/locations", headers=admin_headers)
    assert loc_res.status_code == 200
    loc_id = loc_res.json()["data"][0]["id"]

    v_payload = {
        "vin": f"VIN-AVAIL-{uuid.uuid4().hex[:10].upper()}",
        "license_plate": f"AVAIL-{uuid.uuid4().hex[:4].upper()}",
        "make": "Toyota",
        "model": "Innova Crysta",
        "year": 2026,
        "category": "VAN",
        "transmission": "AUTOMATIC",
        "fuel_type": "DIESEL",
        "seats": 7,
        "daily_rate": 4500.00,
        "status": "AVAILABLE",
        "location_id": loc_id,
    }
    v_create = api_client.post("/api/v1/vehicles", json=v_payload, headers=admin_headers)
    assert v_create.status_code == 201
    v_id = v_create.json()["data"]["id"]

    # 2. Customer attempts to change status via /availability -> 403 Forbidden
    cust_avail_res = api_client.patch(
        f"/api/v1/vehicles/{v_id}/availability",
        json={"status": "UNAVAILABLE"},
        headers=cust_headers,
    )
    assert cust_avail_res.status_code == 403

    # 3. Customer attempts to change status via PATCH /vehicles/{id} -> 403 Forbidden
    cust_update_res = api_client.patch(
        f"/api/v1/vehicles/{v_id}",
        json={"status": "UNAVAILABLE"},
        headers=cust_headers,
    )
    assert cust_update_res.status_code == 403

    # 4. Admin marks vehicle as UNAVAILABLE -> 200 OK
    admin_unavail_res = api_client.patch(
        f"/api/v1/vehicles/{v_id}/availability",
        json={"status": "UNAVAILABLE"},
        headers=admin_headers,
    )
    assert admin_unavail_res.status_code == 200
    assert admin_unavail_res.json()["data"]["status"] == "UNAVAILABLE"

    # Check availability endpoint reflects false
    chk_res = api_client.post("/api/v1/bookings/check-availability", json={
        "vehicle_id": v_id,
        "start_datetime": "2026-12-10T10:00:00Z",
        "end_datetime": "2026-12-15T10:00:00Z",
    })
    assert chk_res.status_code == 200
    assert chk_res.json()["data"]["is_available"] is False

    # Customer booking is blocked (409 Conflict)
    book_block_res = api_client.post("/api/v1/bookings", json={
        "vehicle_id": v_id,
        "pickup_location_id": loc_id,
        "return_location_id": loc_id,
        "start_datetime": "2026-12-10T10:00:00Z",
        "end_datetime": "2026-12-15T10:00:00Z",
        "customer_name": "Blocked Customer",
    }, headers=cust_headers)
    assert book_block_res.status_code == 409

    # 5. Admin marks vehicle as MAINTENANCE -> 200 OK
    admin_maint_res = api_client.patch(
        f"/api/v1/vehicles/{v_id}/availability",
        json={"status": "MAINTENANCE"},
        headers=admin_headers,
    )
    assert admin_maint_res.status_code == 200
    assert admin_maint_res.json()["data"]["status"] == "MAINTENANCE"

    # Customer booking still blocked
    book_maint_res = api_client.post("/api/v1/bookings", json={
        "vehicle_id": v_id,
        "pickup_location_id": loc_id,
        "return_location_id": loc_id,
        "start_datetime": "2026-12-10T10:00:00Z",
        "end_datetime": "2026-12-15T10:00:00Z",
        "customer_name": "Maintenance Blocked Customer",
    }, headers=cust_headers)
    assert book_maint_res.status_code == 409

    # 6. Admin restores status to AVAILABLE -> 200 OK
    admin_avail_res = api_client.patch(
        f"/api/v1/vehicles/{v_id}/availability",
        json={"status": "AVAILABLE"},
        headers=admin_headers,
    )
    assert admin_avail_res.status_code == 200
    assert admin_avail_res.json()["data"]["status"] == "AVAILABLE"

    # 7. Multiple customers can now create overlapping bookings for same vehicle without restriction
    book_cust1 = api_client.post("/api/v1/bookings", json={
        "vehicle_id": v_id,
        "pickup_location_id": loc_id,
        "return_location_id": loc_id,
        "start_datetime": "2026-12-10T10:00:00Z",
        "end_datetime": "2026-12-15T10:00:00Z",
        "customer_name": "Overlapping Customer 1",
    }, headers=cust_headers)
    assert book_cust1.status_code == 201

    book_cust2 = api_client.post("/api/v1/bookings", json={
        "vehicle_id": v_id,
        "pickup_location_id": loc_id,
        "return_location_id": loc_id,
        "start_datetime": "2026-12-12T10:00:00Z",
        "end_datetime": "2026-12-17T10:00:00Z",
        "customer_name": "Overlapping Customer 2",
    }, headers=cust_headers)
    assert book_cust2.status_code == 201

    # 8. Verify bookings do NOT alter vehicle status: vehicle remains AVAILABLE
    veh_detail = api_client.get(f"/api/v1/vehicles/{v_id}").json()["data"]
    assert veh_detail["status"] == "AVAILABLE"

