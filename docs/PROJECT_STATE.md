# ContextOS Project State

## Status

ContextOS is a portfolio-stage, local-first workspace application. The current repository edition is prepared as a public engineering project rather than presented as a production SaaS service.

Package version: `0.2.8`.

The local-first completion program is complete through **Stage 10 final local-first acceptance and public-claims verification**. Stage 9 closed against GitHub Actions run `31798664757` on verified code/test commit `68b1543e5083e9064fe909101047fa5e57e7f563`. Stage 10's verified acceptance candidate is commit `f4ba02699c24210ddd6f4cfaf2b626f7a33b0c40`, CI run `31800346837`, which passed the complete accumulated verification ladder.

## Architecture

- Next.js App Router application under `src/app`.
- React 19 and TypeScript.
- PostgreSQL as canonical server persistence after synchronization.
- Prisma 7 for schema, migrations, and database access.
- Local email/password authentication with bcrypt-hashed passwords and HTTP-only sessions.
- User-scoped records and ownership validation on data-changing paths.
- Fixed-window throttling for repeated failed login and registration attempts.
- Per-user IndexedDB identities, workspace snapshots, and mutation outboxes.
- Idempotent offline mutation synchronization with per-user mutation IDs and stale-write warnings.
- Service-worker caching for the complete versioned application shell and static assets; API traffic remains network-only.
- Baseline production response security headers with `X-Powered-By` disabled.
- Minimal `GET /api/health` application/database availability checks.

## Current Product Surface

The primary workflow consists of:

- Dashboard command page and scratchpad;
- Inbox capture and one-by-one triage;
- Projects and nested subcontexts;
- editable Tasks and important Dates;
- Areas and Markdown-backed standalone Resources;
- Search, Archive, Reviews, and Settings;
- authenticated `/handoff` previews that create unprocessed Inbox suggestions only after user approval.

`/today` and `/this-week` remain compatibility routes and redirect to `/dashboard`. `/dates` is canonical while `/deadlines` remains a compatibility redirect.

## Offline And Synchronization Model

Core workspace state is cached per verified user in IndexedDB. Supported create/edit/archive/restore/delete operations mutate local state first and queue idempotent upserts while offline. PostgreSQL becomes canonical after successful synchronization.

The sync API validates ownership, bounds payloads, scopes mutation IDs per user, checks relationship ownership, and rejects stale updates instead of silently overwriting newer server state.

Initial workspace interaction waits for the verified user's IndexedDB snapshot. Startup bootstrap and explicit server refresh capture a local mutation generation and refuse to replace newer local mutations with an older in-flight server snapshot.

The optimized production acceptance matrix verifies previously authenticated offline cold reopen, core route and dynamic-project hard refresh, browser history, a functional local Search query, durable offline mutations, API/cache separation, and recoverable tombstone hard reload. The application is deliberately not collaborative real-time editing. There is no CRDT layer or merge-conflict UI for simultaneous multi-user edits.

## Lifecycle And Deletion Model

Stage 9 defines and verifies lifecycle behavior, and Stage 10 re-runs those controls as part of final acceptance:

- normal online logout preserves that user's isolated local workspace by default;
- a separate logout path removes only the current account's local identity/workspace/outbox from the browser;
- pending changes have explicit sync, retain, discard, and device-removal behavior and are never silently dropped;
- logout is blocked while offline because browser code cannot invalidate the HttpOnly server session without reaching the server;
- when several verified local workspaces exist and server verification is unavailable, ContextOS presents an explicit local account chooser rather than guessing;
- permanent account deletion requires the current password, exact `DELETE` confirmation, user-scoped local cleanup, and a second password-verified server deletion commit;
- Projects, Tasks, standalone Notes, and Dates use synchronized `trashedAt` tombstones and can be restored from Archive/Trash;
- Inbox capture deletion is synchronized as `status = "deleted"`;
- the historical sync `delete` operation remains a compatibility ledger no-op and is not emitted by the current client for ordinary deletion;
- irreversible per-record purge remains intentionally unavailable until old-offline-client resurrection can be prevented by an explicit version/generation protocol.

The production offline browser matrix includes a Date tombstone hard-reload rehearsal under the installed service-worker runtime. Development coverage separately verifies durable IndexedDB tombstone state, reconnect synchronization, restore, stale-resurrection rejection, logout/device handling, account deletion, and multi-user isolation.

