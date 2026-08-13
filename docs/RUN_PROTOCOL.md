# ContextOS Run Protocol

## Local Setup
1. Copy `.env.example` to `.env` if `.env` does not exist.
2. Start PostgreSQL:
   ```bash
   docker compose up -d
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Generate Prisma Client and migrate:
   ```bash
   npx prisma generate
   npm run db:migrate
   ```
5. Seed the demo account:
   ```bash
   npm run db:seed
   ```
6. Start the app:
   ```bash
   npm run dev
   ```

## Demo Login
- Email: `demo@contextos.local`
- Password: `contextos-demo-v011`

## Verification Ladder
Run verification commands sequentially. In this Next.js app, `npm run build` can rewrite generated `.next` route type files while `npm run typecheck` is reading them, causing false transient typecheck failures if they run in parallel. Playwright runs that auto-start a server should also remain sequential unless deliberately pointed at one shared server.

The Stage 7 verification ladder is:

1. Dependency advisory gate:
   ```bash
   npm audit --audit-level=low
   ```
2. Repository/security audit controls:
   ```bash
   npm run audit:stage7
   ```
3. Prisma schema/client verification:
   ```bash
   npx prisma validate
   npx prisma generate
   ```
4. Database migration and seed:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
   In CI and production-style environments, use `npm run db:deploy` rather than `db:migrate`.
5. Typecheck:
   ```bash
   npm run typecheck
   ```
6. Production build:
   ```bash
   npm run build
   ```
7. Production/offline/security browser matrix:
   ```bash
   npx playwright test --config=playwright.production.config.ts --workers=1
   ```
   This suite starts the optimized application with `next start`. It owns cold-offline-reopen, hard-refresh, cached-shell, workspace-gate, and Stage 7 production-security assertions. Do not substitute the Next.js HMR server for this boundary.
8. Development-server regression suite:
   ```bash
   npm run test:e2e -- --workers=1
   ```

The committed GitHub Actions workflow executes the same required gates against disposable PostgreSQL.

## Stage 7 Audit Controls

The human-readable scope is `docs/stage7-audit-plan.md`; the machine-readable registry is `audits/stage7-controls.json`.

`npm run audit:stage7` currently checks repository hygiene, tracked environment/generated files, session/security implementation invariants, authentication input bounds, browser mutation-origin guards, API no-store headers, synchronization request integrity, local credential isolation, production CSP branching, service-worker cache replacement rules, user-scoped Prisma models, mutation-ledger uniqueness, documentation boundary language, and the CI verification ladder.

Runtime controls live in the Playwright suites. The production matrix additionally verifies production headers, secure session-cookie behavior, cross-origin mutation rejection, unauthenticated workspace API closure, sync mutation ID consistency, timestamp validation, UTF-8 byte accounting, offline shell completeness, offline cold reopen/hard refresh, IndexedDB mutation durability, and API exclusion from the shell cache.

Stage 7 is an internal engineering assurance layer, not a penetration test or compliance certification.

## Core Manual Product Checks

Automated tests are the acceptance evidence; manual checks are useful for browser/device behavior that benefits from human inspection:

- Confirm `GET /api/health` returns `200`, `Cache-Control: no-store`, `database: "ok"`, and the current package version while PostgreSQL is available.
- Log in with the demo account and confirm Dashboard renders as a command page with the page editor above pinned Tasks and Dates blocks.
- Confirm desktop primary navigation shows Dashboard, Inbox, Search, and active project links; confirm mobile bottom navigation shows Dashboard, Inbox, Projects, and Search.
- Confirm Today and This Week redirect to Dashboard and `/deadlines` redirects to `/dates`.
- Add `/task` and `/date` commands from the Dashboard page editor and confirm they create real structured records rather than Inbox captures.
- Add a Markdown checkbox in the Dashboard page editor and confirm it remains scratchpad content rather than creating a task.
- Convert an Inbox capture to a task and verify archive/delete triage behavior.
- Add timed and untimed tasks, including same-time tasks, and confirm no fabricated empty calendar slots appear.
- Add an important Date for today and confirm it appears in Dates as a Date row, not as a task checkbox.
- Cross a Today task, reload, and confirm it remains visible and can be reopened without being reordered merely because completion changed.
- Confirm long task titles wrap on mobile instead of truncating.
- Open a project and confirm command-page notes, Tasks, Dates, Recovery fields, Subcontexts, and child rollups remain coherent.
- Open an Area by URL and confirm projects/subcontexts appear inside it; open Resources and confirm standalone notes remain reachable.
- Search for a project task and a standalone Resource and confirm each result opens a local surface where the record is visible.
- Toggle dark mode and reload to confirm persistence.
- On a 390px mobile viewport, confirm touched task/editor controls remain reachable, slash commands expose listbox/selected state, and block actions expose menu semantics.

## Offline Verification

Full offline reload behavior belongs to the production matrix, because the service-worker application shell and optimized chunks are the actual deployment boundary. Development/HMR chunks are not production offline artifacts, despite browsers occasionally doing their best to make this distinction maximally annoying.

The production matrix must prove:

- a previously authenticated workspace cold-reopens offline without route warming;
- core workspace routes and dynamic project URLs cold-open and hard-refresh offline;
- browser local routing/back-forward remains usable offline;
- `Offline ready` corresponds to a verified complete shell manifest;
- an offline scratchpad edit and its queued mutation survive hard reload;
- API requests fail as network/API requests rather than receiving cached HTML;
- no `/api/*` request is stored in shell caches.

A first-time browser or ambiguous multi-user local browser must remain blocked according to `docs/LOCAL_FIRST_CONTRACT.md` rather than being admitted into a guessed workspace.

## Authentication and Request-Boundary Checks

Production authentication requires a configured `AUTH_SECRET` of at least 32 characters. Use a fresh high-entropy secret, not the example placeholder. Session-token database hashes are keyed by this secret; rotating it intentionally invalidates existing sessions.

Browser-originated state-changing requests to login, registration, logout, sync, and demo reset are exact-origin guarded. The automated production matrix covers cross-origin rejection. Controlled CLI/API calls may omit browser `Origin`/`Sec-Fetch-Site` metadata.

Application-level login/registration throttling remains intentionally per-process/in-memory. It periodically prunes expired buckets, but public deployment still needs trusted proxy IP headers and provider/WAF-level distributed abuse protection.

## Synchronization Integrity Checks

Sync request controls cover total request bytes, mutation count, per-mutation UTF-8 payload bytes, identifier and key lengths, timestamp parsing, and `entityId === payload.id` for upserts. Server application separately verifies record and relationship ownership.

The historical `operation: "delete"` wire value is a compatibility boundary: the current server records it as an idempotent ledger no-op, while present product archive/trash/delete flows synchronize record-state upserts. Do not reinterpret this as hard-delete semantics before the later lifecycle stage owns deletion, logout, pending local changes, and device-data removal.

## Deployment Hardening Checks

- Confirm `.github/workflows/ci.yml` follows the Stage 7 verification ladder against disposable PostgreSQL.
- Confirm `GET /api/health` returns `200` plus `Cache-Control: no-store` when PostgreSQL is reachable, and `503` with `code: "database_unavailable"` when PostgreSQL is unavailable.
- Confirm repeated failed `/api/auth/login` requests eventually return `429` with `Retry-After`, and a successful login resets the failed-attempt bucket for that identity.
- Confirm repeated `/api/auth/register` attempts eventually return `429` with `Retry-After` when public registration is enabled.
- Confirm production responses carry CSP without `unsafe-eval`, frame protection, MIME-sniffing protection, referrer policy, permissions policy, opener/resource policy, and HSTS.
- Confirm `X-Powered-By` is absent and `/api/*` responses are explicitly `no-store`.
- Confirm `/sw.js` uses the current versioned shell, excludes API handling, and only removes old shell caches after replacement readiness verifies.
- Before public production, run an installed-PWA upgrade smoke from an older cached worker.
- Before public production, rehearse and record database backup/restore plus a compatible application/database rollback pair. This remains an unclosed deployment gate until actually performed.

## Database-Unavailable Smoke

When checking graceful DB outage behavior, use a running development server with PostgreSQL stopped or unavailable.

Expected behavior:

- `/login` renders a clear PostgreSQL-unavailable message and does not show an internal server error.
- `POST /api/auth/login` returns `503` JSON with `code: "database_unavailable"`.
- Protected DB-backed APIs such as `/api/bootstrap`, `/api/sync`, `/api/reset-demo`, and `/api/auth/me` return `503` JSON with `code: "database_unavailable"` when a session cookie forces DB lookup.

After DB-down smoke, restart PostgreSQL and rerun the normal DB-up ladder.

## v0.1.x Usage Trial
Use [FRICTION_LOG.md](FRICTION_LOG.md) during a real-use trial when product-friction work resumes. This historical workflow is not a substitute for the Stage 7 audit gates.

1. Start the app locally and log in with the demo account.
2. Record the trial start time in `docs/FRICTION_LOG.md`.
3. Use ContextOS as the only capture and execution surface for one real workday.
4. Capture every open loop and process the Inbox at least twice.
5. Use Dashboard for execution and update at least two project pages.
6. Use at least one subcontext and one Resource note.
7. Complete at least one daily startup or shutdown review.
8. Fill the ranked friction list only after the trial window ends.

## Local Dev Cache And Server Notes
- `playwright.config.ts` defaults to port 3000 and can reuse an existing server. After substantial source/schema changes, confirm the port is serving current code or run tests on another free port with `PLAYWRIGHT_PORT=3001 npm run test:e2e -- --workers=1`.
- After external `npm run db:seed` or `POST /api/reset-demo`, an already-open browser may keep stale IndexedDB workspace data. Use the shell sync indicator's Refresh action or Settings -> refresh from server when no pending offline mutations exist, or open a clean browser context for verification.
- If PostgreSQL is unavailable, auth pages and workspace APIs should render/return database-unavailable states. Start PostgreSQL with `docker compose up -d` before DB-up verification.

## Notes
- `.env` is ignored and may contain local-only values. `.env.example` is the only env file intended to be committed.
- `npm run db:seed` resets the seeded demo workspace. Do not run it during normal production deploys.
- Public registration is disabled by default in production unless `ALLOW_PUBLIC_REGISTRATION=true` is explicitly set.
- `/api/reset-demo` is disabled in production unless `ALLOW_DEMO_RESET=true` is explicitly set.
- Do not use `npm audit fix --force` blindly; review dependency changes and compatibility before applying them.
