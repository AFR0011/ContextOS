# Changelog

## [Unreleased] — C10 accepted baseline, 2026-09-24

### Changed

- The definitive workspace is the simplified Area → Project → Task model with flat Projects; Inbox, Resources, Reviews, standalone Archive/Trash, nested Subcontexts, and the pre-C8 tombstone UI/persistence model remain retired.
- C10 conflict handling uses server-owned per-record revisions and an IndexedDB v4 clean boundary for revisionless cached workspace/outbox state.
- Tasks now support shared post-creation editing for title, Project/Area context, planned day, and scheduled time without adding new Task lifecycle states.
- Area Detail now supports Area rename.
- Project archive is blocked while Open Project Tasks remain; Area archive is blocked by direct Open Tasks only, preserving independent child-Project lifecycle.
- Archived parent context is labelled across Home, Dates, Search, and Project metadata; completed Tasks under archived parents cannot reopen until moved to active context or the parent is restored.
- Per-record Task/Date deletion remains outside the canonical C10 product because sync is intentionally upsert-only and no anti-resurrection delete protocol is claimed.

### Verification

- C10 adds a separate current acceptance registry and A–E full-product audit while preserving published Stage 7–10 evidence as historical provenance.
- Rendered screenshot/human visual acceptance and the complete local final runtime ladder passed; the C10 acceptance baseline was frozen on 2026-09-24 against product commit `ae58fa5c3d1199af80bb53c80b4e4a2136177bd0`, with metadata closure audited at `4aeaffe45437eb5bbdafb4950528e877619c46ca`.

## [1.0.0] - 2026-09-14

### Added

- Local-first workspace operation backed by a user-scoped IndexedDB snapshot and durable mutation outbox after a successful authenticated bootstrap on the device.
- Projects and nested subcontexts, Tasks, important Dates, Areas, Markdown-backed Resources, Inbox capture/triage, local Search, Archive/Trash, Reviews, and explicit handoff previews.
- Versioned application-shell caching for verified production-build offline reopen and hard-refresh behavior on the documented core routes.
- Whole-workspace versioned export/import with replace/merge recovery paths and cross-account ID remapping.
- Trusted-operator account provisioning and password recovery for closed-registration self-hosted deployments.
- Authenticated password rotation and active-session visibility/revocation.
- Repository-owned production-style Docker Compose distribution with PostgreSQL 16, one-shot migrations, a non-root standalone application image, and an unexposed operator image.

### Changed

- New real accounts begin with an empty production workspace scaffold; fictional starter records are limited to deliberate local/disposable demo seed and reset paths.
- Ordinary record deletion is recoverable synchronized state: Projects, Tasks, standalone Notes, and Dates use tombstones, while Inbox captures use synchronized deleted status.
- Lifecycle behavior is explicit: ordinary logout retains isolated local state by default, device removal is separate, pending mutations receive explicit handling, and permanent account deletion is online and password-confirmed.
- PostgreSQL remains canonical after successful synchronization while supported workspace mutations commit locally first and replay idempotently when connectivity returns.

### Security

- User-owned server records and relationships are ownership-validated; browser state-changing routes are same-origin guarded and API responses are excluded from application-shell caching.
- Passwords are bcrypt-hashed, sessions are HTTP-only, repeated authentication attempts are application-throttled, and production public registration/demo reset default closed.
- Operator password reset revokes all server sessions while preserving workspace rows; passwords are never accepted as operator CLI arguments.
- Production container services drop Linux capabilities and use non-root application/operator runtimes with administrative scripts excluded from the public runtime image.

### Reliability / Verification

- Stage 7-10 security, deployment, recovery, lifecycle, offline, public-claims, and final-acceptance controls remain part of the permanent verification ladder.
- CI verifies committed Prisma migrations, operator-account behavior, TypeScript, optimized production build, production/offline Playwright coverage, lifecycle/destructive-data coverage, the full development E2E suite, and deliberate database-outage behavior.
- Production-container acceptance builds the actual app/operator/migration images against a fresh PostgreSQL volume and verifies migration ordering, closed registration, non-root/runtime separation, first-account provisioning, authentication, and empty production bootstrap.

### Known boundaries

ContextOS v1 is self-hostable application software, not an operated hosted SaaS service or a compliance-certified/high-sensitivity platform. It does not claim collaborative real-time/CRDT editing, provider-native backup/PITR rehearsal, production SLA/on-call guarantees, email verification or self-service password reset, distributed WAF/rate limiting, remote erasure of another offline device, or irreversible per-record purge without an anti-resurrection protocol. See `docs/PROJECT_STATE.md`, `SECURITY.md`, and `docs/LOCAL_FIRST_CONTRACT.md` for the canonical boundaries.
