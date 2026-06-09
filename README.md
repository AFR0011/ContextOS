# ContextOS

ContextOS is an execution-first context recovery system for fast capture, inbox triage, daily execution, project recovery, reviews, search, archive/trash, and offline-safe core usage.

This repo is now a Next.js + PostgreSQL demo with:

- real local email/password auth
- Prisma-backed user-scoped data
- seeded demo data by default
- IndexedDB cached core views
- offline mutation outbox with idempotent sync
- service-worker app-shell caching

## Quick Start

```bash
npm install
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

Demo login:

- Email: `demo@contextos.local`
- Password: `contextos-demo-v011`

## Commands

```bash
npm run dev
npm run build
npm run typecheck
npm run db:migrate
npm run db:deploy
npm run db:seed
npm run db:reset
npm run test:e2e
```

## Environment

Copy `.env.example` to `.env` if needed.

Required variables:

- `DATABASE_URL`
- `AUTH_SECRET`
- `SEED_DEMO_EMAIL`
- `SEED_DEMO_PASSWORD`
- `ALLOW_DEMO_RESET`

Generate a fresh `AUTH_SECRET` for every deployed environment. Never reuse a secret from a shared archive, chat transcript, or local demo file.

## Seeding And Deploy Safety

`npm run db:seed` resets the seeded demo workspace. Use it for local demo setup or an intentional one-off demo reset only. It should not run during normal production deploys.

The Vercel build command builds the app only. Run `npm run db:deploy` deliberately when committed migrations need to be applied. `/api/reset-demo` is disabled in production unless `ALLOW_DEMO_RESET=true` is explicitly set.

## Offline Sync

Core workspace data is cached in IndexedDB. Edits are written locally first, queued as idempotent mutations, and synced to `/api/sync` when online. Settings shows online/offline status, pending changes, last sync time, and sync errors.

## Docs

- `BLUEPRINT.md`: product specification
- `docs/PROJECT_STATE.md`: current implementation state
- `docs/REPO_MAP.md`: repo structure
- `docs/RUN_PROTOCOL.md`: setup and verification ladder
- `docs/DEPLOYMENT.md`: local and Vercel deployment notes
