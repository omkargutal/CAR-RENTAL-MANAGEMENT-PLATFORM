import pytest
import uuid
import httpx

BASE_URL = "http://localhost:8000"


@pytest.fixture
def api_client():
    """Live HTTP client connected to running backend container."""
    return httpx.Client(base_url=BASE_URL, timeout=10.0)


def test_customer_registration_success(api_client):
    unique_email = f"customer_{uuid.uuid4().hex[:8]}@example.com"
    payload = {
        "email": unique_email,
        "password": "SecurePassword123!",
        "full_name": "Test Customer",
        "phone_number": "+15551234567",
    }
    res = api_client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == 201, res.text
    data = res.json()["data"]

    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert "refresh_token" in data
    assert data["user"]["email"] == unique_email
    assert data["user"]["role"].lower() == "customer"
    assert data["user"]["is_active"] is True
    assert data["user"]["is_verified"] is False

    # Check HttpOnly cookie
    cookies = res.cookies
    assert "carrental_refresh_token" in cookies


def test_customer_registration_duplicate_email_fails(api_client):
    unique_email = f"dup_{uuid.uuid4().hex[:8]}@example.com"
    payload = {
        "email": unique_email,
        "password": "SecurePassword123!",
        "full_name": "Duplicate Tester",
    }
    res1 = api_client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = api_client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 409
    assert res2.json()["error"]["code"] == "CONFLICT"


def test_login_successful_with_argon2(api_client):
    email = f"login_{uuid.uuid4().hex[:8]}@example.com"
    password = "CorrectPassword123!"

    # 1. Register
    reg_res = api_client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "full_name": "Login Tester"},
    )
    assert reg_res.status_code == 201

    # 2. Login
    login_res = api_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_res.status_code == 200
    login_data = login_res.json()["data"]
    assert "access_token" in login_data
    assert login_data["user"]["email"] == email


def test_login_invalid_credentials_fails(api_client):
    email = f"badcreds_{uuid.uuid4().hex[:8]}@example.com"
    api_client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "ActualPassword123!", "full_name": "Bad Creds"},
    )

    res = api_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "WrongPassword999!"},
    )
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "UNAUTHORIZED"


def test_login_rate_limiting_lockout(api_client):
    email = f"lockout_{uuid.uuid4().hex[:8]}@example.com"
    api_client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "MySecretPassword123!", "full_name": "Lockout User"},
    )

    # Trigger 5 failed logins (max allowed)
    for _ in range(5):
        api_client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "WrongPassword!"},
        )

    # 6th attempt should be locked out
    lockout_res = api_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "MySecretPassword123!"},
    )
    assert lockout_res.status_code == 401
    assert "locked" in lockout_res.json()["error"]["message"].lower()


def test_refresh_token_session_rotation(api_client):
    email = f"refresh_{uuid.uuid4().hex[:8]}@example.com"
    reg_res = api_client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "RefreshPassword123!", "full_name": "Refresh Tester"},
    )
    assert reg_res.status_code == 201
    first_refresh_token = reg_res.json()["data"]["refresh_token"]

    # Refresh session with token in body
    refresh_res = api_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": first_refresh_token},
    )
    assert refresh_res.status_code == 200
    refreshed_data = refresh_res.json()["data"]
    new_refresh_token = refreshed_data["refresh_token"]
    assert new_refresh_token != first_refresh_token

    # Token rotation check: Attempting to reuse old refresh token MUST fail
    reuse_res = api_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": first_refresh_token},
    )
    assert reuse_res.status_code == 401


def test_logout_revokes_session(api_client):
    email = f"logout_{uuid.uuid4().hex[:8]}@example.com"
    reg_res = api_client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "LogoutPassword123!", "full_name": "Logout User"},
    )
    refresh_token = reg_res.json()["data"]["refresh_token"]

    # Logout
    logout_res = api_client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": refresh_token},
    )
    assert logout_res.status_code == 200

    # Refresh should fail now
    fail_refresh = api_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert fail_refresh.status_code == 401


def test_password_reset_flow(api_client):
    email = f"reset_{uuid.uuid4().hex[:8]}@example.com"
    api_client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "OldPassword123!", "full_name": "Reset User"},
    )

    # 1. Forgot password request (in dev environment returns the reset token for testing)
    forgot_res = api_client.post(
        "/api/v1/auth/forgot-password",
        json={"email": email},
    )
    assert forgot_res.status_code == 200
    reset_token = forgot_res.json()["data"]["reset_token"]
    assert reset_token is not None

    # 2. Reset password
    reset_res = api_client.post(
        "/api/v1/auth/reset-password",
        json={"token": reset_token, "new_password": "BrandNewPassword123!"},
    )
    assert reset_res.status_code == 200

    # 3. Old password fails
    old_login = api_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "OldPassword123!"},
    )
    assert old_login.status_code == 401

    # 4. New password succeeds
    new_login = api_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "BrandNewPassword123!"},
    )
    assert new_login.status_code == 200


