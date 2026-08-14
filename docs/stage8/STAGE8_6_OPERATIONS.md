# Stage 8.6 operations runbook

Date: 2026-08-14

## Purpose and scope

This runbook defines the minimum operational signals and failure-handling procedure for ContextOS after Stage 8 deployment hardening. It is intentionally narrow. ContextOS has a health target, provider runtime/build logs, deterministic CI checks, backup/restore evidence, and release-pair rollback evidence. It does not currently have an external uptime service, pager/on-call rotation, distributed tracing, centralized error aggregation, or an uptime/SLA commitment.

## Health target

Use `GET /api/health` as the monitoring target.

Healthy response:

- HTTP `200`
- body reports `status: ok`, `service: contextos`, `database: ok`, and the application package version
- `Cache-Control: no-store`
- dynamic response, not a cached success page

Database-unavailable response:

- HTTP `503`
- generic database-unavailable status/code
- no connection string, database password, host credentials, query text, stack, or raw driver diagnostic in the HTTP body

Unexpected health failure:

- HTTP `500`
- generic client-facing failure text
- provider log contains only a stable operational event plus sanitized error metadata

A simple external monitor can treat a timeout or any non-200 response as unhealthy and alert after a chosen number of consecutive failures. Stage 8 does not configure or claim a particular external monitoring vendor, interval, SLO, SLA, or on-call policy.

## Deployment and build correlation

Do not expand the public health response with Git commit, database branch, provider project, or deployment identifiers solely for correlation.

For Vercel previews, correlate a running deployment through provider metadata:

1. identify the deployment ID and immutable deployment URL;
2. read its Git commit SHA and branch from Vercel deployment metadata;
3. use the immutable deployment ID when inspecting runtime/build logs;
4. use the moving branch alias only as the human-friendly preview entry point.

Stage 8.6 verification used deployment `dpl_FVoSRukWkYbJYxRSSAn3VtLUuN5y`, immutable URL `context-nk94a5d2o-ali-farrokhnejads-projects.vercel.app`, mapped by Vercel to commit `d4bbc860a27d5471d74868e39ebd0ef90c46e27d` on `feat/local-first-completion-stage8`.

The preview-only database branch identity may be logged internally for Stage 8 verification. It must not be returned in the public health body.

## Safe operational logging policy

Application API routes use `logOperationalError()` for unexpected server-side failures. The logger records only:

- a stable, bounded event name;
- whether the value was an Error;
- a safe error class name when available; and
- a whitelisted coarse error code when available, such as a Prisma `P####` code, a five-character PostgreSQL SQLSTATE, or one of the explicitly allowed network codes.

The logger must not emit:

- exception messages or stacks;
- nested causes or raw driver objects;
- database connection strings or database passwords;
- `DATABASE_URL` values;
- authentication secrets;
- cookies, session tokens, bearer tokens, or password material;
- request bodies or sync mutation payloads;
- arbitrary unvalidated error codes.

Generated CI/rehearsal credentials must be registered with the GitHub Actions masking mechanism before being exported to later steps.

## Diagnostic procedure: failed Vercel deployment

1. Pin the exact failed deployment ID and Git SHA. Do not diagnose from the moving preview alias alone.
2. Read build logs for the exact deployment and identify the failing build/migration/configuration step.
3. Check the Stage 8 deployment preflight result for missing/unsafe environment configuration.
4. Do not print environment-variable values or database URLs into issues, chat, documentation, or evidence files.
5. If the candidate itself is bad and the database migration state remains compatible, use the application-only rollback procedure established in Stage 8.5.
6. If a future release changes schema incompatibly, recover a compatible database through the provider-neutral Stage 8.4 procedure before rolling the previous application onto it.

## Diagnostic procedure: migration failure

1. Stop promotion of the failing release.
2. Record the candidate SHA, CI/deployment run, migration name if known, and whether the migration completed or failed.
3. Inspect Prisma migration status and provider logs using credential-safe tooling.
4. Do not improvise destructive production DDL, edit the migration ledger manually, or run a reset command on production.
5. Decide rollback based on measured compatibility:
   - if the previous application works against the upgraded database, roll back only the application;
   - if the previous application is incompatible with the changed database, use a verified backup/restore rollback target.
6. Re-run health/auth/bootstrap verification after recovery.

For the Stage 7 to Stage 8 pair, Stage 8 introduced no Prisma migration. `prisma migrate deploy` was demonstrated to be a no-op and the eight-entry migration ledger remained unchanged.

## Diagnostic procedure: database unavailable

1. Confirm `/api/health` reports `503` rather than a stale `200`.
2. Inspect Vercel runtime status and Neon branch/compute status through provider tooling.
3. Check whether the configured environment points to the intended environment/database without copying the credential-bearing URL into evidence.
4. Use the stable generic database-unavailable code for application-side correlation.
5. Do not log or publish the raw Prisma/pg error object.
6. If the database cannot be recovered safely in place, use the Stage 8.4 restore procedure into a clean target and validate ContextOS health/auth/bootstrap before repointing an application environment.

## Diagnostic procedure: repeated sync failures

1. Query runtime logs for the stable operational event `sync_unexpected_error` and correlate by deployment ID and timestamp.
2. Check `/api/health` to separate database-wide failure from sync-specific failure.
3. Inspect HTTP status patterns without logging request bodies or mutation payloads.
4. Preserve the client outbox while diagnosing. Do not tell the user to clear site data as an initial response, because that can destroy the pending local evidence/state the sync path is designed to preserve.
5. Verify reconnect behavior and eventual drain after the server path is healthy. Stage 8.2 specifically verified the reconnect watchdog after a missed browser reconnect event.

## Diagnostic procedure: PWA/service-worker update failure

1. Record the current service-worker version, cache names, and whether the app reports the offline shell ready.
2. Do not clear storage or unregister the worker before recording the current state unless recovery has already been chosen over diagnosis.
3. Check whether the new worker installed/activated and whether the replacement shell is complete before old cache cleanup.
4. Verify IndexedDB workspace state and the pending outbox survive the transition.
5. Rehearse/reproduce using the same-origin procedure from Stage 8.3 when needed.
6. After recovery, verify a hard offline restart on a core workspace route.

## Failure evidence to record

Safe evidence includes:

- Git SHA and branch;
- Vercel deployment/run ID and immutable hostname;
- GitHub Actions run/job ID;
- timestamp and route;
- HTTP status;
- stable operational event name;
- whitelisted coarse error class/code;
- service-worker version/cache name;
- whether a backup/restore, migration, auth bootstrap, or offline acceptance check passed.

Do not include secret values, connection strings, cookies, session/auth tokens, request bodies, database dumps, raw database errors, or stack traces in committed evidence.

## Known limitations and maintenance items

- No external uptime/availability monitor is configured by Stage 8.
- No centralized distributed tracing/error aggregation or on-call system is configured.
- The existing authentication rate limiter is process-local rather than distributed.
- The current Content Security Policy still permits `unsafe-inline` where required by the present application stack; Stage 8 did not perform a CSP architecture rewrite.
- No external penetration test or compliance certification is claimed.
- The current `pg` stack warns that `sslmode=require` compatibility semantics will change in a future major version. Current connections continue to use the library's present verified behavior. Before a future `pg`/`pg-connection-string` major upgrade, explicitly review and pin the intended TLS verification semantics rather than carrying the warning forward by inertia.

## Stage boundary

Lifecycle/destructive local-data semantics remain Stage 9 work. The final comprehensive local-first acceptance matrix remains Stage 10 work.
