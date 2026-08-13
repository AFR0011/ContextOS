# ContextOS

ContextOS is a local-first workspace for capturing loose context, turning it into executable work, and recovering project state after interruptions.

It combines a Next.js application with PostgreSQL-backed user data, a user-scoped IndexedDB workspace, an offline mutation outbox, and a verified application-shell cache so core work can continue through temporary network failures and synchronize safely when connectivity returns.

> **Project status:** portfolio-stage application and engineering demonstration. It is not presented as a hosted production SaaS service, a compliance-certified system, or a finished multi-device lifecycle implementation.

## Engineering highlights

- **User-scoped persistence:** PostgreSQL + Prisma with authenticated, user-owned records and relationship ownership checks.
- **Local-first core workflow:** user-scoped IndexedDB caches core workspace state and queues mutations locally.
- **Verified offline shell:** a versioned service-worker shell is reported as ready only after its manifest and required static assets are present; API traffic remains network-only.
- **Idempotent synchronization:** queued mutations replay through `/api/sync` with per-user mutation IDs, ownership validation, stale-update handling, UTF-8 byte limits, timestamp validation, and record-ID consistency checks.
- **Authentication hardening:** bcrypt password hashing, random bearer sessions persisted only as `AUTH_SECRET`-keyed hashes, HTTP-only cookies, registration controls, failed-login throttling, bounded auth inputs, and browser same-origin mutation checks.
- **Failure-aware UX:** database, synchronization, offline-shell, pending-work, and conflict states are surfaced instead of silently discarding work.
- **Repository assurance:** Stage 7 defines a machine-readable audit control registry, executable static audit, production-runtime security/offline matrix, dependency gate, and development regression suite.

## Architecture

```text
Browser
  ├─ Next.js App Router UI
  ├─ user-scoped IndexedDB workspace cache
  ├─ offline mutation outbox
  └─ verified versioned application shell
          │
          ▼
      Next.js API
          ├─ authentication / authorization
          ├─ same-origin browser mutation boundary
          ├─ idempotent sync replay
          ├─ ownership + payload validation
          └─ health / structured failure handling
          │
          ▼
   PostgreSQL + Prisma
```

The server is canonical after synchronization. Offline support is intentionally focused on durable workspace mutations and cached application navigation rather than collaborative conflict-resolution UI or arbitrary offline server functionality.

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
- IndexedDB for user-scoped client state and queued mutations
- service worker + Cache Storage for the verified application shell
- Playwright for browser verification
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

The default seed creates a disposable demo workspace. Its projects, tasks, areas, and resources are fictional sample data and are not personal, employment, academic, or client records. Demo credentials are defined in `.env.example` for local/disposable-preview verification; the login form does not pre-populate them.

## Configuration

Required for a real deployment:

- `DATABASE_URL`
- `AUTH_SECRET` with a fresh high-entropy value; production authentication refuses a missing/too-short secret.
- `NEXT_PUBLIC_APP_URL` or `APP_URL` for the canonical public origin.

Optional deployment/demo controls include:

- `AUTH_RATE_LIMIT_WINDOW_MS`
- `AUTH_LOGIN_MAX_FAILURES`
- `AUTH_REGISTER_MAX_ATTEMPTS`
- `SEED_DEMO_EMAIL`
- `SEED_DEMO_PASSWORD`
- `ALLOW_PUBLIC_REGISTRATION`
- `ALLOW_DEMO_RESET`

An optional ContextOS-to-SocialOS bridge also recognizes `CONTEXTOS_SSO_SECRET` and `SOCIALOS_APP_URL`. That bridge is fail-closed without a signing secret of at least 32 characters and is not claimed as a general production SSO platform.

Generate fresh secrets for every deployed environment. Do not reuse example/demo values outside local or disposable preview environments.

## Verification

The repository deliberately separates production-runtime offline/security verification from development-server interaction tests. Humans eventually discovered that a hot-reload server and an installable offline application are, regrettably, not the same thing.

```bash
npm audit --audit-level=low
npm run audit:stage7
npx prisma validate
npx prisma generate
npm run db:deploy
npm run db:seed
npm run typecheck
npm run build
npx playwright test --config=playwright.production.config.ts --workers=1
npm run test:e2e -- --workers=1
```

The GitHub Actions workflow runs that ladder against disposable PostgreSQL 16. The production Playwright matrix owns cold offline reopen/hard-refresh, application-shell completeness, workspace-gate behavior, production security headers, browser origin checks, session-cookie behavior, synchronization boundary tests, and API/cache separation. The development suite covers the broader interactive product, local atomicity, user-scoped IndexedDB, routing, compatibility, mobile accessibility, and fixture regression surface.

`audits/stage7-controls.json` is the machine-readable assurance registry and `scripts/stage7-audit.mjs` implements the static/repository controls suitable for deterministic CI. The remaining controls are evidenced by runtime suites, schema/CI gates, or explicitly documented manual deployment boundaries.

## Deployment notes

- `npm run db:seed` resets the configured demo workspace and should never run automatically against production data.
- `/api/reset-demo` is disabled in production unless `ALLOW_DEMO_RESET=true` is deliberately enabled.
- Public registration is closed by default in production unless explicitly enabled.
- Browser-originated state-changing API requests must match the application origin.
- All `/api/*` responses receive an explicit no-store policy and service-worker caching excludes API traffic.
- `GET /api/health` reports minimal application/database availability with `Cache-Control: no-store`.
- Backup/restore and compatible application/database rollback rehearsal remain deployment gates, not claims made by this repository.

See `docs/DEPLOYMENT.md`, `docs/RUN_PROTOCOL.md`, and `docs/stage7-audit-plan.md` for the deeper operational and assurance workflow.

## Scope and limitations

Current boundaries include:

- no collaborative merge interface;
- no email verification or self-service password-reset flow;
- no supported general OAuth/SSO product surface;
- no distributed provider/WAF rate limiting in this repository;
- no calendar-provider integration or task recurrence;
- no semantic search;
- no external AI dependency for core operation;
- no third-party penetration test or compliance certification;
- no demonstrated production backup/restore and rollback rehearsal yet;
- final logout/account/local-device-data and hard-delete lifecycle semantics remain later-stage work;
- final local-first acceptance remains a later roadmap stage rather than something Stage 7 quietly declares by administrative magic.

These boundaries are documented so the repository distinguishes implemented behavior and automated evidence from future production hardening.

## Repository documentation

- `BLUEPRINT.md` — product specification and design intent
- `docs/PROJECT_STATE.md` — current implementation state and known boundaries
- `docs/REPO_MAP.md` — code/data-flow map
- `docs/LOCAL_FIRST_CONTRACT.md` — canonical local-first behavior and deferred lifecycle semantics
- `docs/RUN_PROTOCOL.md` — setup and verification ladder
- `docs/DEPLOYMENT.md` — deployment guidance and unresolved operational gates
- `docs/stage7-audit-plan.md` — Stage 7 assurance scope and closure rules
- `audits/stage7-controls.json` — machine-readable Stage 7 control registry
- `SECURITY.md` — vulnerability reporting, security assumptions, and non-claims
- `CONTRIBUTING.md` — contribution and verification expectations

## License

MIT. See `LICENSE`.