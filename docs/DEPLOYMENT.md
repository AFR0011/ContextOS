# ContextOS Deployment

## Current Release Gate

ContextOS remains a **portfolio-stage application**, not a hosted production SaaS offering. Repository-level local-first completion and acceptance are complete through Stage 10 within the documented boundary. Stage 8 produced real non-production deployment/recovery evidence; those rehearsals must not be confused with target-specific production operations.

Current repository evidence:

1. **User isolation:** sync writes, workspace reads, and mutation-ledger identifiers are user-scoped and covered by two-user/ownership controls.
2. **Registration/reset defaults:** public registration and demo reset are closed by default in production.
3. **Bounded synchronization:** total request, mutation count, UTF-8 payload, identifier/key, timestamp, record-ID, and ownership boundaries are enforced.
4. **Authentication throttling:** application-level failed-login/registration throttling exists; provider/WAF distributed protection remains deployment-specific defense in depth.
5. **Production HTTP/PWA boundary:** production CSP/security headers, API no-store behavior, same-origin mutation checks, and service-worker API exclusion are automated.
6. **CI:** disposable PostgreSQL CI runs security/evidence audits, migrations, typecheck, optimized build, production/offline browser tests, lifecycle tests, full E2E, and deliberate DB outage.
7. **Hosted preview:** Stage 8 verified a real HTTPS Vercel preview against a dedicated isolated Neon branch, including authentication, core workflow, offline/reconnect behavior, Search, project recovery, Dates, and mobile behavior.
8. **PWA upgrade:** Stage 8 rehearsed a same-origin shell v3→v4 service-worker upgrade while preserving local workspace state.
9. **Database recovery:** Stage 8 used PostgreSQL-native `pg_dump`/`pg_restore` to restore into a genuinely fresh isolated non-production database and verified authenticated application bootstrap.
10. **Release-pair rollback:** Stage 8 verified application rollback for the exact Stage 7→8 pair because their Prisma migration ledgers were unchanged. This is not a claim that arbitrary migrations are reversible.
11. **Lifecycle/destructive state:** Stage 9 verifies logout/device data choices, account deletion ordering, multi-user local isolation, recoverable tombstones, and stale-resurrection protection.
12. **Final repository acceptance:** Stage 10 verified the accumulated repository boundary at candidate commit `f4ba02699c24210ddd6f4cfaf2b626f7a33b0c40`, CI run `31800346837`, including production offline Search/history, lifecycle regressions, full E2E, and database-outage behavior.

Primary evidence is recorded in `docs/stage8/STAGE8_VERIFICATION.md`, `docs/stage9/STAGE9_VERIFICATION.md`, `docs/stage10/STAGE10_ACCEPTANCE.md`, and `audits/stage10-acceptance.json`.

For a real public production target, independently verify the target environment, provider-native backups/restore capability, exact release migration/rollback plan, provider/WAF abuse controls, monitoring/alert ownership, and operational responsibilities. Non-production rehearsal reduces uncertainty; it does not outsource production judgment to a Markdown file.

## Production Environment

Set these variables in the deployment provider before building:

- `DATABASE_URL`: production PostgreSQL connection string.
- `AUTH_SECRET`: fresh random secret with at least 32 characters; deployment practice should use high entropy rather than merely satisfying the length check.
- `NEXT_PUBLIC_APP_URL` or `APP_URL`: canonical public origin used for metadata and exact browser mutation-origin checks. `VERCEL_URL` is accepted as a platform fallback where documented by the application.
- `ALLOW_PUBLIC_REGISTRATION`: keep unset or `false` unless public account creation is intentionally enabled.
- `ALLOW_DEMO_RESET`: keep unset or `false` unless an explicit disposable-demo reset endpoint is intended.
- `AUTH_RATE_LIMIT_WINDOW_MS`: optional application limiter window override.
- `AUTH_LOGIN_MAX_FAILURES`: optional failed-login limit override.
- `AUTH_REGISTER_MAX_ATTEMPTS`: optional registration limit override.
- `SEED_DEMO_EMAIL` / `SEED_DEMO_PASSWORD`: only for deliberate disposable/demo seeding.
- `CONTEXTOS_SSO_SECRET`: optional ContextOS→SocialOS bridge signing secret; use a distinct high-entropy value of at least 32 characters.
- `SOCIALOS_APP_URL`: exact HTTPS SocialOS origin for that optional bridge.

The SSO bridge is optional and is not part of core ContextOS authentication. If `CONTEXTOS_SSO_SECRET` is absent or shorter than 32 characters, token issuance fails closed. Do not reuse `AUTH_SECRET` as the SSO secret. The exact destination origin must also be configured; the bridge does not accept an arbitrary return host.

Generate a fresh auth secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Treat any credential that appeared in a shared archive, chat, screenshot, or committed file as leaked and rotate it before deployment.

## Deployment Preflight

Before a production-like preview or production promotion, run the Stage 8 preflight with the **actual intended environment values**:

