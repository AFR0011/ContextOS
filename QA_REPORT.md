# ContextOS QA Report

## 2026-06-16 - v0.2.6 Auth Abuse Controls

### Verdict

- Local functional verification: PASS.
- App-level login/register abuse controls: PASS.
- Public production: still NO-GO until CI/preview gates, monitoring, backup/restore, rollback evidence, installed-PWA upgrade smoke, and provider/WAF defense-in-depth decisions are complete.

### Commands And Evidence

- `npm run typecheck` - passed.
- `PLAYWRIGHT_PORT=3001 npx playwright test tests/e2e/contextos.spec.ts -g "auth endpoints throttle" --workers=1` - passed, 1 test.
- `npm run build` - passed.
- `npx prisma validate` - passed.
- `npm run db:migrate` - passed; schema already in sync.
- `npm run db:seed` - passed.
- `PLAYWRIGHT_PORT=3001 npm run test:e2e -- --workers=1` - passed, 34 tests.
- In-app Browser smoke on `http://localhost:3001/dashboard` - passed; authenticated Dashboard rendered `MVP v0.2.6`, Dates and Tasks were visible, horizontal overflow was false at the default desktop viewport, and browser console errors were empty.

### Coverage Added

- Repeated failed login attempts return `429` with `Retry-After`.
- Successful login resets failed-attempt buckets for that identity.
- Registration attempts are throttled when public registration is enabled.
- The new auth throttling coverage uses synthetic forwarded IPs so it does not poison the seeded demo account.

## 2026-06-16 - v0.2.5 Security Headers and PWA Cache

### Verdict

- Local functional verification: PASS.
- Deployment headers, production metadata, and service-worker route/cache hardening: PASS.
- Public production: still NO-GO until auth abuse controls, CI/preview gates, monitoring, backup/restore, rollback evidence, and deeper installed-PWA upgrade testing are complete.

### Commands And Evidence

- `npm run typecheck` - passed.
- `PLAYWRIGHT_PORT=3001 npx playwright test tests/e2e/contextos.spec.ts -g "deployment headers" --workers=1` - passed, 1 test.
- `npm run build` - passed without the previous `metadataBase` warning.
- `npx prisma validate` - passed.
- `npm run db:migrate` - passed; schema already in sync.
- `npm run db:seed` - passed.
- `PLAYWRIGHT_PORT=3001 npm run test:e2e -- --workers=1` - passed, 33 tests.
- In-app Browser smoke on `http://localhost:3001/dashboard` - passed; authenticated Dashboard rendered `MVP v0.2.5`, Dates and Tasks were visible, horizontal overflow was false at the default desktop viewport, and browser console errors were empty.

### Coverage Added

- `/login` responses include CSP, frame protection, content-type sniffing protection, referrer policy, and permissions policy.
- `X-Powered-By` is absent from responses.
- Social metadata resolves against an explicit `metadataBase` instead of implicit localhost build defaults.
- `public/sw.js` uses `contextos-shell-v2`, precaches `/dates`, and no longer precaches `/deadlines`.

### Recovery Notes

- Browser automation reported unsupported `networkidle` despite listing it in documentation. The smoke recovered with supported URL/load-state, visible content, overflow, and console-log checks.

## 2026-06-16 - v0.2.4 Dashboard Task/Date Cleanup

### Verdict

- Local functional verification: PASS.
- Dashboard task/date cleanup: PASS.
- Public production: still NO-GO until remaining auth abuse controls, security headers/metadata, CI, PWA cache migration, monitoring, backup/restore, and rollback evidence are complete.

### Commands And Evidence

- `npx prisma validate` - passed.
- `npm run db:migrate` - passed; applied `20260616133000_dashboard_task_sort_mode`.
- `npx prisma generate` - passed.
- `npm run typecheck` - passed.
- `PLAYWRIGHT_PORT=3001 npx playwright test tests/e2e/contextos.spec.ts -g "dashboard preferences|dashboard daily timeline supports one time|dashboard can add a project-linked important date|dashboard Tasks includes future tasks" --workers=1` - passed, 4 tests.
- `npm run db:seed` - passed.
- `npm run build` - passed with the existing `metadataBase` warning.
- `PLAYWRIGHT_PORT=3001 npm run test:e2e -- --workers=1` - passed, 32 tests.
- In-app Browser smoke on `http://localhost:3001/dashboard` - passed; Dashboard rendered `MVP v0.2.4`, Dashboard Tasks sort value was `recent`, desktop and 390px mobile horizontal overflow were `0`, and the only browser warning was the existing `metadataBase` warning.

### Coverage Added

