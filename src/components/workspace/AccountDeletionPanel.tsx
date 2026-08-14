"use client";

import { useState } from "react";
import { AlertTriangle, ArrowLeft, Trash2 } from "lucide-react";
import type { PublicUser } from "@/lib/auth";
import { removeLocalUserDeviceData } from "@/lib/local-lifecycle";
import { readJsonResponse, responseErrorMessage } from "@/lib/http-client";

export function AccountDeletionPanel({ user }: { user: PublicUser }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = password.length > 0 && confirmation === "DELETE" && !busy;

  async function requestDeletion(verifyOnly: boolean) {
    const response = await fetch("/api/account/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, confirmation, verifyOnly })
    });
    const result = await readJsonResponse<{ verified?: boolean; ok?: boolean; error?: string }>(response);
    if (!response.ok) {
      throw new Error(responseErrorMessage(response, result, verifyOnly ? "Could not verify account deletion" : "Could not delete the account"));
    }
    return result;
  }

  async function deleteAccount() {
    if (!ready) return;
    setBusy(true);
    setError(null);

    try {
      if (!navigator.onLine) {
        throw new Error("Connect to the network before deleting your account.");
      }

      const verification = await requestDeletion(true);
      if (!verification?.verified) {
        throw new Error("Account deletion could not be verified.");
      }

      // Clear the current browser first, while the server account is still intact.
      // If IndexedDB cleanup fails, the irreversible server deletion never runs.
      await removeLocalUserDeviceData(user.id);

      const deletion = await requestDeletion(false);
      if (!deletion?.ok) {
        throw new Error("The local copy was removed, but the server account was not deleted. Sign in again online to rebuild the local workspace before retrying.");
      }

      window.location.assign("/login");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not delete the account safely.");
      setBusy(false);
    }
  }

  return (
    <main className="cos-page mx-auto max-w-2xl">
      <button
        type="button"
        onClick={() => window.history.back()}
        className="cos-btn cos-btn-ghost mb-5 min-h-10 px-3 py-2 text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <section className="rounded-xl border border-[var(--cos-danger-border)] bg-[var(--cos-bg-elevated)] p-5 shadow-[var(--cos-shadow-sm)]">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--cos-danger-soft)] text-[var(--cos-danger)]">
            <Trash2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[var(--cos-text-strong)]">Delete account permanently</h1>
            <p className="mt-1 text-sm leading-6 text-[var(--cos-text-muted)]">
              This deletes the server account for <span className="font-medium text-[var(--cos-text)]">{user.email}</span>, its sessions, and all server-owned ContextOS records. The current browser's cached workspace and pending changes are also removed.
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-start gap-2 rounded-lg border border-[var(--cos-warning-border)] bg-[var(--cos-warning-soft)] p-3 text-sm leading-6 text-[var(--cos-warning-text)]">
          <AlertTriangle className="mt-1 h-4 w-4 shrink-0" />
          <span>Other devices that are offline cannot be erased remotely. Their stale local copies remain on those devices, but they will no longer authenticate or synchronize after this account is deleted.</span>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--cos-text)]">Current password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="cos-input w-full px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--cos-text)]">Type DELETE to confirm</span>
            <input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="cos-input w-full px-3 py-2 text-sm"
              aria-label="Type DELETE to confirm"
            />
          </label>
        </div>

        {error ? (
          <p data-testid="account-delete-error" className="mt-4 rounded-lg border border-[var(--cos-danger-border)] bg-[var(--cos-danger-soft)] px-3 py-2 text-sm text-[var(--cos-danger-text)]">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          data-testid="account-delete-submit"
          onClick={() => void deleteAccount()}
          disabled={!ready}
          className="cos-btn mt-5 min-h-11 w-full justify-center bg-[var(--cos-danger)] px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          {busy ? "Deleting account..." : "Permanently delete account"}
        </button>
      </section>
    </main>
  );
}
