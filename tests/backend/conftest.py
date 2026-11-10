import pytest
import sys
import os

# Add backend directory to path whether running on host or inside container
host_backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend"))
if os.path.exists(host_backend_dir) and host_backend_dir not in sys.path:
    sys.path.insert(0, host_backend_dir)

if os.path.exists("/app/app") and "/app" not in sys.path:
    sys.path.insert(0, "/app")

from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(autouse=True, scope="session")
def cleanup_test_vehicles():
    yield
    import asyncio, asyncpg
    async def _clean():
        try:
            conn = await asyncpg.connect("postgresql://carrental_user:carrental_secure_password_2026@postgres:5432/carrental_db")
            await conn.execute("""
                UPDATE vehicles 
                SET is_deleted = true, status = 'ARCHIVED', sort_order = 999 
                WHERE id NOT IN (
                    '1f441ca8-781f-4332-a05f-e024620dacd6',
                    '9aeadbf8-ef83-4a55-9a5c-b3d31dac341c',
                    '7c5262ae-cec8-4ccf-a6ff-9d42d4276354',
                    '303216c5-bf92-4b4b-bd67-8520134c8d32',
                    '95c64444-b520-4ff3-8a80-daa4c15274d3',
                    '8e853f79-935d-4e96-b24a-9955668199fa',
                    '4ad15c6e-6e2d-40db-9a98-0ec35645e584',
                    '40641d65-175d-4296-8000-1caf1836c093',
                    '462320d4-ec6c-4b40-96bd-97f119349ebe',
                    '6b3bc4be-7b11-4fe5-bffe-aaab27a4eac9'
                );
            """)
            await conn.close()
        except Exception:
            pass
    try:
        asyncio.run(_clean())
    except Exception:
        pass
