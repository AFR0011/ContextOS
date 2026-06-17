# ContextOS Project State

## Current Objective
Complete remaining deployment hardening after v0.2.7 cleanup, health endpoint, and CI workflow foundation before any public production release.

## Current Architecture
- Next.js App Router under `src/app`.
- Prisma 7 + PostgreSQL for canonical user-scoped persistence.
- Local email/password auth with hashed passwords and HTTP-only sessions.
- App-level fixed-window throttling for failed login and registration attempts.
- Unauthenticated `/api/health` route for DB availability checks.
- GitHub Actions CI workflow scaffold using Node 22 and disposable PostgreSQL.
- IndexedDB workspace cache plus an idempotent queued mutation outbox.
- Service worker app-shell caching for visited routes and static assets.
- Next config now applies baseline security headers and disables `X-Powered-By`.
- Metadata uses an explicit deployment/local `metadataBase` instead of implicit localhost build defaults.

## Current Product State
- Package and shell version: `0.2.7`.
- Core routes: Dashboard, Inbox, Today, This Week, Projects, Project Detail, Areas, Resources, Dates, Reviews, Search, Archive, and Settings.
- `/dates` is canonical. `/deadlines` redirects to `/dates`.
- `/date` is the advertised capture command. `/deadline` remains an accepted compatibility alias.
- The internal `Deadline` collection remains in storage and sync payloads for offline compatibility, but visible product terminology is Date/Dates.
- Tasks have one optional `scheduledTime`. Legacy cached and queued tasks normalize from `scheduledTime ?? startTime ?? endTime`.
- Dashboard begins with reusable Quick Capture, then Notepad, Dates, Daily timeline, Tasks, and Projects.
- Daily timeline is a compact editable task list with optional time, inline deletion, and persistent cross/uncross completion. It does not render empty calendar slots.
- Dashboard Tasks contains active tasks from all dates/projects. It defaults to newest-created sorting, offers persisted sort modes, and completed tasks appear when Show completed is enabled.
- Dashboard cleanup actions can move finished tasks and archived dates to Trash without hard-deleting records.
- Service-worker shell cache is `contextos-shell-v2` and precaches `/dates`, not the legacy `/deadlines` route.
- Dates contains only important-date records. Task due dates remain on task surfaces.
- Project detail order is header, Active Tasks, Dates, Recovery Canvas, Subcontexts, and suggestions/actions.
- Project Active Tasks is expanded and directly editable.
- Project Notes / Decisions was removed. Existing project-linked notes migrate into `Project.recoveryNotes`; standalone Resources remain Notes.
- Daily and weekly Priority records, editors, seed data, and client state are removed.
- Legacy queued Priority mutations are acknowledged no-ops so old outboxes can drain.
- Sync reconciliation preserves mutations queued while another sync request is in flight.
- Sync replay now rejects cross-user record IDs, scopes mutation IDs per user, validates owned references, and bounds payload size/count.
- Public registration is closed by default in production unless `ALLOW_PUBLIC_REGISTRATION=true`.
- Login/register APIs return `429` plus `Retry-After` after repeated abuse attempts.
- `/api/health` returns no-store `200` when PostgreSQL is reachable and structured `503` when the database is unavailable.
- Historical prototype/planning files have been archived under `docs/archive/`; active TypeScript excludes that archive.
- Search task results open a surface where the task is visible, and standalone note results open Resources.
- Task titles wrap in task surfaces, and completion toggles no longer reorder tasks solely by status.

## Data Migration
- Migration `20260611130000_workflow_simplification` adds and populates `Task.scheduledTime`, then removes `startTime` and `endTime`.
- Migration `20260616090000_user_scoped_sync_mutations` changes sync mutation uniqueness from global `mutationId` to `(userId, mutationId)`.
- Migration `20260616133000_dashboard_task_sort_mode` adds persisted Dashboard Tasks sort mode.
- Existing non-trashed project Notes are appended under `## Imported project notes` with stable note markers, then deleted from the Note table.
- The Priority table is dropped.
- Legacy queued project-note upserts append or replace one marked recovery-note block through the mutation ledger and do not recreate hidden Note records.

## Known Boundaries
- Offline support covers cached core views and queued CRUD-style mutations, not collaborative merge UI.
- Server data is canonical after sync; stale incoming updates produce visible warnings.
- `Deadline` remains an internal model name until a later compatibility-breaking storage migration is justified.
- Project hierarchy remains lightweight through nullable, user-scoped `parentProjectId`.
- Resources are Markdown notes, not arbitrary Notion databases.
- Email verification, password reset, OAuth, semantic search, calendar integration, recurrence, and external AI suggestions remain deferred.
- Moderate dependency advisories still require a safe upstream upgrade review.

## Latest Verification

- `npx prisma validate` passed on 2026-06-17.
- `npm run db:migrate` initially failed because Docker/Postgres was unavailable; after starting Docker Desktop and `docker compose up -d`, retry passed with schema already in sync.
- `npm run db:seed` passed.
- `npm run typecheck` initially failed because archived prototype TypeScript files were included; after excluding `docs/archive`, retry passed. A final rerun after docs updates also passed.
- `npm run build` passed.
- `PLAYWRIGHT_PORT=3001 npx playwright test tests/e2e/contextos.spec.ts -g "health endpoint" --workers=1` passed with 1 test.
- `PLAYWRIGHT_PORT=3001 npm run test:e2e -- --workers=1` passed with 35 tests.
- In-app Browser smoke passed with authenticated Dashboard rendering `MVP v0.2.7`, Dashboard/Dates/Tasks visible, no horizontal overflow, and no console errors.

## Next Useful Work
- Treat v0.2.7 cleanup, health endpoint, and CI workflow foundation as complete locally.
- Push and observe the GitHub Actions workflow, then fix any remote-only CI issues.
- Add production-like preview evidence, operational recovery evidence, deeper installed-PWA upgrade smoke, and provider/WAF defense-in-depth decisions before public production.
- Run the simplified workflow in real use before broadening scope.
- Treat regressions in capture speed, timeline scanning, Dates separation, project recovery, or offline replay as v0.2.2 fixes.
- Review dependency advisories only through deliberate non-breaking upgrades.
