# Stage 10 — Final local-first acceptance and public claims

Stage 10 starts from the closed Stage 9 lifecycle branch at `5a269097863910dcb03074212e661da62380689e`. Its purpose is not to invent another product layer. It aggregates and re-exercises the accumulated local-first, synchronization, security, lifecycle, recovery, operational, and documentation guarantees so the repository can make a final evidence-backed statement about what ContextOS does.

The Stage 9 verified code/test baseline is `68b1543e5083e9064fe909101047fa5e57e7f563` with closing CI run `31798664757`; the Stage 9 documentation/evidence closure head is `5a269097863910dcb03074212e661da62380689e` with closure-head CI run `31799167361`.

## Rules

1. **Acceptance follows evidence.** Stage 10 does not mark a behavior complete because an earlier stage intended it or because a code path looks plausible.
2. **No new product semantics without a demonstrated defect.** Stage 10 may add tests, deterministic audits, documentation, and narrowly scoped fixes exposed by those tests. Feature invention is out of scope.
3. **Use the correct runtime.** Service-worker, cold-open, hard-refresh, PWA, and offline-history claims are verified against an optimized production build, not a development server.
4. **Historical evidence stays scoped.** Stage 8 hosted preview, PWA-upgrade, backup/restore, and rollback rehearsals may be inherited where the underlying architecture is unchanged, but Stage 10 must not silently upgrade non-production evidence into a production-service claim.
5. **Boundaries are evidence too.** Unsupported CRDT collaboration, remote erasure of other offline devices, irreversible per-record purge, provider-native PITR, external penetration testing, distributed rate limiting, and SLA/on-call claims remain explicit boundaries.
6. **Public prose is part of acceptance.** README, project-state, local-first contract, security, deployment, and run-protocol language must match the evidence. A passing application with stale or inflated documentation is not a closed Stage 10.

## Stage 10.0 — Freeze the accumulated baseline

### Work

- Record the exact Stage 9 closure head and CI run.
- Confirm Stage 7 security evidence, Stage 8 operational/recovery evidence, and Stage 9 lifecycle evidence remain present and machine-readable.
- Create a Stage 10 acceptance registry before closing any final claim.

### Acceptance

- Stage 10 starts from one exact, fully green Stage 9 head.
- No earlier evidence is rewritten or generalized beyond its tested scope.

## Stage 10.1 — Production offline functional acceptance

### Work

Re-exercise the local-first contract against the optimized production runtime:

- previously authenticated cold reopen while offline;
- core route navigation and hard refresh for Dashboard, Inbox, Projects, Dates, Areas, Resources, Search, Archive, Reviews, and Settings;
- dynamic project route cold open/hard refresh;
- browser back/forward navigation while offline;
- actual local Search query returning a cached workspace result while offline;
- durable offline mutation plus visible pending state across hard reload;
- production offline tombstone hard reload and Archive/Trash reconstruction;
- API traffic remains network-only and absent from shell caches.

### Acceptance

- Offline usability is demonstrated functionally, not merely by route headings.
- Production service-worker behavior owns offline reload evidence.

## Stage 10.2 — Local durability, synchronization, and conflict acceptance

### Work

Aggregate and rerun evidence for:

- atomic IndexedDB workspace+outbox commits;
- per-user IndexedDB isolation;
- queued mutations surviving reload before acknowledgement;
- reconnect synchronization without requiring a second edit;
- mutation idempotency and per-user mutation-ID scope;
- stale-update warnings and stale tombstone resurrection rejection;
- startup/refresh stale-snapshot rejection after a newer local mutation;
- failure paths that preserve pending work instead of silently replacing it.

### Acceptance

- No tested local mutation is silently lost across the supported offline/reconnect path.
- Older server or client state does not silently replace a newer supported local state.

## Stage 10.3 — Identity, lifecycle, and destructive-data acceptance

### Work

Rerun Stage 9 lifecycle evidence for:

- default logout local retention;
- explicit pending-work handling;
- user-scoped remove-from-device behavior;
- explicit multi-user offline identity selection;
- authenticated/password-confirmed account deletion ordering;
- account cascade deletion and failed reauthentication;
- synchronized recoverable tombstones and restore;
- legacy hard-delete compatibility boundary.

### Acceptance

- No cross-user local exposure is demonstrated.
- Destructive operations match the documented lifecycle policy.
- Unsupported irreversible record purge is not misrepresented as implemented.

## Stage 10.4 — Security, deployment, recovery, and failure acceptance

### Work

- Rerun Stage 7 repository/security/evidence controls.
- Rerun Stage 8 deterministic deployment preflight and sanitized operational-log audit.
- Rerun Prisma validation, migration deployment, build, and database-outage smoke.
- Inherit the exact Stage 8 hosted HTTPS preview, same-origin PWA upgrade, PostgreSQL-native backup/restore, and Stage 7→8 release-pair rollback evidence with its original non-production scope.
- Confirm Stage 9 introduced no database migration that invalidates the recorded Stage 8 release-pair statement.

### Acceptance

- Current branch remains green under repository security and failure controls.
- Recovery/rollback claims cite the exact evidence that actually exists.
- No production SLA, provider-native PITR, or external security-certification claim is introduced.

## Stage 10.5 — Public claims audit

### Work

Audit and synchronize:

- `README.md`;
- `docs/PROJECT_STATE.md`;
- `docs/LOCAL_FIRST_CONTRACT.md`;
- `docs/RUN_PROTOCOL.md`;
- `docs/DEPLOYMENT.md`;
- `SECURITY.md`.

Remove stale statements that say completed Stage 8 or Stage 9 work is still deferred. Add the final acceptance evidence without claiming hosted production SaaS maturity, compliance certification, arbitrary offline server functionality, collaborative conflict resolution, irreversible record purge, or provider-native disaster recovery that has not been demonstrated.

### Acceptance

- Public documentation distinguishes implemented behavior, tested environment, inherited historical evidence, and remaining boundaries.
- No Stage 10 completion language appears while the acceptance registry still contains pending controls.

## Stage 10.6 — Final closure

Stage 10 closes only when:

- the exact accumulated branch passes the complete CI ladder;
- the optimized production runtime passes the final offline acceptance matrix, including functional Search and browser history;
- local durability, sync, stale-state, lifecycle, tombstone, security, build, and outage evidence remain green;
- inherited Stage 8 hosted/recovery/rollback evidence is explicitly scoped rather than generalized;
- all Stage 10 acceptance entries are `passed`, `inherited-passed`, or `documented-boundary` with no `pending` entry;
- public claims match the evidence; and
- the final verification report records exact commits and CI runs.

A closed Stage 10 supports the statement that **ContextOS is an evidence-backed portfolio-stage local-first workspace for the documented core surfaces after prior successful authentication on a device, with durable local mutations and server synchronization when connectivity returns**. It does not convert ContextOS into a production SaaS, collaborative CRDT system, compliance-certified product, or magical distributed system immune to every failure humans have managed to invent.
