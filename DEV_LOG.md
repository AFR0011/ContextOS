# ContextOS Dev Log

## 2026-06-04 - v0.1.7 Workspace Markdown Canvas

Planner selected one batch from `modificaitons.txt`: implement a markdown-first dashboard/project editing surface, visible completed Today tasks, expandable Areas, and dark mode.

Implementation:

- Added `src/components/workspace/MarkdownEditor.tsx`, a line-based markdown block editor with slash formatting and optional slash capture.
- Reworked Dashboard so Dashboard Canvas contains the editor, Today's priorities, and Today tasks; removed the separate dashboard quick-capture field.
- Updated Dashboard and Today task selection so completed scheduled tasks remain visible and crossed off.
- Added in-place expandable Area project/subcontext trees.
- Replaced separate project recovery fields and open-loop entry with one recovery markdown editor.
- Swapped project/resource note editing to the shared markdown editor.
- Added a persisted dark-mode toggle in the workspace shell and global dark-mode style overrides.
- Updated Playwright coverage for the changed workflows.

Verification:

- `npm run typecheck` - passed.
- `npm run build` - passed.
- `npx playwright test -g "dashboard canvas|today tasks|offline capture"` - passed, 3 tests.
- `npm run test:e2e` - passed, 16 tests.
- Visual smoke - dashboard editor rendered in dark mode; screenshot saved to `test-results/dashboard-dark-smoke.png`.
