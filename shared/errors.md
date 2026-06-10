# Shared Errors

- 2026-06-10: Generic dev-loop helper scripts under `tools/` are absent in this repo, so `python tools/context_manager.py init --root .` and helper `py_compile` preflight failed. Continued with existing `shared/` files and recorded the limitation.
- 2026-06-10: The `architect-planner` subagent failed before planning because its fixed model is unsupported for the current account. Continued with a local written batch plan before implementation.
- 2026-06-10: `docker compose up -d` failed because Docker Desktop's Linux engine pipe was unavailable; `npm run db:migrate` then failed because localhost Postgres was unavailable. DB-up full e2e remains blocked.
- 2026-06-04: DESIGN.md visual pass initially hit stale generated Prisma client types for dashboard scratchpad/preference fields. Ran `npx prisma generate`; subsequent `npm run typecheck` passed.
- 2026-06-04: DESIGN.md visual pass e2e setup initially failed because a stale dev server occupied port 3000 and the local database had not applied the existing dashboard command-sheet migration. Stopped the stale server, ran `npm run db:migrate` and `npm run db:seed`; subsequent e2e setup passed.
- 2026-06-04: DESIGN.md visual pass e2e initially failed on duplicated dashboard task title selectors and local-dev offline reload hydration. Scoped selectors to intended task sections/controls and warmed the service-worker shell before offline reload; full `npm run test:e2e` passed with 18 tests.
- 2026-06-04: Initial full e2e run failed 3 tests after selector/workflow changes. Fixed stable Save button, task target, and offline slash-capture cache assertion; targeted rerun and full suite passed.
- 2026-06-04: Parallel `npm run typecheck` and `npm run build` caused a transient `.next/types` race. Sequential rerun passed.
- 2026-06-04: In-app browser screenshot API timed out. DOM smoke passed and a local Playwright screenshot artifact was created.
