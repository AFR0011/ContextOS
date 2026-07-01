# ContextOS Project State

## Current Objective
Complete Phase 1 Pareto simplification verification, then continue remaining deployment hardening before any public production release.

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
- Package and shell version: `0.2.8`.
- Core visible routes: Dashboard, Inbox, Projects, Project Detail, and Search. Utility routes remain valid for Areas, Resources, Dates, Reviews, Archive, and Settings.
- `/today` and `/this-week` redirect to `/dashboard`; Dashboard is canonical for daily work selection.
- `/dates` is canonical. `/deadlines` redirects to `/dates`.
- `/date` is the advertised capture command. `/deadline` remains an accepted compatibility alias.
- The internal `Deadline` collection remains in storage and sync payloads for offline compatibility, but visible product terminology is Date/Dates.
- Tasks have one optional `scheduledTime`. Legacy cached and queued tasks normalize from `scheduledTime ?? startTime ?? endTime`.
- Dashboard begins with reusable Quick Capture, then Today Tasks, Dates, Project Recovery, and compact Scratchpad.
- Today Tasks is a compact editable task list built from overdue, due-today, planned-today, and in-progress tasks. Done tasks planned/due today remain visible and reopenable.
- Dashboard no longer shows the separate all-task reservoir, task sort control, Show completed toggle, drag/drop planning, or review prompt. Backlog/future tasks remain recoverable through Projects and Search.
- Dates uses a title/date-first composer with optional time, location, and project fields behind Details.
- Desktop navigation now shows Dashboard, Inbox, Search, and a Notion/Codex-like active project tree. Mobile bottom nav shows Dashboard, Inbox, Projects, and Search.
- Service-worker shell cache is `contextos-shell-v2` and precaches `/dates`, not the legacy `/deadlines` route.
- Dates contains only important-date records. Task due dates remain on task surfaces.
- Project detail order is header, Active Tasks, Dates, Recovery Canvas, Subcontexts, and actions. Agent suggestions are hidden in the simplified visible surface.
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
- Migration `20260616133000_dashboard_task_sort_mode` adds persisted Dashboard Tasks sort mode, now retained only for legacy preference/sync compatibility.
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

- Phase 1 Pareto simplification checks on 2026-07-01: `npm run typecheck` passed, `npm run build` passed, `npx prisma validate` passed, `npx playwright test tests/e2e/contextos.spec.ts -g "date utilities|dashboard preferences" --workers=1` passed, and `PLAYWRIGHT_PORT=3001 npx playwright test tests/e2e/database-errors.spec.ts --workers=1` passed.
- DB-backed verification remains blocked on 2026-07-01 because Docker Desktop's Linux engine pipe is unavailable and `npm run db:migrate` cannot reach PostgreSQL at `localhost:5432`.
- v0.2.8 task-driven Daily timeline checks on 2026-06-22: `npm run typecheck` passed after narrowing Today task rows, `npm run build` passed, `npx prisma validate` passed, and `git diff --check` passed with line-ending normalization warnings only.
- Focused v0.2.8 Playwright command timed out before returning usable output: `PLAYWRIGHT_PORT=3001 npx playwright test tests/e2e/contextos.spec.ts -g "dashboard tasks can move|dashboard can add a project-linked important date|dashboard daily timeline supports one time|dashboard daily timeline supports untimed" --workers=1`.
- DB-backed v0.2.8 e2e remains blocked because `docker compose ps` cannot reach Docker Desktop's Linux engine pipe.
- `npx prisma validate` passed on 2026-06-17.
- `npm run db:migrate` passed; schema already in sync.
- `npm run db:seed` passed.
- `PLAYWRIGHT_PORT=3001 npx playwright test tests/e2e/contextos.spec.ts -g "dashboard notepad supports toggle headings" --workers=1 --repeat-each=5` passed after the dirty-draft hydration guard.
- `PLAYWRIGHT_PORT=3001 npx playwright test tests/e2e/contextos.spec.ts -g "mobile editor and task controls" --workers=1` passed.
- `npm run typecheck` passed.
- `npm run build` passed.
- `PLAYWRIGHT_PORT=3001 npm run test:e2e -- --workers=1` passed with 36 tests.
- In-app Browser smoke passed with authenticated Dashboard rendering `MVP v0.2.8` on desktop and 390px mobile, Dashboard/Dates/Tasks visible, no horizontal overflow, no console errors, and touched mobile controls at 40x40.
- GitHub Actions CI passed on `codex/v0.2.8-ci-a11y-foundation`: `https://github.com/AFR0011/ContextOS/actions/runs/27678139692`.

## Next Useful Work
- Start Docker/Postgres, rerun the focused Phase 1 Dashboard/navigation e2e slice, then run full e2e if it passes.
- Treat v0.2.7 cleanup, health endpoint, and CI workflow foundation as complete locally.
- Push and observe the GitHub Actions workflow, then fix any remote-only CI issues.
- Add production-like preview evidence, operational recovery evidence, deeper installed-PWA upgrade smoke, and provider/WAF defense-in-depth decisions before public production.
- Run the simplified workflow in real use before broadening scope.
- Treat regressions in capture speed, Today task scanning, Dates separation, project recovery, or offline replay as v0.2.2 fixes.
- Run the simplified Dashboard/Inbox/Projects/Search workflow in real use before deleting hidden utility surfaces.
- Review dependency advisories only through deliberate non-breaking upgrades.
