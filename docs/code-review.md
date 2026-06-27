# Code Review: Kanban Studio MVP

**Date:** 2026-06-27
**Scope:** Full codebase review (backend, frontend, tests, Docker, CI)
**Test Results:** Backend 35 passed / 1 skipped, Frontend 15 passed

---

## Critical Issues

### 1. `frontend/src/components/KanbanBoard.tsx:164` -- Renaming a column calls wrong API
**Type:** Logic bug (will cause 404 errors)

The `handleRenameColumn` function calls `apiUpdateCard` (PUT `/boards/{board_id}/cards/{card_id}`) with a column ID instead of a card ID. The `updateColumn` function exists in `api.ts` but is not imported or used.

```tsx
// Current (wrong):
await apiUpdateCard(state.boardId, columnId, title, undefined, column.sort_order);

// Should be:
await apiUpdateColumn(state.boardId, columnId, title, column.sort_order);
```

**Fix:** Import `updateColumn as apiUpdateColumn` from `@/lib/api` and replace the call.

---

### 2. `backend/app/database.py:28` -- Plaintext password in seed data
**Type:** Security risk

```python
user = User(username="user", password_hash="password")
```

The "password" is stored in plaintext, not hashed. Even as an MVP, this is a bad practice that could mislead about security posture and will require migration later.

**Fix:** Use `bcrypt.hashpw("password", bcrypt.gensalt())` or at minimum `hashlib.sha256`.

---

