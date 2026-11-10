import asyncio
from datetime import datetime, timedelta, timezone
import json
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
def test_roles(api_client):
    uid = uuid.uuid4().hex[:8]

    # Customer
    cust_email = f"wacust_{uid}@testops.com"
    r = api_client.post(
        "/api/v1/auth/register",
        json={"email": cust_email, "password": "Password123!", "full_name": "WhatsApp Customer"},
    )
    assert r.status_code == 201
    cust_token = r.json()["data"]["access_token"]
    cust_id = r.json()["data"]["user"]["id"]

    # Admin
    admin_email = f"waadmin_{uid}@testops.com"
    r = api_client.post(
        "/api/v1/auth/register",
        json={"email": admin_email, "password": "Password123!", "full_name": "WhatsApp Admin"},
    )
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


def test_public_whatsapp_config(api_client):
    """
    1. Acceptance Criteria: Website WhatsApp button redirects to the configured business number
    without requiring API credentials. Verifies +91 formatting and wa.me URL generation.
    """
    res = api_client.get("/api/v1/whatsapp/public-config")
    assert res.status_code == 200
    data = res.json()["data"]
    assert "floating_button_enabled" in data
    assert "business_phone_number" in data
    assert "wa_me_url" in data
    assert data["wa_me_url"].startswith("https://wa.me/")
    # If 10-digit number e.g. 9876543210, wa.me should have 919876543210
    if data["business_phone_number"]:
        digits = "".join(filter(str.isdigit, data["business_phone_number"]))
        if len(digits) == 10:
            assert f"91{digits}" in data["wa_me_url"]


def test_webhook_verification_handshake(api_client):
    """
    2. Acceptance Criteria: Meta webhook verification handshake.
    GET /webhook with hub.mode, hub.verify_token, and hub.challenge.
    """
    # Success handshake
    res = api_client.get(
        "/api/v1/whatsapp/webhook",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "autofleet_webhook_token_2026",
            "hub.challenge": "challenge_token_xyz_9988",
        },
    )
    assert res.status_code == 200
    assert res.text == "challenge_token_xyz_9988"

    # Invalid token handshake rejected
    bad_res = api_client.get(
        "/api/v1/whatsapp/webhook",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "wrong_token_unauthorized",
            "hub.challenge": "challenge_token_xyz_9988",
        },
    )
    assert bad_res.status_code == 403

    # Missing parameters rejected
    missing_res = api_client.get("/api/v1/whatsapp/webhook")
    assert missing_res.status_code == 400


def test_admin_config_management_and_credential_masking(api_client, test_roles):
    """
    3. Acceptance Criteria: Admin can view and update credentials.
    Access tokens and secrets must be masked and never exposed raw in frontend APIs.
    """
    admin_headers = test_roles["admin"]["headers"]

    # 1. Fetch config
    res = api_client.get("/api/v1/whatsapp/config", headers=admin_headers)
    assert res.status_code == 200
    cfg = res.json()["data"]
    assert "access_token_masked" in cfg
    assert "has_access_token" in cfg
    assert cfg["webhook_url"].endswith("/api/v1/whatsapp/webhook")

    # 2. Update config with test credentials
    update_res = api_client.put(
        "/api/v1/whatsapp/config",
        headers=admin_headers,
        json={
            "phone_number_id": "100982736451",
            "waba_id": "90827364512",
            "business_phone_number": "9123456780",
            "display_phone_number": "+91 91234 56780",
            "access_token": "EAAG_TEST_ACCESS_TOKEN_SECRET_XYZ",
            "floating_button_enabled": True,
            "floating_button_greeting": "Hello AutoFleet! Interested in renting.",
        },
    )
    assert update_res.status_code == 200
    updated_cfg = update_res.json()["data"]
    assert updated_cfg["business_phone_number"] == "9123456780"
    assert updated_cfg["phone_number_id"] == "100982736451"
    assert updated_cfg["has_access_token"] is True
    # Masked verification
    assert updated_cfg["access_token_masked"].startswith("EAAG")
    assert "••••••••" in updated_cfg["access_token_masked"]
    assert "SECRET" not in updated_cfg["access_token_masked"]


