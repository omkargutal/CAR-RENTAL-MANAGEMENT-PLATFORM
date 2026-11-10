import importlib
import pytest

MODULE_NAMES = [
    "auth",
    "users",
    "vehicles",
    "locations",
    "bookings",
    "availability",
    "payments",
    "customers",
    "notifications",
    "reviews",
    "reports",
]


def test_all_11_modules_can_be_imported():
    """Verify that every module packages cleanly without circular dependencies."""
    for mod_name in MODULE_NAMES:
        module = importlib.import_module(f"app.modules.{mod_name}")
        assert module is not None


def test_modular_routes_registered_under_api_v1():
    """Verify that all 11 modules register routes under /api/v1 prefix."""
    from app.main import app

    openapi_schema = app.openapi()
    api_paths = list(openapi_schema["paths"].keys())

    # Verify modular prefixes under /api/v1
    for mod in MODULE_NAMES:
        matching = [p for p in api_paths if p.startswith(f"/api/v1/{mod}")]
        assert len(matching) > 0, f"Module '{mod}' has no routes in OpenAPI schema under /api/v1/{mod}"


def test_settings_centralized_configuration():
    """Verify Pydantic settings are centralized and properties are calculated."""
    from app.core.config import settings

    assert settings.PROJECT_NAME == "Car Rental Management Platform"
    assert "asyncpg" in settings.ASYNC_DATABASE_URL
    assert settings.API_V1_STR == "/api/v1"
