# ContextOS Version Log

## v0.2.5 Security Headers and PWA Cache

Status:
Implemented and verified locally on 2026-06-16.

Goal:
Close the next deployment-hardening slice by adding baseline response protections, explicit metadata origin handling, and corrected service-worker cache/routes.

Schema and compatibility:
- No Prisma schema changes.
- Service worker cache version changed to `contextos-shell-v2`.
- `/dates` is precached and `/deadlines` is no longer precached; `/deadlines` still redirects for route compatibility.

Implemented behavior:
- Added CSP, frame protection, content-type sniffing protection, referrer policy, and permissions policy through Next config.
- Disabled the Next `X-Powered-By` response header.
- Added environment-aware `metadataBase` using `NEXT_PUBLIC_APP_URL`, `APP_URL`, `VERCEL_URL`, or a local fallback.
- Limited service-worker route cache writes to successful responses.
- Added targeted Playwright coverage for headers, metadata, and service-worker cache/routes.
- Bumped package and shell version to `0.2.5`.

Verification:
- Typecheck passed.
- Targeted deployment Playwright coverage passed.
- Build passed without the previous `metadataBase` warning.
- Prisma validate/migrate and seed passed.
- Full Playwright suite passed with 33 tests.
- In-app Browser smoke passed with authenticated Dashboard rendering `MVP v0.2.5`, Dates and Tasks visible, no horizontal overflow, and no console errors.

## v0.2.4 Dashboard Task/Date Cleanup

Status:
Implemented and verified locally on 2026-06-16.

Goal:
Reduce Dashboard task/date clutter and make recent tasks easier to scan without changing completion into a hidden reorder trigger.

Schema and compatibility:
- Added `DashboardPreference.taskSortMode` with default `recent`.
- Existing dashboard preferences normalize missing or invalid sort modes to `recent`.
- Sync replay and IndexedDB normalization preserve the new preference while remaining compatible with older cached preferences.

Implemented behavior:
- Dashboard Tasks defaults to newest-created sorting.
- Dashboard Tasks includes persisted sort modes for newest, oldest, scheduled, and date order.
- Daily Timeline and Today remain schedule-first.
- Dashboard Tasks can move completed/dropped tasks to Trash in one confirm-gated action.
- Dashboard Dates can move archived dates to Trash in one confirm-gated action.
- Playwright can run on alternate ports via `PLAYWRIGHT_PORT`.
- Bumped package and shell version to `0.2.4`.

Verification:
- Prisma validate/migrate/generate and seed passed.
- Typecheck and build passed.
- Targeted dashboard Playwright coverage passed.
- Full Playwright suite passed with 32 tests.
- In-app Browser smoke passed on desktop and 390px mobile with no horizontal overflow.

## v0.2.2 Workflow Simplification

Status:
Implemented and verified locally on 2026-06-11.

Goal:
Simplify daily execution around one task time, a compact timeline, separate all-task visibility, important Dates, and recovery-first project pages.

Schema and compatibility:
- Replaced `Task.startTime`/`endTime` with nullable `scheduledTime`, migrating start first and end second.
- Merged project-linked Notes into `Project.recoveryNotes`, then removed those Note rows.
- Removed the Priority model and client workspace collection.
- Retained internal `Deadline` storage plus legacy `/deadline` and `priorities` sync compatibility.
- Added queued-mutation reconciliation so rapid consecutive offline-first writes are not overwritten by an older sync response.

Implemented behavior:
- Added Dashboard Quick Capture above all content.
- Rebuilt Daily timeline as a compact editable list with optional time and persistent cross/uncross completion.
- Added a separate Dashboard Tasks section with Show completed support.
- Made Dates important-date records only and added canonical `/dates` navigation.
- Reordered project detail and removed project Notes / Decisions.
- Removed daily/weekly priority UI, seeds, state, sync data, and review prompts.
- Bumped package and shell version to `0.2.2`.

Verification:
- Prisma validate/generate, migration, and seed passed.
- Typecheck passed.
- Full Playwright suite passed with 28 tests.
- Build and Browser smoke evidence are recorded in `QA_REPORT.md`.

## v0.2.1 Stale Local Cache Recovery

Status:
Implemented locally and verified on 2026-06-10.

