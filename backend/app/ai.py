import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from openai import AsyncOpenAI

openrouter_client = AsyncOpenAI(
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1",
)


async def test_ai() -> str:
    """Simple 2+2 test to verify AI connectivity."""
    response = await openrouter_client.chat.completions.create(
        model="poolside/laguna-xs.2:free",
        messages=[
            {"role": "user", "content": "What is 2+2? Answer with just the number."}
        ],
    )
    return response.choices[0].message.content or ""
