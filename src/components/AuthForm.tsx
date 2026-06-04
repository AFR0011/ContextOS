"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Zap } from "lucide-react";
import { readJsonResponse, responseErrorMessage } from "@/lib/http-client";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [email, setEmail] = useState(mode === "login" ? "demo@contextos.local" : "");
  const [password, setPassword] = useState(mode === "login" ? "contextos-demo-v011" : "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const result = await readJsonResponse<{ error?: string; user?: unknown }>(response);
      if (!response.ok) throw new Error(responseErrorMessage(response, result, "Authentication failed"));
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[var(--cos-bg)] px-4 py-10 text-[var(--cos-text)]">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--cos-primary)] text-white shadow-sm">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--cos-text-strong)]">ContextOS</h1>
            <p className="text-sm text-[var(--cos-text-muted)]">Execution-first context recovery</p>
          </div>
        </div>

        <form onSubmit={submit} className="cos-surface p-5 sm:p-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--cos-text-strong)]">{mode === "login" ? "Sign in" : "Create account"}</h2>
            <p className="mt-1 text-sm text-[var(--cos-text-muted)]">
              {mode === "login" ? "Use the seeded demo account or your own account." : "New accounts start with the demo workspace data."}
            </p>
          </div>

          <label className="mt-6 block text-sm font-medium text-[var(--cos-text)]">
            Email
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              required
              className="cos-input mt-1 w-full px-3 py-2 text-sm"
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-[var(--cos-text)]">
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              required
              minLength={mode === "register" ? 8 : undefined}
              className="cos-input mt-1 w-full px-3 py-2 text-sm"
            />
          </label>

          {error ? <p className="mt-4 rounded-lg border border-[var(--cos-danger-border)] bg-[var(--cos-danger-soft)] px-3 py-2 text-sm text-[var(--cos-danger-text)]">{error}</p> : null}

          <button
            disabled={loading}
            className="cos-btn cos-btn-primary mt-6 w-full px-4 py-2.5 text-sm disabled:opacity-60"
          >
            {loading ? "Working..." : mode === "login" ? "Sign in" : "Create account"}
            <ArrowRight className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => router.push(mode === "login" ? "/register" : "/login")}
            className="mt-4 w-full rounded-lg px-3 py-2 text-center text-sm font-medium text-[var(--cos-text-muted)] hover:bg-[var(--cos-bg-inset)] hover:text-[var(--cos-primary-text)]"
          >
            {mode === "login" ? "Create a new account" : "I already have an account"}
          </button>
        </form>
      </div>
    </div>
  );
}
