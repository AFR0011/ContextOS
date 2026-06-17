# ContextOS Repo Cleanup Audit - 2026-06-16

## Scope

This is a cleanup proposal produced after v0.2.6. No delete/archive operations were performed during this pass.

The audit looked at tracked files, ignored local artifacts, active docs, app routes, tests, duplicate scripts, and historical planning files.

## Proposed Delete

These are safe delete candidates after approval.

### Local ignored artifacts

- `.next/`
- `playwright-report/`
- `test-results/`
- `tsconfig.tsbuildinfo`
- `next-dev.log`
- `next-dev.err.log`
- `next-dev-v012.log`
- `next-dev-v012.err.log`
- `next-dev-v024.log`
- `next-dev-v024.err.log`
- `next-dev-v025.log`
- `next-dev-v025.err.log`
- `next-dev-v026.log`
- `next-dev-v026.err.log`

Why: generated build/test/dev-server artifacts. They are ignored by Git and can be recreated.

### Tracked duplicate/script cleanup

- `scripts/generate-icons.js`

Why: exact duplicate of `scripts/generate-icons.cjs`. The project is ESM, but the icon script uses CommonJS `require`, so `.cjs` is the correct file to keep.

### Small text cleanup

- Remove the stray `a` line from `.gitignore`.

Why: it is not a meaningful ignore rule and makes the file look accidentally edited.

## Proposed Archive

These files are useful history but should not sit at the active repo root forever.

- `Markdown Editor Sample Demo/`
  - Archive to `docs/archive/prototypes/markdown-editor-sample-demo/`.
  - Why: standalone Vite prototype, excluded from `tsconfig.json`, not imported by the app. The production editor now lives under `src/components/workspace/editor/`.

- `CONTEXTOS_VERSION_PLAN.md`
  - Archive to `docs/archive/planning/CONTEXTOS_VERSION_PLAN.md`.
  - Why: superseded by `BLUEPRINT.md`, `docs/VERSION_LOG.md`, `docs/MIGRATION_BACKLOG.md`, and current dev-loop docs.

- `modificaitons.txt`
  - Archive to `docs/archive/user-input/modificaitons-2026-06.md`.
  - Why: original user request list has been implemented/superseded and preserved in dev logs. Keep as history, not active planning.

- `docs/CURRENT_AUDIT_2026-06-05.md`
  - Archive to `docs/archive/audits/CURRENT_AUDIT_2026-06-05.md`.
  - Why: superseded by `docs/AUDIT_2026-06-15.md` plus v0.2.3-v0.2.6 status updates.

- `shared/messages.jsonl`
  - Archive or regenerate.
  - Why: stale compared with `shared/messages.md`; it stops at early v0.1.x messages while the Markdown file is current through v0.2.6.

### Archive After Extracting Open Items

- `UIUX Design Modifications.md`

Why: still contains useful UX backlog ideas, but also contains stale or conflicting instructions, such as task search routing guidance that no longer matches v0.2.3 behavior. Extract the still-relevant items into `docs/MIGRATION_BACKLOG.md` or a future `docs/UX_BACKLOG.md`, then archive the original.

## Keep

These files are active or intentionally historical.

- `BLUEPRINT.md`
  - Product source of truth.

- `DEV_STATE.md`, `DEV_LOG.md`, `QA_REPORT.md`, `RISK_REGISTER.md`
  - Active dev-loop control docs.

- `docs/PROJECT_STATE.md`, `docs/REPO_MAP.md`, `docs/RUN_PROTOCOL.md`, `docs/VERSION_LOG.md`, `docs/DEPLOYMENT.md`, `docs/MIGRATION_BACKLOG.md`
  - Baseline operating docs and long-lived project memory.

- `docs/AUDIT_2026-06-15.md`
  - Current deployment audit, now annotated with v0.2.3, v0.2.5, and v0.2.6 status updates.

- `DESIGN.md`
  - Active visual/taste baseline.

