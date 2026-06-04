# ContextOS Dev State

## Active Loop

- Status: QA complete
- Date: 2026-06-04
- Active batch: v0.1.9 dashboard deadlines, Areas controls, recovery notes
- Source request: `modificaitons.txt`
- Canonical product source: `BLUEPRINT.md`
- Baseline docs: `docs/PROJECT_STATE.md`, `docs/REPO_MAP.md`, `docs/RUN_PROTOCOL.md`

## Selected Batch

Implement one independently testable batch from the follow-up modifications list:

1. Add dashboard deadline creation with optional project, local time, and location metadata.
2. Allow dashboard-created tasks to optionally select a project.
3. Add deadline `time` and `location`, project `recoveryNotes`, and review-prompt dismissal persistence through schema, sync, seed, and client cache.
4. Keep Projects focused on top-level projects, with expandable/collapsible subcontexts that show latest status and next action.
5. Add project create and soft-delete controls inside expanded Areas.
6. Add dismissible in-app daily/weekly review prompts.
7. Replace fragile project recovery heading parsing with structured fixed fields plus a freeform markdown recovery-notes editor.

## Intended Files

- `prisma/schema.prisma`
- `prisma/migrations/20260604160000_add_recovery_deadline_review_fields/migration.sql`
- `src/lib/types.ts`
- `src/lib/data.ts`
- `src/lib/sync-server.ts`
- `src/lib/client-store.tsx`
- `src/lib/starter.ts`
- `src/components/workspace/Dashboard2.tsx`
- `src/components/workspace/Views.tsx`
- `tests/e2e/contextos.spec.ts`
- `docs/PROJECT_STATE.md`
- `docs/VERSION_LOG.md`
- `DEV_LOG.md`
- `QA_REPORT.md`
- `RISK_REGISTER.md`

## Acceptance Criteria

- Dashboard can create a project-linked deadline with optional local time and location.
- Dashboard can create a task with optional project assignment.
- Deadline time/location/project metadata persists through reload and sync.
- Projects page shows root projects first and can expand nested subcontexts.
- Expanded Areas can create and soft-delete projects.
- Dashboard review prompts can be dismissed and do not require browser notification permission.
- Project recovery fixed fields and freeform recovery notes persist after reload.
- Existing offline/local persistence behavior remains intact.
- `npm run typecheck`, `npm run build`, and full Playwright coverage pass.

## Verification Plan

1. `npx prisma generate`
2. `npm run db:migrate`
3. `npm run db:seed`
4. `npm run typecheck`
5. `npm run build`
6. `npm run test:e2e`

## Risk And Mitigation

- Risk: Schema additions could desync server/client/offline paths. Mitigation: propagated fields through schema, migration, types, serialization, sync replay, seed, and client normalization.
- Risk: Recovery notes could regress fixed fields. Mitigation: kept fixed fields structured and stored freeform notes separately.
- Risk: Review reminders could become noisy. Mitigation: used dismissible in-app prompts only.
- Risk: Stale dev server could invalidate e2e evidence. Mitigation: stopped stale port-3000 server and reran the full suite.

## Next Action

Stop after this supervised cycle and report the completed batch. Next useful product action is a real usage pass focused on whether the new dashboard deadline and recovery-note flows remove the observed friction.
