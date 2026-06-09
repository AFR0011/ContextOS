# ContextOS Deployment

## Production Environment

Set these variables in the deployment provider before building:

- `DATABASE_URL`: production PostgreSQL connection string.
- `AUTH_SECRET`: fresh random secret with at least 32 bytes of entropy.
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
4. Deploy.
5. Confirm login/register and a basic capture work against the production database.

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
