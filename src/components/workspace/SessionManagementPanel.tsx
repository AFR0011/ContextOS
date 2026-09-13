"use client";

import { useEffect, useState } from "react";
import { LogOut, MonitorSmartphone, RefreshCw, ShieldCheck } from "lucide-react";
import { readJsonResponse, responseErrorMessage } from "@/lib/http-client";

type SessionSummary = {
  id: string;
  current: boolean;
  createdAt: string;
  expiresAt: string;
};

type SessionListResponse = {
  sessions?: SessionSummary[];
  error?: string;
};

type SessionMutationResponse = {
  ok?: boolean;
  revokedSessions?: number;
  error?: string;
};

function formatSessionTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString();
}

export function SessionManagementPanel({ online, refreshToken = 0 }: { online: boolean; refreshToken?: number }) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(online);
  const [busySessionId, setBusySessionId] = useState<string | null>(null);
  const [revokingOthers, setRevokingOthers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadSessions() {
    if (!online) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/account/sessions", { cache: "no-store" });
      const body = await readJsonResponse<SessionListResponse>(response);
      if (!response.ok || !body?.sessions) {
        throw new Error(responseErrorMessage(response, body, "Could not load active sessions"));
      }
      setSessions(body.sessions);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load active sessions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSessions();
    // refreshToken deliberately lets sibling security actions refresh this server-owned list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, refreshToken]);

  async function revokeSession(sessionId: string) {
    if (!online || busySessionId || revokingOthers) return;
    setBusySessionId(sessionId);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/account/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "revoke", sessionId })
      });
      const body = await readJsonResponse<SessionMutationResponse>(response);
      if (!response.ok || !body?.ok) {
        throw new Error(responseErrorMessage(response, body, "Could not sign out that session"));
      }
      setSuccess(body.revokedSessions ? "Session signed out." : "That session was already signed out.");
      await loadSessions();
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : "Could not sign out that session.");
    } finally {
      setBusySessionId(null);
    }
  }

  async function revokeOtherSessions() {
    if (!online || revokingOthers || busySessionId) return;
    setRevokingOthers(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/account/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "revoke-others" })
      });
      const body = await readJsonResponse<SessionMutationResponse>(response);
      if (!response.ok || !body?.ok) {
        throw new Error(responseErrorMessage(response, body, "Could not sign out other sessions"));
      }
      const count = body.revokedSessions ?? 0;
      setSuccess(
        count > 0
          ? `${count} other signed-in session${count === 1 ? " was" : "s were"} signed out.`
          : "There were no other active sessions to sign out."
      );
      await loadSessions();
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : "Could not sign out other sessions.");
    } finally {
      setRevokingOthers(false);
    }
  }

  const otherSessions = sessions.filter((session) => !session.current);

  return (
    <section className="cos-surface mt-6 p-4" data-testid="session-management-settings">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--cos-primary-soft)] text-[var(--cos-primary-text)]">
            <MonitorSmartphone className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--cos-text-muted)]">Active sessions</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--cos-text-muted)]">
              Review active server sign-ins and revoke sessions you no longer trust. ContextOS does not store device names, IP addresses, or browser fingerprints, so sessions are identified only by their start and expiry times.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void loadSessions()}
          disabled={!online || loading || Boolean(busySessionId) || revokingOthers}
          className="cos-btn cos-btn-ghost min-h-10 shrink-0 px-3 py-2 text-xs disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {!online ? (
        <p className="mt-4 rounded-lg border border-[var(--cos-warning-border)] bg-[var(--cos-warning-soft)] px-3 py-2 text-sm text-[var(--cos-warning-text)]">
          Session management requires an online server connection.
        </p>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-xl border border-[var(--cos-border)]">
        {loading ? (
          <div className="px-4 py-5 text-sm text-[var(--cos-text-muted)]">Loading active sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="px-4 py-5 text-sm text-[var(--cos-text-muted)]">No active sessions could be shown.</div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              data-testid="active-session-row"
              className="flex flex-col gap-3 border-b border-[var(--cos-border-soft)] px-4 py-4 last:border-b-0 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--cos-text-strong)]">
                    {session.current ? "This browser" : "Other session"}
                  </span>
                  {session.current ? (
                    <span data-testid="current-session-badge" className="cos-pill cos-pill-success">
                      <ShieldCheck className="h-3.5 w-3.5" /> Current
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs leading-5 text-[var(--cos-text-muted)]">
                  Started {formatSessionTime(session.createdAt)} · Expires {formatSessionTime(session.expiresAt)}
                </p>
              </div>
              {session.current ? (
                <span className="text-xs text-[var(--cos-text-subtle)]">Use the normal logout flow to end this session.</span>
              ) : (
                <button
                  type="button"
                  data-testid="revoke-session"
                  onClick={() => void revokeSession(session.id)}
                  disabled={!online || Boolean(busySessionId) || revokingOthers}
                  className="cos-btn cos-btn-secondary min-h-10 shrink-0 px-3 py-2 text-xs disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4" />
                  {busySessionId === session.id ? "Signing out..." : "Sign out"}
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          data-testid="revoke-other-sessions"
          onClick={() => void revokeOtherSessions()}
          disabled={!online || otherSessions.length === 0 || Boolean(busySessionId) || revokingOthers}
          className="cos-btn cos-btn-secondary min-h-10 px-4 py-2 text-sm disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          {revokingOthers ? "Signing out other sessions..." : "Sign out all other sessions"}
        </button>
        <span className="text-xs text-[var(--cos-text-subtle)]">
          {otherSessions.length} other active session{otherSessions.length === 1 ? "" : "s"}
        </span>
      </div>

      {error ? (
        <p data-testid="session-management-error" className="mt-3 rounded-lg border border-[var(--cos-danger-border)] bg-[var(--cos-danger-soft)] px-3 py-2 text-sm text-[var(--cos-danger-text)]">
          {error}
        </p>
      ) : null}
      {success ? (
        <p data-testid="session-management-success" className="mt-3 rounded-lg border border-[var(--cos-success-border)] bg-[var(--cos-success-soft)] px-3 py-2 text-sm text-[var(--cos-success-text)]">
          {success}
        </p>
      ) : null}
    </section>
  );
}
