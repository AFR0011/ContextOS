# Stage 8 — Deployment and operational hardening

Stage 8 starts only after Stage 7 closes the repository/portfolio assurance scope with zero open Critical/High findings and a green closing CI run. Stage 8 does not redefine local-first product semantics. Its purpose is to prove that the verified application can be deployed, observed, upgraded, backed up, restored, and rolled back in production-like conditions without turning operational assumptions into undocumented folklore.

Stage 8 remains distinct from:

- **Stage 9:** lifecycle and destructive-data semantics, including logout/local-data removal, pending-change handling, multi-user switching, account deletion, and hard-delete recovery behavior;
- **Stage 10:** final local-first acceptance and the evidence required to strengthen the public local-first claim.

## Goal

Produce reproducible deployment evidence for ContextOS on a production-like hosted preview and for its PostgreSQL persistence layer. At the end of Stage 8, a maintainer should be able to answer, with evidence rather than optimism:

1. Can a clean hosted preview deploy from the repository with production-safe defaults?
2. Can the critical authenticated/local-first workflow survive real HTTPS, service-worker, browser-restart, and reconnect conditions?
3. Can the application detect and surface an unhealthy database without leaking diagnostics?
4. Can the database be backed up and restored into a clean target while preserving user-owned data and sync-ledger integrity?
5. Can a compatible previous application/database pair be restored after a failed release?
6. Can an installed PWA upgrade from the previous shell version without becoming stranded on stale assets?
7. Is there enough operational evidence to diagnose a failed deploy without claiming enterprise observability that does not exist?

## Stage rules

1. **No production database is used for destructive rehearsal.** Backup/restore and rollback drills run against disposable or explicitly designated preview/staging databases unless the user explicitly authorizes a real production target.
2. **No seeding during normal deploy.** `npm run db:seed` remains an explicit local/disposable-preview action, never part of the Vercel build command.
3. **Database migration and application rollout are separate operations.** A successful application rollback must never be described as a database rollback.
4. **Evidence before claims.** Hosted checks, restore logs, migration logs, PWA-upgrade results, and rollback results are recorded under `docs/stage8/` or machine-readable `audits/stage8-*` artifacts.
5. **Do not weaken Stage 7 controls to make deployment pass.** A deployment failure caused by a security boundary is fixed at the deployment/configuration layer unless the intended product behavior is demonstrably wrong.
6. **Provider-specific destructive actions require explicit target confirmation.** Repository-only preparation can proceed without that confirmation.

## Stage 8.0 — Baseline and target inventory

### Work

1. Record the exact Stage 7 parent commit and CI closure evidence.
2. Inventory deployment-relevant files and switches:
   - `vercel.json`;
   - `.env.example`;
   - `docs/DEPLOYMENT.md`;
   - Prisma schema and committed migrations;
   - `/api/health`;
   - service worker and manifest;
   - production Playwright configuration;
   - CI workflow.
3. Record which items require external provider access rather than repository-only work.
4. Create a Stage 8 evidence checklist so later verification cannot be declared complete by prose alone.

### Acceptance

- Stage 8 scope and external dependencies are explicit.
- No deployment or database target is guessed.
- Stage 7 remains the immutable baseline for comparison.

## Stage 8.1 — Deployment configuration and release-command hardening

### Work

1. Verify the Vercel build remains `npm run build` only.
2. Define an explicit migration command/procedure using `npm run db:deploy` before promotion.
3. Add a deterministic deployment-preflight script that validates:
   - required production environment keys are present;
   - `AUTH_SECRET` meets the Stage 7 strength requirement;
   - canonical app origin is HTTPS in production-like mode;
   - public registration/demo reset remain disabled unless deliberately enabled;
   - optional SSO configuration fails closed when incomplete;
   - seed credentials are not required for normal production deploy.
4. Add the preflight to CI using safe CI values.
5. Keep provider secrets out of repository output and logs.

### Acceptance

