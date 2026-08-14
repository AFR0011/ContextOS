# Stage 8 verification: deployment and operational hardening

Date: 2026-08-14
Branch: `feat/local-first-completion-stage8`
Stage 7 production baseline: `7efe1909b1369fde702342b75009e115218295d3`

## Conclusion

Stage 8 required deployment and operational hardening is complete through Stages 8.0–8.6. The required hosted-preview, PWA/service-worker upgrade, provider-neutral database recovery, release-pair rollback, health/diagnostic, and regression evidence has been produced on non-production infrastructure.

This report closes Stage 8 only. Lifecycle/destructive local-data semantics remain Stage 9 work. The final comprehensive local-first acceptance matrix remains Stage 10 work.

## Stage 8.0: baseline and inventory

Stage 7 was frozen as the production baseline and the Stage 8 deployment inventory/evidence registry was created.

Evidence:

- `docs/stage8/STAGE8_BASELINE.md`
- `audits/stage8-evidence.json`

Result: passed.

## Stage 8.1: deterministic deployment preflight

Stage 8 added deployment preflight checks for the PostgreSQL URL, authentication secret strength, HTTPS canonical origin, closed registration/reset controls, SSO configuration, and separation between build and database migration responsibilities.

Primary verification:

- CI run `31688233623`
- verified code commit `7137130c6bd7846550d0865e04d28f31485e24d2`
- `scripts/deployment-preflight.mjs`
- `scripts/deployment-preflight-tests.mjs`
- `docs/DEPLOYMENT.md`

Result: `DEP-002` and `DEP-003` passed.

## Stage 8.2: hosted HTTPS preview and isolated database

A dedicated Neon branch was created for Stage 8 preview testing:

- Neon project: `ContextOS SocialOS`
- branch: `contextos-stage8-preview`
- branch ID: `br-steep-heart-agxfhkxb`

The Vercel Stage 8 branch preview was proven at runtime to use this dedicated branch rather than production. A preview-only test identity was created on the isolated branch and independently confirmed absent from production.

The hosted browser smoke covered authentication, Dashboard, Projects/project detail, Inbox capture, Dates, Search, offline readiness, offline mutation, hard refresh, offline navigation/back-forward, reconnect/sync, online persistence, and mobile navigation.

The first hosted smoke exposed a real reconnect defect: if the browser failed to emit a useful reconnect event, a pending mutation could remain queued until another edit scheduled synchronization. Stage 8 added a pending-outbox reconnect watchdog that keeps the existing `online` event as the fast path and adds bounded retry/focus/visibility triggers only while pending mutations exist.

The reconnect retest passed without a second edit, and Vercel/Neon evidence independently confirmed the queued mutation was applied.

Primary verification:

- reconnect-fix CI run `31745028396`
- verified reconnect commit `01486d4abede22717dff1c28db1ff54623057c1e`
- `docs/stage8/STAGE8_PREVIEW_TARGET.md`
- `docs/stage8/STAGE8_2_VERIFICATION.md`

Result: `PREVIEW-001` and `PREVIEW-002` passed.

## Stage 8.3: installed PWA/service-worker upgrade

The production offline shell advanced from v3 to v4. The optimized production/offline and general E2E assertions were aligned to the v4 shell.

A real same-origin browser upgrade was rehearsed by assigning a temporary Vercel hostname first to the verified v3 Stage 8.2 deployment, installing/controlling v3 on that origin, and then repointing the same hostname to the verified v4 candidate.

The browser verified:

- v4 became ready on the same origin;
- local workspace state survived;
- the old v3 shell cache was removed after replacement readiness;
- the v4 cache existed; and
- the application hard-restarted and navigated to core workspace data while offline.

Primary verification:

- CI run `31747167570`
- verified candidate `9f28510aab7ce75b383163d7b42ac5a3546f0247`
- `docs/stage8/STAGE8_3_VERIFICATION.md`

Result: `PWA-001` passed.

## Stage 8.4: provider-neutral PostgreSQL backup and restore