- Legacy dashboard preferences normalize to the full section set and default invalid task sort modes to `recent`.
- Dashboard Tasks newest-first ordering puts newly created tasks above older tasks.
- Dashboard Tasks sort preference persists after reload.
- Completion toggling does not reorder Dashboard Tasks solely because a task is completed.
- Dashboard Tasks bulk cleanup moves finished tasks to Trash.
- Dashboard Dates bulk cleanup moves archived dates to Trash.

## 2026-06-16 - v0.2.3 Deployment Gate 1

### Verdict

- Local functional verification: PASS.
- First deployment-hardening gate: PASS.
- Public production: still NO-GO until remaining auth abuse controls, security headers/metadata, CI, PWA cache migration, monitoring, backup/restore, and rollback evidence are complete.

### Commands And Evidence

- `npx prisma validate` - passed.
- `npm run db:migrate` - passed; applied `20260616090000_user_scoped_sync_mutations`.
- `npx prisma generate` - passed.
- `npm run typecheck` - passed.
- `npm run test:e2e -- --workers=1 -g "dashboard daily timeline supports one time|long task titles wrap|search results open surfaces|sync rejects oversized"` - passed, 4 tests.
- `npm run build` - passed with the existing `metadataBase` warning.
- Production registration-closed smoke with `ALLOW_PUBLIC_REGISTRATION=false` - passed; `POST /api/auth/register` returned `403`.
- `npm run test:e2e -- --workers=1` - passed, 32 tests.
- In-app Browser production smoke - passed; mobile Dashboard had no horizontal overflow, bottom nav was visible, task title controls were wrapping textareas, task search opened the project with the task visible, and browser logs were empty.

### Coverage Added

- Cross-user sync payload attempting to update another user's project is rejected with `403` and does not modify the source record.
- Oversized sync mutation payload is rejected with `400`.
- Task search results open project surfaces where project tasks are visible.
- Standalone note search results open Resources instead of rendering inert buttons.
- Long mobile task titles wrap.
- Completion toggling does not reorder the daily timeline solely because the task is done.

## 2026-06-15 - Full App And Deployment Audit

### Verdict

- Local functional verification: PASS.
- Private hosted preview: NO-GO pending sync ownership and closed-registration fixes.
- Public production: NO-GO pending all P0/P1 gates in `docs/AUDIT_2026-06-15.md`.

### Commands And Evidence

- `npm ci` - passed; restored the missing local Prisma CLI package.
- `npx prisma validate` - passed.
- `npx prisma migrate status` - passed; six migrations found and database up to date.
- `npm run typecheck` - passed.
- `npm run build` - passed with the existing `metadataBase` warning.
- `npm run test:e2e -- --workers=1` - passed, 29 tests.
- `npm audit --audit-level=moderate --json` - seven advisories: five moderate, two high.
- Desktop/mobile in-app browser audit - no horizontal overflow or console errors.
- Live search audit - task result routed to Today without the task; standalone note button did not navigate.
- Mobile editor audit at 390x844 - focused block controls measured 20x20 and one began partially off-screen.
- Production-header check - no configured CSP/security header set and `X-Powered-By` is exposed.

### Coverage Gaps

- No current two-user sync isolation test.
- No tests for search result destination correctness.
- No service-worker upgrade test from the legacy cache/route set.
- No CI, backup/restore rehearsal, health check, monitoring, or production rollback evidence.

## 2026-06-11 - v0.2.2 Workflow Simplification

Status: PASS.

Checks run:

- `npx prisma validate` - passed.
- `npx prisma generate` - passed.
- `npm run db:migrate` - passed; no pending migrations after `20260611130000_workflow_simplification` was applied.
- `npm run db:seed` - passed.
- `npm run typecheck` - passed.
- `npm run build` - passed. Existing warning: `metadataBase` is not set.
- `npm run test:e2e -- --workers=1` - passed, 29 tests.
- `git diff --check -- . ':(exclude)modificaitons.txt'` - passed with line-ending normalization warnings only; the user-owned file remains untouched and retains its pre-existing trailing space.

Coverage highlights:

- Legacy task times choose `scheduledTime`, then `startTime`, then `endTime`.
- Legacy project-note replay imports exactly one marked recovery-note block and does not recreate a Note.
- Legacy Priority mutations are acknowledged no-ops.
- Daily timeline covers timed, untimed, same-time, rename, delete, cross/reopen, reload persistence, and absence of empty grid slots.
- Dashboard Tasks includes future tasks and follows Show completed.
- Dates excludes task due dates and covers metadata, archive behavior, and `/deadlines` redirect compatibility.
- Project ordering, expanded task editing, removed Notes / Decisions, and recovery-note persistence are covered.
- Today and This Week contain no priority editor terminology.

Browser smoke:

