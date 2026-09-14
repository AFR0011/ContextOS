# ContextOS v1 Release Acceptance

**Release date:** 2026-09-14  
**Release program:** Batch 18 — release closure  
**RC version:** `1.0.0-rc.1`  
**RC candidate commit:** pending exact candidate verification  
**RC GitHub Actions run:** pending exact candidate verification  
**Container rehearsal:** pending exact candidate verification  
**RC disposition:** `PENDING_RC`

## Scope

Batch 18 freezes the already accepted product boundary. It adds release versioning, changelog/release evidence, and a conservative release-closure audit. It does not intentionally change authentication, synchronization, persistence, routing, local-first behavior, lifecycle/deletion semantics, schema, data model, or container architecture.

## Required acceptance ladder

The exact RC candidate must pass, without weakening existing gates:

1. `npm audit --audit-level=low`
2. `npm run audit:stage7`
3. `npm run audit:stage7:evidence`
4. production-like `npm run audit:stage8:preflight`
5. `npm run audit:stage8:preflight:test`
6. `npm run audit:stage8:ops`
7. `npm run audit:stage9:lifecycle`
8. `npm run audit:stage9:evidence`
9. `npm run audit:stage10:acceptance`
10. `npm run audit:stage10:claims`
11. `npm run audit:release`
12. `npx prisma validate` and `npx prisma generate`
13. `npm run db:deploy` and disposable demo seed for the development test boundary
14. `npm run test:account-operator`
15. `npm run typecheck`
16. `npm run build`
17. `npm run test:container-distribution`
18. optimized production/offline Playwright matrix
19. Stage 9 lifecycle/tombstone browser matrix
20. full development E2E suite
21. deliberate database-outage smoke

## Production-container rehearsal

The repository-owned fresh-volume acceptance must build the exact production app/operator/migration images, start PostgreSQL, apply committed migrations before app startup, verify health and closed registration, provision the first account through the unexposed operator image, authenticate it, verify an empty production scaffold, and tear down the isolated project/volume. Batch 18 additionally requires persistence across app/database container restart before stable promotion; that evidence will be recorded here after execution.

## Known non-claims

This release does not claim provider-native backup/PITR rehearsal, production RTO/RPO or SLA/on-call guarantees, external monitoring, distributed WAF/rate limiting, penetration testing/compliance certification, collaborative real-time/CRDT editing, self-service email password recovery, remote erasure of another offline device, or irreversible per-record purge without an anti-resurrection protocol.

## Stable promotion

Stable `1.0.0` may be promoted only from a `PASS_RC` candidate. Promotion is release metadata only and must not intentionally change runtime/product semantics. The final stable candidate must rerun at least the release audit, typecheck, and production build; the complete CI ladder remains the preferred and repository-default verification path.
