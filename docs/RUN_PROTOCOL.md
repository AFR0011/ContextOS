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
Run verification commands sequentially. In this Next.js app, `npm run build` can rewrite generated `.next` route type files while `npm run typecheck` is reading them, causing false transient typecheck failures if they run in parallel.

1. Typecheck:
   ```bash
   npm run typecheck
   ```
2. Build:
   ```bash
   npm run build
   ```
3. Database migration and seed:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
4. Browser smoke tests:
   ```bash
   npm run test:e2e
   ```
5. Manual checks:
   - Confirm `GET /api/health` returns `200`, `Cache-Control: no-store`, `database: "ok"`, and the current package version while Postgres is available.
   - Log in with the demo account and confirm Dashboard Quick Capture is above all sections.
   - Add `/task` and `/date` captures from Dashboard Quick Capture and confirm they reach Inbox.
   - Convert an inbox capture to a task.
   - Add timed and untimed Daily timeline tasks, create two tasks at the same time, and confirm no empty calendar slots appear.
   - Drag a task from Dashboard Tasks into Daily timeline, then remove it from timeline placement through row actions or right-click without deleting the task.
   - Add an important Date for today and confirm it appears in Daily timeline as a Date row, not a task checkbox.
   - Cross a Daily timeline or Today task, reload, and confirm it remains visible and can be reopened.
   - Confirm crossing/reopening a task does not reorder it solely because it is completed.
   - Confirm long task titles wrap on mobile instead of truncating.
   - Confirm Dashboard Tasks includes a future task and follows Show completed.
   - Create, edit, archive, restore, and delete an important Date; confirm task due dates do not appear in Dates.
   - Confirm `/deadlines` redirects to `/dates`.
   - Open a project and confirm section order: Active Tasks, Dates, Recovery Canvas, Subcontexts.
   - Confirm project Notes / Decisions is absent and recovery notes persist.
   - Create a project subcontext and confirm the parent rolls up child tasks/dates.
   - Edit the Dashboard Notepad and confirm it persists.
   - Open an Area and confirm projects/subcontexts appear inside it.
   - Open Areas and Resources from the PARA nav group.
   - Search for a project task and confirm the result opens a surface where that task is visible; search for a standalone Resource note and confirm it opens Resources.
   - Confirm Today and This Week contain no priority editor terminology.
   - Toggle dark mode and reload to confirm it persists.
   - Go offline, add a capture, reload a visited route, return online, and confirm pending sync clears.

## Deployment Hardening Checks
- Confirm `.github/workflows/ci.yml` is present and follows the same sequential verification ladder against disposable PostgreSQL.
- Confirm `GET /api/health` returns `200` plus `Cache-Control: no-store` when PostgreSQL is reachable, and `503` with `code: "database_unavailable"` when PostgreSQL is unavailable.
- Confirm repeated failed `/api/auth/login` requests eventually return `429` with `Retry-After`, and that a successful login resets the failed-attempt bucket for that identity.
- Confirm repeated `/api/auth/register` attempts eventually return `429` with `Retry-After` when public registration is enabled.
- Confirm a representative page such as `/login` returns CSP, frame protection, content-type sniffing protection, referrer policy, and permissions policy headers.
- Confirm `X-Powered-By` is absent.
- Confirm `npm run build` does not emit the old implicit `metadataBase` localhost warning.
- Confirm `/sw.js` uses the current shell cache version and precaches `/dates`, not `/deadlines`.
- Before public production, also run an installed-PWA upgrade smoke from an older cached worker.

## v0.1.x Usage Trial
Use [FRICTION_LOG.md](FRICTION_LOG.md) during the one-day trial.

1. Start the app locally and log in with the demo account.
2. Record the trial start time in `docs/FRICTION_LOG.md`.
3. Use ContextOS as the only capture and execution surface for one real workday.
4. Capture every open loop.
5. Process the inbox at least twice.
6. Use Today for execution.
7. Update at least two project pages.
8. Use at least one subcontext for a large project, course, assignment, or duty.
9. Edit the Dashboard Canvas at least once.
10. Add or inspect at least one Resource note.
11. Complete at least one daily startup or shutdown review.
12. Fill the ranked friction list only after the trial window ends.
13. Fix only obvious small bugs found during use.

## Offline Verification Notes
- In local dev, an offline route reload can prove that IndexedDB data and the outbox are durable even when Next dev chunks do not fully hydrate offline.
- For dev verification, assert cached workspace/outbox durability first, then reconnect and confirm the queued records render and pending sync clears.
- For full offline reload hydration, use a production build smoke because service worker app-shell and chunk caching are the relevant boundary.

## Database-Unavailable Smoke

When checking graceful DB outage behavior, use a running dev server with Postgres stopped or unavailable.

Expected behavior:

- `/login` renders a clear PostgreSQL-unavailable message and does not show an internal server error.
- `POST /api/auth/login` returns `503` JSON with `code: "database_unavailable"`.
- Protected DB-backed APIs such as `/api/bootstrap`, `/api/sync`, `/api/reset-demo`, and `/api/auth/me` return `503` JSON with `code: "database_unavailable"` when a session cookie forces DB lookup.

After DB-down smoke, restart Postgres and rerun the normal DB-up ladder: `npm run db:migrate`, `npm run db:seed`, and `npm run test:e2e`.

## Local Dev Cache And Server Notes
- `playwright.config.ts` defaults to port 3000 and can reuse an existing server. After substantial source/schema changes, confirm the port is serving current code or run tests on another free port with `PLAYWRIGHT_PORT=3001 npm run test:e2e -- --workers=1`.
- After external `npm run db:seed` or `POST /api/reset-demo`, an already-open browser may keep stale IndexedDB workspace data. Use the shell sync indicator's Refresh action or Settings -> refresh from server when no pending offline mutations exist, or open a clean browser context for verification.
- If Postgres is unavailable, auth pages and workspace APIs should now render/return database-unavailable states. Start Postgres with `docker compose up -d` before DB-up verification.

## Notes
- `.env` is ignored and may contain local-only demo values.
- `.env.example` is the only env file intended to be committed.
- `npm run db:seed` resets the seeded demo workspace. Do not run it during normal production deploys.
- `/api/reset-demo` is disabled in production unless `ALLOW_DEMO_RESET=true` is explicitly set.
- Do not use `npm audit fix --force` blindly; review major dependency changes first.