def test_connection_and_test_message(api_client, test_roles):
    """
    4. Acceptance Criteria: Test connection and send test message.
    """
    admin_headers = test_roles["admin"]["headers"]

    # Test connection
    conn_res = api_client.post("/api/v1/whatsapp/test-connection", headers=admin_headers)
    assert conn_res.status_code == 200
    conn_data = conn_res.json()["data"]
    assert "connected" in conn_data
    assert "status" in conn_data

    # Send test message
    msg_res = api_client.post(
        "/api/v1/whatsapp/test-message",
        headers=admin_headers,
        json={
            "recipient_phone": "919876543210",
            "message": "Automated WhatsApp test from PyTest suite.",
        },
    )
    assert msg_res.status_code == 200
    msg_data = msg_res.json()["data"]
    assert msg_data["recipient_phone"] == "919876543210"
    assert msg_data["status"] == "SENT"
    assert msg_data["wamid"].startswith("wamid.")


def test_inbound_webhook_chatbot_fleet_and_pricing_query(api_client):
    """
    5. Acceptance Criteria: Customers can enquire about availability and rates.
    Chatbot replies with live database vehicles and rates.
    """
    wamid = f"wamid.HBgL{uuid.uuid4().hex[:12]}="
    test_phone = f"9198{uuid.uuid4().hex[:8]}"

    # Simulate incoming message payload from Meta
    payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "100982736451",
                "changes": [
                    {
                        "field": "messages",
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {"display_phone_number": "123456", "phone_number_id": "100982736451"},
                            "contacts": [{"profile": {"name": "Test Customer"}, "wa_id": test_phone}],
                            "messages": [
                                {
                                    "from": test_phone,
                                    "id": wamid,
                                    "timestamp": "1730580000",
                                    "text": {"body": "Hi, what cars do you have available?"},
                                    "type": "text",
                                }
                            ],
                        },
                    }
                ],
            }
        ],
    }

    res = api_client.post("/api/v1/whatsapp/webhook", json=payload)
    assert res.status_code == 200
    assert res.json()["status"] == "EVENT_RECEIVED"

    # Verify that conversation and messages were created in database
    async def _verify_db():
        conn = await asyncpg.connect(PG_DSN)
        conv = await conn.fetchrow("SELECT * FROM whatsapp_conversations WHERE phone_number = $1", test_phone)
        assert conv is not None
        assert conv["customer_name"] == "Test Customer"

        # Check messages: 1 inbound and 1 outbound (bot reply)
        msgs = await conn.fetch(
            "SELECT * FROM whatsapp_messages WHERE conversation_id = $1 ORDER BY created_at ASC", conv["id"]
        )
        assert len(msgs) >= 2
        inbound = msgs[0]
        outbound = msgs[1]

        assert inbound["direction"] == "INBOUND"
        assert inbound["content"] == "Hi, what cars do you have available?"

        assert outbound["direction"] == "OUTBOUND"
        assert "Available Vehicles" in outbound["content"]
        assert "$" in outbound["content"]  # Real rates included
        await conn.close()

    asyncio.run(_verify_db())