Goal:
Make browser-local stale workspace data recoverable after external seed/reset without overwriting pending offline mutations.

Schema changes:
None.

Implemented behavior:
- Bumped package metadata to `0.2.1`.
- Added a compact guarded `Refresh` action to the workspace shell sync indicator.
- Kept Settings refresh aligned with the same guard.
- Refresh from server is disabled while offline, syncing, refreshing, or while pending local mutations exist.
- Updated shell version label to `MVP v0.2`.
- Made starter review, dashboard scratchpad, and dashboard preference creation idempotent under reset/bootstrap races.

Verification:
- `npm run db:seed` - passed.
- `npx playwright test tests/e2e/contextos.spec.ts -g "draft-saved domain edit|settings exposes sync visibility|global server refresh"` - passed, 3 tests.
- `npm run typecheck` - passed.
- `npm run build` - passed with existing `metadataBase` warning.
- `npm run test:e2e` - passed, 24 tests.
- In-app Browser Settings smoke - passed.

Known issues:
- This batch adds explicit recovery, not automatic server/cache generation drift detection.
- Existing `metadataBase` warning remains.

## v0.2.0 Daily Schedule Grid

Status:
Implemented locally and verified on 2026-06-10.

Goal:
Start v0.2 timeline maturity with a visual daily schedule grid for existing task time ranges while preserving the validated v0.1.x Dashboard/Today workflow.

Schema changes:
None.

Implemented behavior:
- Reuse existing `Task.startTime` and `Task.endTime`.
- Show valid timed tasks in 30-minute daily schedule rows from `06:00` to `22:00`, extending when timed tasks fall outside that range.
- Treat start-only tasks as 30-minute blocks.
- Keep untimed, overdue, in-progress-without-time, and invalid time ranges in an unscheduled/needs-attention list.
- Share the same schedule behavior between Dashboard and Today through `src/components/workspace/DailySchedule.tsx`.
- Preserve existing Dashboard add-task workflow, Today priorities/deadlines, task completion toggles, and project/domain labels.

Verification:
- `npm run db:migrate` - passed before v0.2 implementation; schema already in sync.
- `npm run db:seed` - passed before v0.2 implementation.
- `npm run typecheck` - passed.
- `npm run build` - passed with existing `metadataBase` warning.
- `npx playwright test tests/e2e/contextos.spec.ts -g "seeded demo account|daily timeline task|daily schedule|today tasks"` - passed, 4 tests.
- `npm run test:e2e` - passed, 23 tests.
- Desktop and 390px mobile in-app Browser smoke passed for Dashboard and Today schedule grids.

Known issues:
- No conflict detection, drag/drop scheduling, recurrence, or calendar import is included in this batch by design.

## v0.1.11 Dashboard Timeline and Schedule Tables

Status:
Implemented locally and verified on 2026-06-05.

Goal:
Apply `modificaitons.txt` items 1-3: piano schedule-like tables, rendered freeform dashboard editing, and a Dashboard Daily timeline with task time ranges.

Changed files:
- `prisma/schema.prisma`
- `prisma/migrations/20260605160000_add_task_time_range/migration.sql`
- `src/lib/types.ts`
- `src/lib/data.ts`
- `src/lib/sync-server.ts`
- `src/lib/client-store.tsx`
- `src/lib/starter.ts`
- `src/components/workspace/Dashboard2.tsx`
- `src/components/workspace/Views.tsx`
- `tests/e2e/contextos.spec.ts`
- `docs/CURRENT_AUDIT_2026-06-05.md`
- Active dev-loop docs and shared coordination docs

Schema changes:
- Added optional `Task.startTime`.
- Added optional `Task.endTime`.

Verification:
- `npx prisma generate` - passed.
- `npm run typecheck` - passed.
- `npm run build` - passed.
- `npx prisma validate` - passed.
- `git diff --check` - passed.
- `npm run db:migrate` - passed after Docker/Postgres became available.
- `npm run db:seed` - passed.
- `npm run test:e2e` - passed, 19 tests.

Known issues:
- DB-unavailable handling is still brittle.
- Already-open browser IndexedDB data can be stale after external seed/reset.
- `npm audit --audit-level=moderate` reports moderate advisories needing safe dependency review.
- Future-work concerns were promoted to `docs/MIGRATION_BACKLOG.md`.