```bash
npm run audit:stage8:preflight
```

It fails closed when:

- `DATABASE_URL` is absent or not PostgreSQL;
- `AUTH_SECRET` is too short;
- the canonical origin is not exact HTTPS or contains path/query/fragment/credentials;
- public registration or demo reset is enabled at the production-like gate;
- an enabled SSO secret is weak/reused or lacks an exact HTTPS SocialOS destination; or
- deployment configuration turns migrations/seeding into build side effects.

Regression rejection cases are exercised with:

```bash
npm run audit:stage8:preflight:test
```

## Local Development

```bash
npm install
docker compose up -d
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

`npm run db:seed` intentionally recreates the starter workspace for the configured demo user. It is not a normal production operation.

## Vercel Deployment Boundary

The checked-in `vercel.json` build command is build-only:

```bash
npm run build
```

It does **not** run migrations or seeding.

Apply committed migrations deliberately:

```bash
npm run db:deploy
```

This avoids multiple builds racing Prisma's PostgreSQL advisory migration lock and keeps schema change as an explicit release operation.

A sensible production promotion sequence is:

1. Select the exact production PostgreSQL target and verify provider backup/restore controls.
2. Configure secrets and canonical origin.
3. Run the production-like preflight against those values.
4. Confirm registration/reset settings and provider/WAF abuse controls.
5. Review migrations since the currently deployed release and document the exact rollback/fallback strategy.
6. Take/verify the provider backup appropriate to the target before destructive/incompatible schema changes.
7. Run `npm run db:deploy` deliberately.
8. Deploy a preview/candidate build against an isolated or safely scoped target where practical.
9. Exercise critical auth/workspace/sync/offline/health flows.
10. Promote the verified build and monitor the target environment.

Stage 8 demonstrates that this class of preview/recovery/rollback rehearsal can be performed. It does not remove the need to repeat target-specific checks for a real production promotion.

## Health Check

ContextOS exposes:

```bash
GET /api/health
```

Expected DB-up response:

```json
{ "status": "ok", "service": "contextos", "database": "ok", "version": "0.2.8" }
```

Expected DB-unavailable response:

```json
{ "status": "unavailable", "service": "contextos", "database": "unavailable", "code": "database_unavailable" }
```

The route returns `Cache-Control: no-store` and does not require authentication. Use it for application/database availability checks; it is not evidence that backups, migrations, or end-user workflows are healthy.

## Recovery Evidence and Boundary

Stage 8 completed a provider-neutral recovery rehearsal using PostgreSQL-native tooling on isolated non-production infrastructure:

- source database dumped with PostgreSQL tooling;
- restored into a genuinely fresh database;
- public-table row counts verified;
- ContextOS built against the restored database; and
- authenticated bootstrap verified.

See `docs/stage8/STAGE8_4_RESTORE_REHEARSAL.md` and `docs/stage8/STAGE8_4_VERIFICATION.md`.

This proves the recorded PostgreSQL-native recovery procedure under the tested conditions. It does **not** prove provider-native point-in-time recovery, production RTO/RPO, backup retention policy, or a disaster-recovery SLA.

## Migration and Rollback Boundary

Stage 8 also rehearsed the exact Stage 7→Stage 8 release pair. No Prisma migration state changed between those releases, so the Stage 7 application could run against the post-Stage-8 database after the upgrade. See `docs/stage8/STAGE8_5_VERIFICATION.md`.

Do not generalize that result to future schema-changing releases. For every release pair with migration changes:

- inspect forward migration compatibility;
- decide whether the older application can safely read/write the post-migration schema;
- record backup/restore fallback for incompatible changes; and
- never label application rollback as database rollback unless both are actually demonstrated.

For providers that do not run the Vercel build command, the production-style sequence remains:

```bash
npm run db:deploy
npm run build
```

Use `db:migrate` only for local migration development.

If Prisma reports `P1002` while acquiring advisory lock `72707369`, cancel duplicate migration jobs and resolve the genuinely stuck database session if necessary. Do not disable advisory locking merely to make the error disappear.

## Intentional Production Seeding

Production seeding should be exceptional and deliberate:

1. Back up and verify the target database.
2. Confirm the target is disposable or does not contain user data that must be preserved.
3. Set explicit seed credentials.
4. Run `npm run db:seed` from a controlled shell.
5. Remove/rotate demo credentials if they should not remain usable.

Never put `npm run db:seed` in the normal production build/deploy command.

## Known Operational Boundaries

The repository does not itself supply or demonstrate:

- provider-native PITR rehearsal;
- production RTO/RPO guarantees;
- external uptime/SLA/on-call ownership;
- distributed tracing/error aggregation;
- provider/WAF distributed rate limiting;
- external penetration testing/compliance certification; or
- a general proof that future schema migrations are rollback-safe.

Those are target-environment responsibilities or future evidence, not hidden assumptions behind the portfolio-stage claim. Stage 10 acceptance does not relax them.
