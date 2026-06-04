# ContextOS Risk Register

## Active Risks

| ID | Risk | Level | Mitigation | Status |
| --- | --- | --- | --- | --- |
| R-2026-06-04-01 | Custom markdown editor could drift toward an overbuilt Notion clone. | Medium | Keep implementation line-based, markdown-backed, and within existing Note/Project fields. | Open |
| R-2026-06-04-02 | Project recovery markdown parsing could accidentally clear fields. | Medium | Parse only known headings, default missing sections to existing safe values during implementation review, and cover persistence in e2e. | Open |
| R-2026-06-04-03 | Dark-mode utility overrides may leave contrast gaps. | Low | Add broad global overrides and smoke changed views. | Open |
| R-2026-06-04-04 | Existing e2e selectors assume textareas for markdown notes. | Low | Add stable test IDs and update selectors as part of the batch. | Open |

## Closed Risks

None yet.