## v0.1.9 Dashboard Deadlines, Areas Project Controls, Recovery Notes

Status:
Implemented locally and verified on 2026-06-04.

Goal:
Apply the next `modificaitons.txt` batch: dashboard deadline creation, optional deadline metadata, cleaner project hierarchy, in-app review prompts, Areas project create/delete, and a usable recovery notes canvas.

Changed files:
- `DEV_LOG.md`
- `DEV_STATE.md`
- `QA_REPORT.md`
- `RISK_REGISTER.md`
- `docs/PROJECT_STATE.md`
- `docs/VERSION_LOG.md`
- `prisma/schema.prisma`
- `prisma/migrations/20260604160000_add_recovery_deadline_review_fields/migration.sql`
- `src/components/workspace/Dashboard2.tsx`
- `src/components/workspace/Views.tsx`
- `src/lib/client-store.tsx`
- `src/lib/data.ts`
- `src/lib/starter.ts`
- `src/lib/sync-server.ts`
- `src/lib/types.ts`
- `tests/e2e/contextos.spec.ts`

Schema changes:
- Added `Project.recoveryNotes`.
- Added `Deadline.time` and `Deadline.location`.
- Added `DashboardPreference.reviewPromptDismissals`.

Implemented behavior:
- Dashboard Dates can create deadlines with date, optional time, optional location, and optional project.
- Dashboard task creation can optionally assign a project.
- Deadlines expose editable time/location/project metadata on deadline surfaces.
- Projects page is a root-project index with expand/collapse for nested subcontexts.
- Expanded Areas can create root projects and soft-delete projects into trash.
- Dashboard shows dismissible in-app daily/weekly review prompts.
- Project detail recovery canvas now preserves structured fields and adds freeform markdown recovery notes without heading-parser fragility.

Verification:
- `npx prisma generate` - passed.
- `npm run db:migrate` - passed.
- `npm run db:seed` - passed.
- `npm run typecheck` - passed.
- `npm run build` - passed.
- `npm run test:e2e` - passed, 19 tests.

Known issues:
- Review reminders are in-app only and appear when the app is open; no browser/OS notifications are implemented.
- Deadline time is stored as local `HH:mm` text and intentionally does not introduce timezone conversion.

## v0.1.8 Visual Design-System Alignment

Status:
Implemented locally and verified on 2026-06-04.

Goal:
Apply `DESIGN.md` visual direction across the existing app while preserving all functionality and data behavior.

