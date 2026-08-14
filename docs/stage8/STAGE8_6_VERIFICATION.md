# Stage 8.6 verification: operational health and diagnostics

Date: 2026-08-14

## Verified code candidate

- Git commit: `d4bbc860a27d5471d74868e39ebd0ef90c46e27d`
- CI run: `31789552012`
- CI conclusion: success

The CI run passed the Stage 7 repository/evidence audits, Stage 8 deployment preflight and rejection cases, the new Stage 8 operational-log audit, Prisma validation/generation/deploy/seed, TypeScript, production build, optimized production/offline browser suite, general E2E suite, and database-outage smoke.

The operational audit produced `STAGE8_OPERATIONAL_LOG_AUDIT=PASS` and verifies that secret-looking error text is removed from operational metadata, only whitelisted coarse error codes survive, the API routes use the sanitized operational logger rather than raw `console.error(..., error)`, the health route remains dynamic/no-store, and generated Stage 8 rehearsal auth secrets are masked before export to later GitHub Actions steps.

## Hosted health evidence

The exact hosted preview used for Stage 8.6 verification was:

- Vercel deployment ID: `dpl_FVoSRukWkYbJYxRSSAn3VtLUuN5y`
- Immutable hostname: `context-nk94a5d2o-ali-farrokhnejads-projects.vercel.app`
- Vercel Git SHA: `d4bbc860a27d5471d74868e39ebd0ef90c46e27d`
- Git branch: `feat/local-first-completion-stage8`
- Deployment state: `READY`

A protected-provider fetch of `/api/health` on that immutable deployment returned HTTP `200` with the minimal JSON body:

- `status: ok`
- `service: contextos`
- `database: ok`
- `version: 0.2.8`

The response included `Cache-Control: no-store` and retained the Stage 7 security headers including CSP, HSTS, frame protection, referrer policy, permissions policy, MIME sniffing protection, and `X-Robots-Tag: noindex`.

The public health response did not expose the Neon branch ID, deployment ID, Git SHA, environment-variable names/values, database host, or credentials.

## Deployment correlation

Vercel provider metadata directly maps the immutable deployment ID and hostname to the Git commit and branch. Therefore the running preview can be correlated to a non-sensitive build/deployment identifier without adding source-control or infrastructure metadata to the public health endpoint.

The Stage 8 branch alias remains a convenient human entry point, but operational diagnosis should pin the immutable deployment ID before reading logs or comparing behavior.

## Runtime-log hygiene

The successful health request was visible in runtime logs for the exact deployment and included the private Stage 8 preview branch identity used for environment verification.

The same exact-deployment log window was searched for credential-shaped material. No matching log entries were found for:

- `DATABASE_URL`
- `AUTH_SECRET`
- `password`
- the Neon credential prefix used by the current environment

No credential value is copied into this report.

Application unexpected-error logging was changed from raw exception-object logging to `logOperationalError()`. The logger emits a stable event name plus sanitized metadata only. Exception messages, stacks, causes, arbitrary codes, request/sync payloads, connection strings, and auth/session material are excluded by design and covered by the Stage 8 operations audit.

The restore and release-rehearsal workflows were also corrected to register generated ephemeral auth secrets with GitHub Actions masking before exporting them. Historical unmasked values from earlier rehearsal jobs were ephemeral test-only runtime secrets, not persistent production credentials; they are intentionally not reproduced here.

## Operational runbook

`docs/stage8/STAGE8_6_OPERATIONS.md` defines the evidence and response procedure for:

- failed Vercel deployments;
- migration failures;
- database-unavailable responses;
- repeated sync errors;
- PWA/service-worker update failures;
- deployment/build correlation; and
- safe operational logging/evidence handling.

The runbook explicitly avoids destructive production repair, raw database diagnostics in committed evidence, and clearing local PWA state before failure evidence has been captured.

## Known forward-maintenance item

The current Node PostgreSQL stack emits a provider/runtime warning that `sslmode=require` handling will adopt standard libpq semantics in a future major version of `pg`/`pg-connection-string`. The current library behavior remains verified; this is not a current connectivity or TLS downgrade failure.

Before a future major upgrade of those dependencies, the intended TLS verification semantics must be reviewed and made explicit rather than accepting the future semantic change implicitly. Stage 8.6 records this as a maintenance item and does not silently rewrite live database connection configuration.

## Limitations

Stage 8.6 does not claim or configure:

- an external uptime-monitoring vendor;
- an SLO/SLA or on-call policy;
- centralized distributed tracing/error aggregation;
- a distributed authentication rate limiter;
- an external penetration test or compliance certification; or
- a full CSP architecture rewrite.

These omissions do not invalidate the Stage 8.6 scope, which is the minimal public health target, exact deployment correlation, credential-safe diagnostics, and an actionable no-secret failure runbook.

## Result

- `OPS-001`: passed. The hosted `/api/health` target is dynamic, minimal, `no-store`, database-aware, and usable by an external HTTP monitor.
- `OPS-002`: passed. The exact hosted preview is correlated through Vercel provider metadata to an immutable deployment ID, hostname, branch, and Git commit without expanding the public health body.
- `OPS-003`: passed. Unexpected server errors are sanitized, generated rehearsal secrets are masked, a deterministic CI audit enforces the boundary, and the operations runbook records safe diagnostic procedures and limitations.

Stage 8.6 is complete pending the final evidence-head regression run.
