# ContextOS Future Concerns Backlog

This file captures concerns that should survive beyond the v0.1.11 audit. It is not an active sprint plan; use `BLUEPRINT.md` and `DEV_STATE.md` for active work selection.

## High Priority

### Graceful Database-Unavailable Handling

- Current issue: if Postgres is down, server-rendered auth pages can fail before rendering the login form because `getCurrentUser()` queries Prisma directly.
- Future work: wrap auth/bootstrap/sync/reset database access in user-facing failure states and maintenance-style responses.
- Acceptance signal: `/login` renders a clear database-unavailable message instead of a server error when Postgres is stopped.

### Stale Local Cache Recovery

- Current issue: after external `db:seed` or reset, an already-open browser may retain stale IndexedDB workspace data.
- Future work: make Settings refresh-from-server more prominent, detect server/cache generation drift if possible, and document when to refresh.
- Acceptance signal: after reseed, the app can clearly guide the user to replace stale local cache without losing pending offline changes.

### Dependency Advisory Review

- Current issue: `npm audit --audit-level=moderate` reports moderate advisories through current Next/PostCSS and Prisma dependency paths.
- Future work: track safe upstream upgrades and avoid `npm audit fix --force` when it proposes breaking downgrades.
- Acceptance signal: advisories are resolved or explicitly accepted with rationale after safe dependency updates exist.

## Medium Priority

### Daily Timeline Maturity

- Current issue: Daily timeline is list-based with optional task time ranges, not a true schedule grid.
- Future work: decide whether v0.2 needs duration validation, conflict detection, drag/drop scheduling, calendar import, or recurrence.
- Acceptance signal: timeline behavior is tested against real workday use rather than expanded by assumption.

### Piano Schedule Scope

- Current issue: Piano Schedule is a Markdown-backed Resource table, not a dynamic Notion-like database with formulas, relations, today filters, or sort controls.
- Future work: decide whether piano practice remains a resource template or becomes the first specialized personal-system surface.
- Acceptance signal: one week of usage determines whether table editing is enough or whether scheduling logic is justified.

### Rich Markdown Editing

- Current issue: the dashboard notepad renders Markdown in a preview but does not provide inline rich text/table editing.
- Future work: choose between improving the lightweight editor or adopting a proven editor library.
- Acceptance signal: editing remains fast on mobile while supporting the Markdown behaviors actually used in practice.

## Lower Priority

### Versioning Alignment

- Current issue: docs use v0.1.x batch labels while `package.json` remains `0.1.0`.
- Future work: define when package version increments and how it maps to docs/version-log entries.
- Acceptance signal: release labels, package version, and version log tell the same story.
