# Security Policy

## Supported scope

Security fixes are accepted for the current `main` branch and the latest tagged release, when tags are available.

ContextOS is a portfolio-stage application. It should not be treated as a production identity, secrets, compliance, or high-sensitivity data platform without an independent deployment/security review.

## Reporting a vulnerability

Please do not open a public issue for a vulnerability that could expose authentication state, user data, secrets, or destructive actions.

Instead, contact the maintainer privately through the contact information on the maintainer's GitHub profile. Include:

- the affected route/component;
- steps to reproduce;
- expected and actual behavior;
- likely impact;
- a minimal proof of concept when useful.

Avoid accessing data that is not yours and avoid destructive testing.

## Security assumptions

The application currently assumes:

- HTTPS termination in deployed environments;
- a unique, strong `AUTH_SECRET` per deployment; production authentication refuses to operate without at least 32 configured characters, while deployment guidance requires a freshly generated high-entropy value;
- PostgreSQL credentials supplied through environment configuration;
- public registration disabled unless deliberately enabled;
- demo-reset functionality disabled in production unless deliberately enabled;
- server-side authorization for user-owned records and sync mutations;
- reverse-proxy client-IP headers are supplied by a trusted deployment boundary when application-level auth throttling is relied upon.

The application includes local email/password authentication, bcrypt password hashing, HTTP-only sessions, user-scoped persistence, application-level auth abuse throttling, baseline response security headers, browser same-origin mutation checks, bounded sync payload handling, ownership checks during synchronization, and a versioned cache-complete offline application shell.

Session bearer tokens are generated from 32 random bytes. The database stores an `AUTH_SECRET`-keyed HMAC of each token rather than the raw bearer token. Rotating `AUTH_SECRET` therefore invalidates existing sessions, which is an intentional security property.

## Browser request boundary

Browser-originated state-changing API requests are required to originate from the exact application origin. ContextOS validates `Origin` when present and uses `Sec-Fetch-Site` as an additional browser signal. Controlled non-browser clients may omit browser origin metadata.

This is defense in depth around the existing `SameSite=Lax` session cookie. It is not a substitute for correct authorization on every data-changing operation.

## Authentication throttling boundary

Failed login and registration attempts are throttled by fixed-window buckets keyed by client IP and, when available, normalized identity. Expired buckets are periodically pruned so stale high-cardinality keys do not remain indefinitely.

The limiter is intentionally application-local and in-memory. It is not a distributed global rate limiter across multiple serverless/process instances, and its client-IP value depends on trusted reverse-proxy forwarding headers. Public production should therefore add provider/WAF-level abuse protection rather than treating the application limiter as the only bot-defense layer.

## Synchronization boundary

Synchronization requests enforce a total request-size limit, mutation-count limit, per-mutation UTF-8 payload-byte limit, bounded identifiers/field keys, parseable bounded timestamps, and `entityId === payload.id` consistency for upserts. Server application then revalidates ownership of target records and user-owned references before writing.

Per-user mutation IDs are unique in PostgreSQL, accepted replays are idempotent, and stale updates are surfaced as warnings rather than silently overwriting newer server state.

The sync schema still accepts the historical `delete` operation for compatibility. The current server treats that operation as a mutation-ledger compatibility no-op; product deletion/archival currently travels through record-state upserts. Final hard-delete, logout/local-data removal, and pending-change lifecycle semantics are deliberately deferred to the later lifecycle stage and must not be inferred from the compatibility operation.

## HTTP and PWA hardening

Production responses use a CSP that excludes `unsafe-eval`, deny framing/object embedding, disable MIME sniffing, restrict referrers and browser permissions, and set opener/resource isolation headers. Production also emits HSTS. Development retains the minimum additional CSP allowances required by development tooling.

All `/api/*` responses receive an explicit `Cache-Control: no-store, max-age=0` policy. The service worker does not intercept API traffic and its shell cache contains application-shell/static resources only. A replacement shell is considered ready before obsolete shell caches are removed.

## Dependency audit status

ContextOS is pinned to stable Next.js 16.2.12 and Prisma 7.9.1. The lockfile uses explicit patched transitive overrides for `esbuild` 0.28.1, `nanoid` 6.0.0, `postcss` 8.5.23, and `sharp` 0.35.3 while remaining on the stable Next.js 16.2 line.

The verified dependency graph reports **0 npm audit vulnerabilities** at the last recorded verification. Permanent CI runs `npm audit --audit-level=low`, so any future advisory at low severity or above fails the verification job rather than being silently accepted.

The dependency graph is still subject to normal upstream maintenance. Security updates should be reviewed as dependencies publish new stable releases, and overrides should be removed when the direct dependency graph no longer needs them.

## Stage 7 assurance controls

The repository's local assurance framework is defined in `docs/stage7-audit-plan.md` and `audits/stage7-controls.json`. `npm run audit:stage7` executes repository/static controls in CI, while production-mode and development-mode Playwright suites cover runtime boundaries.

This is an engineering audit framework, not an independent security certification. It does not turn automated project tests into a penetration test or compliance attestation.

## Known boundaries

The project does not currently provide:

- email verification;
- self-service password reset;
- OAuth/SSO as a supported production feature;
- enterprise audit/compliance guarantees;
- distributed provider-level rate limiting, WAF, or bot protection;
- a formal third-party penetration test;
- demonstrated production backup/restore rehearsal and application/database rollback evidence;
- a nonce/hash-based CSP that eliminates `unsafe-inline`;
- final account/logout/local-device-data lifecycle semantics, which remain later-stage work.

These are deployment/product boundaries, not claims of security completeness.