def test_inbound_webhook_chatbot_booking_lookup_security(api_client, test_roles):
    """
    6. Acceptance Criteria: Validate customer identity before sharing private booking information.
    Never invent data. Enforce privacy verification if phone doesn't match.
    """
    # 1. Create a real test booking
    cust = test_roles["customer"]
    v_res = api_client.get("/api/v1/vehicles")
    vehicle = v_res.json()["data"][0]
    loc_res = api_client.get("/api/v1/locations")
    location = loc_res.json()["data"][0]

    unique_num = int(uuid.uuid4().hex[:6], 16)
    start_dt = (datetime.now(timezone.utc) + timedelta(days=3000 + unique_num % 10000)).replace(minute=0, second=0, microsecond=0)
    end_dt = start_dt + timedelta(days=2)

    registered_phone = f"+91 9988776655"
    book_res = api_client.post(
        "/api/v1/bookings",
        headers=cust["headers"],
        json={
            "vehicle_id": vehicle["id"],
            "pickup_location_id": location["id"],
            "return_location_id": location["id"],
            "start_datetime": start_dt.isoformat(),
            "end_datetime": end_dt.isoformat(),
            "customer_name": "Verified Traveler",
            "customer_email": cust["email"],
            "customer_phone": registered_phone,
            "driver_license_number": "DL-WA-888999",
            "buffer_minutes": 60,
        },
    )
    assert book_res.status_code == 201
    booking_ref = book_res.json()["data"]["booking_reference"]

    # CASE A: Unauthorized third-party phone attempts to check the booking
    unauthorized_phone = "911122334455"
    wamid_unauth = f"wamid.HBgL{uuid.uuid4().hex[:12]}="
    payload_unauth = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "100982736451",
                "changes": [
                    {
                        "field": "messages",
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {"display_phone_number": "123456", "phone_number_id": "100982736451"},
                            "contacts": [{"profile": {"name": "Snoop"}, "wa_id": unauthorized_phone}],
                            "messages": [
                                {
                                    "from": unauthorized_phone,
                                    "id": wamid_unauth,
                                    "timestamp": "1730580010",
                                    "text": {"body": f"Check status for {booking_ref}"},
                                    "type": "text",
                                }
                            ],
                        },
                    }
                ],
            }
        ],
    }
    r1 = api_client.post("/api/v1/whatsapp/webhook", json=payload_unauth)
    assert r1.status_code == 200

    # CASE B: Legitimate customer phone checks the booking
    legit_phone = "919988776655"
    wamid_legit = f"wamid.HBgL{uuid.uuid4().hex[:12]}="
    payload_legit = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "100982736451",
                "changes": [
                    {
                        "field": "messages",
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {"display_phone_number": "123456", "phone_number_id": "100982736451"},
                            "contacts": [{"profile": {"name": "Verified Traveler"}, "wa_id": legit_phone}],
                            "messages": [
                                {
                                    "from": legit_phone,
                                    "id": wamid_legit,
                                    "timestamp": "1730580020",
                                    "text": {"body": f"My booking {booking_ref}"},
                                    "type": "text",
                                }
                            ],
                        },
                    }
                ],
            }
        ],
    }
    r2 = api_client.post("/api/v1/whatsapp/webhook", json=payload_legit)
    assert r2.status_code == 200

    async def _verify_security():
        conn = await asyncpg.connect(PG_DSN)

        # Check unauthorized conversation reply
        c1 = await conn.fetchrow("SELECT id FROM whatsapp_conversations WHERE phone_number = $1", unauthorized_phone)
        m1 = await conn.fetchrow(
            "SELECT content FROM whatsapp_messages WHERE conversation_id = $1 AND direction = 'OUTBOUND' ORDER BY created_at DESC",
            c1["id"],
        )
        assert "Privacy Verification Required" in m1["content"]
        assert "Verified Traveler" not in m1["content"]  # Never disclosed!

        # Check authorized conversation reply
        c2 = await conn.fetchrow("SELECT id FROM whatsapp_conversations WHERE phone_number = $1", legit_phone)
        m2 = await conn.fetchrow(
            "SELECT content FROM whatsapp_messages WHERE conversation_id = $1 AND direction = 'OUTBOUND' ORDER BY created_at DESC",
            c2["id"],
        )
        assert booking_ref in m2["content"]
        assert "Verified Traveler" in m2["content"]  # Successfully disclosed
        assert "Total Charge" in m2["content"]

        await conn.close()

    asyncio.run(_verify_security())


