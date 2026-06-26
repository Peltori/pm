# Project Management MVP - Detailed Plan

## Technology Stack

| Layer       | Choice                              |
|-------------|-------------------------------------|
| Frontend    | Next.js 16 (App Router)             |
| Styling     | Tailwind CSS v4                     |
| Backend     | Python FastAPI                      |
| Package Mgr | pnpm (frontend), uv (backend)       |
| Database    | SQLite (normalized tables)          |
| AI          | OpenRouter (`qwen/qwen3-coder:free`) |
| Auth        | Session-based (server-side sessions) |
| Container   | Docker + docker-compose             |
| Unit Tests  | Vitest + @testing-library/react     |
| E2E Tests   | Playwright                          |
| Backend Tests | pytest + httpx                   |

---

## Part 1: Plan (current phase)

- [x] Enrich plan with per-phase checklist items
- [x] Define test strategy and tooling
- [x] Document tech stack decisions
- [ ] User approval

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
- [ ] User approves scaffolding

**Tests:**
- Unit: FastAPI health endpoint returns 200 with `{"status": "ok"}` ✅
- Unit: AI 2+2 test returns "4" ✅
- Unit: AI test endpoint (`/api/ai/test`) works ✅
- Unit: 4 backend tests pass
- Unit: 6 frontend unit tests pass ✅

---

## Part 3: Add in Frontend

**Goal:** Frontend statically built and served at `/`, demo Kanban board visible.

- [ ] Run `pnpm install` in frontend/ (update lockfile)
- [ ] Update `playwright.config.ts` to use `pnpm run dev`
- [ ] Update `package.json` scripts to use `pnpm` instead of `npm`
- [ ] Verify existing unit tests pass: `pnpm run test:unit`
- [ ] Verify existing e2e tests pass: `pnpm run test:e2e` (after starting Next.js)
- [ ] Build frontend: `pnpm run build` in frontend/
- [ ] Update Docker setup to copy `frontend/.next/` (or `frontend/out/`) into Nginx/Python static server
- [ ] Verify full stack: docker compose up, Kanban board renders at `/`
- [ ] Write integration test: backend serves frontend static files correctly

**Tests:**
- Unit: all existing Vitest tests pass
- E2E: all existing Playwright tests pass against docker container
- Integration: Kanban board renders with 5 columns and 8 cards

---

## Part 4: Fake User Sign-In

**Goal:** Login page at `/`, dummy credentials ("user"/"password"), logout capability.

- [ ] Create `src/app/login/page.tsx` - login form with username/password
- [ ] Create `src/middleware.ts` - Next.js route middleware protecting `/` routes
- [ ] Implement session using server-side session (cookie-based, no external session store)
- [ ] Create logout route (`/api/auth/logout`)
- [ ] Add dark/light mode toggle button to header
- [ ] Store theme preference in localStorage
- [ ] Verify login redirects to Kanban board on success
- [ ] Verify unauthenticated access to `/` redirects to `/login`
- [ ] Verify logout clears session and redirects to `/login`

**Tests:**
- Unit: login form renders and validates empty submission
- E2E: login with valid credentials shows Kanban board
- E2E: login with invalid credentials shows error message
- E2E: logout clears session and redirects to login
- E2E: navigating to `/` without login redirects to `/login`
- E2E: dark/light mode toggle switches theme and persists

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

- [ ] Document schema in `docs/DATABASE.md`
- [ ] Create Alembic migrations (or manual schema SQL)
- [ ] Create `backend/database.py` with SQLAlchemy engine setup
- [ ] User reviews and approves schema
- [ ] Seed initial data for development

**Tests:**
- Unit: database creates tables if they don't exist
- Unit: initial seed data populates correctly

---

## Part 6: Backend API

**Goal:** FastAPI routes to CRUD the Kanban board, backed by SQLite.

- [ ] Create `backend/models.py` - SQLAlchemy ORM models
- [ ] Create `backend/schemas.py` - Pydantic request/response schemas
- [ ] Create `backend/routes/boards.py` - Board CRUD routes
  - `GET /api/boards/{board_id}` - get full board with columns and cards
  - `POST /api/boards/{board_id}/columns` - add column
  - `PUT /api/boards/{board_id}/columns/{column_id}` - rename column
  - `DELETE /api/boards/{board_id}/columns/{column_id}` - delete column
  - `POST /api/boards/{board_id}/cards` - add card
  - `PUT /api/boards/{board_id}/cards/{card_id}` - update card
  - `DELETE /api/boards/{board_id}/cards/{card_id}` - delete card
  - `POST /api/boards/{board_id}/reorder` - reorder cards (move between columns)
