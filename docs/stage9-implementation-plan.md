# Stage 9 — Lifecycle and destructive-data semantics

Stage 9 starts from the closed Stage 8 deployment/operations branch. Its purpose is to make user, device, logout, deletion, trash, and purge behavior explicit and testable before Stage 10 final local-first acceptance.

Stage 9 must not silently redefine synchronization or security behavior merely to make lifecycle tests pass. Destructive actions require an explicit user-visible policy and evidence that offline/local state cannot unexpectedly resurrect or leak records.

## Locked product policy

1. **Normal logout preserves this user's isolated local workspace by default.** Logging out terminates the server session but does not erase the verified user's local workspace or outbox.
2. **Local-device removal is explicit.** Logout exposes a separate "Remove data from this device" path that deletes this user's local workspace, outbox, and remembered local identity on the current browser only.
3. **Pending changes are never silently discarded.** When unsynced mutations exist, logout offers explicit handling instead of pretending logout is unrelated to local durability.
4. **Multiple local users remain isolated.** A cached workspace is always keyed by verified user identity. When multiple verified identities exist and remote identity cannot be established, ContextOS must not guess which workspace to open.
5. **Account deletion is destructive and confirmed.** Deleting an account removes the authenticated user's server-side account and all user-owned rows via existing database cascades, invalidates sessions, and removes the current device's local copy. Other offline devices cannot be remotely erased and must be documented as such.
6. **Ordinary record deletion remains recoverable first.** Projects, tasks, notes, and dates use their existing `trashedAt` tombstone fields. Inbox captures use their existing deleted status. A deleted record must synchronize as a state change before any irreversible purge.
7. **No immediate cross-device hard-delete protocol is introduced.** The legacy sync `delete` operation remains compatibility-only until a purge mechanism can prove that an old offline client cannot resurrect a purged record.
8. **Purge is a separate irreversible action.** Stage 9 may expose deterministic purge tooling only after tombstone age, ownership, relationship, and offline-resurrection behavior are specified and tested.

## Stage 9.0 — Baseline and lifecycle inventory

### Work

- Freeze the exact Stage 8 parent commit.
- Inventory logout, login/workspace-gate, IndexedDB stores, sync outbox, trash/archive UI, account/session schema, and legacy delete mutation behavior.
- Record the current user-facing record types that already carry recoverable tombstones.
- Create a machine-readable Stage 9 evidence checklist before closure.

### Acceptance

- No lifecycle behavior is inferred from implementation accidents.
- The distinction between server session, remembered local identity, local workspace, and local outbox is explicit.
- Stage 8 remains the immutable operational baseline.

## Stage 9.1 — Logout and current-device data handling

### Work

Implement explicit logout choices:

- **Keep local data and log out** — default path. Destroy the server session; preserve this user's local identity/workspace/outbox.
- **Sync and log out** — available when online and pending changes exist. Synchronize successfully before destroying the session.
- **Remove data from this device and log out** — destroy the server session, then remove this user's local identity/workspace/outbox from IndexedDB.
- **Discard unsynced local changes** — never silently clears only the outbox while leaving a mutated cached workspace. The discard path must remove the local workspace/outbox together so the next authenticated load reconstructs from server state.

Failure rules:

- a failed requested sync must not continue into logout as though synchronization succeeded;
- a failed local-data removal must be surfaced;
- logout must remain usable if the database is unavailable, preserving Stage 7 session-cookie failure behavior;
- no other user's IndexedDB state may be removed.

### Acceptance

- Default logout preserves local data.
- Pending work cannot be silently lost.
- Current-device removal is scoped to exactly one user.
- E2E coverage verifies retained, synchronized, and removed-local-data paths.

## Stage 9.2 — Multi-user device lifecycle

### Work

- Preserve per-user IndexedDB workspace/outbox isolation.
- Verify login as user B never renders cached user A data.
- Verify logout of user A does not remove B's local records.
- Preserve explicit ambiguity handling when more than one local identity exists and remote identity is unavailable.
- Add a device-data view or equivalent diagnostic helper if needed so a user can remove a remembered local identity intentionally.

