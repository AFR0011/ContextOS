"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Home, ShieldCheck } from "lucide-react";
import { handoffFromFragment, validateLifeOsHandoff, type LifeOsHandoffV1 } from "@/lib/lifeos-handoff";
import type { LocalVerifiedUser } from "@/lib/local-db";

const PENDING_HANDOFF_KEY = "contextos:pending-handoff";

function HandoffPreview() {
  const router = useRouter();
  const [handoff, setHandoff] = useState<LifeOsHandoffV1 | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fragment = window.location.hash || window.sessionStorage.getItem(PENDING_HANDOFF_KEY) || "";
    try {
      if (!fragment) throw new Error("No handoff payload was provided.");
      setHandoff(handoffFromFragment(fragment, "contextos"));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not read this handoff.");
    } finally {
      window.sessionStorage.removeItem(PENDING_HANDOFF_KEY);
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
  }, []);

  const validation = useMemo(() => {
    if (!handoff) return null;
    try {
      return validateLifeOsHandoff(handoff, "contextos");
    } catch (reason) {
      return reason instanceof Error ? reason.message : "This handoff is invalid.";
    }
  }, [handoff]);

  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <button type="button" onClick={() => router.replace("/dashboard")} className="cos-btn cos-btn-ghost min-h-10 px-3 py-2 text-sm">
        <ArrowLeft className="h-4 w-4" /> Home
      </button>

      <section className="cos-surface space-y-5 p-5 sm:p-6" data-testid="handoff-compatibility-preview">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-6 w-6 text-[var(--cos-primary)]" />
          <div>
            <h1 className="text-xl font-semibold text-[var(--cos-text-strong)]">Review LifeOS handoff</h1>
            <p className="mt-1 text-sm leading-6 text-[var(--cos-text-muted)]">
              ContextOS no longer creates Inbox captures. This compatibility preview does not save the proposal while the canonical LifeOS action contract is being defined.
            </p>
          </div>
        </div>

        {error ? <p role="alert" className="rounded-lg bg-[var(--cos-danger-soft)] p-3 text-sm text-[var(--cos-danger-text)]">{error}</p> : null}
        {!handoff && !error ? <p className="text-sm text-[var(--cos-text-muted)]">Preparing handoff preview...</p> : null}

        {handoff ? (
          <>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="cos-pill cos-pill-primary">{handoff.source}</span>
              <span className="cos-pill cos-pill-muted">{handoff.kind}</span>
              {handoff.area ? <span className="cos-pill cos-pill-muted">{handoff.area}</span> : null}
            </div>

            <div className="rounded-lg border border-[var(--cos-border-soft)] bg-[var(--cos-bg-soft)] p-4">
              <p className="text-sm font-semibold text-[var(--cos-text-strong)]">{handoff.title}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--cos-text)]">{handoff.body}</p>
            </div>

            {typeof validation === "string" ? <p role="alert" className="text-sm text-[var(--cos-danger-text)]">{validation}</p> : null}

            <p className="text-sm leading-6 text-[var(--cos-text-muted)]">
              For now, use Home or Cmd/Ctrl+K to create the relevant Task or Date explicitly. No legacy Capture is written from this screen.
            </p>

            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => router.replace("/dashboard")} className="cos-btn cos-btn-primary min-h-10 px-4 py-2 text-sm">
                <Home className="h-4 w-4" /> Open Home
              </button>
              <button type="button" onClick={() => router.replace("/lifeos")} className="cos-btn cos-btn-secondary min-h-10 px-4 py-2 text-sm">
                Open LifeOS
              </button>
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}

export default function HandoffPage() {
  const router = useRouter();
  const [authState, setAuthState] = useState<"checking" | "ready" | "error">("checking");
  const [authError, setAuthError] = useState("");
  const [user, setUser] = useState<LocalVerifiedUser | null>(null);

  useEffect(() => {
    if (window.location.hash) {
      window.sessionStorage.setItem(PENDING_HANDOFF_KEY, window.location.hash);
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10_000);

    void fetch("/api/auth/me", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json().catch(() => null) as { user?: LocalVerifiedUser; error?: string } | null;
        if (!response.ok) throw new Error(result?.error || `Could not verify sign-in (${response.status}).`);
        if (!result?.user) {
          router.replace("/login?next=/handoff");
          return;
        }
        setUser(result.user);
        setAuthState("ready");
      })
      .catch((reason) => {
        setAuthError(
          reason instanceof DOMException && reason.name === "AbortError"
            ? "Sign-in verification timed out. Please retry."
            : reason instanceof Error
              ? reason.message
              : "Could not verify sign-in."
        );
        setAuthState("error");
      })
      .finally(() => window.clearTimeout(timeout));

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [router]);

  if (authState === "ready" && user) return <HandoffPreview />;

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--cos-bg)] p-4 text-[var(--cos-text)]">
      <section className="cos-surface w-full max-w-lg space-y-3 p-6">
        <h1 className="text-xl font-semibold text-[var(--cos-text-strong)]">Preparing ContextOS handoff</h1>
        {authState === "checking" ? <p className="text-sm text-[var(--cos-text-muted)]">Checking your sign-in before showing the private proposal...</p> : null}
        {authState === "error" ? (
          <>
            <p role="alert" className="text-sm text-[var(--cos-danger-text)]">{authError}</p>
            <button type="button" onClick={() => window.location.reload()} className="cos-btn cos-btn-primary min-h-10 px-4 py-2 text-sm">Retry</button>
          </>
        ) : null}
      </section>
    </main>
  );
}
