import pytest

from app.services.ai import test_ai, test_structured_output


async def test_ai_2plus2():
    result = await test_ai()
    assert result is not None
    assert "4" in result


async def test_ai_structured_output():
    result = await test_structured_output()
    assert result is not None
    assert "greeting" in result
    assert "hello world" in result.lower()
