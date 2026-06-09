# Shared Errors

- 2026-06-04: DESIGN.md visual pass initially hit stale generated Prisma client types for dashboard scratchpad/preference fields. Ran `npx prisma generate`; subsequent `npm run typecheck` passed.
- 2026-06-04: DESIGN.md visual pass e2e setup initially failed because a stale dev server occupied port 3000 and the local database had not applied the existing dashboard command-sheet migration. Stopped the stale server, ran `npm run db:migrate` and `npm run db:seed`; subsequent e2e setup passed.
- 2026-06-04: DESIGN.md visual pass e2e initially failed on duplicated dashboard task title selectors and local-dev offline reload hydration. Scoped selectors to intended task sections/controls and warmed the service-worker shell before offline reload; full `npm run test:e2e` passed with 18 tests.
- 2026-06-04: Initial full e2e run failed 3 tests after selector/workflow changes. Fixed stable Save button, task target, and offline slash-capture cache assertion; targeted rerun and full suite passed.
- 2026-06-04: Parallel `npm run typecheck` and `npm run build` caused a transient `.next/types` race. Sequential rerun passed.
- 2026-06-04: In-app browser screenshot API timed out. DOM smoke passed and a local Playwright screenshot artifact was created.
- 2026-06-09: Initial focused Dashboard Notepad Playwright run failed entity demotion scratch persistence. Fixed immediate scratchpad persistence when entity blocks demote; targeted and full e2e passed.
- 2026-06-09: Initial full e2e rerun failed mobile markdown Return handling. Fixed native line-break splitting from live textarea values with a stable listener; focused mobile test and final full e2e passed.
- 2026-06-09: Full e2e surfaced a concurrent starter bootstrap unique-constraint server log. Replaced dashboard scratchpad/preference singleton upserts with duplicate-skipping creates; final full e2e passed without that error.
