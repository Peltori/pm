"use client";

import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  return (
    <header className="flex flex-col gap-6 rounded-[32px] border border-[var(--border)] bg-[var(--bg-strong)] p-8 shadow-[var(--shadow)]">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--text-muted)]">
            Single Board Kanban
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold text-[var(--text)]">
            Kanban Studio
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-muted)]">
            Keep momentum visible. Rename columns, drag cards between stages, and capture quick notes without getting buried in settings.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)] transition hover:border-[var(--primary-blue)] hover:text-[var(--text)]"
            >
              Logout
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
