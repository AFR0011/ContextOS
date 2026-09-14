# ContextOS Repo Map

## Root
- `BLUEPRINT.md`: product specification and current v1 rules.
- `package.json`: Next/Prisma scripts and dependencies.
- `docker-compose.yml`: local PostgreSQL service.
- `.env.example`: required local environment variables.
- `prisma.config.ts`: Prisma 7 CLI datasource configuration.
- `.github/workflows/ci.yml`: GitHub Actions verification workflow using Node 22 and PostgreSQL 16.
- `docs/archive/`: historical prototypes, superseded plans, old audits, and archived operational artifacts excluded from app typecheck.

## App
- `src/app/(workspace)/handoff`: authenticated LifeOS proposal preview and explicit approval.
- `src/app`: Next App Router routes.
- `src/app/(auth)`: login and register pages.
- `src/app/(workspace)`: protected application routes, including canonical `/dates` and compatibility `/deadlines` redirect.
- `src/app/api`: auth, health, bootstrap, sync, and reset route handlers.
- `src/app/globals.css`: Tailwind import and global CSS.

## Product UI
- `src/components/AuthForm.tsx`: local auth form.
- `src/components/workspace/WorkspaceShell.tsx`: protected app shell, navigation, sync badge.
- `src/components/workspace/LocalWorkspaceRouter.tsx`: canonical authenticated workspace route owner.
- `src/components/workspace/Views.tsx`: stable export facade for the remaining route-level workspace views.
- `src/components/workspace/AreasView.tsx`: Areas overview, project trees, and Area-scoped project creation.
- `src/components/workspace/DatesView.tsx`: important-date creation, editing, archive, trash, and Markdown notes.
- `src/components/workspace/ProjectsView.tsx`: project index and nested project navigation.
- `src/components/workspace/ProjectDetailView.tsx`: project command page, recovery context, tasks, dates, subcontexts, and export.
- `src/components/workspace/ReviewsView.tsx`: daily/weekly review capture and review history.
- `src/components/workspace/Dashboard2.tsx`: Dashboard command page with scratchpad editor, live Tasks/Dates blocks, and local block view controls.
- `src/components/workspace/CommandPageBlocks.tsx`: shared command-page editor and live task/date block components for Dashboard and Project detail.
- `src/components/workspace/DailySchedule.tsx`: compact editable task-list surface retained for compatibility views.

## Server And Data
- `src/lib/lifeos-handoff.ts`: shared `lifeos-handoff/v1` validation and URL-fragment decoding.
- `docs/fixtures/lifeos-handoff-v1.json`: cross-repository conformance fixture.
- `prisma/schema.prisma`: PostgreSQL schema, including nullable task `scheduledTime` and project `parentProjectId`.
- `prisma/migrations`: database migrations.
- `src/lib/prisma.ts`: Prisma client singleton with PostgreSQL adapter.
- `src/lib/auth.ts`: password/session helpers and route protection.
- `src/lib/data.ts`: database-to-client workspace serialization.
- `src/lib/sync-server.ts`: idempotent outbox replay, legacy task/note/priority compatibility, and last-write-wins application.
- `src/lib/starter.ts`: empty production workspace scaffold plus deliberate demo/starter fixture creation for seed/reset paths.
- `src/lib/command-page-commands.ts`: parser for explicit `/task` and `/date` command-page lines.
- `src/lib/types.ts`: shared app data types.
- `src/lib/client-store.tsx`: IndexedDB cache, offline outbox, sync state, and client mutations.

## PWA
- `public/sw.js`: runtime cache service worker.
- `public/manifest.webmanifest`: installable app manifest.

## Legacy
- The previous Vite entrypoints and dormant Vite page files were removed during the Next migration.
- The standalone Markdown editor Vite prototype is archived under `docs/archive/prototypes/markdown-editor-sample-demo/` and is not part of the active app.
- The former monolithic `LegacyWorkspaceViews.tsx` workspace implementation was removed in Batch 10 after all live views were extracted into focused modules.
- Retired June 2026 dev-loop coordination artifacts that formerly lived under the root `shared/` directory are archived under `docs/archive/shared/`; they are historical provenance, not active product or CI state.