## Deployment And Recovery State

Stage 8 produced non-production evidence for:

- deterministic production deployment preflight;
- a real HTTPS Vercel preview against an isolated Neon branch;
- offline/reconnect synchronization on hosted infrastructure;
- same-origin service-worker/PWA upgrade from shell v3 to v4 while preserving local workspace state;
- PostgreSQL-native `pg_dump`/`pg_restore` recovery into a fresh database with application-level verification;
- Stage 7 to Stage 8 release-pair migration/rollback compatibility; and
- minimal operational health and sanitized error logging.

Stage 10 inherits those exact results with their original scope. Provider-native snapshot/PITR rehearsal, production RTO/RPO, and arbitrary future migration rollback are not claimed.

## Authentication And Deployment Defaults

- Public registration is closed in production unless `ALLOW_PUBLIC_REGISTRATION=true` is explicitly configured.
- `/api/reset-demo` is disabled in production unless `ALLOW_DEMO_RESET=true` is deliberately enabled.
- Demo seeding is intended for local or disposable preview environments only.
- Database failures are surfaced as structured service errors rather than raw Prisma/database exceptions.
- Deployment secrets must be supplied through environment variables; `.env.example` contains placeholders/demo values only.
- Account deletion is same-origin guarded, authenticated, password re-verified, and implemented through the `User` cascade root rather than ad hoc child-table deletion.

## Public Demo Fixtures

The publication branch uses neutral sample data rather than personal, academic, employment, or application records. The Playwright suite asserts against the same neutral fixture contract, and `tests/e2e/publication-fixtures.spec.ts` prevents the removed personal/workflow labels from being reintroduced accidentally.

The imported editor reference prototype used during earlier private development is not part of the public application tree.

## Verification

The committed GitHub Actions workflow provisions PostgreSQL 16 and runs, in sequence:

1. `npm ci` and dependency audit;
2. Stage 7 repository/security/evidence guards;
3. Stage 8 deployment-preflight and operational-log guards;
4. Stage 9 lifecycle and evidence guardrails;
5. Stage 10 acceptance-registry and public-claims audits;
6. Prisma validation/generation and committed migration deployment;
7. disposable demo seed;
8. TypeScript checks;
9. production build;
10. optimized production/offline Stage 10 Playwright matrix, including offline history, functional local Search, mutation durability, and tombstone hard-reload evidence;
11. dedicated Stage 9 lifecycle browser matrix;
12. full database-backed development E2E suite; and
13. deliberate database-outage smoke.

Stage 10's verified acceptance candidate, commit `f4ba02699c24210ddd6f4cfaf2b626f7a33b0c40` / run `31800346837`, passed every gate above. Stage-specific provenance is recorded under `docs/stage8/`, `docs/stage9/`, `docs/stage10/`, and `audits/`.

## Known Boundaries

- No email verification or self-service password reset.
- No OAuth as a supported production login path.
- No collaborative merge interface.
- No calendar-provider integration or recurring-task engine.
- No semantic search.
- No external AI service is required for core operation.
- Offline support covers cached workspace views and queued local mutations after a previously authenticated device has an eligible local workspace, not arbitrary server functionality.
- Ordinary logout requires connectivity because a true server-session logout cannot be completed offline.
- Other offline devices cannot be remotely scrubbed after account deletion.
- Irreversible per-record purge is not exposed without a proven anti-resurrection design.
- Provider-native backup/PITR rehearsal, external penetration testing, distributed provider-level rate limiting, and production SLA/on-call guarantees are not claimed.

Stage 10 closure is an engineering acceptance statement for the documented portfolio-stage product boundary. It is not a claim that the remaining product, deployment, or security boundaries ceased to exist.

## Public Repository Documentation

- `README.md` — project overview and engineering highlights.
- `BLUEPRINT.md` — product specification and design intent.
- `docs/REPO_MAP.md` — code and data-flow map.
- `docs/RUN_PROTOCOL.md` — local setup and verification ladder.
- `docs/DEPLOYMENT.md` — deployment notes and safety boundaries.
- `docs/LOCAL_FIRST_CONTRACT.md` — offline, lifecycle, and deletion semantics.
- `docs/stage10/STAGE10_ACCEPTANCE.md` — final local-first acceptance record.
- `SECURITY.md` — security assumptions and vulnerability reporting.
- `CONTRIBUTING.md` — contribution and verification expectations.
