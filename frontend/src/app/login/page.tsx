"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      credentials: "include",
    });

    if (res.ok) {
      router.push("/");
    } else {
      const data = await res.json();
      setError(data.error || "Invalid credentials");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface)] p-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--stroke)] bg-white p-8 shadow-lg">
        <h1 className="mb-1 font-display text-2xl font-semibold text-[var(--navy-dark)]">
          Kanban Studio
        </h1>
        <p className="mb-6 text-sm text-[var(--gray-text)]">Sign in to continue</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
          )}

          <div>
            <label htmlFor="username" className="mb-1 block text-sm font-medium text-[var(--navy-dark)]">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[var(--primary-blue)]"
              placeholder="user"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-[var(--navy-dark)]">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[var(--primary-blue)]"
              placeholder="password"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-[var(--secondary-purple)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
