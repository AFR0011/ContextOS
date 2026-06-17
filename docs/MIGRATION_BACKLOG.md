# ContextOS Future Concerns Backlog

This file captures concerns that should survive beyond v0.2.8. It is not an active sprint plan; use `BLUEPRINT.md` and `DEV_STATE.md` for active work selection.

## High Priority

### Deployment Hardening

- Current issue: the 2026-06-15 audit found user-ownership gaps in sync upserts, public registration in a single-user MVP, unbounded sync payloads, missing abuse controls/security headers/CI, stale PWA cache routes, and incomplete operational recovery.
- Status: v0.2.3 completed Gate 1 user/data isolation work, v0.2.4 completed Dashboard cleanup ergonomics, v0.2.5 completed baseline security headers, explicit metadata base handling, and corrected service-worker cache/routes, v0.2.6 completed app-level auth abuse controls, v0.2.7 added the health endpoint plus GitHub Actions CI workflow scaffold, and v0.2.8 locally repairs the first remote CI failure path.
- Future work: observe/fix the v0.2.8 branch CI run after push, run production-like preview smoke, deeper installed-PWA upgrade smoke, backup/restore, monitoring, rollback evidence, and any provider/WAF auth protection needed for public production.
- Acceptance signal: remaining deployment gates in `docs/DEPLOYMENT.md` all pass.

### Graceful Database-Unavailable Handling

- Current issue: if Postgres is down, server-rendered auth pages can fail before rendering the login form because `getCurrentUser()` queries Prisma directly.
- Status: implemented in v0.1.12 for auth pages plus auth/bootstrap/sync/reset APIs.
- Remaining work: expand the classifier only from real provider-specific connection errors.
- Acceptance signal: `/login` renders a clear database-unavailable message instead of a server error when Postgres is stopped. Verified on 2026-06-10.

### Stale Local Cache Recovery

- Current issue: after external `db:seed` or reset, an already-open browser may retain stale IndexedDB workspace data.
- Status: v0.2.1 added a compact guarded shell Refresh action, aligned Settings guard behavior, and covered external reset recovery in e2e.
- Future work: detect server/cache generation drift automatically if this remains confusing in real use.
- Acceptance signal: after reseed, the app can clearly guide the user to replace stale local cache without losing pending offline changes. Verified on 2026-06-10.

### Dependency Advisory Review

- Current issue: `npm audit --audit-level=moderate` reports moderate advisories through current Next/PostCSS and Prisma dependency paths.
- Future work: track safe upstream upgrades and avoid `npm audit fix --force` when it proposes breaking downgrades.
- Acceptance signal: advisories are resolved or explicitly accepted with rationale after safe dependency updates exist.

## Medium Priority

### Dashboard, Mobile, and Recovery UX Backlog

- Current source: extracted from `UIUX Design Modifications.md` before archiving that planning file in v0.2.7.
- Dashboard clarity: make Quick Capture and Notepad the dominant daily surface, add a compact Today pressure strip, reduce equal-weight section cards, and keep Show completed / sort controls in small section-level control rows.
- Shared UI primitives: after production gates, extract behavior-preserving `Section`, `RecordRow`, `InlineComposer`, `EmptyState`, `Notice`, and segmented/filter controls from the largest workspace files.
- Mobile command surface: mobile bottom navigation exists for Dashboard, Inbox, Today, Projects, and Search. v0.2.8 adds 40px covered targets for touched Daily Timeline/editor controls; broader 40-44px tap target and touch-action audit remains.
- Project recovery: promote Next Action and Latest Status into stronger hero fields, preserve Active Tasks and Dates near the top, and eventually add recovery scorecard/timeline affordances if real use proves they help.
- Accessibility and interaction quality: add stronger slash/block menu semantics, verify icon-only labels, and standardize focus-visible states.
- Acceptance signal: these changes improve capture speed, daily scanning, mobile use, and project recovery without reintroducing fake clickable rows, task search dead ends, priority terminology, or completion-based list jumps.

### Daily Timeline Maturity

- Current state: v0.2.2 intentionally replaced the schedule grid with a compact notepad-like list and one optional `scheduledTime`.
- Future work: add recurrence, calendar import, conflicts, or duration only if real usage proves the simple list insufficient.
- Acceptance signal: timed, untimed, and same-time tasks remain fast to create and scan without empty calendar slots. Verified by e2e on 2026-06-11.

### Internal Date Naming

- Current state: visible UI and routes use Date/Dates, while the storage/sync collection remains `Deadline`/`deadlines` for offline compatibility.
- Future work: rename the internal model only in a deliberately compatibility-breaking migration with cache/outbox handling.
- Acceptance signal: no visible legacy terminology leaks while old clients can still drain queued mutations.

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

- Status: aligned in v0.2.8. Package metadata, shell label, active docs, and version log use `0.2.8`.
- Future work: keep version bumps part of each release batch.