- [ ] Create `backend/services/` - business logic layer
- [ ] Handle "create board if not exists" for the single-user MVP
- [ ] Write comprehensive backend unit tests with pytest

**Tests:**
- Unit: each CRUD endpoint tested with mocked DB session
- Unit: reorder endpoint tests all move scenarios (same column, different column, end of list)
- Unit: column rename endpoint
- Unit: card add/delete endpoints
- Integration: endpoints work with real SQLite (test DB)

---

## Part 7: Frontend + Backend Integration

**Goal:** Frontend uses backend API; board is persistent.

- [ ] Create `src/lib/api.ts` - API client functions for all endpoints
- [ ] Update `KanbanBoard.tsx` to fetch board state from API on mount
- [ ] Update column rename handler to call API
- [ ] Update card add/delete handlers to call API
- [ ] Update drag-and-drop handler to call reorder API
- [ ] Create loading state UI for initial board load
- [ ] Create error state UI for failed API calls
- [ ] Full end-to-end testing of persistent board

**Tests:**
- Unit: API client functions tested with mocked fetch
- E2E: add card → refresh page → card persists
- E2E: drag card to new column → refresh page → card in new column
- E2E: rename column → refresh page → new name persists
- E2E: delete card → refresh page → card gone

---

## Part 8: AI Connectivity

**Goal:** Backend can make AI calls via OpenRouter.

- [ ] Create `backend/services/ai.py` - OpenRouter client
- [ ] Read `OPENROUTER_API_KEY` from `.env` (loaded via `python-dotenv`)
- [ ] Implement basic chat completion call using `qwen/qwen3-coder:free`
- [ ] Test with "2+2" question, verify response is "4"
- [ ] Test structured outputs: send a prompt with JSON schema, verify response conforms

**Tests:**
- Unit: AI service returns valid response for simple prompt
- Unit: AI service returns structured output matching schema
- Integration: full call through FastAPI endpoint with "2+2" test

---

## Part 9: AI + Kanban Structured Outputs

**Goal:** AI receives board JSON + user message + conversation history; responds with answer + optional board updates.

- [ ] Design prompt template that includes:
  - System prompt explaining the AI's role (assistant that can update Kanban)
  - Current board state (JSON)
  - User message
  - Conversation history
- [ ] Define JSON schema for structured output:
  ```json
  {
    "type": "object",
    "properties": {
      "response": { "type": "string" },
      "board_update": {
        "type": "object",
        "properties": {
          "add_cards": { "type": "array", "items": { "type": "object", "properties": { "column_id": {"type": "string"}, "title": {"type": "string"}, "details": {"type": "string"} } } },
          "move_cards": { "type": "array", "items": { "type": "object", "properties": { "card_id": {"type": "string"}, "from_column_id": {"type": "string"}, "to_column_id": {"type": "string"}, "position": {"type": "integer"} } } },
          "delete_cards": { "type": "array", "items": { "type": "string" } }
        }
      }
    }
  }
  ```
- [ ] Create `POST /api/ai/chat` endpoint
- [ ] Parse and apply board_update to database
- [ ] Return response text + applied updates

**Tests:**
- Unit: prompt builder includes all required context
- Unit: structured output parser correctly extracts response and updates
- Unit: board_update is correctly applied to database
- Integration: full chat flow with board update end-to-end
- Integration: "move card X to column Y" produces correct API calls

---

## Part 10: AI Chat Sidebar

**Goal:** Beautiful sidebar widget for AI chat; auto-refresh UI when AI updates Kanban.

- [ ] Create `src/components/AIChatSidebar.tsx` - chat interface
- [ ] Chat displays conversation messages (user + AI responses)
- [ ] Chat has input field for user messages
- [ ] When AI returns board updates, frontend automatically refreshes the board state
- [ ] Show loading indicator during AI response
- [ ] Add AI toggle button to show/hide sidebar
- [ ] Style matches project color scheme
- [ ] Full E2E testing of AI interaction

**Tests:**
- Unit: AIChatSidebar renders correctly
- Unit: chat sends messages and displays responses
- E2E: send message to AI, see response in chat
- E2E: AI updates board, board UI refreshes automatically
- E2E: toggle sidebar open/close
- E2E: conversation history persists across messages in same session