- A deployment can fail before build/promotion for unsafe configuration rather than discovering it after traffic reaches the application.
- Build and migration responsibilities remain separate and documented.
- Stage 7 security defaults remain unchanged.

## Stage 8.2 — Production-like hosted preview smoke

### Work

1. Deploy the Stage 8 branch to a HTTPS preview environment with a dedicated preview database.
2. Run a hosted smoke suite against the preview origin covering:
   - health endpoint;
   - login/session cookie behavior;
   - Dashboard load;
   - capture creation and Inbox visibility;
   - project recovery/navigation;
   - Dates and Search;
   - offline transition and queued local mutation;
   - reconnect and synchronization drain;
   - hard refresh on a core route;
   - dynamic project route;
   - mobile viewport navigation;
   - production security/no-store headers.
3. Record preview URL, deployment identifier/commit, database role (preview only), and test result without recording secrets.

### Acceptance

- The same commit that is being evaluated is identifiable from the evidence.
- Critical hosted workflows pass under real HTTPS/service-worker conditions.
- Preview failures are reproducible locally or explained as provider/configuration failures before closure.

## Stage 8.3 — Installed-PWA and service-worker upgrade rehearsal

### Work

1. Establish an older verified shell/application version as the upgrade source.
2. Install or emulate the PWA under that older version and create local cached workspace state plus at least one pending local mutation.
3. Deploy the Stage 8 version with a newer shell/cache version.
4. Verify:
   - the old application remains usable until the replacement shell is complete;
   - activation does not delete the only usable shell before replacement readiness;
   - cached workspace data survives the upgrade;
   - pending mutations survive and later synchronize;
   - an offline restart after upgrade opens the new shell;
   - obsolete shell caches are removed only after replacement readiness.
5. Add automation where browser tooling can make this deterministic; retain a documented manual hosted check for any installation behavior the test runner cannot faithfully emulate.

### Acceptance

- No stranded installed client after upgrade.
- No local workspace/outbox loss across service-worker replacement.
- Cache cleanup remains readiness-gated.

## Stage 8.4 — Backup and restore rehearsal

### Work

1. Add provider-neutral PostgreSQL backup/restore runbook instructions using native PostgreSQL tooling where available (`pg_dump` / `pg_restore`) and document provider-native snapshot alternatives separately.
2. Create a disposable source database from committed migrations and deterministic verification fixtures.
3. Generate a backup artifact from that source.
4. Restore the backup into a fresh empty target database.
5. Validate restored invariants:
   - schema/migration state is usable by the current application;
   - user counts and user-owned record counts match the source;
   - representative relationships resolve;
   - sync mutation ledger records remain scoped and replay-safe;
   - authentication/session rows are treated according to the documented restore policy;
   - application health and authenticated bootstrap succeed against the restored target.
6. Add a CI-safe restore rehearsal if tooling/runtime cost is reasonable; otherwise provide a deterministic local script and a recorded Stage 8 run.

### Acceptance

- A backup has actually been restored into a fresh database, not merely created.
- Restored data is checked at the application boundary as well as by row counts.
- The procedure names what is and is not preserved.

## Stage 8.5 — Migration and rollback rehearsal

### Work

1. Define a release pair as `(application commit, database migration state)`.
2. Rehearse an upgrade from the Stage 7-compatible database/application pair to Stage 8 against disposable infrastructure.
3. Verify migrations are forward-applicable with `npm run db:deploy`.
4. Rehearse application rollback while the database remains at the upgraded schema and document whether the previous application remains compatible.
5. Where previous application compatibility is not guaranteed, restore the pre-upgrade database backup into a fresh rollback target and verify the previous application against that restored target.
6. Record the exact compatibility result. Never claim reversible Prisma migrations unless an actual reverse migration/restore mechanism exists.

### Acceptance

- A maintainer knows whether app-only rollback is safe for this release pair.
- When it is not safe, a tested backup-restore rollback path exists.
- Migration failure and rollback procedures are explicit and time-ordered.

## Stage 8.6 — Health, diagnostics, and minimal operational monitoring

