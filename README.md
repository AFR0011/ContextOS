# ContextOS

ContextOS is a local-first workspace for capturing loose context, turning it into executable work, and recovering project state after interruptions.

It combines a Next.js application with PostgreSQL-backed user data and an offline mutation outbox so core work can continue through temporary network failures and synchronize safely when connectivity returns.

> **Project status:** portfolio-stage application and engineering demonstration. It is not presented as a hosted production SaaS service.

## Engineering highlights

- **User-scoped persistence:** PostgreSQL + Prisma with authenticated, user-owned records.
- **Offline-safe core workflow:** IndexedDB caches core views and queues mutations locally.
- **Idempotent synchronization:** queued mutations are replayed through `/api/sync` with per-user mutation IDs, ownership validation, stale-update handling, and bounded payloads.
- **Authentication hardening:** hashed passwords, HTTP-only sessions, registration controls, failed-login throttling, and structured database-outage handling.
- **Failure-aware UX:** database and synchronization failures are surfaced as recoverable states instead of silent data loss.
- **Automated verification:** GitHub Actions provisions PostgreSQL, applies migrations, seeds a disposable workspace, type-checks, builds, and runs Playwright E2E tests.

## Architecture

```text
Browser
  ├─ Next.js App Router UI
  ├─ IndexedDB workspace cache
  └─ Offline mutation outbox
          │
          ▼
      Next.js API
          ├─ authentication / authorization
          ├─ idempotent sync replay
          ├─ ownership + payload validation
          └─ health / failure handling
          │
          ▼
   PostgreSQL + Prisma
```

The server is canonical after synchronization. Offline support is intentionally focused on durable CRUD-style workspace mutations rather than collaborative conflict-resolution UI.

## Product surface

ContextOS currently supports:

- Dashboard command page and scratchpad;
- Inbox capture and triage;
- Projects and nested subcontexts;
- Tasks and important dates;
- Areas and Markdown-backed resources;
- Search and recovery surfaces;
- Archive and review flows;
- offline-safe edits with visible pending-sync state;
- authenticated handoff previews that require user approval before creating Inbox suggestions.

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

The default seed creates a disposable demo workspace. Its projects, tasks, areas, and resources are fictional sample data and are not personal, employment, academic, or client records. Demo credentials are defined in `.env.example` and are intended only for local or disposable preview use.

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

Generate a fresh `AUTH_SECRET` for every deployed environment. Do not reuse example or demo values outside local development.

## Verification

```bash
npm run typecheck
npm run build
npm run test:e2e
```

The CI workflow additionally starts PostgreSQL 16, validates and generates the Prisma client, applies committed migrations, seeds the demo workspace, installs Chromium, and runs the database-backed Playwright suite.

`tests/e2e/publication-fixtures.spec.ts` also guards the public fixture contract so personal/workflow-specific seed labels removed during publication cleanup are not accidentally reintroduced.

## Deployment notes

- `npm run db:seed` resets the configured demo workspace and should never run automatically against production data.
- `/api/reset-demo` is disabled in production unless `ALLOW_DEMO_RESET=true` is deliberately enabled.
- Public registration is closed by default in production unless explicitly enabled.
- `GET /api/health` reports application/database availability with `Cache-Control: no-store`.

See `docs/DEPLOYMENT.md` and `docs/RUN_PROTOCOL.md` for the deeper operational workflow.

## Scope and limitations

Current boundaries include:

- no collaborative merge interface;
- no email verification or self-service password-reset flow;
- no OAuth;
- no calendar-provider integration or task recurrence;
- no semantic search;
- no external AI dependency for core operation;
- offline behavior covers cached workspace views and queued mutations, not arbitrary offline server functionality.

These boundaries are documented so the repository distinguishes implemented behavior from future production hardening.

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