def test_customer_profile_and_documents_management(api_client):
    email = f"profile_{uuid.uuid4().hex[:8]}@example.com"
    reg_res = api_client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "Password123!", "full_name": "Original Name"},
    )
    token = reg_res.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. View /me
    me_res = api_client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["data"]["full_name"] == "Original Name"

    # 2. Update profile
    patch_res = api_client.patch(
        "/api/v1/auth/me",
        headers=headers,
        json={"full_name": "Updated Name", "phone_number": "+14159998888"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["data"]["full_name"] == "Updated Name"

    # 3. Update documents (driver's license)
    doc_res = api_client.post(
        "/api/v1/auth/documents",
        headers=headers,
        json={
            "driver_license_number": "CA-DL-98765432",
            "driver_license_state": "CA",
            "driver_license_country": "USA",
            "driver_license_expiry": "2028-12-31",
        },
    )
    assert doc_res.status_code == 200
    docs = doc_res.json()["data"]["documents"]
    assert docs["driver_license_number"] == "CA-DL-98765432"


def test_role_permissions_and_unauthorized_access(api_client):
    # 1. Anonymous access to protected route returns 401
    anon_res = api_client.get("/api/v1/auth/me")
    assert anon_res.status_code == 401

    # 2. Customer user attempting to access administrative user list returns 403
    cust_res = api_client.post(
        "/api/v1/auth/register",
        json={"email": f"cust_{uuid.uuid4().hex[:8]}@example.com", "password": "Password123!", "full_name": "Customer User"},
    )
    cust_token = cust_res.json()["data"]["access_token"]
    cust_headers = {"Authorization": f"Bearer {cust_token}"}

    forbidden_list = api_client.get("/api/v1/users", headers=cust_headers)
    assert forbidden_list.status_code == 403
    assert forbidden_list.json()["error"]["code"] == "FORBIDDEN"

    # 3. Create Admin user directly to test RBAC capabilities
    admin_email = f"admin_{uuid.uuid4().hex[:8]}@example.com"
    admin_reg = api_client.post(
        "/api/v1/auth/register",
        json={"email": admin_email, "password": "AdminPassword123!", "full_name": "Super Admin"},
    )
    admin_id = admin_reg.json()["data"]["user"]["id"]

    # Elevate user to ADMIN via DB
    import asyncio
    from app.core.database import AsyncSessionLocal
    from sqlalchemy import text
    async def _elevate():
        async with AsyncSessionLocal() as session:
            await session.execute(text(f"UPDATE users SET role = 'ADMIN' WHERE id = '{admin_id}'"))
            await session.commit()
    asyncio.run(_elevate())


    # Login as Admin to get fresh token with role=admin claim
    admin_login = api_client.post(
        "/api/v1/auth/login",
        json={"email": admin_email, "password": "AdminPassword123!"},
    )
    admin_token = admin_login.json()["data"]["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 4. Admin CAN list users
    users_list = api_client.get("/api/v1/users", headers=admin_headers)
    assert users_list.status_code == 200
    assert len(users_list.json()["data"]) >= 2

    # 5. Admin can elevate customer to staff with audit trail
    target_user_id = cust_res.json()["data"]["user"]["id"]
    role_change_res = api_client.patch(
        f"/api/v1/users/{target_user_id}/role",
        headers=admin_headers,
        json={"role": "staff", "reason": "Promoted to fleet coordinator"},
    )
    assert role_change_res.status_code == 200
    assert role_change_res.json()["data"]["role"].lower() == "staff"

    # 6. Admin CANNOT change their own role (security rule)
    self_role_change = api_client.patch(
        f"/api/v1/users/{admin_id}/role",
        headers=admin_headers,
        json={"role": "customer", "reason": "Self demotion"},
    )
    assert self_role_change.status_code == 403

    # 7. Admin can view administrative audit logs
    audit_res = api_client.get("/api/v1/users/audit-logs", headers=admin_headers)
    assert audit_res.status_code == 200
    logs = audit_res.json()["data"]
    assert any(log["action"] == "user.role_changed" for log in logs)
