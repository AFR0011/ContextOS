# Contributing

ContextOS is a focused portfolio-stage project. Contributions should preserve its core goal: fast context capture, durable execution state, and reliable recovery after interruptions.

## Development setup

```bash
npm install
cp .env.example .env
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev
```

## Before submitting a change

Run the relevant verification steps:

```bash
npm run typecheck
npm run build
npm run test:e2e
```

For schema changes, also run Prisma validation/migrations against a disposable local PostgreSQL database.

## Contribution expectations

- Keep records user-scoped.
- Preserve the local-first/offline mutation model for supported core workflows.
- Avoid introducing external AI or cloud dependencies into core operation.
- Add or update Playwright coverage for auth, data ownership, sync, offline, or routing changes.
- Do not commit secrets, personal data, generated browser reports, local databases, or deployment credentials.
- Keep public demo/seed content generic and non-personal.
- Update documentation when behavior, setup, limitations, or operational assumptions change materially.

## Pull requests

A useful pull request should explain:

1. what problem it solves;
2. what behavior changed;
3. how it was verified;
4. any known limitations or follow-up work.

Small, reviewable changes are preferred over broad rewrites.