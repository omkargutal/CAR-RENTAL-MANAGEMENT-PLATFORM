def test_liveness_probe(client):
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_openapi_docs_endpoint(client):
    response = client.get("/api/v1/openapi.json")
    assert response.status_code == 200
    data = response.json()
    assert "paths" in data
    assert "/api/v1/vehicles" in data["paths"]
    assert "/api/v1/bookings" in data["paths"]
    assert "/api/v1/users" in data["paths"]
