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
   - Log in with the demo account.
   - Add a slash capture from the Dashboard Canvas editor.
   - Convert an inbox capture to a task.
   - Check a Today task done and confirm it remains visible and can be unchecked.
   - Edit project recovery context through the project markdown editor.
   - Create a project subcontext and confirm the parent rolls up child tasks/deadlines.
   - Edit the Dashboard Canvas and confirm it appears in Resources.
   - Open an Area and confirm projects/subcontexts appear inside it.
   - Open Areas and Resources from the PARA nav group.
   - Toggle dark mode and reload to confirm it persists.
   - Go offline, add a capture, reload a visited route, return online, and confirm pending sync clears.

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

## Local Dev Cache And Server Notes
- `playwright.config.ts` can reuse an existing server on port 3000. After substantial source/schema changes, confirm the port is serving current code or stop the listener so Playwright starts a fresh dev server.
- After external `npm run db:seed` or `POST /api/reset-demo`, an already-open browser may keep stale IndexedDB workspace data. Use Settings -> refresh from server when no pending offline mutations exist, or open a clean browser context for verification.
- If Postgres is unavailable, auth pages and workspace APIs may fail before rendering useful UI. Start Postgres with `docker compose up -d` before DB-backed verification.

## Notes
- `.env` is ignored and may contain local-only demo values.
- `.env.example` is the only env file intended to be committed.
- `npm run db:seed` resets the seeded demo workspace. Do not run it during normal production deploys.
- `/api/reset-demo` is disabled in production unless `ALLOW_DEMO_RESET=true` is explicitly set.
- Do not use `npm audit fix --force` blindly; review major dependency changes first.
