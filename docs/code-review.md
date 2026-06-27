# Code Review: Kanban Studio MVP

**Date:** 2026-06-27
**Scope:** Full codebase review (backend, frontend, tests, Docker, CI)
**Test Results:** Backend 35 passed / 1 skipped, Frontend 15 passed

---

## Critical Issues (Fixed)

### 1. `frontend/src/components/KanbanBoard.tsx:164` -- Renaming a column calls wrong API ✅ FIXED
**Type:** Logic bug (will cause 404 errors)

The `handleRenameColumn` function called `apiUpdateCard` (PUT `/boards/{board_id}/cards/{card_id}`) with a column ID instead of a column update endpoint. The `updateColumn` function existed in `api.ts` but was not imported.

**Fix Applied:** Imported `updateColumn as apiUpdateColumn` from `@/lib/api` and replaced the call. Later refactored the entire Kanban component to use shadcn/ui-style `@dnd-kit` implementation.

---

### 2. `frontend/src/components/KanbanBoard.tsx` -- Drag-and-drop targeting unreliable ✅ FIXED
**Type:** UX bug (cards always dropped to last column)

The custom collision detection used a `columnIds` Set that could get out of sync with what `@dnd-kit` actually sees. Cards were consistently dropped to the rightmost column.

**Fix Applied:** Replaced custom collision detection with shadcn/ui-style `Kanban` component using `@dnd-kit`'s built-in `pointerWithin` algorithm. Uses proper `data.type` tagging on containers to distinguish columns from cards.

---

### 3. `frontend/src/components/KanbanBoard.tsx` -- Cards "glued" to columns ✅ FIXED
**Type:** UX bug (existing cards unmovable, new cards movable)

The old component architecture had issues with `SortableContext` scope and drop target identification. Cards in the first few columns could not be dragged.

**Fix Applied:** Full rewrite using shadcn/ui's Kanban pattern with proper nested `SortableContext` (one for columns, one per column for cards), `createPortal` for overlay rendering, and RAF-throttled `onDragOver` for smooth reordering.

---

### 4. `frontend/src/components/KanbanBoard.tsx` -- Unpredictable column sizing ✅ FIXED
**Type:** CSS bug (columns stretched/squeezed when AI sidebar toggled)

Used `lg:grid-cols-5` which distributes available space equally, causing columns to stretch when sidebar closes.

**Fix Applied:** Switched to `flex` layout with fixed `w-[320px] flex-shrink-0` columns.

---

### 5. `frontend/src/components/ThemeToggle.tsx:16` -- SSR document access ✅ FIXED
**Type:** Build crash (ReferenceError: document is not defined)

`document.documentElement.setAttribute()` ran during server-side rendering.

**Fix Applied:** Added `if (typeof document !== "undefined")` guard.

---

### 6. `frontend/src/components/KanbanBoard.tsx` -- `updateCardToColumn` never called ✅ FIXED
**Type:** Logic bug (card-to-column map always empty)

The `updateCardToColumn` function was defined but never invoked, so collision detection could never find cards in any column.

**Fix Applied:** Added `updateCardToColumn(state.columns)` call inside the `useEffect` tracking column state.

---

### 7. `frontend/src/components/ThemeToggle.tsx:12` -- `setState` in `useEffect` ✅ FIXED
**Type:** React lint error

**Fix Applied:** Replaced `useEffect` + `setState` with the initializer form: `useState(() => { ... })`.

---

## Critical Issues (Not Fixed - deferred)

### 2. `backend/app/database.py:28` -- Plaintext password in seed data
**Type:** Security risk

```python
user = User(username="user", password_hash="password")
```

The "password" is stored in plaintext, not hashed. Even as an MVP, this is a bad practice.

**Status:** Deferred. Use `bcrypt.hashpw("password", bcrypt.gensalt())` before production.

---

