# ContextOS Deployment

## Current Release Gate

As of v0.2.6 on 2026-06-16, the first deployment-hardening slices are complete, but public production is still blocked until the remaining gates are verified:

1. Sync writes and mutation-ledger lookups are user-scoped and pass two-user isolation tests. DONE in v0.2.3.
2. Production registration is closed or invitation-controlled; demo credentials and reset actions are not presented as normal production UX. CLOSED BY DEFAULT in v0.2.3.
3. Sync requests have request-size, mutation-count, entity, and field-length limits. DONE in v0.2.3.
4. Login/register have rate limiting or equivalent provider protection. APP-LEVEL DONE in v0.2.6; provider/WAF defense in depth still recommended for public production.
5. Security headers, `metadataBase`, and the corrected service-worker cache/routes are verified. DONE in v0.2.5.
6. CI passes Prisma validation/generation, typecheck, build, and sequential Playwright against disposable PostgreSQL.
7. A production-like preview passes auth, capture, offline/reconnect, search, project recovery, Dates, mobile, and installed-PWA smoke.
8. Database backup/restore, monitoring/health checks, migration handling, and application/database rollback are rehearsed and recorded.

See `docs/AUDIT_2026-06-15.md` for evidence and priorities.

## Production Environment

Set these variables in the deployment provider before building:

- `DATABASE_URL`: production PostgreSQL connection string.
- `AUTH_SECRET`: fresh random secret with at least 32 bytes of entropy.
- `NEXT_PUBLIC_APP_URL` or `APP_URL`: canonical public origin used for metadata. `VERCEL_URL` is accepted as a platform fallback.
- `AUTH_RATE_LIMIT_WINDOW_MS`: optional auth limiter window override; default is 10 minutes.
- `AUTH_LOGIN_MAX_FAILURES`: optional failed-login limit override; default is 5 per window.
- `AUTH_REGISTER_MAX_ATTEMPTS`: optional registration attempt limit override; default is 3 per window.
- `SEED_DEMO_EMAIL`: optional demo account email for intentional seeding.
- `SEED_DEMO_PASSWORD`: optional demo account password for intentional seeding.
- `ALLOW_DEMO_RESET`: keep unset or `false` in production unless an explicit demo reset endpoint is intended.

Generate a fresh auth secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Treat any credential that appeared in a shared archive, chat, screenshot, or committed file as leaked. Rotate the database password and update `DATABASE_URL` in the provider before deploying.

## Local Development

```bash
npm install
docker compose up -d
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

`npm run db:seed` is safe for local demo data, but it intentionally recreates the starter workspace for the seeded demo user.

## Vercel Deploy

The checked-in `vercel.json` build command is:

```bash
npm run build
```

This builds the app. It does not run migrations or `npm run db:seed`.

Prisma migration deployment should be run deliberately when committed files under `prisma/migrations/**` change:

```bash
npm run db:deploy
```

This avoids multiple Vercel builds competing for Prisma's PostgreSQL advisory migration lock.

Before the first deploy:

1. Create or select the production PostgreSQL database.
2. Add the production environment variables in Vercel.
3. Ensure `ALLOW_DEMO_RESET` is unset or `false`.
4. Complete the Current Release Gate above.
5. Deploy to a preview environment first.
6. Confirm the full critical workflow and operational checks against the preview database.
7. Promote the verified preview to production.

Do not treat application rollback as a database rollback. Before any destructive migration, take and verify a provider backup and document the compatible application/database rollback pair.

## Manual Migration

For providers that do not run the Vercel build command, apply migrations manually:

```bash
npm run db:deploy
npm run build
```

Use `npm run db:migrate` only for local development migration creation/application. Use `npm run db:deploy` for production.

If a deploy fails with Prisma `P1002` while acquiring advisory lock `72707369`, cancel any duplicate in-progress deploys/migration jobs and retry after the previous migration process exits. PostgreSQL advisory locks are session-scoped; a genuinely stuck backend must be cleared from the database provider before migration deployment can continue. Do not disable Prisma advisory locking for normal production deploys.

## Intentional Production Seeding

Production seeding should be rare and deliberate:

1. Back up the database.
2. Confirm the target database is not holding real user data that should be preserved.
3. Set `SEED_DEMO_EMAIL` and `SEED_DEMO_PASSWORD` explicitly for the target environment.
4. Run `npm run db:seed` manually from a controlled shell.
5. Remove or rotate the seed password if the account should not remain public.

Never add `npm run db:seed` back to the normal production build command.
