"use client";

import { useState } from "react";

export function ThemeToggle() {
  const getInitialTheme = (): string => {
    if (typeof window === "undefined") return "light";
    const stored = localStorage.getItem("theme");
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return stored || (systemDark ? "dark" : "light");
  };

  const [theme, setTheme] = useState(getInitialTheme);

  const applyTheme = (t: string) => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", t);
    }
  };

  applyTheme(theme);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    applyTheme(next);
  }

  return (
    <button
      onClick={toggle}
      className="rounded-lg border border-[var(--border)] bg-[var(--bg-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)] transition hover:border-[var(--primary-blue)] hover:text-[var(--text)]"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}
