# ContextOS

ContextOS is a local-first workspace for capturing loose context, turning it into executable work, and recovering project state after interruptions.

It combines a Next.js application with PostgreSQL-backed user data, a user-scoped IndexedDB workspace, an offline mutation outbox, and a verified application-shell cache so the documented core workspace can continue through temporary network failures after a successful sign-in on the device and synchronize when connectivity returns.

> **Project status:** portfolio-stage application and engineering demonstration. It is not presented as a hosted production SaaS service, a compliance-certified system, or a collaborative distributed-data platform. The local-first completion program is closed through Stage 9; Stage 10 final acceptance and public-claims verification remain in progress on the completion branch.

## Engineering highlights

- **User-scoped persistence:** PostgreSQL + Prisma with authenticated, user-owned records and relationship ownership checks.
- **Local-first core workflow:** user-scoped IndexedDB caches core workspace state and queues supported mutations locally.
- **Verified offline shell:** a versioned service-worker shell is reported as ready only after its manifest and required static assets are present; API traffic remains network-only.
- **Idempotent synchronization:** queued mutations replay through `/api/sync` with per-user mutation IDs, ownership validation, stale-update handling, UTF-8 byte limits, timestamp validation, and record-ID consistency checks.
- **Lifecycle semantics:** ordinary logout retains isolated local state by default, current-device removal is explicit and user-scoped, multiple local identities require explicit offline selection, and permanent account deletion is password-confirmed and online.
- **Recoverable deletion:** Projects, Tasks, standalone Notes, and Dates synchronize recoverable tombstones; stale older writes cannot silently resurrect a newer tombstone.
- **Failure-aware UX:** database, synchronization, offline-shell, pending-work, and conflict states are surfaced instead of silently discarding work.
- **Repository assurance:** Stage 7 provides security/repository controls, Stage 8 records deployment/recovery/operational evidence, Stage 9 adds lifecycle/destructive-data evidence, and Stage 10 aggregates final local-first acceptance without broadening those claims beyond the tested boundary.

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

PostgreSQL is canonical after successful synchronization. Local-first behavior is intentionally focused on durable workspace mutations and cached application navigation rather than collaborative conflict-resolution UI or arbitrary offline server functionality.

## Product surface

ContextOS currently supports:

- Dashboard command page and scratchpad;
- Inbox capture and triage;
- Projects and nested subcontexts;
- Tasks and important Dates;
- Areas and Markdown-backed Resources;
- Search over locally available workspace data;
- Archive and review flows;
- offline-safe supported edits with visible pending-sync state;
- explicit local-account selection when multiple verified workspaces exist offline;
- recoverable trash/restore behavior;
- authenticated handoff previews that require user approval before creating Inbox suggestions.

The core offline contract is documented in `docs/LOCAL_FIRST_CONTRACT.md`. First-time authentication, synchronization itself, true logout, permanent account deletion, and other inherently remote operations require connectivity.

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

The repository deliberately separates production-runtime offline/security verification from development-server interaction tests. The optimized runtime owns service-worker and offline hard-reload claims; the development server does not impersonate an installed PWA.

```bash
npm audit --audit-level=low
npm run audit:stage7
npm run audit:stage7:evidence
npm run audit:stage8:preflight
npm run audit:stage8:preflight:test
npm run audit:stage8:ops
npm run audit:stage9:lifecycle
npm run audit:stage9:evidence
npm run audit:stage10:acceptance
npx prisma validate
npx prisma generate
npm run db:deploy
npm run db:seed
npm run typecheck
npm run build
npx playwright test --config=playwright.production.config.ts --workers=1
npm run test:e2e -- --workers=1
```

The GitHub Actions workflow runs the required ladder against disposable PostgreSQL 16. The production Playwright matrix owns cold offline reopen/hard-refresh, core route and dynamic-project reconstruction, functional offline Search/history acceptance, application-shell completeness, production security boundaries, offline mutation durability, tombstone hard reload, and API/cache separation. The development suite covers the broader interactive product, local atomicity, synchronization behavior, user-scoped IndexedDB, routing, lifecycle/destructive-data behavior, compatibility, accessibility, and fixture regression surface.

The machine-readable assurance state is split across `audits/stage7-controls.json`, `audits/stage8-evidence.json`, `audits/stage9-evidence.json`, and `audits/stage10-acceptance.json`. Stage 10 remains open until its registry has no pending controls and the final claims audit passes.

## Deployment and recovery notes

- `npm run db:seed` resets the configured demo workspace and should never run automatically against production data.
- `/api/reset-demo` is disabled in production unless `ALLOW_DEMO_RESET=true` is deliberately enabled.
- Public registration is closed by default in production unless explicitly enabled.
- Browser-originated state-changing API requests must match the application origin.
- All `/api/*` responses receive an explicit no-store policy and service-worker caching excludes API traffic.
- `GET /api/health` reports minimal application/database availability with `Cache-Control: no-store`.
- Stage 8 demonstrated a real HTTPS Vercel preview on an isolated Neon branch, a same-origin service-worker upgrade, PostgreSQL-native `pg_dump`/`pg_restore` recovery into a fresh non-production database, and application rollback for the exact Stage 7→8 release pair whose migration state was unchanged.
- Those rehearsals are engineering evidence, not a claim of provider-native PITR, production disaster-recovery SLA, or arbitrary migration reversibility.

See `docs/DEPLOYMENT.md`, `docs/RUN_PROTOCOL.md`, `docs/LOCAL_FIRST_CONTRACT.md`, and the stage verification reports for the deeper operational and assurance workflow.

## Scope and limitations

Current boundaries include:

- no collaborative merge interface or CRDT semantics;
- no email verification or self-service password-reset flow;
- no supported general OAuth/SSO product surface;
- no distributed provider/WAF rate limiting in this repository;
- no calendar-provider integration or task recurrence;
- no semantic search;
- no external AI dependency for core operation;
- no third-party penetration test or compliance certification;
- no provider-native backup/PITR rehearsal;
- no production SLA/on-call/disaster-recovery guarantee;
- no remote erasure of another offline device after account deletion;
- no irreversible user-facing per-record purge without a proven anti-resurrection protocol;
- no offline first-time authentication, true logout, or permanent account deletion; and
- final Stage 10 local-first acceptance remains open until the accumulated evidence and public claims pass together.

These boundaries distinguish implemented/tested behavior from deployment maturity and unsupported future capability.

## Repository documentation

- `BLUEPRINT.md` — product specification and design intent
- `docs/PROJECT_STATE.md` — current implementation state and known boundaries
- `docs/REPO_MAP.md` — code/data-flow map
- `docs/LOCAL_FIRST_CONTRACT.md` — canonical offline, synchronization, lifecycle, and deletion contract
- `docs/RUN_PROTOCOL.md` — setup and verification ladder
- `docs/DEPLOYMENT.md` — deployment guidance and operational boundaries
- `docs/stage7-audit-plan.md` — Stage 7 assurance scope and closure rules
- `docs/stage8/STAGE8_VERIFICATION.md` — Stage 8 deployment/recovery/operations evidence
- `docs/stage9/STAGE9_VERIFICATION.md` — Stage 9 lifecycle/destructive-data evidence
- `docs/stage10/STAGE10_ACCEPTANCE.md` — Stage 10 final acceptance status
- `audits/stage10-acceptance.json` — machine-readable Stage 10 acceptance registry
- `SECURITY.md` — vulnerability reporting, security assumptions, and non-claims
- `CONTRIBUTING.md` — contribution and verification expectations

## License

MIT. See `LICENSE`.
