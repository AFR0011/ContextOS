"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Zap } from "lucide-react";
import { readJsonResponse, responseErrorMessage } from "@/lib/http-client";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [email, setEmail] = useState(mode === "login" ? "demo@contextos.local" : "");
  const [password, setPassword] = useState(mode === "login" ? "contextos-demo" : "");
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
    <div className="grid min-h-screen place-items-center bg-slate-950 px-4 py-10 text-white">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">ContextOS</h1>
            <p className="text-sm text-slate-400">Execution-first context recovery</p>
          </div>
        </div>

        <form onSubmit={submit} className="rounded-2xl border border-white/10 bg-white p-6 text-slate-950 shadow-2xl shadow-indigo-950/30">
          <div>
            <h2 className="text-2xl font-bold">{mode === "login" ? "Sign in" : "Create account"}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {mode === "login" ? "Use the seeded demo account or your own account." : "New accounts start with the demo workspace data."}
            </p>
          </div>

          <label className="mt-6 block text-sm font-medium text-slate-700">
            Email
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              required
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-slate-700">
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              required
              minLength={mode === "register" ? 8 : undefined}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            />
          </label>

          {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <button
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? "Working..." : mode === "login" ? "Sign in" : "Create account"}
            <ArrowRight className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => router.push(mode === "login" ? "/register" : "/login")}
            className="mt-4 w-full text-center text-sm font-medium text-slate-500 hover:text-indigo-700"
          >
            {mode === "login" ? "Create a new account" : "I already have an account"}
          </button>
        </form>
      </div>
    </div>
  );
}
