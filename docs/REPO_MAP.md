# REPO_MAP

## Top-Level Layout
- `BLUEPRINT.md` - product contract, target architecture, sprint plan, and acceptance criteria.
- `AGENTS.md` - repo-specific Codex operating rules.
- `DEV_STATE.md` - current dev-loop state and active batch.
- `DEV_LOG.md` - chronological development log.
- `QA_REPORT.md` - verification history and gaps.
- `RISK_REGISTER.md` - active implementation risks.
- `app/` - Next.js App Router application shell.
- `app/layout.tsx` - root HTML layout, metadata, fonts, and global CSS import.
- `app/page.tsx` - current root ContextOS workspace scaffold page.
- `app/globals.css` - Tailwind import and base theme variables.
- `package.json` - npm scripts and runtime/dev dependencies.
- `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs` - framework, TypeScript, lint, and Tailwind/PostCSS config.
- `drizzle.config.ts` - Drizzle Kit config for schema and migration output.
- `.env.example` - local PostgreSQL connection template.
- `docker-compose.yml` - local PostgreSQL service for migration checks and development.
- `db/index.ts` - PostgreSQL client and Drizzle database instance.
- `db/schema.ts` - initial schema for users, workspaces, contexts, pages, and page_versions.
- `db/migrations/` - generated Drizzle SQL migrations and metadata.
- `docs/` - secondary repo map and project state docs.
- `shared/` - dev-loop agent status, request/response, error, and performance audit logs.

## Key Files
- `BLUEPRINT.md` remains the strongest product and sprint source of truth.
- `package.json` defines `dev`, `build`, `start`, `lint`, `typecheck`, `db:generate`, `db:migrate`, `db:push`, and `db:studio`.
- No auth implementation, API routes, protected routes, or workspace seed code exists yet.

## Likely Entrypoints
- App entrypoints live under `app/`.
- The root route is `app/page.tsx`.
- Planned API routes will likely live under `app/api/`.
- Database schema lives under `db/schema.ts`.
- Planned shared utilities will likely live under `lib/`.

## Current Notes
- Repo type inference: early Next.js framework app.
- Active source surface is the app shell plus operating docs.
- Refine this map as `lib/`, API routes, auth, workspace seeding, and editor surfaces are introduced.
