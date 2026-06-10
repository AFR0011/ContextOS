# ContextOS Dev State

## Active Loop

- Status: EXECUTE IN PROGRESS - Batch v0.2.0 Daily Schedule Grid
- Date: 2026-06-10
- Active batch: v0.2.0 visual daily schedule grid for Dashboard and Today
- Source request: Implement the approved plan: close v0.1.12 DB-up verification, then start v0.2 timeline maturity with a schedule grid.
- Canonical product source: `BLUEPRINT.md`
- Baseline docs: `docs/PROJECT_STATE.md`, `docs/REPO_MAP.md`, `docs/RUN_PROTOCOL.md`

## Product Validation Signal

- The user reports one week of real app testing and that ContextOS does what it is supposed to do.
- Treat the v0.1.x execution-first workflow as validated for the current MVP surface.
- v0.2 may improve timeline maturity, but should preserve the current Dashboard/Today workflow.

## Previous Batch Closeout

### v0.1.12 Graceful Database-Unavailable Handling

Status: DONE.

DB-down behavior was already verified. After Docker/Postgres became available, DB-up regression verification passed:

```text
npm run db:migrate PASSED (already in sync)
npm run db:seed    PASSED
npm run typecheck  PASSED
npm run build      PASSED (existing metadataBase warning)
npm run test:e2e   PASSED (22 tests)
```

`R-2026-06-10-02` is closed.

## Active Batch Summary

### Goal

Start v0.2 with a lightweight, reversible Daily Schedule Grid that makes timed work easier to scan without turning ContextOS into a calendar clone.

### Intended Changes

| Area | Change |
|------|--------|
| Versioning | Bump `package.json` and `package-lock.json` to `0.2.0` |
| Shared schedule UI | Add a reusable Daily Schedule component/helpers using existing `Task.startTime` and `Task.endTime` |
| Dashboard | Replace the Daily timeline list rendering with the schedule grid plus an unscheduled/needs-attention list |
| Today | Show the same scheduled/unscheduled split while preserving priorities, deadlines, labels, and completion toggles |
| Tests | Add targeted Playwright coverage for seeded grid rows, timed task persistence, untimed items, invalid ranges, and Today parity |

### Acceptance Criteria

| Criteria | Status |
|----------|--------|
| No Prisma migration, API change, or sync payload shape change | PLANNED |
| Timed tasks with valid `startTime` render in 30-minute schedule rows | PLANNED |
| Start-only tasks render as 30-minute blocks | PLANNED |
| Untimed, overdue, in-progress-without-time, and invalid ranges render below the grid as unscheduled/needs-attention | PLANNED |
| Dashboard and Today both use the shared schedule behavior | PLANNED |
| Existing completion toggles and project/domain labels still work | PLANNED |
| Typecheck, build, targeted schedule tests, and full e2e pass | PLANNED |

### Risk Assessment

| ID | Risk | Level | Status |
|---|------|-------|--------|
| R-2026-06-10-04 | Schedule-grid visualization could make the daily command surface harder to scan on mobile | Medium | Open; keep compact rows, no drag/drop, verify with e2e and browser smoke |
| R-2026-06-10-05 | Sharing schedule logic between Dashboard and Today could regress existing task labels or completion behavior | Medium | Open; add targeted tests for both surfaces |
| R-2026-06-10-06 | Invalid time ranges could disappear if only valid grid placement is implemented | Low | Open; explicitly route invalid ranges to needs-attention list |

## Next Phase

1. Implement shared schedule helpers/component.
2. Wire Dashboard and Today to the shared schedule.
3. Add targeted Playwright coverage.
4. Run typecheck, build, targeted schedule tests, full e2e, and browser smoke.
5. Update docs/QA/risk state to close the v0.2.0 batch.
