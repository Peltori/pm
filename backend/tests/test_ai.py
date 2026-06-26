import pytest

from app.ai import test_ai


async def test_ai_2plus2():
    result = await test_ai()
    assert result is not None
    assert "4" in result
