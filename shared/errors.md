# Shared Errors

- 2026-06-16: Browser automation listed `networkidle` in documentation but the active browser runtime rejected it during v0.2.5 smoke. Classified as low-severity tool mismatch; recovered with supported `load`, URL, visible-content, overflow, and console-log checks. Browser smoke passed.
- 2026-06-16: Generic dev-loop helper scripts under `tools/` remain absent, so `python tools/context_manager.py init --root .` and helper `py_compile` preflight failed. Continued with existing `shared/` files and direct doc updates.
- 2026-06-16: The first Browser smoke evaluate used `instanceof HTMLSelectElement`, but the browser evaluate sandbox did not expose that constructor. Retried with plain tag/value reads; Browser smoke passed.
- 2026-06-11: The fixed-model `dev-loop-orchestrator` subagent is unsupported for the current ChatGPT account. Continued under the existing local phase-artifact fallback and recorded the complete v0.2.2 batch in `DEV_STATE.md` before implementation.
- 2026-06-11: Generic dev-loop helper scripts under `tools/` remain absent, so helper initialization and syntax checks are unavailable. Existing `shared/` files are being maintained directly.
- 2026-06-10: Generic dev-loop helper scripts under `tools/` are absent in this repo, so `python tools/context_manager.py init --root .` and helper `py_compile` preflight failed. Continued with existing `shared/` files and recorded the limitation.
- 2026-06-10: The `architect-planner` subagent failed before planning because its fixed model is unsupported for the current account. Continued with a local written batch plan before implementation.
- 2026-06-10: `docker compose up -d` initially failed because Docker Desktop's Linux engine pipe was unavailable; `npm run db:migrate` then failed because localhost Postgres was unavailable. Later resolved after Docker/Postgres became available; DB-up migration, seed, and full e2e passed.
- 2026-06-04: DESIGN.md visual pass initially hit stale generated Prisma client types for dashboard scratchpad/preference fields. Ran `npx prisma generate`; subsequent `npm run typecheck` passed.
- 2026-06-04: DESIGN.md visual pass e2e setup initially failed because a stale dev server occupied port 3000 and the local database had not applied the existing dashboard command-sheet migration. Stopped the stale server, ran `npm run db:migrate` and `npm run db:seed`; subsequent e2e setup passed.
- 2026-06-04: DESIGN.md visual pass e2e initially failed on duplicated dashboard task title selectors and local-dev offline reload hydration. Scoped selectors to intended task sections/controls and warmed the service-worker shell before offline reload; full `npm run test:e2e` passed with 18 tests.
- 2026-06-04: Initial full e2e run failed 3 tests after selector/workflow changes. Fixed stable Save button, task target, and offline slash-capture cache assertion; targeted rerun and full suite passed.
- 2026-06-04: Parallel `npm run typecheck` and `npm run build` caused a transient `.next/types` race. Sequential rerun passed.
- 2026-06-04: In-app browser screenshot API timed out. DOM smoke passed and a local Playwright screenshot artifact was created.
