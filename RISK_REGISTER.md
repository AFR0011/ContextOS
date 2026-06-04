# ContextOS Risk Register

## Active Risks

| ID | Risk | Level | Mitigation | Status |
| --- | --- | --- | --- | --- |
| R-2026-06-04-01 | Custom markdown editor could drift toward an overbuilt Notion clone. | Medium | Kept implementation line-based, markdown-backed, and within existing Note/Project fields. | Mitigated |
| R-2026-06-04-02 | Project recovery markdown parsing could accidentally clear fields. | Medium | Parser reads only known headings, defaults missing sections to existing values, and e2e verifies next-action persistence. | Mitigated |
| R-2026-06-04-03 | Dark-mode utility overrides may leave contrast gaps. | Low | Added broad global overrides and performed visual smoke on Dashboard. | Accepted |
| R-2026-06-04-04 | Existing e2e selectors assume textareas for markdown notes. | Low | Added stable test IDs and updated selectors; full e2e passed. | Closed |

## Closed Risks

None yet.