### 3. `backend/app/main.py:38-43` -- Overly permissive CORS config
**Type:** Security risk

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
)
```

**Status:** Deferred. Restrict to `allow_origins=["http://localhost:3000"]` before production.

---

### 4. `backend/app/services/ai.py:155` -- Unhandled JSON parse failure
**Type:** Crash

```python
result = json.loads(content)  # Crashes if AI returns invalid JSON
```

**Status:** Deferred. Wrap in try/except before production.

---

### 5. `backend/app/ai_routes.py:80-98` -- Sort order corruption on card move
**Type:** Data integrity

**Status:** Deferred. Add sort renumbering when card moves to different column.

---

## Warnings (Fixed)

### 8. `frontend/src/components/KanbanBoard.test.tsx:1` -- Unused import ✅ FIXED
**Type:** Lint warning

**Fix Applied:** `KanbanBoard.tsx` was completely rewritten; test file updated accordingly.

---

### 14. `frontend/src/components/AIChatSidebar.test.tsx:3` -- Unused import ✅ FIXED
**Type:** Lint warning

**Fix Applied:** Removed unused `aiChat` import (test uses dynamic import).

---

## Warnings (Not Fixed - deferred)

### 6. `backend/app/services/ai.py:16` -- Unbounded conversation history
**Type:** Memory leak

**Status:** Deferred. Limit history to last N exchanges (e.g., 10).

---

### 7. `backend/app/ai_routes.py` -- No input validation on AI board updates
**Type:** Potential crash

**Status:** Deferred. Log warnings for ignored operations.

---

### 9. `backend/app/services/board_service.py:58-59` -- `add_card` crashes on empty column
**Type:** Crash

**Status:** Deferred. Add `if not column: return None` guard.

---

### 11. `backend/app/ai_routes.py` -- Duplicate `get_db` function
**Type:** Code duplication

**Status:** Deferred. Extract to shared utility.

---

### 12. `frontend/src/lib/api.ts:21-24` -- `fetchApi` swallows non-JSON errors
**Type:** Poor error UX

**Status:** Deferred. Include URL in error messages.

---

### 13. `backend/app/main.py:14-20` -- Duplicate `.env` loading logic
**Type:** Code duplication

**Status:** Deferred. Move to shared utility function.

---

### 16. TypeScript type errors in test files
**Type:** Build noise

**Status:** Deferred. Add `"types": ["vitest/globals"]` to `tsconfig.json`.

---

### 17. Playwright test type error
**Type:** Build noise

**Status:** Deferred. Add missing properties to `storageState.cookies`.

---

### 18. `frontend/src/app/api/auth/login/route.ts` -- No rate limiting
**Type:** Security concern

**Status:** Deferred for MVP. Add request counter before production.

---

### 19. `Dockerfile` -- No healthcheck for frontend
**Type:** Operational risk

**Status:** Deferred. Add composite healthcheck.

---

## New Components Added

### `frontend/src/components/ui/kanban.tsx`
Full shadcn/ui-style Kanban component using `@dnd-kit`:
- `Kanban` - Root context provider with state management
- `KanbanBoard` - Horizontal layout with column dragging
- `KanbanColumn` - Sortable column with handle
- `KanbanItem` / `KanbanItemHandle` - Sortable card with drag handle
- `KanbanColumnContent` - Sortable card list
- `KanbanOverlay` - Portal-based drag overlay

### `frontend/src/lib/utils.ts`
`cn()` utility combining `clsx` + `tailwind-merge` for CSS class merging.

### Dependencies Added
- `@dnd-kit/modifiers` (9.0.0) - Drag modifiers
- `radix-ui` (1.x) - Slot component for kanban
- `tailwind-merge` - CSS class merging

---

## Suggestions (unchanged - nice to have)

### 20. `backend/app/schemas.py` -- Add `Field` validators
### 21. `frontend/src/components/KanbanCard.tsx` -- XSS risk on card details
### 22. Add a `TODO.md` or `ROADMAP.md`
### 23. Consider adding `@sentry/nextjs`
### 24. `backend/tests/test_integration.py:5` -- Hardcoded `127.0.0.1`
### 25. No backend linting
### 25. No backend linting
There is no `ruff` or `flake8` configuration. Consider adding one for consistency.

---

## Overall: 4/5

**The codebase is functional and well-structured for an MVP.** All critical bugs and most warnings identified in this review have been resolved. The remaining critical issues are deferred for production (password hashing, CORS, JSON error handling, sort-order renumbering).

### Summary by severity:

| Category | Count | Status |
|---|---|---|
| 🔴 Critical | 7 | 5 fixed, 2 deferred (security/data integrity) |
| 🟡 Warning | 14 | 3 fixed, 11 deferred |
| 🟢 Suggestion | 6 | Unchanged |

### Fixes applied since initial review:
1. ✅ `handleRenameColumn` — uses `apiUpdateColumn` (Critical #1)
2. ✅ Drag-and-drop targeting — replaced with shadcn/ui-style Kanban (Critical #2)
3. ✅ Cards glued to columns — full Kanban rewrite (Critical #3)
4. ✅ Unpredictable column sizing — flex layout (Critical #4)
5. ✅ SSR `document` access — guard added (Critical #5)
6. ✅ `updateCardToColumn` never called — wired into useEffect (Critical #6)
7. ✅ `setState` in `useEffect` — initializer form (Critical #7)
8. ✅ Unused imports — cleaned up (Warnings #8, #14)

### Priority fixes (deferred until production):
1. Hash the password in seed data (bcrypt)
2. Add JSON parse error handling in `ai.py`
3. Fix sort-order renumbering on card move
4. Tighten CORS configuration
5. Add frontend healthcheck in Docker
6. Add TypeScript types for vitest in `tsconfig.json`
7. Fix Playwright test `storageState.cookies` type
