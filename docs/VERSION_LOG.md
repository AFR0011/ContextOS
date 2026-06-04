# ContextOS Version Log

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