A genuinely empty restore database, `stage8_restore_20260814`, was created on the dedicated non-production Neon preview branch. The recovery procedure used PostgreSQL-native `pg_dump`, `pg_restore`, and `psql` through PostgreSQL 18 tooling. Neon branching itself was not substituted for provider-neutral recovery evidence.

The final successful run restored the complete public table set and matched exact row counts against the source before application startup. It then built ContextOS against the restored database, started the production application, authenticated the preview-only identity, and verified authenticated workspace bootstrap.

The rehearsal exposed and corrected two harness defects:

1. table-count verification initially used unqualified quoted table names and was corrected to explicitly use the `public` schema;
2. dependency installation initially omitted `DATABASE_URL` even though Prisma generation runs during postinstall.

Neither defect represented data loss or a failed PostgreSQL restore.

Primary verification:

- restore workflow `31787773777`
- ordinary CI `31787773837`
- verified commit `c84d6e7e3d9afded98454aea669824e32e2cf3e2`
- `STAGE8_DB_RESTORE=PASS`
- `STAGE8_RESTORED_BOOTSTRAP=PASS`
- `docs/stage8/STAGE8_4_VERIFICATION.md`

Result: `DB-RESTORE-001` and `DB-RESTORE-002` passed.

`DB-NATIVE-001` remains `blocked-external` because a provider-native snapshot/PITR rehearsal was explicitly optional and was not substituted for the required PostgreSQL-native procedure.

## Stage 8.5: migration and rollback rehearsal

Git and database inspection established that Stage 8 introduced no Prisma schema or migration-file changes relative to the Stage 7 production release. Both releases share the same eight applied Prisma migrations.

The disposable recovered database was used for an exact release-pair rehearsal:

1. the Stage 7 production application built and passed health/auth/bootstrap;
2. Stage 8 `prisma migrate deploy` ran and reported no pending migrations;
3. migration-name/checksum/applied-state ledgers before and after the deployment step were byte-identical;
4. the Stage 8 application built and passed health/auth/bootstrap; and
5. the exact Stage 7 application was then run again against that same post-deploy database and passed health/auth/bootstrap.

Therefore application-only rollback is demonstrated safe for this specific Stage 7→Stage 8 release pair because database migration state is unchanged. This is not a claim that arbitrary Prisma migrations are reversible.

Primary verification:

- release-pair workflow `31788424132`
- ordinary CI `31788424095`
- verified release-pair trigger commit `9d7372e061cc836faa4c8263b2faecc1e29484dd`
- `STAGE8_MIGRATION_LEDGER_UNCHANGED=PASS`
- `STAGE8_STAGE7_BEFORE_UPGRADE=PASS`
- `STAGE8_STAGE8_AFTER_UPGRADE=PASS`
- `STAGE8_STAGE7_AFTER_ROLLBACK=PASS`
- `STAGE8_APP_ONLY_ROLLBACK=PASS`
- `docs/stage8/STAGE8_5_VERIFICATION.md`

The backup/restore fallback required for a future incompatible release pair was independently demonstrated by Stage 8.4.

Result: `ROLLBACK-001`, `ROLLBACK-002`, and the tested fallback capability recorded by `ROLLBACK-003` passed.

## Stage 8.6: health, diagnostics, and safe operational evidence

Stage 8 retained a minimal dynamic `/api/health` target with database awareness and `Cache-Control: no-store`.

The exact hosted operational candidate was:

- Vercel deployment: `dpl_FVoSRukWkYbJYxRSSAn3VtLUuN5y`
- immutable hostname: `context-nk94a5d2o-ali-farrokhnejads-projects.vercel.app`
- Git commit: `d4bbc860a27d5471d74868e39ebd0ef90c46e27d`
- deployment state: `READY`

The hosted health request returned `200`, `status: ok`, `database: ok`, and version `0.2.8`, with `no-store` and the existing security headers. The public response did not expose database branch, deployment ID, Git SHA, environment values, database host, or credentials. Vercel provider metadata supplies deployment-to-commit correlation privately instead.

Stage 8.6 also found two diagnostic-leak risks and corrected them:

