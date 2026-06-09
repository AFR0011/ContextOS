# ContextOS Dev State

## Active Loop

- Status: QA COMPLETE - Dashboard Notepad command surface
- Date: 2026-06-09
- Active batch: Replace dashboard Dates/Daily timeline with entity-backed Notepad projection
- Source request: Dashboard Notepad Command Surface plan
- Canonical product source: `BLUEPRINT.md`
- Baseline docs: `docs/PROJECT_STATE.md`, `docs/REPO_MAP.md`, `docs/RUN_PROTOCOL.md`

## Active Batch Summary

### Goal

Make the Dashboard Notepad the daily command surface:

1. Keep structured Tasks and Deadlines as source of truth.
2. Render dated Tasks/Deadlines as editable Notepad todo blocks.
3. Keep scratch Markdown as the source for normal todos and freeform notes.
4. Remove dashboard-only Dates/Daily timeline surfaces without changing `/deadlines`, Today, project detail UI, offline sync, or soft-trash conventions.

### Implementation

| File | Change |
|------|--------|
| `src/components/workspace/Dashboard2.tsx` | Replaced Dates/Daily timeline composition with Today/Upcoming/Completed/Scratch Notepad groups, entity-backed blocks, promotion/edit/toggle/demotion behavior, validation, and immediate scratch persistence on demotion |
| `src/components/workspace/editor/BlockMarkdownEditor.tsx` | Added controlled block support, validation rendering, entity-safe duplication, default todo blocks, and mobile/native line-break robustness |
| `src/lib/scheduled-todo.ts` | Parser/formatter for `Title (DDMMYY) [HHMM] {Location}` with local date keys and validation |
| `src/lib/client-store.tsx` | Added deadline `archivedAt` creation support and serialized outbox writes for rapid adjacent mutations |
| `src/lib/starter.ts` | Updated dashboard starter preferences to `["notepad", "projects"]` and made dashboard singleton seed rows duplicate-safe |
| `tests/scheduled-todo.test.ts` | Parser/formatter unit coverage |
| `tests/e2e/contextos.spec.ts` | Dashboard Notepad, scratch-only, invalid syntax, entity identity/demotion, deadline location, reload, mobile Return, and offline scheduled coverage |

### Acceptance Criteria

| Criteria | Status |
|----------|--------|
| Dashboard no longer shows Dates or Daily timeline sections | DONE |
| Seeded dated Tasks/Deadlines appear in Notepad canonical syntax | DONE |
| Plain `Text Amir`-style todos remain scratch-only | DONE |
| Scheduled scratch lines promote to one real Task/Deadline and do not duplicate | DONE |
| Existing entity edits preserve IDs and update the same structured record | DONE |
| Entity demotion/delete soft-trashes backing records and preserves scratch when appropriate | DONE |
| Checkbox behavior updates Task status / Deadline archivedAt while scratch todos remain Markdown-only | DONE |
| Invalid scheduled syntax shows inline validation and does not mutate entities | DONE |
| Offline scheduled create/update/delete/toggle queues through the existing outbox model | DONE |

### Verification Evidence

```text
npm run test                                                    PASSED
npm run typecheck                                               PASSED
npm run build                                                   PASSED
docker compose up -d                                            PASSED
npm run db:migrate                                              PASSED
npm run db:seed                                                 PASSED
npx playwright test tests/e2e/contextos.spec.ts --grep "seeded demo account|dashboard notepad" PASSED (7 tests)
npx playwright test tests/e2e/contextos.spec.ts --grep "offline scheduled notepad"              PASSED (1 test)
npx playwright test tests/e2e/contextos.spec.ts --grep "mobile markdown editor"                  PASSED (1 test)
npm run test:e2e                                                PASSED (24 tests)
```

### Recovery Notes

- Docker Desktop was initially unavailable; starting Docker Desktop restored `docker compose up -d`.
- A targeted run exposed demotion scratch persistence loss before debounce; fixed with immediate scratchpad persistence when entity blocks demote.
- A full e2e rerun exposed mobile/native line-break timing in the editor; fixed by splitting from live textarea values and using a stable native listener.
- A concurrent bootstrap unique-constraint log was fixed by changing dashboard starter singleton creation to duplicate-skipping `createMany`.

### Risk Assessment

| ID | Risk | Level | Status |
|---|------|-------|--------|
| R-2026-06-09-01 | Entity-backed Notepad blocks could corrupt Tasks/Deadlines, duplicate promoted items, or lose scratch demotions | High | Closed by same-ID updates, validation guards, soft trash, immediate scratch persistence, and e2e |
| R-2026-06-09-02 | Rapid adjacent offline mutations could overwrite outbox entries | Medium | Closed by serialized outbox writes and offline scheduled e2e |
| R-2026-06-09-03 | Scheduled todo syntax and task location support are intentionally limited in v1 | Medium | Accepted with inline validation and Deadline mapping for location-bearing lines |

## Shared Files Updated This Cycle

| File | Description |
|------|-------------|
| `DEV_STATE.md` | Active batch documented and closed |
| `DEV_LOG.md` | Implementation and recovery notes added |
| `QA_REPORT.md` | Verification evidence added |
| `RISK_REGISTER.md` | New accepted/closed risks added |
| `docs/PROJECT_STATE.md` | Project snapshot updated |
| `shared/context.md` | Batch status updated |
| `shared/status.md` | QA complete status updated |
| `shared/history.md` | Cycle logged |

## Next Phase

1. Use the Notepad command surface in the v0.1.x trial and record friction.
2. Review whether Task location should be added in a future schema batch.
3. Continue prioritizing graceful DB-unavailable handling and stale-cache recovery.
