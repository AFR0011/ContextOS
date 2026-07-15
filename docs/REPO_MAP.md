# ContextOS Repo Map

## Root
- `BLUEPRINT.md`: product specification and MVP rules.
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
- `src/components/workspace/Views.tsx`: route-level ContextOS views and Project command-page surface.
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
- `src/lib/starter.ts`: default domains and seeded workspace creation.
- `src/lib/command-page-commands.ts`: parser for explicit `/task` and `/date` command-page lines.
- `src/lib/types.ts`: shared app data types.
- `src/lib/client-store.tsx`: IndexedDB cache, offline outbox, sync state, and client mutations.

## PWA
- `public/sw.js`: runtime cache service worker.
- `public/manifest.webmanifest`: installable app manifest.

## Legacy
- The previous Vite entrypoints and dormant Vite page files were removed during the Next migration.
- The standalone Markdown editor Vite prototype is archived under `docs/archive/prototypes/markdown-editor-sample-demo/` and is not part of the active app.
