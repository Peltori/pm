from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from openai import AsyncOpenAI

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        if not os.getenv("OPENROUTER_API_KEY"):
            load_dotenv(str(Path(__file__).resolve().parent.parent.parent / ".env"))
        _client = AsyncOpenAI(
            api_key=os.getenv("OPENROUTER_API_KEY"),
            base_url="https://openrouter.ai/api/v1",
        )
    return _client


async def test_ai() -> str:
    """Simple 2+2 test to verify AI connectivity."""
    client = _get_client()
    response = await client.chat.completions.create(
        model="poolside/laguna-xs.2:free",
        messages=[
            {"role": "user", "content": "What is 2+2? Answer with just the number."}
        ],
    )
    return response.choices[0].message.content or ""


async def test_structured_output() -> str:
    """Test structured JSON output from the model."""
    client = _get_client()
    response = await client.chat.completions.create(
        model="poolside/laguna-xs.2:free",
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
