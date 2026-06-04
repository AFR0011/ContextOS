# ContextOS Dev State

## Active Loop

- Status: PLAN complete, ready for EXECUTE
- Date: 2026-06-04
- Active batch: v0.1.7 workspace markdown canvas
- Source request: `modificaitons.txt`
- Canonical product source: `BLUEPRINT.md`
- Baseline docs: `docs/PROJECT_STATE.md`, `docs/REPO_MAP.md`, `docs/RUN_PROTOCOL.md`

## Selected Batch

Implement one independently testable batch that turns the dashboard and recovery pages into markdown-first work surfaces:

1. Replace the dashboard's separate quick-capture input with an integrated markdown canvas editor that supports slash commands and can send slash captures to the existing Inbox capture flow.
2. Render markdown blocks as structured editing controls for headings, lists, checkboxes, quotes, and code-style lines instead of leaving every markdown line as plain textarea text.
3. Keep Today tasks visible after checking them done when they still belong to today's due/planned/in-progress set, using the existing crossed-off `TaskRow` behavior.
4. Expand Areas so an Area can be opened in-place and show its project/subcontext tree with project navigation.
5. Replace scattered project recovery fields with one markdown recovery editor that saves Current Objective, Next Action, Latest Status, and Open Loops together.
6. Add a persisted dark-mode toggle for the workspace shell.

## Intended Files

- `src/components/workspace/MarkdownEditor.tsx`
- `src/components/workspace/Views.tsx`
- `src/components/workspace/WorkspaceShell.tsx`
- `src/app/globals.css`
- `tests/e2e/contextos.spec.ts`
- `docs/PROJECT_STATE.md`
- `docs/RUN_PROTOCOL.md`
- `docs/VERSION_LOG.md`
- `DEV_LOG.md`
- `QA_REPORT.md`
- `RISK_REGISTER.md`
- `shared/*`

## Acceptance Criteria

- Dashboard has no separate top quick-capture input; quick capture happens from the dashboard markdown editor with `/task`, `/note`, `/project`, `/deadline`, and `/status` lines.
- Markdown editor visually renders editable headings, subheadings, bullets, checkboxes, quotes, and code-style blocks while preserving markdown storage.
- A checked Today task remains visible and can be unchecked or status-changed from Dashboard and Today when it still matches today's schedule.
- Areas can be opened to reveal root projects and nested subcontexts; project rows still navigate to project detail pages.
- Project detail pages have one recovery markdown editor for objective, next action, latest status, and open loops, and saved edits persist after reload.
- Workspace dark mode can be toggled and persists through reload via local storage.
- Existing offline/local persistence behavior remains intact.
- `npm run typecheck` and `npm run build` pass; targeted Playwright coverage passes for the changed UI.

## Verification Plan

1. `npm run typecheck`
2. `npm run build`
3. Targeted Playwright tests for dashboard editor/capture, Today done visibility, Areas expansion, project recovery editor, and dark mode.
4. `npm run test:e2e` if the local database and dev server are available.

## Risk And Mitigation

- Risk: A custom markdown block editor can overreach into a full Notion clone. Mitigation: keep it markdown-line based and reuse existing data models.
- Risk: Replacing textarea selectors breaks e2e tests. Mitigation: update tests with stable `data-testid` hooks.
- Risk: Dark-mode overrides may miss a few utility classes. Mitigation: use broad global overrides for the app's existing color utilities and verify build/tests.
- Risk: Project recovery parsing could drop fields. Mitigation: parse only known headings and preserve empty strings safely.

## Next Action

Execute the planned implementation batch only.
