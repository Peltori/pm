from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_ai_test_endpoint():
    response = client.get("/api/ai/test")
    assert response.status_code == 200
    data = response.json()
    assert "result" in data
    assert "4" in data["result"]


def test_ai_test_structured_endpoint():
    response = client.get("/api/ai/test-structured")
    assert response.status_code == 200
    data = response.json()
    assert "structured_result" in data
    assert "greeting" in data["structured_result"]