### Acceptance

- No cross-user cached-data exposure.
- No guessed offline identity.
- Per-user local removal is deterministic.

## Stage 9.3 — Account deletion

### Work

- Add an authenticated same-origin account-deletion API.
- Require current-password verification and explicit destructive confirmation at the UI boundary.
- Delete the current `User` row transactionally and rely on the verified `onDelete: Cascade` relations for sessions and all user-owned persistence.
- Clear the current session cookie even if the deleted session row disappears through the cascade.
- After successful server deletion, remove the current browser's local identity/workspace/outbox.
- Document that other offline devices cannot be remotely scrubbed; if they later reconnect with a deleted account, authentication fails and their stale local workspace must not be silently rebound to a new account.

### Acceptance

- Wrong password and malformed requests cannot delete an account.
- A successful deletion removes all server-owned rows for the authenticated user.
- The current device no longer retains that user's local workspace.
- Another user's data is unaffected.

## Stage 9.4 — Recoverable record deletion contract

### Work

- Formalize `trashedAt` as the synchronized tombstone for projects, tasks, notes, and dates.
- Keep capture deletion represented by the synchronized `status = "deleted"` state unless a schema migration is justified by a demonstrated requirement.
- Ensure ordinary views/search exclude trashed/deleted records while Archive/Trash can restore them.
- Verify a tombstone created offline survives reload, synchronizes, remains hidden on another client after refresh, and can be restored.
- Verify stale pre-delete updates cannot silently resurrect a newer tombstone.
- Add deterministic tests for project/task/note/date deletion and restore.

### Acceptance

- "Delete" means recoverable tombstone, not immediate physical deletion.
- Tombstone state synchronizes across clients.
- Offline edits cannot trivially resurrect a newer deletion.

## Stage 9.5 — Purge and legacy delete-operation boundary

### Work

- Audit every current producer of sync `operation: "delete"`.
- Keep the legacy operation compatibility-only unless a complete anti-resurrection purge protocol is implemented.
- If purge is implemented, define a retention period and a server-side purge rule that proves ownership and tombstone age before physical deletion.
- Do not allow an old offline upsert to recreate a purged identifier without an explicit generation/version rule.
- If that guarantee is not implemented in Stage 9, leave irreversible per-record purge outside the user-facing product and document the boundary rather than faking completeness.

### Acceptance

- No user-facing action is mislabeled as permanent deletion when it is only a no-op ledger entry.
- No irreversible purge claim exists without anti-resurrection evidence.

## Stage 9.6 — Documentation, security, and regression matrix

### Work

- Update `docs/LOCAL_FIRST_CONTRACT.md`, `docs/PROJECT_STATE.md`, and `SECURITY.md` where lifecycle boundaries materially change.
- Add Stage 9 static/evidence checks for lifecycle-sensitive routes and IndexedDB removal scope.
- Run the complete Stage 8/Stage 7 regression ladder unchanged where applicable.
- Add production/offline browser coverage for logout retention, current-device removal, multi-user isolation, account deletion, tombstone sync, restore, and deleted-account reconnect behavior.

### Acceptance

- Existing auth, sync, ownership, local-first, deployment, backup/restore, rollback, and PWA evidence remains green.
- Stage 9-specific lifecycle evidence is reproducible.
- No Critical/High lifecycle data-loss or cross-user exposure finding remains open.

## Stage 9.7 — Closure

Stage 9 closes only when:

- logout defaults to preserving isolated local data;
- pending mutations have explicit non-lossy handling;
- current-device removal is user-scoped and tested;
- multi-user local isolation is verified;
- account deletion is authenticated, confirmed, server-complete, and current-device-complete;
- ordinary record deletion is a synchronized recoverable tombstone;
- legacy hard-delete semantics are either safely implemented with anti-resurrection evidence or explicitly kept out of the user-facing product;
- all Stage 9 evidence is recorded against exact commits/CI runs; and
- Stage 10 final local-first acceptance remains open.
