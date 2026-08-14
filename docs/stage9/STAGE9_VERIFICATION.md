# Stage 9 verification: lifecycle and destructive-data semantics

Date: 2026-08-14  
Branch: `feat/local-first-completion-stage9`  
Stage 8 parent: `9c6cd0dd3b31008f1924c96bba288f599be2ec32`

## Status

Stage 9 implementation is complete enough for closure verification, but this report is intentionally **open** until an exact accumulated branch commit passes the full CI regression ladder with the Stage 9 lifecycle and evidence checks enabled.

No runtime-dependent Stage 9 evidence item should be treated as closed from this document while `audits/stage9-evidence.json` still records it as `pending`.

## Implemented lifecycle semantics

### Logout and current-device state

- Normal online logout preserves the current verified user's local identity, cached workspace, and pending outbox by default.
- Pending mutations expose explicit synchronization, local-retention, discard, and remove-from-device choices.
- A requested synchronization that leaves mutations pending cancels logout rather than discarding or hiding the pending work.
- Discard removes the current cached workspace together with its outbox so unsynchronized local state is not later mistaken for server-confirmed truth.
- Remove-from-device deletes the current user's local identity, workspace, and outbox without clearing another user's IndexedDB state.
- Privacy-sensitive local cleanup is completed before the remote session is revoked, so a local-cleanup failure leaves the still-authenticated account recoverable.
- Logout is blocked while offline because browser code cannot truthfully revoke the HttpOnly server session without reaching the server.

Primary artifacts:

- `src/lib/local-lifecycle.ts`
- `src/components/workspace/LogoutDialog.tsx`
- `tests/e2e/stage9-lifecycle.spec.ts`

### Multi-user local identity

- Local workspaces remain keyed by verified user ID.
- A single eligible local workspace can still reopen offline.
- When several eligible verified local workspaces exist and remote verification is unavailable, ContextOS does not guess. It presents an explicit local account chooser and opens only the selected identity.

Primary artifacts:

- `src/components/workspace/WorkspaceGate.tsx`
- `tests/e2e/workspace-gate.spec.ts`

### Account deletion

- Permanent account deletion is a network-required operation.
- The route is same-origin guarded and requires an authenticated session.
- The current password and exact `DELETE` confirmation are required.
- The browser first performs a password-verified preflight, then removes that user's current-device IndexedDB state, and only then sends the irreversible password-verified server deletion request.
- The server deletes the authenticated `User` cascade root and expires the session cookie.
- If local cleanup fails, server deletion is not attempted.
- If the final server deletion fails after successful local cleanup, the server account remains and can rebuild local state on a later online login.
- Other offline devices cannot be remotely erased; stale copies on those devices cannot authenticate or synchronize after deletion and remain keyed to the deleted user ID.

Primary artifacts:

- `src/app/api/account/delete/route.ts`
- `src/components/workspace/AccountDeletionPanel.tsx`
- `src/app/(workspace)/account/delete/page.tsx`
- `tests/e2e/stage9-lifecycle.spec.ts`

### Recoverable record deletion

- Projects, Tasks, standalone Notes, and Dates retain their existing `trashedAt` tombstone model.
- Inbox capture deletion remains `status = "deleted"` synchronized state.
- Normal views/search exclude deleted state while Archive/Trash restores tombstoned records.
- Tombstone upserts use the existing updated-at stale-write rule. Tests exercise a newer tombstone followed by an older attempted resurrection and require the server to retain the tombstone with a stale warning.
- Browser coverage exercises an offline Date tombstone through reload, reconnect synchronization, and restore.
- The historical sync `operation: "delete"` remains compatibility-only and is not emitted by current ordinary client deletion paths.
- Irreversible per-record purge remains withheld because no generation/version protocol yet proves that an old offline client cannot resurrect a physically purged record.

Primary artifacts:

- `src/lib/client-store.tsx`
- `src/lib/sync-server.ts`
- `src/components/workspace/Views.tsx`
- `tests/e2e/stage9-tombstones.spec.ts`

## Deterministic guardrails

Stage 9 adds:

- `scripts/stage9-lifecycle-audit.mjs` for lifecycle-sensitive implementation assertions;
- `scripts/stage9-evidence-check.mjs` for evidence-registry integrity;
- `audits/stage9-evidence.json` for machine-readable closure state; and
- CI steps for both Stage 9 checks while retaining the Stage 7 and Stage 8 verification ladder.

The evidence validator refuses a passed `CLOSE-001` while any Stage 9 evidence item remains pending and requires exact CI-run/commit evidence for closure.

## Defects found during Stage 9

Stage 9 work has already exposed or clarified several issues rather than merely documenting intended behavior:

1. The original logout control destroyed the server session without defining local-data or pending-change semantics.
2. The historical sync `delete` operation was confirmed to be a mutation-ledger compatibility no-op rather than product hard delete.
3. Multiple local identities were safely refused but had no explicit offline selection path; Stage 9 adds one.
4. The first remove-from-device implementation revoked the server session before requested IndexedDB cleanup. The order was reversed so privacy-sensitive local cleanup fails before logout rather than after it.
5. A Stage 9 contract rewrite removed wording consumed by the Stage 7 documentation guard. The canonical wording was restored while retaining the more precise Stage 9 lifecycle model.
6. Project-linked Inbox note conversion was confirmed to be a project-recovery import path rather than the persistent standalone Note resource model; the tombstone contract is scoped accordingly instead of pretending those two representations are identical.

## Closure evidence

Pending. The final section will record:

- exact closing commit;
- exact GitHub Actions run;
- Stage 9 lifecycle/evidence audit results;
- TypeScript/build result;
- optimized production/offline browser result;
- full development E2E result;
- database-outage smoke result; and
- remaining documented boundaries.

## Boundaries retained for Stage 10 or later

Stage 9 does not claim:

- remote erasure of IndexedDB held by another offline device;
- irreversible user-facing per-record purge;
- CRDT/collaborative merge semantics;
- external penetration testing/compliance certification;
- provider-native backup/PITR rehearsal beyond the completed provider-neutral PostgreSQL recovery evidence; or
- Stage 10 final comprehensive local-first acceptance.
