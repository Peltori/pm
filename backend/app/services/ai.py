from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from openai import AsyncOpenAI

_client: AsyncOpenAI | None = None

# Simple in-memory conversation history store (keyed by user identifier for MVP)
# Cap at 10 exchanges (20 messages) to avoid token limit issues
_MAX_HISTORY = 20
_conversation_history: dict[str, list[dict]] = {}


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        if not os.getenv("OPENROUTER_API_KEY"):
            # Try multiple possible .env locations (local dev, docker, etc.)
            candidates = [
                Path(__file__).resolve().parent.parent.parent.parent / ".env",
                Path(__file__).resolve().parent.parent.parent / ".env",
            ]
            for env_path in candidates:
                if env_path.exists():
                    load_dotenv(str(env_path))
                    break
        _client = AsyncOpenAI(
            api_key=os.getenv("OPENROUTER_API_KEY"),
            base_url="https://openrouter.ai/api/v1",
        )
    return _client


async def test_ai() -> str:
    """Simple 2+2 test to verify AI connectivity."""
    client = _get_client()
    response = await client.chat.completions.create(
        model="openrouter/free",
        messages=[
            {"role": "user", "content": "What is 2+2? Answer with just the number."}
        ],
    )
    return response.choices[0].message.content or ""


async def test_structured_output() -> str:
    """Test structured JSON output from the model."""
    client = _get_client()
    response = await client.chat.completions.create(
        model="openrouter/free",
        messages=[
            {"role": "user", "content": "Respond with a JSON object containing exactly one key 'greeting' with the value 'hello world'."}
        ],
        extra_body={
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": "simple_greeting",
                    "schema": {
                        "type": "object",
                        "properties": {
                            "greeting": {"type": "string"}
                        },
                        "required": ["greeting"],
                        "additionalProperties": False
                    }
                }
            }
        },
    )
    return response.choices[0].message.content or ""


SYSTEM_PROMPT = """You are an AI assistant for a Kanban board project management app.
You can respond to user messages AND update the Kanban board by adding, moving, or deleting cards.

You MUST respond with a structured JSON object containing:
- "response": a helpful text response to show the user
- "board_update": optional object with card operations (leave empty or omit if no changes needed)

Board update operations:
- add_cards: array of objects with "column_id" (int), "title" (str), "details" (str)
- move_cards: array of objects with "card_id" (int), "to_column_id" (int), "position" (int)
- delete_cards: array of card IDs (ints) to delete

When moving cards, "position" is the 0-based index within the target column.
When adding cards, they are appended to the end of the specified column.
When deleting, the card_id refers to the current card ID in the board state.

Always respond with valid JSON. Never include markdown code fences or explanations outside the JSON object."""

STRUCTURED_OUTPUT_SCHEMA = {
    "type": "object",
    "properties": {
        "response": {"type": "string"},
        "board_update": {
            "type": "object",
            "properties": {
                "add_cards": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "column_id": {"type": "integer"},
                            "title": {"type": "string"},
                            "details": {"type": "string"},
                        },
                        "required": ["column_id", "title"],
                    },
                },
                "move_cards": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "card_id": {"type": "integer"},
                            "to_column_id": {"type": "integer"},
                            "position": {"type": "integer"},
                        },
                        "required": ["card_id", "to_column_id"],
                    },
                },
                "delete_cards": {
                    "type": "array",
                    "items": {"type": "integer"},
                },
            },
        },
    },
    "required": ["response"],
}


def build_board_context(board: dict) -> str:
    """Convert board state to a readable JSON string for the AI."""
    return json.dumps(board, indent=2)


def build_messages(board: dict, user_message: str, history: list[dict] | None = None) -> list[dict]:
    """Build the full messages array with system prompt, board context, history, and user message."""
    board_context = build_board_context(board)
    system_msg = {
        "role": "system",
        "content": f"{SYSTEM_PROMPT}\n\nHere is the current state of the Kanban board:\n\n{board_context}",
    }
    messages = [system_msg]

    # Add conversation history
    if history:
        messages.extend(history)

    # Add user message
    messages.append({"role": "user", "content": user_message})

    return messages


async def chat(board: dict, user_message: str, history: list[dict] | None = None, user_id: str = "default") -> dict[str, Any]:
    """Process a chat message with board context. Returns response dict with optional board updates."""
    client = _get_client()
    messages = build_messages(board, user_message, history)

    response = await client.chat.completions.create(
        model="openrouter/free",
        messages=messages,
        extra_body={
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": "kanban_board_update",
                    "schema": STRUCTURED_OUTPUT_SCHEMA,
                },
            }
        },
    )

    content = response.choices[0].message.content or "{}"
    try:
        result = json.loads(content)
    except json.JSONDecodeError:
        result = {"response": "I received an unexpected response. Please try again."}

    # Store this exchange in history (system message is implicit, only user+assistant)
    if user_id not in _conversation_history:
        _conversation_history[user_id] = []
    _conversation_history[user_id].append({"role": "user", "content": user_message})
    _conversation_history[user_id].append({"role": "assistant", "content": result.get("response", "")})
    # Cap history to last N messages
    if len(_conversation_history[user_id]) > _MAX_HISTORY:
        _conversation_history[user_id] = _conversation_history[user_id][-_MAX_HISTORY:]

    return result
