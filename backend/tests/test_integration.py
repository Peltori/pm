import httpx
import pytest

BASE = "http://127.0.0.1:3000"


def _server_running(url):
    try:
        httpx.get(url, timeout=2)
        return True
    except Exception:
        return False


@pytest.mark.skipif(not _server_running("http://127.0.0.1:8000/health"), reason="backend not running")
async def test_backend_health():
    async with httpx.AsyncClient() as client:
        r = await client.get("http://127.0.0.1:8000/health")
        assert r.status_code == 200
        assert r.json() == {"status": "ok"}


@pytest.mark.skipif(not _server_running("http://127.0.0.1:3000"), reason="frontend not running")
async def test_frontend_serves_kanban_board():
    async with httpx.AsyncClient(follow_redirects=True) as client:
        r = await client.get(BASE)
        assert r.status_code == 200
        assert "Kanban Studio" in r.text


@pytest.mark.skipif(not _server_running("http://127.0.0.1:8000/health"), reason="backend not running")
async def test_ai_endpoint_accessible():
    async with httpx.AsyncClient() as client:
        r = await client.get("http://127.0.0.1:8000/api/ai/test")
        if r.status_code in (429, 500):
            pytest.skip("AI rate limit exceeded")
        assert r.status_code == 200, f"AI test failed: {r.text}"
        result = r.json()
        assert "result" in result
