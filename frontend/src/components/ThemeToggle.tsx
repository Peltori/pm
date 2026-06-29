"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const t = stored || (systemDark ? "dark" : "light");
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.setAttribute("data-theme", next);
  }

  if (theme === null) return null;

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
