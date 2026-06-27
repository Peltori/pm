import pytest
from unittest.mock import AsyncMock, patch

from app.services.ai import (
    chat,
    build_messages,
    build_board_context,
    _conversation_history,
    SYSTEM_PROMPT,
)


def _mock_ai_response():
    """Create a mock that returns a valid structured response."""
    mock = AsyncMock()
    mock.chat.completions.create = AsyncMock(
        return_value=AsyncMock(
            choices=[
                AsyncMock(
                    message=AsyncMock(content='{"response": "I can help with your board.", "board_update": {"add_cards": [], "move_cards": [], "delete_cards": []}}')
                )
            ]
        )
    )
    return mock


def _mock_2plus2_response():
    """Create a mock that returns 4."""
    mock = AsyncMock()
    mock.chat.completions.create = AsyncMock(
        return_value=AsyncMock(
            choices=[AsyncMock(message=AsyncMock(content="4"))]
        )
    )
    return mock


def _mock_structured_response():
    """Create a mock that returns structured JSON."""
    mock = AsyncMock()
    mock.chat.completions.create = AsyncMock(
        return_value=AsyncMock(
            choices=[
                AsyncMock(message=AsyncMock(content='{"greeting": "hello world"}'))
            ]
        )
    )
    return mock


@pytest.fixture(autouse=True)
def clear_history():
    """Clear conversation history before each test."""
    _conversation_history.clear()
    yield
    _conversation_history.clear()


@pytest.mark.asyncio
async def test_ai_2plus2():
    with patch("app.services.ai._get_client") as mock_get_client:
        mock_get_client.return_value = _mock_2plus2_response()
        from app.services.ai import test_ai
        result = await test_ai()
        assert "4" in result


@pytest.mark.asyncio
async def test_ai_structured_output():
    with patch("app.services.ai._get_client") as mock_get_client:
        mock_get_client.return_value = _mock_structured_response()
        from app.services.ai import test_structured_output
        result = await test_structured_output()
        assert "greeting" in result
        assert "hello world" in result.lower()


@pytest.mark.asyncio
async def test_chat_simple_response():
    with patch("app.services.ai._get_client") as mock_get_client:
        mock_get_client.return_value = _mock_ai_response()
        board = {"id": 1, "columns": [{"id": 1, "title": "Backlog", "cards": []}]}
        result = await chat(board, "Hello, who are you?")
        assert "response" in result
        assert isinstance(result["response"], str)


@pytest.mark.asyncio
async def test_chat_with_board_update():
    with patch("app.services.ai._get_client") as mock_get_client:
        mock_response = AsyncMock()
        mock_response.chat.completions.create = AsyncMock(
            return_value=AsyncMock(
                choices=[
                    AsyncMock(
                        message=AsyncMock(
                            content='{"response": "Added!", "board_update": {"add_cards": [{"column_id": 1, "title": "New Task", "details": ""}], "move_cards": [], "delete_cards": []}}'
                        )
                    )
                ]
            )
        )
        mock_get_client.return_value = mock_response
        board = {"id": 1, "columns": [{"id": 1, "title": "Backlog", "cards": []}]}
        result = await chat(board, "Add a task")
        assert "response" in result
        assert result.get("board_update") is not None
        assert "add_cards" in result["board_update"]
        assert result["board_update"]["add_cards"][0]["title"] == "New Task"


@pytest.mark.asyncio
async def test_chat_history_accumulates():
    with patch("app.services.ai._get_client") as mock_get_client:
        mock_get_client.return_value = _mock_ai_response()
        board = {"id": 1, "columns": []}
        await chat(board, "First message")
        await chat(board, "Second message")
        assert len(_conversation_history.get("default", [])) == 4


def test_build_messages_contains_board():
    board = {"id": 1, "columns": [{"id": 1, "title": "Test", "cards": []}]}
    messages = build_messages(board, "Hello")
    assert messages[0]["role"] == "system"
    assert "Test" in messages[0]["content"]
    assert messages[-1]["role"] == "user"
    assert messages[-1]["content"] == "Hello"


def test_build_messages_with_history():
    board = {"id": 1, "columns": []}
    history = [{"role": "user", "content": "previous"}, {"role": "assistant", "content": "reply"}]
    messages = build_messages(board, "Hello", history)
    assert len(messages) == 4
    assert messages[1]["content"] == "previous"
    assert messages[2]["content"] == "reply"
    assert messages[3]["content"] == "Hello"
