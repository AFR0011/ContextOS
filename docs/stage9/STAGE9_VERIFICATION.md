# Stage 9 verification: lifecycle and destructive-data semantics

Date: 2026-08-14  
Branch: `feat/local-first-completion-stage9`  
Stage 8 parent: `9c6cd0dd3b31008f1924c96bba288f599be2ec32`

## Status

**Closed.** Stage 9 lifecycle and destructive-data semantics are verified against exact automated evidence.

Verified code/test commit: `68b1543e5083e9064fe909101047fa5e57e7f563`  
Closing GitHub Actions run: `31798664757`  
Conclusion: `success`

The closing run passed the inherited Stage 7 and Stage 8 guardrails, Stage 9 lifecycle/evidence checks, Prisma validation and migrations, TypeScript, production build, optimized production/offline browser coverage, the Stage 9 lifecycle browser matrix, the full development E2E suite, and the deliberate database-outage smoke.

`audits/stage9-evidence.json` records all runtime-dependent Stage 9 controls as passed. The deliberately unsupported irreversible per-record purge and Stage 10 final-acceptance boundary remain documented boundaries rather than being relabeled as successes.

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
- The browser first performs a password-verified preflight, removes that user's current-device IndexedDB state, and only then sends the irreversible password-verified server deletion request.
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

- Projects, Tasks, standalone Notes, and Dates retain their `trashedAt` tombstone model.
- Inbox capture deletion remains `status = "deleted"` synchronized state.
- Normal views/search exclude deleted state while Archive/Trash restores tombstoned records.
- Tombstone upserts use the existing updated-at stale-write rule. Automated coverage creates a newer tombstone, submits an older attempted resurrection, and requires the server to retain the tombstone with a stale warning.
- Development browser coverage proves an offline Date tombstone is durably present in IndexedDB before reconnect, then synchronizes and restores across the server boundary.
- Production browser coverage separately proves the tombstone and Archive/Trash view survive an actual offline hard reload under the installed service-worker runtime before reconnect and restore.
- The historical sync `operation: "delete"` remains compatibility-only and is not emitted by current ordinary client deletion paths.
- Irreversible per-record purge remains withheld because no generation/version protocol yet proves that an old offline client cannot resurrect a physically purged record.

Primary artifacts:

- `src/lib/client-store.tsx`
- `src/lib/sync-server.ts`
- `src/components/workspace/Views.tsx`
- `tests/e2e/stage9-tombstones.spec.ts`
- `tests/offline-production/stage9-tombstone.spec.ts`

## Startup consistency protection

Stage 9 also hardened a local-first startup race found during lifecycle testing:

- workspace interaction is withheld until the initial user-scoped IndexedDB read is known;
- local mutations advance a generation counter;
- startup bootstrap and explicit refresh capture the generation before requesting server state; and
- an older server snapshot is not allowed to replace a newer local mutation if the generation changed while the request was in flight.

The deterministic regression test holds an older `/api/bootstrap` response, performs a newer local mutation, then releases the stale response and proves the local mutation survives and later synchronizes.

Primary artifacts:

- `src/lib/client-store.tsx`
- `src/components/workspace/WorkspaceShell.tsx`
- `tests/e2e/stage9-tombstones.spec.ts`
- `scripts/stage9-lifecycle-audit.mjs`

## Deterministic guardrails

Stage 9 adds:

- `scripts/stage9-lifecycle-audit.mjs` for lifecycle-sensitive implementation assertions;
- `scripts/stage9-evidence-check.mjs` for evidence-registry integrity;
- `audits/stage9-evidence.json` for machine-readable closure state; and
- CI steps for both Stage 9 checks while retaining the Stage 7 and Stage 8 verification ladder.

The evidence validator refuses a passed `CLOSE-001` while any Stage 9 evidence item remains pending and requires exact CI-run/commit evidence for closure.

## Defects found during Stage 9

Stage 9 exposed or clarified concrete issues instead of merely documenting desired behavior:

1. The original logout control destroyed the server session without defining local-data or pending-change semantics.
2. The historical sync `delete` operation was confirmed to be a mutation-ledger compatibility no-op rather than product hard delete.
3. Multiple local identities were safely refused but had no explicit offline selection path; Stage 9 adds one.
4. The first remove-from-device implementation revoked the server session before requested IndexedDB cleanup. The order was reversed so privacy-sensitive local cleanup fails before logout rather than after it.
5. Account deletion needed a verify-first, local-cleanup-second, irreversible-server-delete-last sequence to avoid leaving sensitive current-device data behind after an irreversible server deletion.
6. A startup/bootstrap race could replace a newly mutated local workspace with an older server snapshot. Initial local-state gating plus mutation-generation checks now prevent that stale replacement.
7. Project-linked Inbox note conversion was confirmed to be a project-recovery import path rather than the persistent standalone Note resource model; the tombstone contract is scoped accordingly.
8. A lifecycle test initially tried to prove offline hard reload through the development Playwright server. The evidence was split correctly: development proves durable local tombstone/reconnect semantics, while the optimized production/service-worker runtime proves actual offline hard reload.
9. Several early browser failures were test-isolation or locator defects, including shared registration-throttle state and editable Date titles represented as input values. Those were corrected without weakening production rate limiting or product semantics.

## Closure evidence

Closing GitHub Actions run `31798664757` on commit `68b1543e5083e9064fe909101047fa5e57e7f563` passed:

- dependency audit;
- Stage 7 repository/security audit;
- Stage 7 evidence validation;
- Stage 8 deployment preflight and rejection cases;
- Stage 8 operational-log audit;
- Stage 9 lifecycle audit;
- Stage 9 evidence-registry validation;
- Prisma schema validation, client generation, migration deployment, and disposable seed;
- TypeScript typecheck;
- optimized production build;
- optimized production/offline and Stage 7 browser matrix, including production offline tombstone hard reload;
- dedicated Stage 9 lifecycle/tombstone/workspace-gate browser matrix;
- full development Playwright E2E suite; and
- deliberate PostgreSQL database-outage smoke.

No Critical/High Stage 9 lifecycle data-loss or cross-user-exposure finding remains open within the stated product boundary.

## Boundaries retained for Stage 10 or later

Stage 9 does not claim:

- remote erasure of IndexedDB held by another offline device;
- irreversible user-facing per-record purge;
- CRDT/collaborative merge semantics;
- external penetration testing/compliance certification;
- provider-native backup/PITR rehearsal beyond the completed provider-neutral PostgreSQL recovery evidence; or
- Stage 10 final comprehensive local-first acceptance.

Stage 10 must aggregate the accumulated product, offline-runtime, synchronization, lifecycle, security, recovery, operational, and public-claims evidence before the repository strengthens its final local-first completion claim.
