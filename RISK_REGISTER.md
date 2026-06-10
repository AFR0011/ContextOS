# ContextOS Risk Register

## Active Risks

| ID | Risk | Level | Mitigation | Status |
| --- | --- | --- | --- | --- |
| R-2026-06-10-01 | Database-outage classifier could miss provider-specific connection errors or overclassify unusual Prisma failures. | Medium | Centralized classifier with targeted coverage; expand patterns only from real provider errors. | Open |
| R-2026-06-05-05 | Markdown table rendering could make the freeform editor heavier or less mobile-friendly. | Medium | Kept the editor as textarea plus lightweight preview; e2e covers rendered headings/checklist preview. | Accepted |
| R-2026-06-05-06 | Piano schedule table could overfit one Notion database and become a general Notion clone. | Low | Kept it as a Markdown-backed Resource/table pattern, not formulas/relations. | Accepted |
| R-2026-06-05-07 | Already-open browser IndexedDB cache can drift after external seed/reset. | Low | Settings has refresh-from-server; audit recommends clearer stale-cache recovery. | Accepted |
| R-2026-06-05-08 | Moderate dependency advisories exist in current Next/Prisma dependency tree. | Medium | Do not run forced fixes; review safe upstream upgrades. | Open |
| R-2026-06-05-03 | PWA manifest changes could break install flow on some browsers | Low | Configuration-only change; easily reversible by reverting manifest.json | Open |
| R-2026-06-05-01 | Residual dark-mode tokenization risk across less-used routes. | Low | Dark mode uses broad global overrides; visual pass on major routes completed. | Accepted |
| R-2026-06-05-02 | Markdown editor is intentionally line/block based and may need trial feedback before deeper Notion-like behavior. | Medium | Kept implementation minimal and markdown-backed; awaiting real usage feedback. | Accepted |

## Closed Risks

| ID | Risk | Level | Status |
| --- | --- | --- | --- |
| R-2026-06-10-07 | Server refresh could overwrite unsynced local work if the guard is incomplete. | High | Closed - global and Settings refresh actions are disabled while pending/offline work exists, and the store retains the existing outbox guard. Targeted e2e passed. |
| R-2026-06-10-08 | A global refresh affordance could add visual noise to the command shell. | Low | Closed - action is compact inside the existing sync indicator, and browser smoke showed no horizontal overflow. |
| R-2026-06-10-04 | Schedule-grid visualization could make the daily command surface harder to scan on mobile. | Medium | Closed - compact schedule grid passed targeted e2e plus desktop and 390px mobile browser smoke with no horizontal overflow. |
| R-2026-06-10-05 | Sharing schedule logic between Dashboard and Today could regress existing task labels or completion behavior. | Medium | Closed - shared component is covered by targeted Dashboard/Today tests, completion-toggle test, and full e2e. |
| R-2026-06-10-06 | Invalid time ranges could disappear if only valid grid placement is implemented. | Low | Closed - targeted e2e verifies invalid `endTime <= startTime` tasks render in needs-attention and not in the grid. |
| R-2026-06-10-02 | Normal DB-up auth/bootstrap/sync flows were not rerun end-to-end after outage handling because Docker/Postgres were unavailable. | Medium | Closed - `npm run db:migrate`, `npm run db:seed`, `npm run typecheck`, `npm run build`, and `npm run test:e2e` passed on 2026-06-10 after Docker/Postgres became available. |
| R-2026-06-10-03 | Postgres outage previously caused auth/API server errors instead of clear user-facing outage states. | Medium | Closed - auth pages show a PostgreSQL outage message and DB-backed APIs return structured `503` JSON under DB-down smoke. |
| R-2026-06-05-04 | Task time-range schema expansion could desync Prisma, API serialization, offline cache, and sync replay. | Medium | Closed - propagated through schema, migration, types, serialization, sync replay, client normalization, seed, and e2e coverage. |
| R-2026-06-04-08 | Schema expansion for deadlines/recovery notes could desync Prisma, API serialization, offline cache, and sync replay. | Medium | Mitigated by propagating fields through schema, migration, types, seed, bootstrap serialization, sync server, client normalization, and e2e coverage. | Closed |
| R-2026-06-04-09 | Freeform recovery notes could regress fixed project recovery fields. | Medium | Kept fixed fields as structured `Project` fields and added `recoveryNotes` separately; e2e verifies both next action and notes persist. | Closed |
| R-2026-06-04-10 | Adding deadline location inputs could reintroduce one mutation per keystroke. | Low | Used draft-save `EditableField` for editable deadline location surfaces; only discrete date/time/select changes sync immediately. | Closed |
| R-2026-06-04-11 | In-app review reminders could become noisy. | Low | Implemented dismissible dashboard prompts stored in user preferences; no browser notification permission or OS-level pings. | Closed |
| R-2026-06-04-05 | Broad visual token/class updates could accidentally change app behavior. | Medium | Kept edits visual-only; final typecheck, build, and full e2e passed. | Closed |
| R-2026-06-04-06 | Design pass could become too soft/decorative for an operational tool. | Low | Capped shared card/panel radii at 8px, removed large card radii, and inspected desktop/mobile screenshots. | Closed |
| R-2026-06-04-07 | Denser dashboard rows can duplicate visible task titles and break broad e2e locators. | Low | Scoped affected test assertions to intended sections/controls without changing product behavior. | Closed |
| R-2026-06-04-01 | Custom markdown editor could drift toward an overbuilt Notion clone. | Medium | Kept implementation line-based, markdown-backed, and within existing Note/Project fields. | Closed |
| R-2026-06-04-02 | Project recovery markdown parsing could accidentally clear fields. | Medium | Parser reads only known headings, defaults missing sections to existing values, and e2e verifies next-action persistence. | Closed |
| R-2026-06-04-03 | Dark-mode utility overrides may leave contrast gaps. | Low | Added broad global overrides and performed visual smoke on Dashboard. | Closed |
| R-2026-06-04-04 | Existing e2e selectors assume textareas for markdown notes. | Low | Added stable test IDs and updated selectors; full e2e passed. | Closed |
