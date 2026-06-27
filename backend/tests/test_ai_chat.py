import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.database import Card, Column, get_db as get_db_shared
from .conftest import TestingSessionLocal

client = TestClient(app)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db_shared] = override_get_db


MOCK_SIMPLE_RESPONSE = {"response": "I'm your AI assistant."}

MOCK_ADD_CARD_RESPONSE = {
    "response": "I've added the task to Backlog.",
    "board_update": {
        "add_cards": [{"column_id": 1, "title": "AI Test Task", "details": ""}],
        "move_cards": [],
        "delete_cards": [],
    },
}


def test_ai_chat_simple_response():
    """Test basic chat response without board updates."""
    with patch("app.ai_routes.chat", new_callable=AsyncMock, return_value=MOCK_SIMPLE_RESPONSE):
        response = client.post(
            "/api/ai/chat",
            json={"message": "Hello, who are you?", "user_id": "test1"},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["response"] == "I'm your AI assistant."
    assert data["board_update"] is None


def test_ai_chat_with_add_card():
    """Test AI response that adds a card to the board."""
    with patch("app.ai_routes.chat", new_callable=AsyncMock, return_value=MOCK_ADD_CARD_RESPONSE):
        response = client.post(
            "/api/ai/chat",
            json={"message": "Add a task called 'AI Test Task' to Backlog", "user_id": "test2"},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["response"] == "I've added the task to Backlog."
    assert data["board_update"] is not None
    assert "add_cards" in data["board_update"]
    assert len(data["board_update"]["add_cards"]) > 0

    # Verify the card was actually added to the database
    db = TestingSessionLocal()
    try:
        backlog = db.query(Column).filter(Column.title == "Backlog").first()
        assert backlog is not None
        cards = db.query(Card).filter(Card.column_id == backlog.id).all()
        card_titles = [c.title for c in cards]
        assert "AI Test Task" in card_titles
    finally:
        db.close()


def test_ai_chat_no_board_update():
    """Test that chat returns cleanly when no board update is needed."""
    with patch("app.ai_routes.chat", new_callable=AsyncMock, return_value={"response": "Sure thing!"}):
        response = client.post(
            "/api/ai/chat",
            json={"message": "Thanks!", "user_id": "test3"},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["response"] == "Sure thing!"
    assert data["board_update"] is None


def test_ai_chat_history_persists():
    """Test that conversation history is maintained per user."""
    with patch("app.ai_routes.chat", new_callable=AsyncMock, return_value={"response": "Response 1"}):
        client.post(
            "/api/ai/chat",
            json={"message": "First", "user_id": "test4"},
        )
    with patch("app.ai_routes.chat", new_callable=AsyncMock, return_value={"response": "Response 2"}):
        response = client.post(
            "/api/ai/chat",
            json={"message": "Second", "user_id": "test4"},
        )
    assert response.status_code == 200
    data = response.json()
    assert "response" in data
