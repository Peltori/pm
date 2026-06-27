from fastapi import APIRouter
from fastapi.responses import JSONResponse

from .services.ai import test_ai, test_structured_output

router = APIRouter()


@router.get("/ai/test")
async def ai_test():
    """Verify AI connectivity with a simple 2+2 test."""
    result = await test_ai()
    return {"result": result}


@router.get("/ai/test-structured")
async def ai_test_structured():
    """Test structured JSON output from the model."""
    result = await test_structured_output()
    return JSONResponse(content={"structured_result": result})