- `docs/FRICTION_LOG.md`
  - Still referenced by `docs/RUN_PROTOCOL.md` for usage trials.

- `src/app/(workspace)/deadlines/page.tsx`
  - Compatibility redirect from `/deadlines` to `/dates`.

- Internal `Deadline` model, `deadline` capture alias, and `deadlines` sync payload name.
  - Keep until a dedicated compatibility-breaking migration handles stored data and old offline outboxes.

- `scripts/generate-icons.cjs` and `pngjs`
  - Keep for reproducible PWA icon generation.

- All files under `prisma/migrations/`
  - Keep. They are deployment history and database state.

- `shared/*.md`, `shared/locks.json`, `shared/performance*.md/csv`, `shared/trends.md`, `shared/bottlenecks.md`
  - Keep for now because the repo's dev-loop contract expects them, though they can be compacted later.

## Fix Or Review, Not Delete

- `tests/e2e/contextos.spec.ts`
  - Finding: one test uses `page.goto("/week")`, but the actual route is `/this-week`.
  - Action taken: changed the test to `/this-week` and added exact page-heading assertions for Today and This Week.

- `src/components/workspace/Views.tsx`
- `src/components/workspace/Dashboard2.tsx`
- `src/components/workspace/editor/BlockMarkdownEditor.tsx`
- `src/lib/client-store.tsx`
  - Finding: these are the largest active source files and mix several concerns.
  - Recommendation: split by screen/section only in behavior-preserving refactor batches after production gates.

- `README.md`
  - Finding: environment variable list was stale.
  - Action already taken in v0.2.6 cleanup pass: split required and optional environment variables and added auth limiter knobs.

## Future Version Options

### Option A: Production Readiness Track

Best next if the app may be hosted publicly soon.

- Add CI for Prisma validate, typecheck, build, and Playwright against disposable PostgreSQL.
- Add health/readiness endpoint.
- Add deployment preview checklist.
- Add backup/restore and rollback rehearsal docs.
- Add installed-PWA upgrade smoke.

### Option B: Mobile Command Surface Track

Best next if daily phone use matters most.

- Mobile bottom navigation for Dashboard, Inbox, Today, Projects, Search.
- 40-44px tap targets.
- Visible mobile actions instead of hover-only controls.
- Better editor/menu accessibility semantics.
- Mobile viewport regression tests.

### Option C: Dashboard Clarity Track

Best next if the Dashboard still feels visually heavy.

- Add compact Today pressure strip under Quick Capture.
- Reduce equal-weight card stacking.
- Make Notepad the dominant daily surface.
- Move Show completed and sort controls into a smaller section control row.
- Extract shared `Section`, `RecordRow`, and `InlineComposer` primitives.

### Option D: Project Recovery Track

Best next if resuming projects is the core value.

- Promote Next Action and Latest Status into hero fields.
- Add status timeline.
- Add decisions/artifacts/links as first-class recovery objects.
- Add project recovery scorecard for stale or unclear projects.

### Option E: Data Safety Track

Best next before serious long-term use.

- Full JSON export.
- Full Markdown export.
- Import preview.
- Export-before-delete prompts.
- Account password/session/data controls.

### Option F: Read-Only Intelligence Track

Best after the deterministic workflow is stable.

- Rule-based suggestions for missing next actions, stale projects, and dates without tasks.
- Copyable project context summary.
- Capture classification suggestions.
- Optional local LLM spike, read-only and manual-apply only.

## Recommended Order

1. Done: fix the `/week` test target to `/this-week`.
2. Delete ignored local artifacts.
3. Remove `scripts/generate-icons.js` and the stray `.gitignore` line.
4. Archive the standalone editor demo and superseded planning/audit files.
5. Run production-readiness work next: CI/preview plus backup/rollback/health evidence.
6. Then choose either Mobile Command Surface or Dashboard Clarity based on real-use friction.
