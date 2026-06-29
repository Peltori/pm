# Project Management MVP - Detailed Plan

## Technology Stack

| Layer       | Choice                              |
|-------------|-------------------------------------|
| Frontend    | Next.js 16 (App Router)             |
| Styling     | Tailwind CSS v4                     |
| Backend     | Python FastAPI                      |
| Package Mgr | pnpm (frontend), uv (backend)       |
| Database    | SQLite (normalized tables)          |
| AI          | OpenRouter (`openrouter/free`)      |
| Auth        | Cookie-based session                |
| Container   | Docker + docker-compose             |
| Unit Tests  | Vitest                              |
| E2E Tests   | Playwright                          |
| Backend Tests | pytest + httpx                    |

## Deployment

- **Docker** (recommended): Single container with both frontend and backend. Deploy to Render, Fly.io, Railway, or any Docker host.
- **Vercel**: Requires moving API routes into Next.js serverless functions (not supported as-is with separate FastAPI backend).
- The `.env` file at project root contains `OPENROUTER_API_KEY`.

---

## Part 1: Plan (current phase)

- [x] Enrich plan with per-phase checklist items
- [x] Define test strategy and tooling
- [x] Document tech stack decisions
- [x] User approval

---

## Part 2: Scaffolding

**Goal:** Docker infrastructure, FastAPI backend serving "hello world", start/stop scripts.

- [x] Create `docker-compose.yml` (single service: pm-app)
- [x] Create `backend/Dockerfile`
- [x] Create `Dockerfile` at project root for Next.js build (multi-stage)
- [x] Create `scripts/start.sh` (Linux/macOS)
- [x] Create `scripts/start.ps1` (Windows)
- [x] Create `scripts/stop.sh` (Linux/macOS)
- [x] Create `scripts/stop.ps1` (Windows)
- [x] Create `backend/pyproject.toml` with uv
- [x] Create basic FastAPI app with `/health` endpoint returning `{"status": "ok"}`
- [x] Configure FastAPI to serve Next.js static files at `/`
- [x] Test AI connectivity: make a simple "2+2" call via OpenRouter from the backend
- [x] User approves scaffolding

**Tests:**
- Unit: FastAPI health endpoint returns 200 with `{"status": "ok"}` ✅
- Unit: AI 2+2 test returns "4" ✅
- Unit: AI test endpoint (`/api/ai/test`) works ✅
- Unit: 4 backend tests pass
- Unit: 6 frontend unit tests pass ✅

---

## Part 3: Add in Frontend

**Goal:** Frontend statically built and served at `/`, demo Kanban board visible.

- [x] Run `pnpm install` in frontend/ (update lockfile)
- [x] Update `playwright.config.ts` to use direct binary path
- [x] Update `package.json` scripts to use `node_modules/.bin/` directly (avoids pnpm 11 implicit install bug)
- [x] Verify existing unit tests pass: `pnpm run test:unit` (6/6 pass)
- [x] Verify existing e2e tests pass: `pnpm run test:e2e` (3/3 pass)
- [x] Build frontend: `pnpm run build` produces Next.js standalone output
- [x] Update Docker setup to copy `frontend/.next/standalone/` and run Next.js on port 3000
- [x] Verify full stack: docker compose up, Kanban board renders at `/`
- [x] Write integration test: `backend/tests/test_integration.py`

**Tests:**
- Unit: all existing Vitest tests pass (6/6) ✅
- E2E: all existing Playwright tests pass (3/3) ✅
- Integration: Kanban board renders with 5 columns and 8 cards ✅

---

## Part 4: Fake User Sign-In

**Goal:** Login page at `/`, dummy credentials ("user"/"password"), logout capability.

- [x] Create `src/app/login/page.tsx` - login form with username/password
- [x] Create `src/middleware.ts` - Next.js route middleware protecting `/` routes
- [x] Implement session using cookie-based session (no external session store)
- [x] Create logout route (`/api/auth/logout`)
- [x] Add dark/light mode toggle button to header (`src/components/ThemeToggle.tsx`)
- [x] Store theme preference in localStorage
- [x] Verify login redirects to Kanban board on success
- [x] Verify unauthenticated access to `/` redirects to `/login`
- [x] Verify logout clears session and redirects to `/login`

**Tests:**
- E2E: login with valid credentials shows Kanban board ✅
- E2E: login with invalid credentials shows error message ✅
- E2E: login page accessible without session ✅
- E2E: logout clears session and redirects to login ✅
- E2E: navigating to `/` without login redirects to `/login` ✅
- E2E: dark/light mode toggle switches theme and persists ✅
- E2E: all 7 tests pass (3 original + 4 new)

---

## Part 5: Database Modeling

**Goal:** Propose and document normalized SQLite schema for Kanban board.

Schema proposal:

