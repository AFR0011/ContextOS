# Shared Context

- Phase: COMPLETE
- Active batch: v0.2.1 Stale Local Cache Recovery
- Owner: Docs-QA
- Planner handoff: Add a compact guarded server-refresh action to normal workspace chrome and align Settings guard behavior. Preserve pending offline work; no schema/API/sync payload changes.
- Latest feedback: v0.2.1 Stale Local Cache Recovery passed verification on 2026-06-10.
- Current risks: see `RISK_REGISTER.md` (notably provider-specific DB outage classification and moderate dependency advisories).
- Next required action: Stop this batch; select the next v0.2.x batch from `docs/MIGRATION_BACKLOG.md` or new user feedback.

## Implementation Summary

**Task:** v0.2.1 Stale Local Cache Recovery.
**Status:** complete.

**Changes:**
- Bump package metadata to `0.2.1`.
- Added a guarded global refresh-from-server action.
- Disabled refresh when offline, syncing, refreshing, or pending local mutations exist.
- Made starter singleton creation race-tolerant during reset/bootstrap overlap.
- Added targeted e2e for stale local UI recovery after external reset.
- No schema/API/sync changes.

**Verification:**
- v0.1.12 closeout passed: migration, seed, typecheck, build, and full e2e with 22 tests.
- v0.2.0 passed typecheck, build, targeted schedule Playwright tests, full e2e with 23 tests, and desktop/mobile browser smoke.
- v0.2.1 passed db seed, targeted stale-cache Playwright tests, typecheck, build, full e2e with 24 tests, and browser smoke.
