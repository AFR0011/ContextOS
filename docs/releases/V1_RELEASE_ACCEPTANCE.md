# ContextOS v1 Release Acceptance

**Release date:** 2026-09-14  
**Release program:** Batch 18 — release closure  
**RC version:** `1.0.0-rc.1`  
**RC candidate commit:** `175c2899e66c20784123d5ecaa56403fa256b29e`  
**RC GitHub Actions run:** `34864658835` — https://github.com/AFR0011/ContextOS/actions/runs/34864658835  
**RC container rehearsal:** `PASS` — fresh-volume startup, closed registration, operator first-account provisioning, empty production bootstrap, and representative synchronized workspace data surviving app/database restart with the named PostgreSQL volume preserved.  
**RC disposition:** `PASS_RC`

**Stable version:** `1.0.0`  
**Stable candidate commit:** `4b66d6c840cc4b526d4315a0b438d8b3eeed08a1`  
**Stable GitHub Actions run:** `34865680146` — https://github.com/AFR0011/ContextOS/actions/runs/34865680146  
**Stable disposition:** `PASS_V1`

## Scope

Batch 18 freezes the already accepted product boundary. It adds release versioning, changelog/release evidence, a conservative release-closure audit, and restart-persistence coverage in the existing container-distribution acceptance path. It does not intentionally change authentication, synchronization, persistence, routing, local-first behavior, lifecycle/deletion semantics, schema, data model, or container architecture.

Stable promotion from the accepted RC is release metadata only: `1.0.0-rc.1` becomes `1.0.0`, the changelog/current-version documentation is updated, and no product/runtime feature is added.

## RC acceptance result

The exact RC candidate `175c2899e66c20784123d5ecaa56403fa256b29e` passed the complete committed CI ladder in run `34864658835`:

1. `npm audit --audit-level=low` — PASS, zero vulnerabilities reported.
2. `npm run audit:stage7` — PASS.
3. `npm run audit:stage7:evidence` — PASS, 60/60 controls mapped.
4. production-like `npm run audit:stage8:preflight` — PASS.
5. `npm run audit:stage8:preflight:test` — PASS, 9/9 rejection cases.
6. `npm run audit:stage8:ops` — PASS.
7. `npm run audit:stage9:lifecycle` — PASS, 18/18 controls.
8. `npm run audit:stage9:evidence` — PASS.
9. `npm run audit:stage10:acceptance` — PASS, no pending acceptance items.
10. `npm run audit:stage10:claims` — PASS.
11. `npm run audit:release` — PASS.
12. `npx prisma validate` and `npx prisma generate` — PASS.
13. `npm run db:deploy` and disposable development-test seed — PASS.
14. `npm run test:account-operator` — PASS.
15. `npm run typecheck` — PASS.
16. `npm run build` — PASS.
17. `npm run test:container-distribution` — PASS, including `CONTEXTOS_CONTAINER_RESTART_PERSISTENCE=PASS`.
18. optimized production/offline Playwright matrix — PASS.
19. Stage 9 lifecycle/tombstone browser matrix — PASS.
20. full development E2E suite — PASS.
21. deliberate database-outage smoke — PASS.

## Stable acceptance result

The exact stable candidate `4b66d6c840cc4b526d4315a0b438d8b3eeed08a1` passed the same committed verification ladder in GitHub Actions run `34865680146`. Dependency audit, Stage 7–10 assurance checks, release closure audit, Prisma validation/generation and committed migrations, operator account regression, TypeScript, optimized production build, production container distribution/restart persistence, production/offline browser coverage, lifecycle browser coverage, full E2E, and deliberate database-outage smoke all completed successfully.

The stable promotion contains no intended runtime/product change beyond release metadata from the accepted RC. This acceptance-record update is evidence-only and does not alter application runtime, schema, persistence, synchronization, lifecycle semantics, or container architecture.

## Production-container rehearsal

The repository-owned container acceptance builds the exact production app/operator/migration images against an isolated fresh PostgreSQL volume. It verifies committed migrations before app startup, health, non-root/runtime separation, closed public registration, operator first-account creation, authentication, and the empty production scaffold. Batch 18 then creates representative synchronized workspace data, restarts the application and database containers without deleting the named PostgreSQL volume, and verifies the account, representative data, and health survive the restart. The disposable project and volume are explicitly removed afterward.

This proves the repository-owned deployment/restart contract only. It is not provider-native backup/PITR, RTO/RPO, SLA, external-monitoring, or disaster-recovery evidence.

## Known non-claims

This release does not claim provider-native backup/PITR rehearsal, production RTO/RPO or SLA/on-call guarantees, external monitoring, distributed WAF/rate limiting, penetration testing/compliance certification, collaborative real-time/CRDT editing, self-service email password recovery, remote erasure of another offline device, or irreversible per-record purge without an anti-resurrection protocol.

## Final disposition

`PASS_V1`

The release candidate to tag as `v1.0.0` is `4b66d6c840cc4b526d4315a0b438d8b3eeed08a1`. The subsequent acceptance-record commit exists only to persist the completed verification evidence in repository history; it is not a different application candidate.
