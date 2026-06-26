from fastapi import APIRouter

from .ai import test_ai

router = APIRouter()


@router.get("/ai/test")
async def ai_test():
    """Verify AI connectivity with a simple 2+2 test."""
    result = await test_ai()
    return {"result": result}
