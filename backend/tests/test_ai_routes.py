from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_ai_test_endpoint():
    response = client.get("/api/ai/test")
    assert response.status_code == 200
    data = response.json()
    assert "result" in data
    assert "4" in data["result"]
