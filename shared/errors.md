# Shared Errors

- 2026-06-04: Initial full e2e run failed 3 tests after selector/workflow changes. Fixed stable Save button, task target, and offline slash-capture cache assertion; targeted rerun and full suite passed.
- 2026-06-04: Parallel `npm run typecheck` and `npm run build` caused a transient `.next/types` race. Sequential rerun passed.
- 2026-06-04: In-app browser screenshot API timed out. DOM smoke passed and a local Playwright screenshot artifact was created.
