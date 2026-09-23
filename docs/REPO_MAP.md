# ContextOS Repo Map

## Root

- `BLUEPRINT.md`: canonical current product specification.
- `package.json`: scripts and dependency contract.
- `.env.example`, `.env.production.example`: deployment configuration templates.
- `compose.production.yml`, `Dockerfile`: repository-owned self-host distribution.
- `prisma/`: schema and committed migrations.
- `docs/archive/`: historical/superseded material excluded from active product semantics.

## App routes

- `src/app/(workspace)/dashboard`: Home entrypoint handed to the local workspace router.
- `src/app/(workspace)/projects`: Projects / dynamic Project detail entrypoints.
- `src/app/(workspace)/areas`: Areas / dynamic Area detail entrypoints.
- `src/app/(workspace)/dates`: canonical Dates entrypoint.
- `src/app/(workspace)/lifeos`: LifeOS hub entrypoint.
- `src/app/(workspace)/search`: Search entrypoint.
- `src/app/(workspace)/settings`: Settings entrypoint.
- `src/app/(workspace)/account/delete`: account-deletion confirmation.
- `src/app/handoff`: authenticated read-only compatibility preview for `lifeos-handoff/v1`; C7 no longer writes Inbox captures.

Compatibility redirect pages:

- `/today` -> `/dashboard`
- `/this-week` -> `/dashboard`
- `/deadlines` -> `/dates`
- `/inbox` -> `/dashboard`
- `/resources` -> `/lifeos`
- `/reviews` -> `/lifeos`
- `/archive` -> `/search`

## Product UI

- `WorkspaceShell.tsx`: desktop/mobile shell, theme, sync, navigation, command palette host.
- `LocalWorkspaceRouter.tsx`: canonical authenticated local route owner.
- `WorkspaceCommandPalette.tsx`: Cmd/Ctrl+K search/navigation and Task/Date quick-create.
- `HomeView.tsx`: Today Dayline, Daily Notes, Insights, Context Today, Upcoming.
- `ProjectsView.tsx`: Active/Archived flat Projects.
- `ProjectDetailView.tsx`: objective, Tasks, Dates, Linked Knowledge boundary.
- `AreasView.tsx`: Active/Archived Areas.
- `AreaDetailView.tsx`: Area rename, Active Projects, Direct editable Tasks, Direct Dates, Archived Projects.
- `TaskEditSheet.tsx`: shared post-creation Task editor for title, context, planned day, and time.
- `DatesView.tsx`: canonical Today/Upcoming/Past Event/Deadline surface.
- `ProductSearchView.tsx`: exact canonical Search detail.
- `LifeOSFoundationView.tsx`: shallow LifeOS module hub.
- `ProductSettingsView.tsx`: definitive six-section Settings IA.
- `ProductPrimitives.tsx`: shared UI primitives and command-palette presentation.
- `Views.tsx`: stable export facade for remaining route-level Work views.

Inbox, Resources, Reviews, and standalone Archive were retired in C7. Their old view modules are physically removed, not hidden behind dormant imports.

The former `LegacyWorkspaceViews.tsx` monolith was removed in Batch 10; the remaining C7 retired modules were removed during the canonical redesign.

## Canonical domain/search

- `src/lib/canonical-domain.ts`: Area, Project, Task, ContextDate, DailyNote, Insight types.
- `src/lib/canonical-selectors.ts`: Home/Project/Date derived selectors.
- `src/lib/canonical-search.ts`: shared Search/command-palette canonical index.
- `src/lib/archive-policy.ts`: Project/Area archive blockers and archived-parent Task reopen invariant.

## Persistence / synchronization

- `src/lib/types.ts`: canonical persisted workspace and sync types.
- `src/lib/client-store.tsx`: canonical IndexedDB state and atomic outbox mutations.
- `src/lib/local-db.ts`: per-user IndexedDB storage.
- `src/lib/sync-server.ts`: canonical server mutation validation/replay, ownership checks, and stale-write handling.
- `src/lib/data.ts`: authenticated bootstrap serialization.
- `src/lib/portability.ts`: import/export validation and relationship checks.
- `src/lib/starter.ts`: empty production scaffold plus neutral canonical demo seed.
- `prisma/schema.prisma`: current database schema.

C8 removes the retired persistence layer. Server bootstrap, local storage, sync, and export now share the canonical Area / Project / Task / Date / DailyNote shape.

## LifeOS integration

- `src/lib/lifeos-modules.ts`: module provider + safe configurable destinations.
- `src/lib/lifeos-handoff.ts`: historical handoff validation/fragment parser.
- `docs/fixtures/lifeos-handoff-v1.json`: cross-repository compatibility fixture.

## PWA / local routing

- `src/lib/local-router.tsx`: local route history, canonical path detection, compatibility aliases.
- `public/sw.js`: versioned verified application shell; APIs are network-only.
- `OfflineReadiness.tsx`: readiness state shown to the user.

## Assurance

- `scripts/stage7-*.mjs`: repository/security/config/data-scope controls.
- `scripts/stage8-*.mjs`: deployment/operations controls.
- `scripts/stage9-lifecycle-audit.mjs`: current lifecycle and canonical no-tombstone safety guard.
- `scripts/stage10-*.mjs`: historical Stage 10 acceptance/claims provenance integrity.
- `scripts/c10-product-acceptance-check.mjs`: current post-redesign C10 acceptance registry guard.
- `audits/c10-product-acceptance.json`: current C10 acceptance state.
- `audits/historical-artifact-retirements.json`: explicit map for intentionally removed historical assurance artifacts.
- `tests/e2e/`: development interaction, local-first, compatibility, persistence, and regression tests.
- `tests/offline-production/`: optimized-runtime offline/PWA/security checks.
- `docs/stage8/`, `docs/stage9/`, `docs/stage10/`: historical verification provenance.
- `docs/c10/C10_ACCEPTANCE.md`: current definitive product-acceptance program.

## Migration boundary

Inbox, Resources, Reviews, and standalone Archive remain retired first-class UI. Their compatibility URLs redirect to canonical destinations.

C8 is the persistence boundary: retired storage/models are removed, export format v2 is canonical, and sync is canonical-only. C10's IndexedDB v4 revision boundary retains verified local identity while clearing incompatible revisionless workspace/outbox state.
