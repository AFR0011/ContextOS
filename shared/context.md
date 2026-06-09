# Shared Context

- Phase: QA COMPLETE
- Active batch: 2026-06-09 Dashboard Notepad command surface
- Owner: Docs-QA
- Planner handoff: Replace dashboard Dates/Daily timeline with one Notepad command surface while preserving structured Tasks/Deadlines, `/deadlines`, project detail UI, offline sync, and soft trash.
- Latest feedback: Implementation verified with parser/typecheck/build/db/targeted Playwright/full e2e evidence.
- Current risks: see `RISK_REGISTER.md` (notably task location/syntax v1 limits, DB-unavailable handling, stale browser cache after external seed/reset, and moderate dependency advisories).
- Next required action: Trial the Notepad command surface and decide whether Task location belongs in a future schema batch.

## Implementation Summary

**Task:** Dashboard Notepad command surface.
**Status:** QA complete.

**Changes:**
- Replaced dashboard Dates/Daily timeline with Notepad groups for Today, Upcoming, Completed, and Scratch.
- Projected dated Tasks and non-trashed Deadlines as entity-backed todo blocks.
- Added scheduled syntax promotion/edit/demotion validation and persistence coverage.
- Serialized rapid outbox appends and hardened starter dashboard singleton rows.

**Verification:**
- `npm run test`, `npm run typecheck`, `npm run build`, DB migrate/seed, targeted Playwright, and full `npm run test:e2e` passed.
