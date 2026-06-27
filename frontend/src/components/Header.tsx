"use client";

import { ThemeToggle } from "./ThemeToggle";

interface HeaderProps {
  onAiToggle?: () => void;
  isAiOpen?: boolean;
}

export function Header({ onAiToggle, isAiOpen = false }: HeaderProps) {
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
          {onAiToggle && (
            <button
              onClick={onAiToggle}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                isAiOpen
                  ? "border-[var(--primary-blue)] bg-[var(--primary-blue)] text-white"
                  : "border-[var(--border)] bg-[var(--bg-strong)] text-[var(--text-muted)] hover:border-[var(--primary-blue)] hover:text-[var(--text)]"
              }`}
              aria-label="Toggle AI assistant"
            >
              <span className="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10A10 10 0 0 1 2 12 10 10 0 0 1 12 2z" />
                  <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                  <line x1="9" y1="9" x2="9.01" y2="9" />
                  <line x1="15" y1="9" x2="15.01" y2="9" />
                </svg>
                AI
              </span>
            </button>
          )}
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
