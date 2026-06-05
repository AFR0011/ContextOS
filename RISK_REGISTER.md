# ContextOS Risk Register

## Active Risks

| ID | Risk | Level | Mitigation | Status |
| --- | --- | --- | --- | --- |
| R-2026-06-05-03 | PWA manifest changes could break install flow on some browsers | Low | Configuration-only change; easily reversible by reverting manifest.json |
| R-2026-06-05-01 | Residual dark-mode tokenization risk across less-used routes. | Low | Dark mode uses broad global overrides; visual pass on major routes completed. | Accepted |
| R-2026-06-05-02 | Markdown editor is intentionally line/block based and may need trial feedback before deeper Notion-like behavior. | Medium | Kept implementation minimal and markdown-backed; awaiting real usage feedback. | Accepted |

## Closed Risks

| ID | Risk | Level | Status |
| --- | --- | --- | --- |
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
