# ContextOS

ContextOS is a local-first workspace for capturing loose context, turning it into executable work, and recovering project state after interruptions.

It combines a Next.js application with PostgreSQL-backed user data and an offline mutation outbox so core work can continue through temporary network failures and synchronize safely when connectivity returns.

## Engineering highlights

- **User-scoped persistence:** PostgreSQL + Prisma with authenticated, user-owned records.
- **Offline-first core workflow:** IndexedDB caches core views and queues mutations locally.
- **Idempotent synchronization:** queued mutations are replayed through `/api/sync` with per-user mutation IDs and ownership validation.
- **Authentication hardening:** hashed passwords, HTTP-only sessions, registration controls, failed-login throttling, and structured outage handling.
- **Failure-aware UX:** database and synchronization failures are surfaced as recoverable states instead of silent data loss.
- **Automated verification:** GitHub Actions runs PostgreSQL-backed migrations, seed, type checking, production build, and Playwright E2E tests.

## Architecture

```text
Browser
  ├─ Next.js App Router UI
  ├─ IndexedDB cache
  └─ Offline mutation outbox
          │
          ▼
      Next.js API
          │
          ├─ authentication / authorization
          ├─ idempotent sync replay
          └─ validation
          │
          ▼
   PostgreSQL + Prisma
```

The server is canonical after synchronization. Offline support is intentionally focused on durable CRUD-style workspace mutations rather than collaborative conflict-resolution UI.

## Product surface

ContextOS currently supports:

- Dashboard command page and scratchpad
- Inbox capture and triage
- Projects and nested subcontexts
- Tasks and important dates
- Search and recovery surfaces
- Notes/resources
- Archive and review flows
- Offline-safe edits with visible pending-sync state
- Authenticated LifeOS-style handoff previews

## Tech stack

- Next.js 16 / React 19 / TypeScript
- PostgreSQL / Prisma 7
- IndexedDB for client-side cache and queued mutations
- Playwright for end-to-end verification
- Docker Compose for local PostgreSQL
- GitHub Actions CI

## Quick start

### Prerequisites

- Node.js 22+
- Docker with Docker Compose

### Run locally

```bash
npm install
cp .env.example .env
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

The default seed creates a disposable demo workspace. The credentials are defined in `.env.example` and are intended only for local/demo use.

## Configuration

Required:

- `DATABASE_URL`
- `AUTH_SECRET`

Optional deployment/demo controls include:

- `NEXT_PUBLIC_APP_URL` or `APP_URL`
- `AUTH_RATE_LIMIT_WINDOW_MS`
- `AUTH_LOGIN_MAX_FAILURES`
- `AUTH_REGISTER_MAX_ATTEMPTS`
- `SEED_DEMO_EMAIL`
- `SEED_DEMO_PASSWORD`
- `ALLOW_PUBLIC_REGISTRATION`
- `ALLOW_DEMO_RESET`

Generate a fresh `AUTH_SECRET` for every deployed environment. Do not reuse the example value outside local development.

## Verification

```bash
npm run typecheck
npm run build
npm run test:e2e
```

The CI workflow additionally starts PostgreSQL 16, validates and generates the Prisma client, applies committed migrations, seeds the demo workspace, builds the application, and runs Playwright against the database-backed app.

## Deployment notes

- `npm run db:seed` resets the configured demo workspace and should never run automatically against production data.
- `/api/reset-demo` is disabled in production unless `ALLOW_DEMO_RESET=true` is deliberately enabled.
- Public registration is closed by default in production unless explicitly enabled.
- `GET /api/health` reports application/database availability with `Cache-Control: no-store`.

See `docs/DEPLOYMENT.md` and `docs/RUN_PROTOCOL.md` for the deeper operational workflow.

## Scope and limitations

ContextOS is a portfolio-stage application, not a hosted multi-tenant SaaS service.

Current boundaries include:

- no collaborative merge interface;
- no email verification or password-reset flow;
- no OAuth;
- no calendar integration or task recurrence;
- no external AI dependency for core operation;
- offline behavior covers cached workspace views and queued mutations, not arbitrary offline server functionality.

These limits are intentional and are documented rather than hidden behind the traditional software-development strategy of pretending unfinished things are a roadmap.

## Repository documentation

- `BLUEPRINT.md` — product specification and design intent
- `docs/PROJECT_STATE.md` — current implementation state and known boundaries
- `docs/REPO_MAP.md` — code/data-flow map
- `docs/RUN_PROTOCOL.md` — setup and verification ladder
- `docs/DEPLOYMENT.md` — deployment guidance
- `SECURITY.md` — vulnerability reporting and security assumptions
- `CONTRIBUTING.md` — contribution and verification expectations

## License

MIT. See `LICENSE`.