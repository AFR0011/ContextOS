"use client";

import { useState } from "react";
import { AlertTriangle, LogOut, ShieldX, Trash2, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import type { PublicUser } from "@/lib/auth";
import { readLocalOutbox } from "@/lib/local-db";
import { clearLocalWorkspaceState, removeLocalUserDeviceData } from "@/lib/local-lifecycle";

type LogoutSyncState = {
  online: boolean;
  pendingCount: number;
  syncing: boolean;
};

export interface LogoutDialogProps {
  open: boolean;
  user: PublicUser;
  sync: LogoutSyncState;
  syncNow: () => Promise<void>;
  onClose: () => void;
}

type LogoutAction = "keep" | "sync" | "discard" | "remove";

async function destroyServerSession() {
  const response = await fetch("/api/auth/logout", { method: "POST" });
  if (!response.ok) throw new Error("Could not end the server session. Reconnect and try again.");
}

export function LogoutDialog({ open, user, sync, syncNow, onClose }: LogoutDialogProps) {
  const router = useRouter();
  const [working, setWorking] = useState<LogoutAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const busy = working !== null;
  const hasPending = sync.pendingCount > 0;

  async function finishLogout(action: LogoutAction) {
    if (busy) return;
    setWorking(action);
    setError(null);
    let localCleanupCompleted = false;

    try {
      if (!sync.online) {
        throw new Error("Reconnect before logging out so the HttpOnly server session can be invalidated safely.");
      }

      if (action === "sync") {
        await syncNow();
        const remaining = await readLocalOutbox(user);
        if (remaining.length > 0) {
          throw new Error("Pending changes are still unsynchronized. Logout was cancelled so they are not lost.");
        }
      }

      // When the user explicitly asks to discard/remove local state, complete
      // that privacy-sensitive operation before revoking the remote session.
      // A failed local cleanup therefore leaves the still-authenticated account
      // recoverable instead of logging the user out while sensitive cache remains.
      if (action === "discard") {
        await clearLocalWorkspaceState(user.id);
        localCleanupCompleted = true;
      }

      if (action === "remove") {
        await removeLocalUserDeviceData(user.id);
        localCleanupCompleted = true;
      }

      await destroyServerSession();

      router.replace("/login");
      router.refresh();
    } catch (reason) {
      if (localCleanupCompleted) {
        setError("Local data was removed as requested, but the server session could not be ended. Reconnect and retry logout; if the session is still valid, signing in online can rebuild the local workspace.");
      } else {
        setError(reason instanceof Error ? reason.message : "Could not complete logout safely.");
      }
      setWorking(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/45 p-4" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onClose();
    }}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-dialog-title"
        data-testid="logout-dialog"
        className="w-full max-w-lg rounded-xl border border-[var(--cos-border)] bg-[var(--cos-bg-elevated)] p-5 shadow-xl"
      >
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--cos-warning-soft)] text-[var(--cos-warning-text)]">
            <LogOut className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="logout-dialog-title" className="text-lg font-semibold text-[var(--cos-text-strong)]">Log out of ContextOS</h2>
            <p className="mt-1 text-sm text-[var(--cos-text-muted)]">
              Your local workspace is preserved by default for <span className="font-medium text-[var(--cos-text)]">{user.email}</span>.
            </p>
          </div>
        </div>

        {!sync.online ? (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-[var(--cos-warning-border)] bg-[var(--cos-warning-soft)] p-3 text-sm text-[var(--cos-warning-text)]">
            <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Logout is blocked while offline because the HttpOnly server session cannot be invalidated from browser code alone. Local data has not been changed.</span>
          </div>
        ) : null}

        {hasPending ? (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-[var(--cos-warning-border)] bg-[var(--cos-warning-soft)] p-3 text-sm text-[var(--cos-warning-text)]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{sync.pendingCount} local change{sync.pendingCount === 1 ? " is" : "s are"} still pending. Choose explicitly what happens to them.</span>
          </div>
        ) : null}

        {error ? (
          <div data-testid="logout-error" className="mt-4 rounded-lg border border-[var(--cos-danger-border)] bg-[var(--cos-danger-soft)] p-3 text-sm text-[var(--cos-danger-text)]">
            {error}
          </div>
        ) : null}

        <div className="mt-5 space-y-2">
          {hasPending ? (
            <button
              type="button"
              data-testid="logout-sync"
              disabled={busy || !sync.online || sync.syncing}
              onClick={() => void finishLogout("sync")}
              className="cos-btn cos-btn-primary min-h-11 w-full justify-start px-4 py-3 text-sm disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
              {working === "sync" ? "Syncing and logging out..." : "Sync pending changes and log out"}
            </button>
          ) : null}

          <button
            type="button"
            data-testid="logout-keep-local"
            disabled={busy || !sync.online}
            onClick={() => void finishLogout("keep")}
            className={`${hasPending ? "cos-btn cos-btn-secondary" : "cos-btn cos-btn-primary"} min-h-11 w-full justify-start px-4 py-3 text-sm disabled:opacity-50`}
          >
            <LogOut className="h-4 w-4" />
            {working === "keep" ? "Logging out..." : hasPending ? "Keep pending changes locally and log out" : "Log out and keep local data"}
          </button>

          {hasPending ? (
            <button
              type="button"
              data-testid="logout-discard-local"
              disabled={busy || !sync.online}
              onClick={() => void finishLogout("discard")}
              className="cos-btn cos-btn-ghost min-h-11 w-full justify-start px-4 py-3 text-sm text-[var(--cos-danger-text)] disabled:opacity-50"
            >
              <ShieldX className="h-4 w-4" />
              {working === "discard" ? "Discarding local workspace..." : "Discard unsynced local changes and log out"}
            </button>
          ) : null}

          <button
            type="button"
            data-testid="logout-remove-device-data"
            disabled={busy || !sync.online}
            onClick={() => void finishLogout("remove")}
            className="cos-btn cos-btn-ghost min-h-11 w-full justify-start px-4 py-3 text-sm text-[var(--cos-danger-text)] disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            {working === "remove" ? "Removing device data..." : "Remove this account's data from this device and log out"}
          </button>
        </div>

        <div className="mt-4 border-t border-[var(--cos-border-soft)] pt-4">
          <button
            type="button"
            data-testid="open-account-deletion"
            disabled={busy || !sync.online}
            onClick={() => window.location.assign("/account/delete")}
            className="cos-btn cos-btn-ghost min-h-10 w-full justify-start px-4 py-2 text-sm text-[var(--cos-danger-text)] disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" /> Permanently delete account...
          </button>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          className="cos-btn cos-btn-ghost mt-3 min-h-10 w-full justify-center px-4 py-2 text-sm disabled:opacity-50"
        >
          Cancel
        </button>
      </section>
    </div>
  );
}
