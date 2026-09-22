# ContextOS Project State

## Status

ContextOS is a self-hostable, local-first workspace application with an evidence-backed core workflow. The repository is deployable application software, not an operated hosted SaaS service or a compliance-certified/high-sensitivity platform.

Package version: `1.0.0`.

The post-release canonical redesign has completed C1–C9 on `main`. C10 is the current definitive product-acceptance and baseline-freeze phase. The product is based on flat Areas, Projects, Tasks, ContextDates, Daily Notes, canonical Search, a command palette, and a shallow LifeOS hub.

Historical assurance remains important provenance. Stage 9 closed against GitHub Actions run `31798664757`. Stage 10's verified acceptance candidate is commit `f4ba02699c24210ddd6f4cfaf2b626f7a33b0c40`, CI run `31800346837`. Later product changes preserve the applicable engineering boundaries while updating tests/docs when semantics intentionally change.

## Current Product Surface

### Home

Home is the operational entry point at `/dashboard`:

- Today Dayline: scheduled Tasks + Events today;
- untimed planned Tasks under Anytime;
- one Daily Note for the local calendar day;
- explainable Insights only when genuinely available;
- In Context Today;
- future Upcoming Events/Deadlines.

### Work model

```text
Area -> Project -> Task
```

- Projects are flat and belong to exactly one Area.
- Tasks belong to one Project or directly to one Area.
- Project states: Active / Archived.
- Area states: Active / Archived.
- Task states: Open / Done.
- ContextDates are Event / Deadline and belong to exactly one Project or Area.
- Dates have no completion/archive lifecycle.

### Search and command palette

Search indexes only canonical:

- Projects;
- Areas;
- Tasks;
- ContextDates;
- Daily Notes.

Archived/completed/past canonical records remain searchable.

Cmd/Ctrl+K shares the same canonical Search model and provides page navigation plus direct New Task/New Date flows.

### LifeOS

The LifeOS hub exposes Ravel, SocialOS, Ledger, and Canon through an explicit provider boundary. Module destinations are optional configuration. Missing or invalid destinations display **Not connected**; ContextOS does not invent module metrics or duplicate module internals.

### Settings

Definitive Settings sections:

- Account
- Appearance
- Offline & Sync
- Data
- Security
- Advanced

Area management lives under Areas, not Settings.

## Retired Surface Boundary

Inbox, Resources, Reviews, and the standalone Archive page are retired first-class product surfaces.

Compatibility URLs:

```text
/inbox     -> /dashboard
/resources -> /lifeos
/reviews   -> /lifeos
/archive   -> /search
```

Historical aliases remain:

```text
/today     -> /dashboard
/this-week -> /dashboard
/deadlines -> /dates
```

The old UI modules are removed. The compatibility aliases remain shell-resolvable so old bookmarks can migrate cleanly, including on a prepared offline device.

The demo reset no longer creates Capture, standalone Note/Resource, or Review fixtures.

### LifeOS handoff boundary

The historical `/handoff` parser remains readable for compatibility, but C7 no longer writes approved proposals into a retired Inbox. Until a canonical inter-module action contract is defined, the route is a private read-only preview that does not save the proposal.

## Canonical Persistence After C8

C8 completes the clean persistence break.

Current persisted workspace collections are:

- Area;
- Project;
- Task;
- ContextDate (exposed as Dates in WorkspaceData/export);
- DailyNote.

Removed persistence concepts include Capture, standalone Note/Resource, Review, legacy Deadline, DashboardScratchpad / DashboardPreference, project recovery/nesting metadata, legacy Task status/due/archive fields, and per-record tombstone fields.

The sync wire accepts canonical entity types only and ordinary mutations are upsert-only. Export format v2 uses canonical names. IndexedDB v4 preserves verified local identity while clearing incompatible pre-C8 workspace/outbox snapshots so authenticated bootstrap can rebuild canonical state.

## Local-First Architecture

- Next.js App Router / React / TypeScript.
- PostgreSQL canonical after successful synchronization.
- Prisma schema/migrations.
- user-scoped IndexedDB workspace + outbox.
- atomic local workspace/outbox commits.
- idempotent sync replay with ownership validation and stale warnings.
- versioned service-worker shell; API requests remain network-only.
- previously authenticated local identities only; ContextOS never fabricates first-time offline authentication.
- explicit identity choice when several eligible local workspaces exist.

The canonical offline surfaces are Home, Projects/Project Detail, Dates, Areas/Area Detail, LifeOS, Search, and Settings. Retired aliases may resolve to those canonical destinations but are not separate offline products.

## Security / Lifecycle

- passwords are bcrypt-hashed;
- sessions are HttpOnly and user-scoped;
- browser state-changing requests are same-origin guarded;
- public registration/demo reset are closed by default in production;
- ordinary logout preserves local data by default;
- user-scoped remove-from-device exists;
- pending work is never silently discarded;
- offline logout is blocked because the server HttpOnly session cannot truthfully be revoked offline;
- permanent account deletion is online and password-confirmed;
- other offline devices cannot be remotely scrubbed after account deletion.

## Verification State

The historical Stage 7–10 ladder remains repository provenance and the current verification ladder continues to include the applicable static/security/deployment/lifecycle controls, TypeScript/build gates, production/offline browser tests, and development E2E tests.

Current assurance reflects the canonical C8–C9 product while preserving older Stage 7–10 evidence as historical provenance:

- retired-route tests verify explicit redirects rather than deleted UI;
- local atomicity/user-isolation tests use canonical records rather than retired Inbox/Resource/Review state;
- stale-write assurance protects canonical last-write behavior without relying on retired tombstone fields;
- production offline checks cover canonical routes plus compatibility aliases;
- C9 adds hostile-long-content, touch, keyboard-focus, and full canonical offline mutation/reconnect convergence coverage;
- C10 adds a separate current acceptance registry rather than rewriting the historical Stage 10 record.

## Known Boundaries

- no collaborative real-time merge UI or CRDT model;
- no email verification or self-service password reset;
- no general OAuth/SSO product surface;
- no calendar-provider integration or task recurrence;
- no semantic search;
- no external AI dependency for core operation;
- no distributed provider/WAF rate limiting supplied by this repository;
- no provider-native backup/PITR guarantee;
- no production SLA/on-call guarantee;
- no remote erasure of another offline device;
- no irreversible per-record purge without an anti-resurrection protocol;
- no rolling pre-C8 local workspace/outbox upgrade is promised; incompatible old local state is reset at IndexedDB v4.

Historical note: Stage 10 closed in August 2026 against the earlier **portfolio-stage** local-first boundary. That wording is historical provenance, not the current product maturity label. Current C10 (September 2026) is a separate post-redesign acceptance program anchored to the accepted C9 baseline.

## Canonical References

- `BLUEPRINT.md`
- `docs/LOCAL_FIRST_CONTRACT.md`
- `docs/REPO_MAP.md`
- `docs/RUN_PROTOCOL.md`
- `docs/DEPLOYMENT.md`
- `docs/CONTAINER_DEPLOYMENT.md`
- `SECURITY.md`
- historical `docs/stage8/`, `docs/stage9/`, and `docs/stage10/`
