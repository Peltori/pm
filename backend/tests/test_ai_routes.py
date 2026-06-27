from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_ai_test_endpoint():
    with patch("app.ai_routes.test_ai", new_callable=AsyncMock, return_value="4"):
        response = client.get("/api/ai/test")
    assert response.status_code == 200
    data = response.json()
    assert data["result"] == "4"


def test_ai_test_structured_endpoint():
    with patch("app.ai_routes.test_structured_output", new_callable=AsyncMock, return_value='{"greeting": "hello world"}'):
        response = client.get("/api/ai/test-structured")
    assert response.status_code == 200
    data = response.json()
    assert "structured_result" in data
    assert "greeting" in data["structured_result"]