```
users
  - id (INTEGER PK)
  - username (TEXT UNIQUE)
  - password_hash (TEXT)

boards
  - id (INTEGER PK)
  - user_id (INTEGER FK -> users.id)
  - created_at (TEXT)
  - updated_at (TEXT)

columns
  - id (INTEGER PK)
  - board_id (INTEGER FK -> boards.id)
  - title (TEXT)
  - sort_order (INTEGER)

cards
  - id (INTEGER PK)
  - column_id (INTEGER FK -> columns.id)
  - title (TEXT)
  - details (TEXT)
  - sort_order (INTEGER)
```

- [x] Document schema in `docs/DATABASE.md`
- [x] Use SQLAlchemy ORM models directly (no Alembic for MVP)
- [x] Create `backend/database.py` with SQLAlchemy engine, models, and seed data
- [x] User reviews and approves schema
- [x] Seed initial data (1 user, 1 board, 5 columns, 8 cards)

**Tests:**
- Unit: database creates tables if they don't exist ✅
- Unit: initial seed data populates correctly (5 columns, 8 cards) ✅

---

## Part 6: Backend API

**Goal:** FastAPI routes to CRUD the Kanban board, backed by SQLite.

- [x] Create `backend/schemas.py` - Pydantic request/response schemas
- [x] Create `backend/routes/boards.py` - Board CRUD routes (8 endpoints)
- [x] Create `backend/services/board_service.py` - business logic layer
- [x] Handle "create board if not exists" for the single-user MVP
- [x] Write comprehensive backend unit tests with pytest

**Tests:**
- Unit: 17 CRUD endpoint tests pass with real SQLite test DB
- Unit: reorder endpoint tests same column + different column scenarios
- Unit: column rename, card add/delete, 404 handling
- Unit: 23/23 backend tests pass (3 Docker-only skipped)

---

## Part 7: Frontend + Backend Integration

**Goal:** Frontend uses backend API; board is persistent.

- [x] Create `src/lib/api.ts` - API client with integer IDs for all endpoints
- [x] Update `KanbanBoard.tsx` to fetch board state from API on mount
- [x] Update column rename handler to call API (PUT /columns/{id})
- [x] Update card add/delete/reorder handlers to call API
- [x] Migrate frontend types from string IDs to integer IDs
- [x] Loading state UI for initial board load
- [x] Error state UI for failed API calls with Retry button
- [x] Updated E2E tests with Playwright route mocking

**Tests:**
- Unit: 6 Vitest tests pass (loading, columns, cards)
- E2E: 7/7 pass (load board, add card, error state, login, theme)

---

## Part 8: AI Connectivity

**Goal:** Backend can make AI calls via OpenRouter.

- [x] Create `backend/services/ai.py` - OpenRouter client (lazy initialization)
- [x] Read `OPENROUTER_API_KEY` from project root `.env` (loaded via `python-dotenv`)
- [x] Implement basic chat completion call using `openrouter/free`
- [x] Test with "2+2" question, verify response is "4"
- [x] Test structured outputs: send a prompt with JSON schema, verify response conforms
- [x] Consolidated single `.env` file at project root (removed duplicate `backend/.env`)

**Tests:**
- Unit: AI service returns valid response for simple prompt (2+2) ✅
- Unit: AI service returns structured output matching schema ✅
- Integration: full call through FastAPI endpoint with "2+2" test (`GET /api/ai/test`) ✅
- Integration: structured output test endpoint (`GET /api/ai/test-structured`) ✅

**Endpoints:**
- `GET /api/ai/test` - simple 2+2 connectivity check
- `GET /api/ai/test-structured` - structured JSON output verification

---

## Part 9: AI + Kanban Structured Outputs

**Goal:** AI receives board JSON + user message + conversation history; responds with answer + optional board updates.

- [x] Design prompt template with system prompt, board state JSON, user message, and conversation history
- [x] Define JSON schema for structured output (response + board_update with add_cards, move_cards, delete_cards)
- [x] Create `POST /api/ai/chat` endpoint
- [x] Parse and apply board_update to database (add, move, delete cards)
- [x] Return response text + applied updates
- [x] Conversation history stored per user_id (in-memory for MVP)

**Tests:**
- Unit: prompt builder includes all required context
- Unit: structured output parser correctly extracts response and updates
- Unit: board_update is correctly applied to database
- Integration: full chat flow with board update end-to-end
- Integration: chat history accumulates per user

---

## Part 10: AI Chat Sidebar

**Goal:** Beautiful sidebar widget for AI chat; auto-refresh UI when AI updates Kanban.

- [x] Create `src/components/AIChatSidebar.tsx` - chat interface
- [x] Chat displays conversation messages (user + AI responses)
- [x] Chat has input field for user messages
- [x] When AI returns board updates, frontend calls onBoardUpdate callback
- [x] Show loading indicator during AI response
- [x] Add AI toggle button to show/hide sidebar (in Header)
- [x] Style matches project color scheme
- [x] Unit tests: 9 tests pass

**Tests:**
- Unit: AIChatSidebar renders correctly
- Unit: chat sends messages and displays responses
- Unit: loading indicator shows during response
- Unit: board updates trigger onBoardUpdate callback
- Unit: handles API errors gracefully
- Unit: close button works
- Unit: Enter key sends message
- Unit: send button disabled when empty
