"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Zap } from "lucide-react";
import { readJsonResponse, responseErrorMessage } from "@/lib/http-client";
import { rememberLocalUser, type LocalVerifiedUser } from "@/lib/local-db";

export default function AuthForm({ mode, serviceStatus, registrationEnabled = true }: { mode: "login" | "register"; serviceStatus?: string; registrationEnabled?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams?.get("next") || "/dashboard";
  const safeNext = nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (mode === "register" && !registrationEnabled) {
      setError("Registration is closed for this deployment.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const result = await readJsonResponse<{ error?: string; user?: LocalVerifiedUser }>(response);
      if (!response.ok) throw new Error(responseErrorMessage(response, result, "Authentication failed"));
      if (!result?.user) throw new Error("Authentication succeeded without a user identity.");
      await rememberLocalUser(result.user);
      router.push(safeNext);
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
              {mode === "login"
                ? registrationEnabled ? "Use the seeded demo account or your own account." : "Sign in to your private workspace."
                : registrationEnabled ? "New accounts start with the demo workspace data." : "Registration is closed for this deployment."}
            </p>
          </div>

          {serviceStatus ? (
            <p data-testid="auth-service-status" className="mt-4 rounded-lg border border-[var(--cos-warning-border)] bg-[var(--cos-warning-soft)] px-3 py-2 text-sm text-[var(--cos-warning-text)]">
              {serviceStatus}
            </p>
          ) : null}

          <label className="mt-6 block text-sm font-medium text-[var(--cos-text)]">
            Email
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="username"
              maxLength={254}
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
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              maxLength={mode === "login" ? 256 : 128}
              required
              minLength={mode === "register" ? 8 : undefined}
              className="cos-input mt-1 w-full px-3 py-2 text-sm"
            />
          </label>

          {error ? <p className="mt-4 rounded-lg border border-[var(--cos-danger-border)] bg-[var(--cos-danger-soft)] px-3 py-2 text-sm text-[var(--cos-danger-text)]">{error}</p> : null}

          <button
            disabled={loading || Boolean(serviceStatus) || (mode === "register" && !registrationEnabled)}
            className="cos-btn cos-btn-primary mt-6 w-full px-4 py-2.5 text-sm disabled:opacity-60"
          >
            {loading ? "Working..." : mode === "login" ? "Sign in" : "Create account"}
            <ArrowRight className="h-4 w-4" />
          </button>

          {mode === "login" && !registrationEnabled ? null : (
            <button
              type="button"
              onClick={() => router.push(mode === "login" ? "/register" : "/login")}
              className="mt-4 w-full rounded-lg px-3 py-2 text-center text-sm font-medium text-[var(--cos-text-muted)] hover:bg-[var(--cos-bg-inset)] hover:text-[var(--cos-primary-text)]"
            >
              {mode === "login" ? "Create a new account" : "I already have an account"}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
