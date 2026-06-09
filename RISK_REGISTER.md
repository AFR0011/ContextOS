# ContextOS Risk Register

## Active Risks

| ID | Risk | Level | Mitigation | Status |
| --- | --- | --- | --- | --- |
| R-2026-06-09-03 | Scheduled todo syntax is intentionally narrow and task-backed location edits are not supported in v1. | Medium | Inline validation blocks invalid/corrupting entity edits; location-bearing new lines create Deadlines until Task location exists. | Accepted |
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
| R-2026-06-09-01 | Entity-backed Notepad blocks could corrupt Tasks/Deadlines, duplicate promoted items, or lose scratch demotions. | High | Closed - same-ID edit paths, validation guards, soft-trash demotion, immediate scratch persistence, and targeted/full e2e coverage passed. |
| R-2026-06-09-02 | Rapid adjacent offline mutations from scheduled create/edit/delete/toggle could overwrite IndexedDB outbox entries. | Medium | Closed - outbox appends are serialized and offline scheduled Playwright coverage passed. |
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
