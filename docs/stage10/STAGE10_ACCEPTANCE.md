# Stage 10 final local-first acceptance

Date: 2026-08-14  
Branch: `feat/local-first-completion-stage10`  
Stage 9 closure head: `5a269097863910dcb03074212e661da62380689e`  
Stage 9 closure-head CI: `31799167361`

## Status

**Open.** Stage 10 is the final evidence aggregation and public-claims stage. The repository must not describe Stage 10 or final local-first acceptance as closed while `audits/stage10-acceptance.json` contains pending controls.

No new product feature is required by default. Stage 10 may add deterministic acceptance coverage or narrow fixes only when the accumulated contract fails under the correct runtime.

## Baseline already inherited

Stage 10 starts from a fully green Stage 9 closure head. The inherited evidence includes:

- Stage 7 repository/security/ownership/origin/cache controls;
- Stage 8 hosted HTTPS preview and reconnect rehearsal;
- Stage 8 same-origin service-worker v3→v4 upgrade with local-state preservation;
- Stage 8 PostgreSQL-native `pg_dump`/`pg_restore` recovery into an isolated non-production database plus authenticated application bootstrap;
- Stage 8 exact Stage 7→8 release-pair rollback evidence with unchanged migration state;
- Stage 8 operational health and sanitized diagnostic controls;
- Stage 9 logout/device lifecycle, multi-user isolation, account deletion, recoverable tombstones, stale-resurrection rejection, and startup stale-snapshot protection.

Historical evidence keeps its original scope. In particular, the Stage 8 recovery and rollback rehearsals do not become claims of provider-native PITR or a production disaster-recovery SLA merely because Stage 10 cites them.

## Stage 10-specific acceptance gaps

The initial audit found two contract requirements that deserved stronger current production-runtime evidence rather than relying on route rendering or historical hosted smoke:

1. **Functional offline Search:** the production matrix already proved `/search` could render offline, but did not type a query and require a result from cached workspace state.
2. **Offline browser history:** the contract requires back/forward navigation across core surfaces. Stage 8 hosted smoke exercised it, but the final repository-owned production matrix should prove it deterministically on the current branch.

`tests/offline-production/stage10-acceptance.spec.ts` adds those checks against the optimized production runtime and the seeded neutral workspace.

## Required final evidence

Before closure this report must record exact evidence for:

- production cold offline reopen and core-route hard refresh;
- functional offline Search and browser back/forward;
- durable local mutation + outbox persistence;
- reconnect synchronization and idempotency;
- stale-write and stale-startup-snapshot handling;
- per-user local isolation and explicit multi-user selection;
- logout/device/account lifecycle semantics;
- production offline tombstone hard reload, reconnect, and restore;
- Stage 7 security controls on the final branch;
- Stage 8 deployment/diagnostic controls on the final branch;
- Prisma migration/build and database-outage behavior;
- exact inherited Stage 8 PWA/recovery/rollback provenance; and
- a public claims audit across README, project state, local-first contract, run protocol, deployment documentation, and SECURITY.

## Boundaries that remain valid even after closure

Stage 10 final acceptance will not claim:

- first-time offline authentication or registration;
- arbitrary API/server functionality while offline;
- collaborative CRDT/merge semantics;
- remote erasure of another device's offline IndexedDB copy;
- irreversible per-record purge without an anti-resurrection generation protocol;
- provider-native PITR rehearsal;
- external penetration testing or compliance certification;
- distributed authentication rate limiting supplied by this repository; or
- production SLA/on-call/disaster-recovery guarantees.

These are product or operational boundaries, not failed acceptance controls.

## Closure record

Pending. This section will be replaced with the exact final verified commit, CI run, acceptance-registry state, public-claims result, and any defects discovered during Stage 10.
