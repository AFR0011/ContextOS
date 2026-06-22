# ContextOS Dev State

## Active Loop

- Status: CLOSE - Batch v0.2.8 task-driven daily timeline
- Date: 2026-06-22
- Active batch: v0.2.8 task-driven daily timeline
- Completed batch: v0.2.7 cleanup and production-readiness foundation
- Canonical product source: `BLUEPRINT.md`
- Tooling fallback: dev-loop helper scripts are not present under `tools/`, so this cycle is using the documented local phase-artifact fallback.

## Active Batch Plan

Scope this cycle to one independently testable dashboard workflow batch:

1. Audit the current product, QA, UI/UX, and senior-engineering state from the active docs and implementation.
2. Keep the Daily timeline backed by real tasks, but make it visibly task-driven from the dashboard Tasks list.
3. Add today important Dates into the Daily timeline so the day view is built from the day's tasks and dated commitments.
4. Add lightweight task movement affordances between Dashboard Tasks and Daily timeline:
   - drag a task into Daily timeline to plan it for today,
   - drag a task back to Tasks to clear today timeline placement where possible,
   - use row actions or right-click as an accessible fallback.
5. Preserve existing task editing, completion, deletion, sorting, show-completed, offline outbox, and mobile wrapping behavior.
6. Update focused regression coverage and canonical docs/state.

Out of scope for this batch: schema changes, external calendar integration, recurrence, AI scheduling, arbitrary manual ordering, time durations, empty calendar grids, and broad visual redesign.

Acceptance criteria:

- Daily timeline includes tasks planned or due today and important Dates scheduled for today.
- Adding a task from the Daily timeline creates a real task planned for today.
- A task in Dashboard Tasks can be added to today’s Daily timeline by drag/drop and by a row action/context menu.
- A task planned for today can be removed from the Daily timeline without deleting the task.
- Dates remain non-completable Date records, not task checkboxes.
- Existing Dashboard, Today, Project task surfaces, and task sort/completion behavior keep working.
- `npm run typecheck` and `npm run build` pass.

## Outcome

Batch complete with DB-backed e2e blocked by local infrastructure.

Implemented the task-driven Daily timeline batch:

- Extended the shared `DailySchedule` component to render task rows and today Date rows.
- Added drag/drop task movement hooks and row-action/right-click menus for adding tasks to, and removing tasks from, the Dashboard Daily timeline.
- Updated the Dashboard Daily timeline to include tasks planned or due today plus important Dates dated today.
- Kept newly created timeline tasks as real Task records planned for today.
- Kept Dates as non-completable Date records with editable time and archive/restore behavior.
- Updated Dashboard Tasks so it remains the broader task reservoir and can plan tasks into today's timeline.
- Added focused e2e coverage for task movement and today Dates appearing in the timeline.

## Acceptance Evidence

| Criteria | Status |
| --- | --- |
| Daily timeline includes tasks planned or due today and important Dates scheduled for today | DONE in code; e2e coverage added but not run to completion because DB is unavailable |
| Adding a task from the Daily timeline creates a real task planned for today | PRESERVED |
| A task in Dashboard Tasks can be added to today's Daily timeline by drag/drop and by a row action/context menu | DONE in code; e2e coverage added but not run to completion because DB is unavailable |
| A task planned for today can be removed from the Daily timeline without deleting the task | DONE in code; e2e coverage added but not run to completion because DB is unavailable |
| Dates remain non-completable Date records, not task checkboxes | DONE |
| Existing Dashboard, Today, Project task surfaces, and task sort/completion behavior keep working | STATIC PASS; full e2e blocked |
| `npm run typecheck` and `npm run build` pass | DONE |

## Verification

- `python tools/context_manager.py init --root .` - blocked; helper script is not present.
- `python -m py_compile tools/context_manager.py tools/performance_tracker.py tools/consistency_validator.py tools/risk_assessor.py` - blocked; helper scripts are not present.
- `npm run typecheck` - initially failed on a Today-view task-row type assumption after introducing mixed schedule rows; fixed by narrowing the Today local rows to task rows.
- `npm run typecheck` - passed after fixes.
- `PLAYWRIGHT_PORT=3001 npx playwright test tests/e2e/contextos.spec.ts -g "dashboard tasks can move|dashboard can add a project-linked important date|dashboard daily timeline supports one time|dashboard daily timeline supports untimed" --workers=1` - timed out before returning usable test output.
- `docker compose ps` - blocked because Docker Desktop's Linux engine pipe is unavailable, so DB-backed Playwright verification cannot complete in the current local state.
- `npm run build` - passed.
- `npx prisma validate` - passed.
- `git diff --check` - passed with line-ending normalization warnings only.

## Remaining Risks

- Drag/drop behavior needs browser regression coverage because native HTML drag events can be brittle across inputs and touch devices.
- Removing a task from the timeline clears today planning/time placement; tasks that are due today should still surface because they are still dated commitments.
- Full DB-backed e2e and browser smoke still need to run once Docker/Postgres is available.

## Next Action

Start Docker/Postgres, rerun the focused Dashboard timeline e2e slice, then run the full documented e2e ladder if the focused slice passes.
