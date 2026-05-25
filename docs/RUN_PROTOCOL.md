# RUN_PROTOCOL

## Verification Ladder
Use the first applicable checks for the current repo state.

1. Documentation-only state:
   - Inspect changed Markdown files for consistency with `BLUEPRINT.md`.
   - Run `git status --short --branch`.

2. After `package.json` exists:
   - Run the package manager install command if dependencies are missing.
   - Run `npm run lint` when present.
   - Run `npm run typecheck` when present.
   - Run `npm test` when present.

3. After database setup exists:
   - Validate environment variable documentation.
   - Run `npm run db:generate`.
   - Run `npx drizzle-kit check`.
   - Run migrations against a clean local database when available.
   - For local PostgreSQL, copy `.env.example` to `.env`, start Docker Desktop, then run `docker compose up -d postgres` and `npm run db:migrate`.

4. After UI routes exist:
   - Start the dev server.
   - Smoke test dashboard/auth routes in a browser or with an HTTP check.

## Reporting Rules
- State exactly which checks ran.
- State skipped checks with the concrete reason.
- Update `QA_REPORT.md` when verification results or gaps change.
