"use client";

import { useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { SessionManagementPanel } from "@/components/workspace/SessionManagementPanel";
import { readJsonResponse, responseErrorMessage } from "@/lib/http-client";

export function PasswordChangePanel({ online }: { online: boolean }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sessionRefreshToken, setSessionRefreshToken] = useState(0);

  const confirmationMatches = confirmation.length > 0 && newPassword === confirmation;
  const validLength = newPassword.length >= 8 && newPassword.length <= 128;
  const ready = Boolean(
    online &&
    !busy &&
    currentPassword.length > 0 &&
    validLength &&
    confirmationMatches &&
    currentPassword !== newPassword
  );

  async function changePassword() {
    if (!ready) return;
    setBusy(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/account/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const body = await readJsonResponse<{ ok?: boolean; revokedSessions?: number; error?: string }>(response);
      if (!response.ok || !body?.ok) {
        throw new Error(responseErrorMessage(response, body, "Could not change the password"));
      }

      const revoked = body.revokedSessions ?? 0;
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      setSuccess(
        revoked > 0
          ? `Password changed. ${revoked} other signed-in session${revoked === 1 ? " was" : "s were"} signed out.`
          : "Password changed. This browser remains signed in."
      );
      setSessionRefreshToken((value) => value + 1);
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : "Could not change the password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="cos-surface mt-6 p-4" data-testid="password-change-settings">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--cos-primary-soft)] text-[var(--cos-primary-text)]">
            <KeyRound className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--cos-text-muted)]">Account security</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--cos-text-muted)]">
              Change your password after confirming the current one. Other signed-in sessions are revoked automatically; this browser stays signed in.
            </p>
          </div>
        </div>

        <form
          className="mt-4 grid gap-3 lg:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault();
            void changePassword();
          }}
        >
          <label className="block text-sm font-medium text-[var(--cos-text)]">
            Current password
            <input
              aria-label="Current password"
              type="password"
              autoComplete="current-password"
              maxLength={256}
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="cos-input mt-1 w-full px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm font-medium text-[var(--cos-text)]">
            New password
            <input
              aria-label="New password"
              aria-describedby="new-password-requirements new-password-length-validation new-password-difference-validation"
              aria-invalid={Boolean(newPassword && (!validLength || currentPassword === newPassword))}
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="cos-input mt-1 w-full px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm font-medium text-[var(--cos-text)]">
            Confirm new password
            <input
              aria-label="Confirm new password"
              aria-describedby="password-confirmation-validation"
              aria-invalid={Boolean(confirmation && !confirmationMatches)}
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="cos-input mt-1 w-full px-3 py-2 text-sm"
            />
          </label>

          <div className="lg:col-span-3">
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" disabled={!ready} className="cos-btn cos-btn-primary min-h-10 px-4 py-2 text-sm disabled:opacity-50">
                <ShieldCheck className="h-4 w-4" />
                {busy ? "Changing password..." : "Change password"}
              </button>
              <span id="new-password-requirements" className="text-xs text-[var(--cos-text-subtle)]">New passwords must be 8–128 characters.</span>
            </div>
            {!online ? <p className="mt-2 text-sm text-[var(--cos-warning-text)]">Password changes require an online server connection.</p> : null}
            {newPassword && !validLength ? <p id="new-password-length-validation" role="status" className="mt-2 text-sm text-[var(--cos-warning-text)]">Use between 8 and 128 characters.</p> : null}
            {confirmation && !confirmationMatches ? <p id="password-confirmation-validation" role="status" className="mt-2 text-sm text-[var(--cos-warning-text)]">The new passwords do not match.</p> : null}
            {currentPassword && newPassword && currentPassword === newPassword ? <p id="new-password-difference-validation" role="status" className="mt-2 text-sm text-[var(--cos-warning-text)]">Choose a password different from the current one.</p> : null}
            {error ? <p data-testid="password-change-error" role="alert" className="mt-3 break-words rounded-lg border border-[var(--cos-danger-border)] bg-[var(--cos-danger-soft)] px-3 py-2 text-sm text-[var(--cos-danger-text)] [overflow-wrap:anywhere]">{error}</p> : null}
            {success ? <p data-testid="password-change-success" role="status" className="mt-3 break-words rounded-lg border border-[var(--cos-success-border)] bg-[var(--cos-success-soft)] px-3 py-2 text-sm text-[var(--cos-success-text)] [overflow-wrap:anywhere]">{success}</p> : null}
          </div>
        </form>
      </section>

      <SessionManagementPanel online={online} refreshToken={sessionRefreshToken} />
    </>
  );
}
