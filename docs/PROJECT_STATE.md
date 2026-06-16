# ContextOS Project State

## Current Objective
Complete deployment hardening after v0.2.3 Gate 1 before any public production release.

## Current Architecture
- Next.js App Router under `src/app`.
- Prisma 7 + PostgreSQL for canonical user-scoped persistence.
- Local email/password auth with hashed passwords and HTTP-only sessions.
- IndexedDB workspace cache plus an idempotent queued mutation outbox.
- Service worker app-shell caching for visited routes and static assets.

## Current Product State
- Package and shell version: `0.2.3`.
- Core routes: Dashboard, Inbox, Today, This Week, Projects, Project Detail, Areas, Resources, Dates, Reviews, Search, Archive, and Settings.
- `/dates` is canonical. `/deadlines` redirects to `/dates`.
- `/date` is the advertised capture command. `/deadline` remains an accepted compatibility alias.
- The internal `Deadline` collection remains in storage and sync payloads for offline compatibility, but visible product terminology is Date/Dates.
- Tasks have one optional `scheduledTime`. Legacy cached and queued tasks normalize from `scheduledTime ?? startTime ?? endTime`.
- Dashboard begins with reusable Quick Capture, then Notepad, Dates, Daily timeline, Tasks, and Projects.
- Daily timeline is a compact editable task list with optional time, inline deletion, and persistent cross/uncross completion. It does not render empty calendar slots.
- Dashboard Tasks contains active tasks from all dates/projects. Completed tasks appear when Show completed is enabled.
- Dates contains only important-date records. Task due dates remain on task surfaces.
- Project detail order is header, Active Tasks, Dates, Recovery Canvas, Subcontexts, and suggestions/actions.
- Project Active Tasks is expanded and directly editable.
- Project Notes / Decisions was removed. Existing project-linked notes migrate into `Project.recoveryNotes`; standalone Resources remain Notes.
- Daily and weekly Priority records, editors, seed data, and client state are removed.
- Legacy queued Priority mutations are acknowledged no-ops so old outboxes can drain.
- Sync reconciliation preserves mutations queued while another sync request is in flight.
- Sync replay now rejects cross-user record IDs, scopes mutation IDs per user, validates owned references, and bounds payload size/count.
- Public registration is closed by default in production unless `ALLOW_PUBLIC_REGISTRATION=true`.
- Search task results open a surface where the task is visible, and standalone note results open Resources.
- Task titles wrap in task surfaces, and completion toggles no longer reorder tasks solely by status.

## Data Migration
- Migration `20260611130000_workflow_simplification` adds and populates `Task.scheduledTime`, then removes `startTime` and `endTime`.
- Migration `20260616090000_user_scoped_sync_mutations` changes sync mutation uniqueness from global `mutationId` to `(userId, mutationId)`.
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

- `npx prisma validate`, `npm run db:migrate`, and `npx prisma generate` passed on 2026-06-16.
- `npm run typecheck` passed.
- Targeted Playwright for sync/search/task wrapping/order passed with 4 tests.
- `npm run build` passed with the existing `metadataBase` warning.
- Production registration-closed smoke with `ALLOW_PUBLIC_REGISTRATION=false` passed with a 403 response.
- `npm run test:e2e -- --workers=1` passed with 32 tests.
- Desktop/mobile in-app Browser production smoke passed with no horizontal overflow or console warnings/errors.

## Next Useful Work
- Treat v0.2.3 as deployment Gate 1 complete.
- Add auth abuse controls, security headers, corrected PWA caching, CI, and operational recovery evidence before public production.
- Run the simplified workflow in real use before broadening scope.
- Treat regressions in capture speed, timeline scanning, Dates separation, project recovery, or offline replay as v0.2.2 fixes.
- Review dependency advisories only through deliberate non-breaking upgrades.
