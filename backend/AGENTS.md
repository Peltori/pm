# Backend

FastAPI backend for the Kanban Studio app.

## Structure

```
backend/
  app/
    __init__.py
    main.py          # FastAPI app entry, health + static file serving
    ai_routes.py     # /api/ai endpoints
    database.py      # SQLAlchemy models, sessions, seed data
    schemas.py       # Pydantic request/response schemas
    routes/
      __init__.py
      boards.py      # Board CRUD routes
    services/
      __init__.py
      ai.py          # OpenRouter client (openrouter/free)
      board_service.py # Business logic for board operations
  tests/
    test_main.py     # Health endpoint test
    test_ai.py       # AI connectivity test
    test_ai_routes.py# AI test endpoint integration test
  pyproject.toml     # Python deps (uv managed)
  .env               # OPENROUTER_API_KEY
  Dockerfile
```

## Tech

- Python 3.12+
- FastAPI + uvicorn
- SQLite (async, via aiosqlite + SQLAlchemy)
- OpenRouter AI (openrouter/free)
- pytest + httpx for testing
- uv for package management

## Running

```bash
uv run uvicorn app.main:app --reload
uv run pytest tests/ -v
```

## API Endpoints

- `GET /health` — returns `{"status": "ok"}`
- `GET /` — serves frontend (Next.js build or placeholder)
- `GET /api/ai/test` — tests AI connectivity (2+2)
