# ContextOS Project State

## Status

ContextOS is a portfolio-stage, local-first workspace application. The current repository edition is being prepared as a public engineering project rather than presented as a production SaaS service.

Package version: `0.2.8`.

The local-first completion program is complete through Stage 8 deployment/operational hardening. Stage 9 lifecycle and destructive-data semantics are under verification on `feat/local-first-completion-stage9`. Stage 10 remains the final comprehensive local-first acceptance stage.

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

The application is deliberately not collaborative real-time editing. There is no CRDT layer or merge-conflict UI for simultaneous multi-user edits.

## Lifecycle And Deletion Model

Stage 9 defines lifecycle behavior rather than leaving it implicit:

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

## Deployment And Recovery State

Stage 8 produced non-production evidence for:

- deterministic production deployment preflight;
- a real HTTPS Vercel preview against an isolated Neon branch;
- offline/reconnect synchronization on hosted infrastructure;
- same-origin service-worker/PWA upgrade from shell v3 to v4 while preserving local workspace state;
- PostgreSQL-native `pg_dump`/`pg_restore` recovery into a fresh database with application-level verification;
- Stage 7 to Stage 8 release-pair migration/rollback compatibility;
- minimal operational health and sanitized error logging.

Provider-native snapshot/PITR rehearsal remains optional/external evidence and is not claimed as completed.

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

The committed GitHub Actions workflow provisions PostgreSQL 16 and currently runs, in sequence:

1. `npm ci` and dependency audit;
2. Stage 7 repository/security/evidence guards;
3. Stage 8 deployment-preflight and operational-log guards;
4. Stage 9 lifecycle guardrails;
5. Prisma validation/generation and committed migration deployment;
6. disposable demo seed;
7. TypeScript checks;
8. production build;
9. optimized production/offline Playwright matrix;
10. full database-backed development E2E suite, including Stage 9 lifecycle/tombstone coverage;
11. deliberate database-outage smoke.

For local verification, see `docs/RUN_PROTOCOL.md`. Stage-specific evidence is recorded under `docs/stage8/`, `docs/stage9/`, and `audits/`.

## Known Boundaries

- No email verification or self-service password reset.
- No OAuth as a supported production login path.
- No collaborative merge interface.
- No calendar-provider integration or recurring-task engine.
- No semantic search.
- No external AI service is required for core operation.
- Offline support covers cached workspace views and queued local mutations, not arbitrary server functionality.
- Ordinary logout requires connectivity because a true server-session logout cannot be completed offline.
- Other offline devices cannot be remotely scrubbed after account deletion.
- Irreversible per-record purge is not exposed without a proven anti-resurrection design.
- Provider-native backup/PITR rehearsal and external penetration testing are not claimed.
- Stage 10 final local-first acceptance remains open.

## Public Repository Documentation

- `README.md` — project overview and engineering highlights.
- `BLUEPRINT.md` — product specification and design intent.
- `docs/REPO_MAP.md` — code and data-flow map.
- `docs/RUN_PROTOCOL.md` — local setup and verification ladder.
- `docs/DEPLOYMENT.md` — deployment notes and safety boundaries.
- `docs/LOCAL_FIRST_CONTRACT.md` — offline, lifecycle, and deletion semantics.
- `SECURITY.md` — security assumptions and vulnerability reporting.
- `CONTRIBUTING.md` — contribution and verification expectations.