Changed files:
- `DEV_STATE.md`
- `DEV_LOG.md`
- `QA_REPORT.md`
- `RISK_REGISTER.md`
- `shared/errors.md`
- `docs/PROJECT_STATE.md`
- `docs/VERSION_LOG.md`
- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/components/AuthForm.tsx`
- `src/components/workspace/Dashboard2.tsx`
- `src/components/workspace/MarkdownEditor.tsx`
- `src/components/workspace/Views.tsx`
- `src/components/workspace/WorkspaceShell.tsx`
- `tests/e2e/contextos.spec.ts`

Schema changes:
None.

Implemented visual changes:
- Added shared ContextOS tokens for backgrounds, elevated surfaces, text, borders, primary accent, status colors, focus rings, radii, shadows, and light/dark aliases.
- Restyled shared page, surface, row, button, input, pill, and empty-state classes.
- Aligned auth pages, shell/navigation, dashboard command sheet, markdown editor, route surfaces, cards, rows, badges, search/settings/review surfaces, and mobile spacing to the calm operational direction in `DESIGN.md`.
- Tightened card/panel radius to 8px or less and removed large rounded card remnants.
- Updated browser theme color metadata to the ContextOS accent.

Behavior changes:
None intended. No route, API, auth, offline sync, data model, Prisma, migration, or business-logic behavior was intentionally changed.

Verification:
- `npx prisma generate` - passed.
- `npm run db:migrate` - passed.
- `npm run db:seed` - passed.
- `npm run typecheck` - passed.
- `npm run build` - passed.
- `npm run test:e2e` - passed, 18 tests.
- Desktop/mobile visual smoke - passed; artifacts saved to `test-results/contextos-design-desktop.png` and `test-results/contextos-design-mobile.png`.

Known issues:
- This pass aligns the existing UI; it does not introduce new dashboard functionality or a new design-system library.

## v0.1.7 Sprint 7 - Workspace Markdown Canvas

Status:
Implemented locally and verified on 2026-06-04.

Goal:
Turn the dashboard and project recovery surfaces into markdown-first workspaces while keeping ContextOS execution-first.

Changed files:
- `DEV_STATE.md`
- `DEV_LOG.md`
- `QA_REPORT.md`
- `RISK_REGISTER.md`
- `shared/**`
- `docs/PROJECT_STATE.md`
- `docs/RUN_PROTOCOL.md`
- `docs/VERSION_LOG.md`
- `src/app/globals.css`
- `src/components/workspace/MarkdownEditor.tsx`
- `src/components/workspace/Views.tsx`
- `src/components/workspace/WorkspaceShell.tsx`
- `tests/e2e/contextos.spec.ts`

Schema changes:
None.

Implemented behavior:
- Added a reusable markdown block editor that visually renders editable headings, subheadings, bullets, checkboxes, quotes, and code fences while saving plain markdown.
- Dashboard Canvas now absorbs quick capture: `/task`, `/note`, `/project`, `/deadline`, and `/status` lines create existing capture records from the editor.
- Dashboard integrates Today's priorities and Today tasks beside the canvas.
- Today tasks remain visible and crossed off after completion when they still belong to today's due/planned/in-progress set.
- Areas open in place to show projects and nested subcontexts.
- Project detail pages now use one recovery markdown editor for current objective, next action, latest status, and open loops.
- Workspace dark mode is toggleable from the shell and persists in local storage.

Verification:
- `npm run typecheck` - passed.
- `npm run build` - passed.
- `npx playwright test -g "dashboard canvas|today tasks|offline capture"` - passed, 3 tests.
- `npm run test:e2e` - passed, 16 tests.
- Browser/visual smoke - passed by DOM and local screenshot; dashboard editor rendered in dark mode at `test-results/dashboard-dark-smoke.png`.

Known issues:
- Markdown editing is line/block based, not a full collaborative rich-text engine.
- Slash captures preserve the slash-command capture text in Inbox and visually replace the editor line locally; saving the canvas remains explicit.
- Dark mode uses global utility overrides rather than a full tokenized component theme.

Next sprint recommendation:
Use v0.1.7 during the real workday trial and record whether editor-integrated slash capture and project recovery canvas reduce field-hopping.

## v0.1.6 Sprint 6 - PARA Foundation

Status:
Implemented locally and verified on 2026-06-04.

Goal:
Set up ContextOS around PARA while keeping v0.1.x execution-first: nested projects/subcontexts, Dashboard Canvas, Areas, and Resources.

Changed files:
- `BLUEPRINT.md`
- `prisma/schema.prisma`
- `prisma/migrations/20260603170000_add_project_parent/migration.sql`
- `src/app/(workspace)/areas/page.tsx`
- `src/app/(workspace)/resources/page.tsx`
- `src/components/workspace/Views.tsx`
- `src/components/workspace/WorkspaceShell.tsx`
- `src/lib/client-store.tsx`
- `src/lib/data.ts`
- `src/lib/starter.ts`
- `src/lib/sync-server.ts`
- `src/lib/types.ts`
- `tests/e2e/contextos.spec.ts`
- `docs/PROJECT_STATE.md`
- `docs/RUN_PROTOCOL.md`
- `docs/REPO_MAP.md`
- `docs/VERSION_LOG.md`

Schema changes:
- Added nullable `Project.parentProjectId`.
- Added index on `(userId, parentProjectId)`.
- Kept hierarchy lightweight without a strict self-referential foreign key for v0.1.x offline sync simplicity.

Implemented behavior:
- Projects can be nested as subcontexts.
- Parent project pages roll up descendant tasks and deadlines with child project labels.
- Projects page shows root projects with subcontext previews and rollup counts.
- Dashboard includes a persisted markdown Dashboard Canvas stored as a standalone Resource note.
- Added Areas route using Domains as ongoing areas.
- Added Resources route using standalone Notes as resources.
- Sidebar navigation is grouped into Execution, PARA, and Review.
- Demo seed now includes nested ContextOS Demo subcontexts and a Dashboard Canvas resource.

Verification:
- `npm run db:migrate` - passed after starting the local Postgres container.
- `npm run db:seed` - passed.
- `npm run typecheck` - passed.
- `npm run build` - passed.
- `npm run test:e2e` - passed, 14 tests.
- Browser smoke - passed; demo login reached Dashboard, Projects showed seeded subcontexts, Areas rendered, and Resources showed Dashboard Canvas.

Known issues:
- Areas are still Domains in v0.1.x; there is no separate Area table yet.
- Resources are standalone Notes; there is no rich collection/database, formula, routine, or spaced-repetition engine yet.
- Archiving/trashing a parent project does not cascade to children.

Next sprint recommendation:
Run the one-day real usage trial with special attention to assistantship/course nesting, Dashboard Canvas usefulness, and whether piano/vocabulary should remain Resources or become richer v0.2 personal-system features.

## v0.1.5 Sprint 5 - Real Usage Trial Prepared

Status:
In progress. The one-day real usage trial still needs to be performed by the user before v0.1.5 can be considered complete.

Goal:
Prepare the trial artifacts and protocol so the app can be used for one real workday without inventing new features first.

Changed files:
- `docs/FRICTION_LOG.md`
- `docs/RUN_PROTOCOL.md`
- `docs/PROJECT_STATE.md`
- `docs/VERSION_LOG.md`

Schema changes:
None.

Prepared trial artifacts:
- Trial rules and acceptance tracker.
- Capture/inbox checkpoint table.
- Friction entry templates.
- Ranked friction list template.
- Trial closeout prompts.
- Local-dev offline reload verification guidance.

Verification:
- `npm run typecheck` - passed.
- `npm run build` - passed.
- `npm run test:e2e` - passed, 11 tests.
- `git diff --check` - passed with CRLF warnings only.
- Browser smoke at `http://localhost:3000/login` - passed; demo login reached Dashboard and Quick Capture was visible.

Known issues:
- The real usage trial is intentionally not simulated. It requires actual daily use.
- No v0.2.0 feature work should start until the friction log has been filled and ranked.

Next sprint recommendation:
Complete the v0.1.5 real usage trial, then fix only obvious small bugs found during use.

## v0.1.4 Sprint 4 - Offline Sync Visibility + Conflict Warnings

Goal:
Make offline sync state visible and trustworthy: pending work, retry, refresh, errors, and stale overwrite warnings should be obvious to the user.

Changed files:
- `src/lib/types.ts`
- `src/lib/sync-server.ts`
- `src/app/api/sync/route.ts`
- `src/lib/client-store.tsx`
- `src/components/workspace/WorkspaceShell.tsx`
- `src/components/workspace/Views.tsx`
- `tests/e2e/contextos.spec.ts`
- `docs/PROJECT_STATE.md`
- `docs/VERSION_LOG.md`

Schema changes:
None.

Manual/e2e behavior covered:
- Settings shows sync status, pending count, last sync, last refresh, stale warning count, retry sync, and refresh-from-server controls.
- The global shell shows online/offline, syncing, pending, error, and stale-warning state.
- Draft-save fields show an offline queue warning while editing offline.
- The sync API returns stale warnings for older offline mutations while acknowledging them so the outbox can clear.
- Offline capture data is verified durable in IndexedDB across a browser reload, then visible and synced after reconnect.

Verification:
- `npm run typecheck` - passed.
- `npm run build` - passed.
- `npm run db:migrate` - passed earlier in the sprint against local Postgres; no schema changes.
- `npm run db:seed` - passed against local Postgres.
- `npm run test:e2e` - passed, 11 tests.
- `git diff --check` - passed with CRLF warnings only.

Known issues:
- Stale conflict handling is warning-only; there is no merge/diff UI yet.
- In the dev server e2e environment, offline route reloads prove durable cache state directly before reconnecting; production offline hydration still depends on the app shell and chunks being cached by the service worker.

Next sprint recommendation:
Sprint 5 - real usage trial and friction audit.

## v0.1.3 Sprint 3 - Mutation Hygiene + Draft-Save Behavior

Goal:
Stop high-churn text fields from creating sync mutations on every keystroke, while keeping offline edits recoverable and easy to understand.

Changed files:
- `src/components/workspace/Views.tsx`
- `tests/e2e/contextos.spec.ts`
- `docs/PROJECT_STATE.md`
- `docs/VERSION_LOG.md`

Schema changes:
None.

Manual test result:
- Ran a focused local browser smoke against `http://localhost:3000`.
- Went offline on a project detail page.
- Edited Latest Status with a 30+ character draft.
- Confirmed unsaved state appeared.
- Saved the draft and confirmed pending count became `1`, not one mutation per typed character.
- Went online, synced, and confirmed pending count returned to `0`.

Verification:
- `npm run typecheck` - passed.
- `npm run build` - passed.
- `npm run db:migrate` - passed against local Postgres; no schema changes.
- `npm run db:seed` - passed against local Postgres.
- `npm run test:e2e` - passed, 9 tests.

Known issues:
- Draft fields save on blur as well as explicit Save. This protects against accidental navigation, but a future richer editor may want clearer cancel/discard behavior.
- Date inputs and select controls still sync immediately because each change is a discrete intentional edit.

Next sprint recommendation:
Sprint 4 - offline sync visibility and conflict warnings.

## v0.1.2 Sprint 2 - Local Date + Time Correctness

Goal:
Fix date handling so Today, This Week, priorities, task planned/due dates, and deadlines use the user's local calendar day instead of UTC slicing.

Changed files:
- `src/lib/dates.ts`
- `src/lib/client-store.tsx`
- `src/lib/data.ts`
- `src/lib/sync-server.ts`
- `src/lib/starter.ts`
- `src/components/workspace/Views.tsx`
- `tests/e2e/contextos.spec.ts`
- `docs/PROJECT_STATE.md`
- `docs/VERSION_LOG.md`

Schema changes:
None.

Manual test result:
- Opened the local app in the in-app browser at `http://localhost:3000`.
- Logged in with the seeded local demo account.
- Confirmed Today rendered.
- Confirmed Deadlines hydrated date inputs as `YYYY-MM-DD` values after workspace data loaded.

Verification:
- `npm run typecheck` - passed.
- `npm run build` - passed.
- `npm run db:migrate` - passed against local Postgres; no schema changes.
- `npm run db:seed` - passed against local Postgres.
- `npm run test:e2e` - passed, 7 tests.

Known issues:
- Existing records previously stored as local-midnight `DateTime` values may need a one-off correction if they were created before this fix and display one day off. Fresh seed/sync writes now use canonical UTC-midnight date-only values.

Next sprint recommendation:
Sprint 3 - mutation hygiene and intentional draft-save behavior.

## v0.1.1 Sprint 1 - Security + Deploy Hygiene

Goal:
Remove obvious security and deployment footguns before sharing or deploying the project.

Changed files:
- `.gitignore`
- `.env.example`
- `ContextOS v0.1.zip`
- `README.md`
- `docs/DEPLOYMENT.md`
- `docs/RUN_PROTOCOL.md`
- `docs/PROJECT_STATE.md`
- `prisma/seed.ts`
- `src/app/api/reset-demo/route.ts`
- `src/components/AuthForm.tsx`
- `tests/e2e/contextos.spec.ts`
- `vercel.json`

Local-only updates:
- Ignored `.env` was reset to localhost Postgres defaults, given a fresh `AUTH_SECRET`, and updated to the new demo seed password.

Schema changes:
None.

Manual test result:
- Confirmed `ContextOS v0.1.zip` no longer contains `.env`.
- Confirmed `vercel.json` does not run `npm run db:seed`.
- Confirmed non-ignored source only contains local/example credentials and the public demo seed password.
- Confirmed local `.env` now targets localhost before destructive seed/reset verification.

Verification:
- `npm run typecheck` - passed.
- `npm run build` - passed.
- `npm run db:migrate` - passed against local Postgres.
- `npm run db:seed` - passed against local Postgres.
- `npm run test:e2e` - passed, 5 tests.

Known issues:
- External Neon/Postgres credential rotation cannot be completed from this repo alone. Rotate it in the provider and update deployment environment variables.
- Git history contains previous `.env.example` commits, but `.env` itself was not tracked in the checked history.

Next sprint recommendation:
Sprint 2 - local date and timezone correctness.