### Work

1. Preserve `/api/health` as minimal, public, and `no-store`.
2. Add or verify deployment metadata that helps correlate a running preview with a build without exposing secrets. Prefer provider deployment metadata or a non-sensitive build identifier rather than expanding the health endpoint unnecessarily.
3. Document an uptime-monitor target and expected status behavior.
4. Define what diagnostic evidence should be captured for:
   - failed deployment;
   - migration failure;
   - database unavailability;
   - repeated sync errors;
   - service-worker/PWA upgrade failure.
5. Verify logs/errors do not include connection strings, password material, session bearers, auth-secret material, or raw database diagnostics.
6. Do not claim centralized tracing, SLOs, pager escalation, or enterprise monitoring unless actually added and demonstrated.

### Acceptance

- Basic deployment/database availability can be monitored.
- A failed preview/deploy can be correlated to a commit/deployment without adding sensitive diagnostics.
- Documentation distinguishes application health from backup integrity and business-level correctness.

## Stage 8.7 — Closure matrix and documentation

### Work

1. Run the entire existing Stage 7 verification ladder unchanged.
2. Run Stage 8 preflight and repository checks.
3. Run hosted preview smoke against the exact candidate deployment.
4. Run PWA upgrade rehearsal.
5. Run backup/restore rehearsal.
6. Run migration/rollback rehearsal.
7. Update:
   - `docs/DEPLOYMENT.md`;
   - `docs/PROJECT_STATE.md`;
   - `SECURITY.md` only where operational boundaries materially changed;
   - `docs/stage8/STAGE8_VERIFICATION.md` with exact evidence.
8. Record remaining provider/manual boundaries without promoting them to completed claims.

### Closure criteria

Stage 8 closes only when all of the following are true:

- Stage 7 static, Prisma, TypeScript, build, production-browser, development-browser, and DB-outage gates remain green;
- deployment preflight is executable and green under safe production-like values;
- a HTTPS hosted preview of the candidate commit passes the critical smoke matrix;
- installed-PWA/service-worker upgrade behavior has been rehearsed with local workspace/outbox preservation;
- a PostgreSQL backup has been restored into a clean target and verified through application-level checks;
- release-pair migration and rollback behavior has been rehearsed and documented;
- health/diagnostic behavior remains minimal, non-secret, and operationally useful;
- normal deploy does not seed data;
- no production target was destructively modified as part of verification;
- exact deployment/test/restore evidence is recorded;
- no Stage 9 lifecycle semantics were silently invented;
- Stage 10 final local-first acceptance remains explicitly open.

## Expected artifacts

Repository artifacts may include:

- `docs/stage8-implementation-plan.md` — this plan;
- `scripts/deployment-preflight.mjs` — deterministic deployment configuration checks;
- `scripts/stage8-db-backup-restore.*` or equivalent — provider-neutral disposable restore rehearsal;
- `scripts/stage8-release-rehearsal.*` — release-pair migration/rollback orchestration where practical;
- `tests/hosted-preview/*` — hosted smoke coverage that can target an externally supplied base URL;
- `tests/offline-production/*` additions — deterministic service-worker upgrade coverage where feasible;
- `audits/stage8-evidence.json` — machine-readable evidence map;
- `docs/stage8/STAGE8_VERIFICATION.md` — closing report with exact commit, preview deployment, CI, backup/restore, and rollback results.

The exact file split may change only if repository structure makes another location materially clearer; such a deviation must be documented before implementation.

## Clarifications required before external/destructive work

Repository-only preparation and disposable local/CI database rehearsal can proceed without external confirmation. Before Stage 8.2 or any provider-native backup/restore action, confirm:

1. the hosted preview provider/project to use (the repository currently points toward Vercel);
2. the PostgreSQL provider for the preview/staging database;
3. whether a dedicated non-production database already exists or should be created;
4. whether provider-native snapshots/backups should be tested in addition to the provider-neutral `pg_dump`/`pg_restore` rehearsal.
