# Frontend Codebase

## Overview

This is the frontend for the Kanban Studio Project Management app, built with Next.js 16 (App Router).

## Project Structure

```
frontend/
  src/
    app/                    # Next.js App Router
      layout.tsx            # Root layout with fonts and global styles
      page.tsx              # Entry point - renders KanbanBoard
      globals.css           # Tailwind + CSS custom properties (color scheme)
    components/
      Header.tsx            # Header with theme toggle and AI chat toggle
      ThemeToggle.tsx       # Dark/light mode toggle button
      KanbanBoard.tsx       # Main board component with DnD context
      KanbanCardPreview.tsx # Drag overlay preview
      NewCardForm.tsx       # Inline form for adding cards
      AIChatSidebar.tsx     # AI chat sidebar widget
    components/ui/          # UI components
    lib/
      api.ts                # API client for backend calls
      kanban.ts             # Types (Card, Column, BoardData), initial data, move logic
      kanban.test.ts        # Unit tests for moveCard logic
    test/
      setup.ts              # Vitest setup (imports jest-dom matchers)
      vitest.d.ts           # Type declarations for test environment
    components/KanbanBoard.test.tsx  # Component tests (render, rename, add/remove)
    components/AIChatSidebar.test.tsx # AI chat sidebar tests
  tests/
    kanban.spec.ts          # Playwright E2E tests
```

## Key Dependencies

- **React 19** + **Next.js 16** - framework
- **Tailwind CSS v4** - styling
- **@dnd-kit** (core, sortable, utilities) - drag and drop
- **clsx** - conditional class names
- **Vitest + @testing-library/react** - unit tests
- **Playwright** - E2E tests

## Package Manager

Uses **pnpm** for dependency management. Do not use npm.

## Color Scheme (CSS custom properties)

- `--accent-yellow`: #ecad0a
- `--primary-blue`: #209dd7
- `--secondary-purple`: #753991
- `--navy-dark`: #032147
- `--gray-text`: #888888

## Fonts

- Display: Space Grotesk
- Body: Manrope

## Data Model

The board state lives in a single React state object (`BoardData`):

- `columns`: array of `{id, title, cardIds[]}`
- `cards`: record of `{id, title, details}` keyed by card id
- Cards are referenced by ID in columns, stored as objects in the cards record
- Drag-and-drop uses @dnd-kit with `closestCorners` collision detection
- Cards can be moved within the same column (reorder), between columns, or to column endpoints
- Column titles are editable inline

## Running

```bash
pnpm install
pnpm run dev       # development
pnpm run build      # production build
pnpm run test:unit  # unit tests
pnpm run test:e2e   # E2E tests (requires Next.js running)
pnpm run test:all   # all tests
```