1. API routes logged raw exception objects for unexpected failures. A server-only operational logger now emits only a stable event name plus sanitized error class/coarse whitelisted code metadata, dropping messages, stacks, causes, arbitrary codes, request payloads, and credential-bearing driver material.
2. generated ephemeral auth secrets in the Stage 8 recovery/release workflows were exported without first registering them with GitHub Actions masking. They are now masked before export.

A deterministic operations audit feeds secret-looking data through the sanitizer, checks all relevant API routes for raw-error logging, checks the health boundary, and verifies workflow masking policy.

Primary verification:

- code CI run `31789552012`
- code candidate `d4bbc860a27d5471d74868e39ebd0ef90c46e27d`
- Stage 8.6 evidence-head CI `31789959516`
- evidence head `b01e65b08bcb09b597b2f7a778eaa966d77cfac6`
- `scripts/stage8-operational-log-tests.ts`
- `src/lib/safe-error-metadata.ts`
- `src/lib/operational-log.ts`
- `docs/stage8/STAGE8_6_OPERATIONS.md`
- `docs/stage8/STAGE8_6_VERIFICATION.md`

The sampled exact-deployment runtime log window contained no matching `DATABASE_URL`, auth-secret label, password string, or current Neon credential-prefix material.

A forward-maintenance warning remains documented: the current PostgreSQL client stack warns that `sslmode=require` semantics will change in a future major version. Current behavior is not a present TLS downgrade or connectivity failure. The intended TLS verification semantics must be made explicit before that future dependency-major upgrade.

Result: `OPS-001`, `OPS-002`, and `OPS-003` passed.

## Full regression evidence

Stage 8 repeatedly preserved the Stage 7 verification ladder while adding Stage 8-specific gates. The latest pre-closure evidence-head run is:

- GitHub Actions run `31789959516`
- commit `b01e65b08bcb09b597b2f7a778eaa966d77cfac6`
- conclusion: success

It passed:

- dependency audit;
- Stage 7 repository audit;
- Stage 7 evidence validation;
- Stage 8 deployment preflight;
- Stage 8 preflight rejection tests;
- Stage 8 operational-log audit;
- Prisma validation/generation/deploy/seed;
- TypeScript typecheck;
- production build;
- optimized production/offline browser matrix;
- general Playwright E2E; and
- database-outage smoke.

## Security and scope boundaries retained

Stage 8 does not claim:

- provider-native backup/PITR rehearsal completion;
- an external uptime-monitoring service or SLA/on-call policy;
- distributed tracing/error aggregation;
- a distributed authentication rate limiter;
- external penetration testing or compliance certification;
- removal of all `unsafe-inline` CSP allowances;
- lifecycle/destructive local-data semantics; or
- the final comprehensive local-first acceptance matrix.

The first item remains an optional/external Stage 8 evidence item. Lifecycle/destructive semantics are reserved for Stage 9. Final local-first acceptance is reserved for Stage 10.

## Defects found because Stage 8 was exercised rather than merely documented

Stage 8 produced several concrete corrections during rehearsal:

- reconnect synchronization no longer depends exclusively on a browser `online` event;
- the service-worker version transition was rehearsed on a real same-origin v3→v4 path;
- recovery tooling now validates schema-qualified restored data and configures Prisma during dependency install;
- rollback compatibility is measured against exact Stage 7/Stage 8 application trees rather than assumed from schema history;
- API operational logging no longer emits raw exception objects; and
- generated recovery/release auth secrets are masked in Actions logs.

These findings are part of the Stage 8 result, not exceptions hidden from it.

## Stage 8 closure status

All required Stage 8.0–8.6 evidence items are passed. The only non-passed Stage 8 operational item is the explicitly optional/external `DB-NATIVE-001`. Stage 9 and Stage 10 boundary items remain intentionally outside Stage 8.

`CLOSE-001` is satisfied by the green Stage 8.6 evidence-head regression run `31789959516` on `b01e65b08bcb09b597b2f7a778eaa966d77cfac6`.

`CLOSE-002` is satisfied by the exact hosted preview, PWA upgrade, restore, rollback, operations, and CI evidence consolidated in this report and `audits/stage8-evidence.json`.

Stage 8 deployment and operational hardening is complete, subject only to a final documentation/evidence-head regression run after the closure entries are marked passed.
