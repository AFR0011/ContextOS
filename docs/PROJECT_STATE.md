# ContextOS Project State

## Status

ContextOS is a portfolio-stage, local-first workspace application. The current repository edition is being prepared as a public engineering project rather than presented as a production SaaS service.

Package version: `0.2.8`.

## Architecture

- Next.js App Router application under `src/app`.
- React 19 and TypeScript.
- PostgreSQL as canonical server persistence.
- Prisma 7 for schema, migrations, and database access.
- Local email/password authentication with hashed passwords and HTTP-only sessions.
- User-scoped records and ownership validation on data-changing paths.
- Fixed-window throttling for repeated failed login and registration attempts.
- IndexedDB cache for core workspace views.
- Idempotent offline mutation outbox with per-user mutation IDs.
- Service-worker caching for the application shell and static assets.
- Baseline response security headers with `X-Powered-By` disabled.
- `GET /api/health` for application/database availability checks.

## Current Product Surface

The primary workflow consists of:

- Dashboard command page and scratchpad;
- Inbox capture and one-by-one triage;
- Projects and nested subcontexts;
- editable Tasks and important Dates;
- Areas and Markdown-backed Resources;
- Search, Archive, Reviews, and Settings;
- authenticated `/handoff` previews that create unprocessed Inbox suggestions only after user approval.

`/today` and `/this-week` remain compatibility routes and redirect to `/dashboard`. `/dates` is canonical while `/deadlines` remains a compatibility redirect.

## Offline And Synchronization Model

Server data is canonical after synchronization. Core workspace state is cached in IndexedDB and CRUD-style changes can be queued while offline. The sync API validates ownership, bounds payloads, scopes mutation IDs per user, and rejects stale or cross-user updates instead of silently applying them.

This is deliberately not collaborative real-time editing. There is no merge-conflict UI for simultaneous multi-user edits.

## Authentication And Deployment Defaults

- Public registration is closed in production unless `ALLOW_PUBLIC_REGISTRATION=true` is explicitly configured.
- `/api/reset-demo` is disabled in production unless `ALLOW_DEMO_RESET=true` is deliberately enabled.
- Demo seeding is intended for local or disposable preview environments only.
- Database failures are surfaced as structured service errors rather than raw Prisma/database exceptions.
- Deployment secrets must be supplied through environment variables; `.env.example` contains placeholders/demo values only.

## Public Demo Fixtures

The publication branch uses neutral sample data rather than personal, academic, employment, or application records. The Playwright suite asserts against the same neutral fixture contract, and `tests/e2e/publication-fixtures.spec.ts` prevents the removed personal/workflow labels from being reintroduced accidentally.

The imported editor reference prototype used during earlier private development is not part of the public application tree.

## Verification

The committed GitHub Actions workflow provisions PostgreSQL 16 and runs the repository verification path on pushes and pull requests:

1. install dependencies with `npm ci`;
2. validate and generate the Prisma client;
3. apply committed database migrations;
4. seed the disposable demo workspace;
5. run TypeScript checks;
6. build the production application;
7. install Chromium for Playwright;
8. run the database-backed Playwright E2E suite.

For local verification, see `docs/RUN_PROTOCOL.md`.

## Known Boundaries

- No email verification or self-service password reset.
- No OAuth.
- No collaborative merge interface.
- No calendar-provider integration or recurring-task engine.
- No semantic search.
- No external AI service is required for core operation.
- Offline support covers cached workspace views and queued mutations, not arbitrary server functionality.
- Production-like preview validation, backup/restore rehearsal, monitoring, and rollback evidence remain deployment-hardening work rather than claims of this portfolio release.

## Public Repository Documentation

- `README.md` — project overview and engineering highlights.
- `BLUEPRINT.md` — product specification and design intent.
- `docs/REPO_MAP.md` — code and data-flow map.
- `docs/RUN_PROTOCOL.md` — local setup and verification ladder.
- `docs/DEPLOYMENT.md` — deployment notes and safety boundaries.
- `SECURITY.md` — security assumptions and vulnerability reporting.
- `CONTRIBUTING.md` — contribution and verification expectations.