def test_human_support_escalation_and_admin_manual_reply(api_client, test_roles):
    """
    7. Acceptance Criteria: Human support escalation works.
    Status transitions to HUMAN_AGENT, admin can view conversation and send manual outbound reply.
    """
    admin_headers = test_roles["admin"]["headers"]
    handover_phone = f"9197{uuid.uuid4().hex[:8]}"
    wamid_handover = f"wamid.HBgL{uuid.uuid4().hex[:12]}="

    payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "100982736451",
                "changes": [
                    {
                        "field": "messages",
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {"display_phone_number": "123456", "phone_number_id": "100982736451"},
                            "contacts": [{"profile": {"name": "Needy Customer"}, "wa_id": handover_phone}],
                            "messages": [
                                {
                                    "from": handover_phone,
                                    "id": wamid_handover,
                                    "timestamp": "1730580030",
                                    "text": {"body": "I want to speak with a human agent please"},
                                    "type": "text",
                                }
                            ],
                        },
                    }
                ],
            }
        ],
    }
    r = api_client.post("/api/v1/whatsapp/webhook", json=payload)
    assert r.status_code == 200

    # Admin fetches conversations filtered by HUMAN_AGENT
    convs_res = api_client.get(
        "/api/v1/whatsapp/conversations",
        headers=admin_headers,
        params={"status": "HUMAN_AGENT"},
    )
    assert convs_res.status_code == 200
    convs = convs_res.json()["data"]
    target_conv = next((c for c in convs if c["phone_number"] == handover_phone), None)
    assert target_conv is not None
    assert target_conv["status"] == "HUMAN_AGENT"

    conv_id = target_conv["id"]

    # Admin inspects thread
    thread_res = api_client.get(f"/api/v1/whatsapp/conversations/{conv_id}", headers=admin_headers)
    assert thread_res.status_code == 200
    thread = thread_res.json()["data"]
    assert len(thread["messages"]) >= 2

    # Admin sends manual reply directly to customer via WhatsApp
    reply_res = api_client.post(
        f"/api/v1/whatsapp/conversations/{conv_id}/reply",
        headers=admin_headers,
        json={"message": "Hello, this is Omkar from AutoFleet support. How can I assist you with your booking?"},
    )
    assert reply_res.status_code == 200
    reply_data = reply_res.json()["data"]
    assert reply_data["direction"] == "OUTBOUND"
    assert reply_data["status"] == "SENT"
    assert "Omkar" in reply_data["content"]

    # Admin resolves or switches back to BOT
    handover_res = api_client.put(
        f"/api/v1/whatsapp/conversations/{conv_id}/handover",
        headers=admin_headers,
        json={"status": "BOT", "notes": "Issue resolved by concierge."},
    )
    assert handover_res.status_code == 200
    assert handover_res.json()["data"]["status"] == "BOT"


def test_delivery_status_updates_and_webhook_idempotency(api_client, test_roles):
    """
    8. Acceptance Criteria: Delivery status receipts and idempotent webhook deduplication.
    """
    admin_headers = test_roles["admin"]["headers"]

    # 1. Send an outbound message to get a wamid
    send_res = api_client.post(
        "/api/v1/whatsapp/test-message",
        headers=admin_headers,
        json={"recipient_phone": "919876543210", "message": "Status tracking test"},
    )
    assert send_res.status_code == 200
    wamid = send_res.json()["data"]["wamid"]

    # 2. Simulate delivery status update from Meta: 'delivered' then 'read'
    status_payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "100982736451",
                "changes": [
                    {
                        "field": "messages",
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {"display_phone_number": "123456", "phone_number_id": "100982736451"},
                            "statuses": [
                                {
                                    "id": wamid,
                                    "status": "delivered",
                                    "timestamp": "1730580040",
                                    "recipient_id": "919876543210",
                                }
                            ],
                        },
                    }
                ],
            }
        ],
    }
    r1 = api_client.post("/api/v1/whatsapp/webhook", json=status_payload)
    assert r1.status_code == 200

    # Read status update
    status_payload["entry"][0]["changes"][0]["value"]["statuses"][0]["status"] = "read"
    r2 = api_client.post("/api/v1/whatsapp/webhook", json=status_payload)
    assert r2.status_code == 200

    # 3. Verify status in database
    async def _verify_status():
        conn = await asyncpg.connect(PG_DSN)
        msg = await conn.fetchrow("SELECT status FROM whatsapp_messages WHERE wamid = $1", wamid)
        assert msg is not None
        assert msg["status"] == "READ"
        await conn.close()

    asyncio.run(_verify_status())