### 3. `backend/app/main.py:38-43` -- Overly permissive CORS config
**Type:** Security risk

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,  # Contradicts allow_origins=["*"]
    ...
)
```

`allow_origins=["*"]` with `allow_credentials=True` is contradictory in browsers (credentials are stripped). This also opens the API to any origin.

**Fix:** Restrict to known origins: `allow_origins=["http://localhost:3000"]` (or Docker network equivalent).

---

### 4. `backend/app/services/ai.py:155` -- Unhandled JSON parse failure
**Type:** Crash / unhandled error

```python
content = response.choices[0].message.content or "{}"
result = json.loads(content)  # Crashes if AI returns invalid JSON
```

If the AI model returns malformed JSON (possible even with structured output), the entire chat request crashes with a 500 error and the error is not caught by the route handler.

**Fix:** Wrap in try/except, return a helpful error response so the frontend shows a friendly message.

---

### 5. `backend/app/ai_routes.py:80-98` -- Card move doesn't update sort orders when column changes
**Type:** Logic bug / data corruption

When a card is moved to a different column, its `sort_order` is set to `position` if provided, but the old column's existing cards are not renumbered after the card was removed. The `sort_order` values become non-sequential (e.g., 0, 1, 3 with 2 missing).

The `reorder_card` service function has the same issue.

**Fix:** After removing a card from the old column, re-sort remaining cards: `for i, c in enumerate(old_column_cards): c.sort_order = i`.

---

## Warnings (should fix)

### 6. `backend/app/services/ai.py:16` -- Unbounded conversation history
**Type:** Memory leak / performance

`_conversation_history` grows indefinitely. Each message adds a user+assistant pair, and the entire board state (including all card details) is injected into the system prompt for every request. Long conversations will hit API token limits and increase latency.

**Fix:** Limit history to last N exchanges (e.g., 10). Consider truncating or summarizing older history.

---

### 7. `backend/app/ai_routes.py` -- No input validation on AI-generated board updates
**Type:** Potential crash

The route trusts the AI's JSON output directly. If `add_cards` contains a `column_id` that doesn't exist, the code silently `continue`s, but there's no logging or feedback to the user.

**Fix:** Log warnings for ignored operations and return them in the response so the frontend can inform the user.

---

### 8. `frontend/src/components/ThemeToggle.tsx:12` -- `setState` in `useEffect`
**Type:** React lint error (confirmed by ESLint)

```tsx
useEffect(() => {
  const stored = localStorage.getItem("theme");
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const initial = stored || (systemDark ? "dark" : "light");
  setTheme(initial);  // ESLint warns: avoid calling setState in effect
```

**Fix:** Use the initializer form: `const [theme, setTheme] = useState(() => { ... })` which runs once during render, avoiding the effect + setState pattern.

---

### 9. `backend/app/services/board_service.py:58-59` -- `add_card` crashes on empty column
**Type:** Crash

```python
sort_order = column.cards[-1].sort_order + 1 if column.cards else 0
```

If `column` is `None` (column_id doesn't exist), `column.cards` raises `AttributeError`. The route handler validates the column exists, but the service function itself should not crash.

**Fix:** Add a guard: `if not column: return None` at the start of the function.

---

### 10. `frontend/src/components/KanbanBoard.tsx` -- No `updateColumn` import despite function existing
**Type:** Duplication / missed opportunity

The `updateColumn` function exists in `api.ts` but is not imported. The `handleRenameColumn` uses the wrong function. This is related to Critical Issue #1 but noted separately as a code organization concern.

**Fix:** Import and use `updateColumn` (Critical Issue #1 already covers this).

---

### 11. `backend/app/ai_routes.py` -- Duplicate `get_db` function
**Type:** Code duplication

Both `ai_routes.py` and `routes/boards.py` define identical `get_db()` context managers.

**Fix:** Extract to a shared utility (e.g., `backend/app/database.py`).

---

### 12. `frontend/src/lib/api.ts:21-24` -- `fetchApi` swallows non-JSON errors
**Type:** Poor error UX

```typescript
const err = await res.json().catch(() => ({}));
throw new Error(err.detail || `API error ${res.status}`);
```

When the API returns a non-JSON error (e.g., HTML 500 page, network error), `err` is `{}` and the message falls back to a generic `API error 500` with no context about which endpoint failed.

**Fix:** Include the URL in error messages for easier debugging: `throw new Error(\`API error on ${url}: \${err.detail || res.status}\`)`.

---

### 13. `backend/app/main.py:14-20` -- Duplicate `.env` loading logic
**Type:** Code duplication

The `.env` loading loop is duplicated between `main.py` and `services/ai.py`. If the path logic changes, both locations must be updated.

**Fix:** Move to a shared utility function in `database.py` or `ai.py` and import where needed.

---

### 14. `frontend/src/components/AIChatSidebar.test.tsx:3` -- Unused import
**Type:** Lint warning (confirmed)

```tsx
import { aiChat } from "@/lib/api";  // Unused; test uses dynamic import
```

**Fix:** Remove the unused import.

---

### 15. `frontend/src/components/KanbanBoard.test.tsx:1` -- Unused import
**Type:** Lint warning (confirmed)

```tsx
import { screen, render, waitFor, fireEvent } from "@testing-library/react";
//                                        ^^^^^^^^^^ unused
```

**Fix:** Remove `fireEvent` from the import.

---

### 16. TypeScript type errors in test files
**Type:** Build noise

`vi`, `describe`, `it`, `expect` are not recognized by the TypeScript compiler in test files. This is because `vitest` types are not included in the `tsconfig.json` `include` array (or `@types/vitest` is missing).

**Fix:** Add `"types": ["vitest/globals"]` to `compilerOptions` in `tsconfig.json`, or ensure vitest types are properly included.

---

### 17. Playwright test type error
**Type:** Build noise

`frontend/tests/kanban.spec.ts:20` -- `storageState.cookies` is missing required properties (`expires`, `httpOnly`, `secure`) per the TypeScript definition.

**Fix:** Add the missing properties:
```ts
cookies: [{ name: "session", value: "authenticated", domain: "127.0.0.1", path: "/", sameSite: "Strict", httpOnly: false, secure: false, expires: -1 }]
```

---

### 18. `frontend/src/app/api/auth/login/route.ts` -- No rate limiting / brute-force protection
**Type:** Security concern

The login endpoint accepts unlimited requests. An attacker could brute-force the hardcoded credentials (`user` / `password`).

**Fix:** For MVP this is acceptable but note it for the TODO list. Consider adding a simple request counter (in-memory for MVP).

---

### 19. `Dockerfile` -- No healthcheck for frontend
**Type:** Operational risk

The docker-compose healthcheck only checks the backend (`/health`). The frontend (port 3000) is not monitored.

**Fix:** Add a secondary healthcheck or use a composite check: `test: ["CMD-SHELL", "curl -f http://localhost:8000/health && curl -f http://localhost:3000/login || exit 1"]`.

---

## Suggestions (nice to have)

### 20. `backend/app/schemas.py` -- Add `Field` validators
Use Pydantic `Field(min_length=1, max_length=200)` on string fields to enforce reasonable bounds on titles and details.

### 21. `frontend/src/components/KanbanCard.tsx` -- XSS risk on card details
Card titles and details are rendered via `{card.title}` and `{card.details}`. Since these come from the backend API and are set via form inputs (not user-generated content), XSS is not a current risk. But note this for future if card content can be user-generated via AI responses.

### 22. Add a `TODO.md` or `ROADMAP.md`
Document known issues (brute-force protection, bounded history, plaintext passwords, sort-order fix) so they aren't forgotten.

### 23. Consider adding `@sentry/nextjs` or similar
For production error tracking. The AI endpoint in particular can fail in ways that are hard to debug in production.

### 24. `backend/tests/test_integration.py:5` -- Hardcoded `127.0.0.1`
The integration tests hardcode `127.0.0.1` which may not work in all CI environments. Consider reading from an environment variable or using `localhost`.

### 25. No backend linting
There is no `ruff` or `flake8` configuration. Consider adding one for consistency.

---

## Overall: 3/5

**The codebase is functional and well-structured for an MVP**, but has **one critical bug** (rename column calls wrong API), **one security concern** (plaintext password), and several warnings that should be addressed before production.

### Summary by severity:

| Category | Count | Notes |
|---|---|---|
| 🔴 Critical | 5 | Wrong API call, plaintext password, CORS, JSON crash, sort-order corruption |
| 🟡 Warning | 14 | Memory leak, code duplication, type errors, missing validation, UX improvements |
| 🟢 Suggestion | 6 | Nice-to-have improvements |

### Priority fixes (do before production):
1. Fix `handleRenameColumn` to use `apiUpdateColumn`
2. Hash the password in seed data
3. Add JSON parse error handling in `ai.py`
4. Fix sort-order renumbering on card move
5. Tighten CORS configuration
6. Fix unused imports and TypeScript type errors
