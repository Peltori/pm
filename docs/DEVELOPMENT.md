# Development Setup

## Prerequisites

- Node.js 22+ with pnpm
- Python 3.11+ with uv
- OPENROUTER_API_KEY in `.env` at project root

## Starting Locally

Two processes must run simultaneously:

### 1. Backend (FastAPI)

```bash
cd backend
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
```

The backend serves the Kanban board API, AI chat, and auth endpoints on port 8000.

### 2. Frontend (Next.js)

```bash
cd frontend
pnpm dev
```

The frontend dev server runs on port 3000 and proxies all `/api/*` requests to the backend on port 8000 via Next.js rewrites.

## Docker (Production)

```bash
# Start both frontend and backend in one container
./scripts/start.sh

# Stop
./scripts/stop.sh
```

## Notes

- The dev server uses Turbopack for fast hot-reload
- Changes to either frontend or backend trigger auto-reload (frontend via Turbopack, backend via uvicorn's `--reload`)
- The `.env` file must be at the project root (`/pm/.env`) for the backend to pick up `OPENROUTER_API_KEY`