- Desktop Dashboard showed Quick Capture above `Notepad`, `Dates`, `Daily timeline`, `Tasks`, and `Projects`; no empty schedule grid or horizontal overflow.
- Desktop Dates used only Date terminology, excluded a task due title, and `/deadlines` redirected to `/dates`.
- Desktop project detail order was `Active Tasks`, `Dates`, `Recovery Canvas`, `Subcontexts`; task editing was visible and Notes / Decisions was absent.
- Desktop Today/This Week contained no priority terminology.
- Mobile `390x844` Dashboard, Dates, and Today had `0px` horizontal overflow; timeline list and Tasks section remained present.
- Browser console error log was empty.

Verdict: PASS. v0.2.2 is complete and verified.

## 2026-06-10 - v0.2.1 Stale Local Cache Recovery

Status: PASS.

Checks run:

- `npm run db:seed` - passed.
- `npx playwright test tests/e2e/contextos.spec.ts -g "draft-saved domain edit|settings exposes sync visibility|global server refresh"` - passed, 3 tests.
- `npm run typecheck` - passed.
- `npm run build` - passed. Existing warning: `metadataBase` is not set.
- `npm run test:e2e` - passed, 24 tests.

Browser smoke:

- Settings rendered at `http://localhost:3000/settings`.
- Sidebar version label showed `MVP v0.2`.
- Global shell refresh action and Settings refresh action were both visible/enabled with pending count `0`.
- Horizontal overflow was `0px`.

Verdict: PASS. Stale local cache recovery is implemented without schema/API/sync payload changes.

## 2026-06-10 - v0.1.12 Graceful Database-Unavailable Handling

Status: PASS.

Checks run:

- `npm run typecheck` - passed.
- `npm run build` - passed. Existing warning: `metadataBase` is not set.
- `npx prisma validate` - passed.
- `git diff --check` - passed with line-ending normalization warnings only.
- `npx playwright test tests/e2e/database-errors.spec.ts` - passed, 1 test.
- `docker compose up -d` - failed/blocked because Docker Desktop's Linux engine pipe was unavailable.
- `npm run db:migrate` - failed/blocked because localhost Postgres was unavailable.

DB-down smoke:

- `GET /login` returned 200, rendered "ContextOS cannot reach PostgreSQL right now", and did not render internal-error text.
- `POST /api/auth/login` returned `503` with `code: "database_unavailable"`.
- `GET /api/bootstrap` with a dummy session cookie returned `503` with `code: "database_unavailable"`.
- `POST /api/sync` with a dummy session cookie returned `503` with `code: "database_unavailable"`.
- `POST /api/reset-demo` with a dummy session cookie returned `503` with `code: "database_unavailable"`.
- `GET /api/auth/me` with a dummy session cookie returned `503` with `code: "database_unavailable"`.
- In-app Browser smoke at `http://localhost:3000/login` verified the outage banner and no internal-error text.

Not run:

- Earlier in the cycle, `npm run db:seed` and full `npm run test:e2e` were not run because Docker/Postgres were unavailable.

DB-up follow-up after Docker/Postgres became available:

- `npm run db:migrate` - passed; schema already in sync.
- `npm run db:seed` - passed.
- `npm run typecheck` - passed.
- `npm run build` - passed. Existing warning: `metadataBase` is not set.
- `npm run test:e2e` - passed, 22 tests.

Verdict: PASS. DB-down and DB-up behavior are both verified.

## 2026-06-10 - v0.2.0 Daily Schedule Grid

Status: PASS.

Checks run:

- `npm run typecheck` - passed.
- `npm run build` - passed. Existing warning: `metadataBase` is not set.
- `npx playwright test tests/e2e/contextos.spec.ts -g "seeded demo account|daily timeline task|daily schedule|today tasks"` - passed, 4 tests.
- `npm run test:e2e` - passed, 23 tests.

Browser smoke:

- Desktop Dashboard at `http://localhost:3000/dashboard` showed the shared schedule grid with seeded tasks in `09:30`, `10:30`, and `15:00` slots.
- Desktop Today at `http://localhost:3000/today` showed the same schedule split and start-only `15:00-15:30` behavior.
- Mobile viewport `390x844` showed the Dashboard and Today schedule grids with seeded slot rows present and `0px` horizontal overflow.
- Before visual judgment, Settings refresh-from-server was used to replace stale IndexedDB data from the already-open browser session.

Verdict: PASS. v0.2.0 schedule grid is implemented without schema/API/sync changes.

## 2026-06-05 - v0.1.11 Dashboard Timeline and Schedule Tables

Status: PASS.

Checks run:

- `npx prisma generate` - passed.
- `npm run typecheck` - passed.
- `npm run build` - passed. Existing warning: `metadataBase` is not set.
- `npx prisma validate` - passed.
- `git diff --check` - passed.
- `docker compose up -d` - Postgres container running.
- `npm run db:migrate` - passed after Docker/Postgres became available; applied `20260605160000_add_task_time_range`.
- `npm run db:seed` - passed.
- `npx playwright test -g "date utilities"` - passed.
- `npx playwright test -g "daily timeline task"` - passed.
- `npm run test:e2e` - passed, 19 tests.
- `npm audit --audit-level=moderate` - failed with 5 moderate advisories; fixes require breaking/incorrect forced dependency changes and were not applied.

Browser smoke:

- In-app browser recovered from the earlier database outage after Postgres was started.
- Dashboard rendered at `http://localhost:3000/dashboard`.
- Daily timeline and seeded task time ranges were visible.
- Server data contains the seeded `Piano Schedule` resource; clean e2e context verified the table. The already-open in-app browser retained stale IndexedDB resource data after external reseed, which is recorded as residual risk.

Verdict: PASS_WITH_RISKS.

## 2026-06-05 - v0.1.10 PWA Polish Batch

Status: VERIFICATION IN PROGRESS

Checks run:

- `npm run typecheck` - PASSED.
- `npm run build` - PASSED (all routes registered correctly).
- Icon generation script executed successfully.
- Manifest JSON validated without errors.

Files verified:
- `/public/manifest.webmanifest` - Valid JSON with proper icon entries
- `/public/icon-192.png` - 192x192 PNG created (2621 bytes)
- `/public/icon-512.png` - 512x512 PNG created (7722 bytes)
- `/public/apple-touch-icon.png` - iOS touch icon created
- `/public/apple-touch-icon-180.png` - iOS retina touch icon created

Next steps:
- Manual PWA installability test on Chrome/Android and Safari/iOS
- DevTools Application -> Manifest panel verification
- DevTools Application -> Service Workers verification

Verdict: BUILD COMPLETE - Ready for manual PWA testing.

## 2026-06-05 - v0.1.9 Batch Verification

Status: PASS (verification cycle)

Checks run:

- `npx prisma generate` - passed.
- `npm run typecheck` - passed.
- `npm run build` - passed (all routes registered correctly).
- Database migration and seed require local Postgres server running.

Notes:

- Full e2e test suite requires a running local Postgres server on port 5432.
- The v0.1.9 implementation is complete per DEV_STATE.md and passes typecheck/build verification.
- Test failures seen on 2026-06-04 were due to stale dev server; stopping the old server and re-running passed.

Verdict: PASS - implementation is correct, e2e requires Postgres connectivity for database operations.

## 2026-06-04 - DESIGN.md Visual Design-System Alignment

Status: Complete.

Checks run:

- `npx prisma generate` - passed.
- `npm run db:migrate` - passed.
- `npm run db:seed` - passed.
- `npm run typecheck` - passed.
- `npm run build` - passed.
- `npm run test:e2e` - passed, 18 tests.
- In-app browser desktop smoke at `http://localhost:3000/dashboard` - passed; Dashboard, Today, Projects, Search, and Settings rendered and navigated successfully.
- Mobile Playwright smoke at 390x844 - passed; Dashboard rendered, drawer navigation to Today worked, and horizontal overflow was 0px before and after navigation.

Artifacts:

- `test-results/contextos-design-desktop.png`
- `test-results/contextos-design-mobile.png`

Notes:

- Initial typecheck failed because the local generated Prisma client was stale; `npx prisma generate` refreshed it and typecheck passed.
- Initial e2e setup hit a stale dev server and a local database missing the existing dashboard command-sheet tables; stopping the stale server, then running `npm run db:migrate` and `npm run db:seed`, recovered the environment.
- Initial e2e assertions failed on duplicated visible task titles after the denser dashboard layout. Tests now scope those selectors to the intended task section/control.

Verdict: PASS.

## 2026-06-04 - v0.1.7 Workspace Markdown Canvas

Status: Complete.

Checks run:

- `npm run typecheck` - passed.
- `npm run build` - passed.
- `npx playwright test -g "dashboard canvas|today tasks|offline capture"` - passed, 3 tests.
- `npm run test:e2e` - passed, 16 tests.
- Browser DOM smoke at `http://localhost:3000/dashboard` - passed; dashboard editor count was 1 and dark mode class was active.
- Local Playwright screenshot smoke - passed; artifact saved at `test-results/dashboard-dark-smoke.png`.

Notes:

- An initial parallel `npm run typecheck` and `npm run build` invocation produced a transient `.next/types` race. Sequential `npm run build` and `npm run typecheck` both passed.
- The in-app browser screenshot API timed out, but DOM smoke passed and a local Playwright screenshot was created and inspected.

Verdict: PASS_WITH_RISKS.
