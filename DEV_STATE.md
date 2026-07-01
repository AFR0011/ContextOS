# ContextOS Dev State

## Active Loop

- Status: CLOSE - Notion-style command pages
- Date: 2026-07-01
- Active batch: Notion-style command pages for Dashboard and Project detail
- Completed batch: v0.2.8 task-driven daily timeline
- Canonical product source: `BLUEPRINT.md`
- Tooling fallback: dev-loop helper scripts are not present under `tools/`, so this cycle is using the documented local phase-artifact fallback.

## Active Batch Plan

Scope this cycle to one independently testable simplification batch:

1. Reuse the existing Markdown editor and stored scratch/recovery fields instead of introducing a new editor dependency.
2. Add a shared parser for explicit `/task` and `/date` command lines.
3. Convert Dashboard into a command page backed by `DashboardScratchpad.content`.
4. Replace old Dashboard composers and Project Recovery with pinned live Tasks and Dates blocks.
5. Convert Project detail into a command page backed by `Project.recoveryNotes`.
6. Group Project task/date blocks by direct project first, then immediate child subcontexts with descendant rollups.
7. Update focused e2e coverage and canonical docs/state.

Out of scope for this batch: Prisma/schema changes, record deletion, a full Notion clone, drag/drop block reordering, external AI calls, and broad navigation changes beyond the already-simplified Pareto nav.

Acceptance criteria:

- Dashboard page body autosaves and supports Markdown scratch content.
- Dashboard `/task` creates a real workspace-level task and clears the command line.
- Dashboard `/date` creates a real Date and clears the command line.
- Plain Markdown checkboxes do not create structured task records.
- Dashboard no longer shows Project Recovery or old task/date composer fields.
- Dashboard live blocks show active workspace tasks/dates with local scope/group controls.
- Project notes persist through the page editor.
- Project `/task` and `/date` attach records to the current project.
- Project live blocks group direct records first, then child subcontext rollups.
- Existing recovery fields and subcontexts remain editable.
- `npm run typecheck` and `npm run build` pass.

## Outcome

Batch complete with DB-backed e2e blocked by local infrastructure.

Implemented the Notion-style command-page batch:

- Added `src/lib/command-page-commands.ts` for explicit `/task` and `/date` parsing.
- Extended the existing Markdown editor with page-mode styling, allowed command filtering, inline validation, and command-line clearing after successful structured creation.
- Added shared `CommandPageEditor`, task rows, date rows, and live block components.
- Rebuilt Dashboard as a command page with a scratchpad editor, pinned Tasks/Dates blocks, and localStorage-backed scope/group controls.
- Rebuilt Project detail as a command page with project notes, pinned Tasks/Dates, compact Recovery fields, and Subcontexts.
- Updated e2e coverage for parser behavior, Dashboard command creation/scratchpad behavior, Project command attachment/grouping, and simplified nav/dashboard expectations.
- Updated canonical product, design, repo-map, run-protocol, QA, and risk docs.

## Acceptance Evidence

| Criteria | Status |
| --- | --- |
| Dashboard page body autosaves and supports Markdown scratch content | DONE in code; DB-backed e2e added but not run because DB is unavailable |
| Dashboard `/task` creates a real workspace-level task and clears the command line | DONE in code; DB-backed e2e added but not run because DB is unavailable |
| Dashboard `/date` creates a real Date and clears the command line | DONE in code; DB-backed e2e added but not run because DB is unavailable |
| Plain Markdown checkboxes do not create structured task records | DONE in parser/editor behavior; DB-backed e2e added but not run because DB is unavailable |
| Dashboard no longer shows Project Recovery or old task/date composer fields | DONE in code and test expectations |
| Dashboard live blocks show active workspace tasks/dates with local scope/group controls | DONE in code and test expectations |
| Project notes persist through the page editor | DONE in code; DB-backed e2e added but not run because DB is unavailable |
| Project `/task` and `/date` attach records to the current project | DONE in code; DB-backed e2e added but not run because DB is unavailable |
| Project live blocks group direct records first, then child subcontext rollups | DONE in code and test expectations |
| Existing recovery fields and subcontexts remain editable | DONE in code and test expectations |
| `npm run typecheck` and `npm run build` pass | DONE |

## Verification

- `npm run typecheck` - passed.
- `npm run build` - passed.
- `npx prisma validate` - passed.
- `docker compose ps` - blocked because Docker Desktop's Linux engine pipe is unavailable.
- `npm run db:migrate` - blocked because PostgreSQL at `localhost:5432` is unavailable.
- `PLAYWRIGHT_PORT=3001 npx playwright test tests/e2e/contextos.spec.ts -g "command page parser" --workers=1` - passed, 1 test.
- `git diff --check` - passed with line-ending normalization warnings only.

## Remaining Risks

- Full DB-backed Dashboard and Project command-page e2e coverage is written but still needs to run against a live local Postgres.
- The new command-page interaction should be trialed in real use before deleting any hidden utility routes or legacy compatibility surfaces.
- The user-supplied `Notion-style editor demo/` folder remains untracked and is treated as a reference artifact only.

## Next Action

Start Docker/Postgres, rerun `npm run db:migrate` and `npm run db:seed`, run the focused Dashboard/Project command-page e2e slice, then run the full documented e2e ladder if the focused slice passes.
