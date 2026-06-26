import httpx

BASE = "http://127.0.0.1:3000"


async def test_backend_health():
    async with httpx.AsyncClient() as client:
        r = await client.get("http://127.0.0.1:8000/health")
        assert r.status_code == 200
        assert r.json() == {"status": "ok"}


async def test_frontend_serves_kanban_board():
    async with httpx.AsyncClient() as client:
        r = await client.get(BASE)
        assert r.status_code == 200
        assert "Kanban Studio" in r.text


async def test_ai_endpoint_accessible():
    async with httpx.AsyncClient() as client:
        r = await client.get("http://127.0.0.1:8000/api/ai/test")
        assert r.status_code == 200
        result = r.json()
        assert "result" in result
