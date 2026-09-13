# ContextOS

ContextOS is a self-hostable local-first workspace for capturing loose context, turning it into executable work, and recovering project state after interruptions.

It combines a Next.js application with PostgreSQL-backed user data, a user-scoped IndexedDB workspace, an offline mutation outbox, and a verified application-shell cache so the documented core workspace can continue through temporary network failures after a successful sign-in on the device and synchronize when connectivity returns.

> **Project status:** self-hostable local-first application with an evidence-backed core workflow. The repository is not an operated hosted production SaaS service, a compliance-certified system, or a collaborative distributed-data platform. High-sensitivity/public production deployments still require target-specific operational and security review. The local-first completion program is complete through Stage 10 final acceptance within the documented boundary.

## Product

ContextOS is built around a simple loop: capture what is loose, turn it into work, preserve enough context to resume, and keep that state available through ordinary connectivity failures.

The current product surface includes:

- Dashboard command page and scratchpad;
- Inbox capture and triage;
- Projects and nested subcontexts;
- Tasks and important Dates;
- Areas and Markdown-backed Resources;
- Search over locally available workspace data;
- Archive and review flows;
- offline-safe supported edits with visible pending-sync state;
- explicit local-account selection when multiple verified workspaces exist offline;
- recoverable trash/restore behavior; and
- authenticated handoff previews that require user approval before creating Inbox suggestions.

New registrations start with an empty workspace scaffold. First-run setup asks the user to create an Area or restore an existing ContextOS export; fictional demo records are reserved for deliberate local/disposable-preview seed and reset paths.

## Engineering highlights

- **User-scoped persistence:** PostgreSQL + Prisma with authenticated, user-owned records and relationship ownership checks.
- **Local-first core workflow:** user-scoped IndexedDB caches core workspace state and queues supported mutations locally.
- **Verified offline shell:** a versioned service-worker shell is reported as ready only after its manifest and required static assets are present; API traffic remains network-only.
- **Idempotent synchronization:** queued mutations replay through `/api/sync` with per-user mutation IDs, ownership validation, stale-update handling, UTF-8 byte limits, timestamp validation, and record-ID consistency checks.
- **Lifecycle semantics:** ordinary logout retains isolated local state by default, current-device removal is explicit and user-scoped, multiple local identities require explicit offline selection, and permanent account deletion is password-confirmed and online.
- **Operator account recovery:** production can keep public registration closed while a trusted server operator creates empty-workspace users or resets a forgotten password without exposing a public reset endpoint; operator resets revoke all server sessions and preserve workspace data.
- **Recoverable deletion:** Projects, Tasks, standalone Notes, and Dates synchronize recoverable tombstones; stale older writes cannot silently resurrect a newer tombstone.
- **Failure-aware UX:** database, synchronization, offline-shell, pending-work, and conflict states are surfaced instead of silently discarding work.
- **Repository assurance:** Stage 7 provides security/repository controls, Stage 8 records deployment/recovery/operational evidence, Stage 9 adds lifecycle/destructive-data evidence, and Stage 10 closes final local-first acceptance and public-claims verification without broadening those claims beyond the tested boundary.

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
npm run audit:stage10:claims
npx prisma validate
npx prisma generate
npm run db:deploy
npm run db:seed
npm run test:account-operator
npm run typecheck
npm run build
npx playwright test --config=playwright.production.config.ts --workers=1
npm run test:e2e -- --workers=1
```

The GitHub Actions workflow runs the required ladder against disposable PostgreSQL 16. The production Playwright matrix owns cold offline reopen/hard-refresh, core route and dynamic-project reconstruction, functional offline Search/history acceptance, application-shell completeness, production security boundaries, offline mutation durability, tombstone hard reload, and API/cache separation. The development suite covers the broader interactive product, local atomicity, synchronization behavior, user-scoped IndexedDB, routing, lifecycle/destructive-data behavior, compatibility, accessibility, and fixture regression surface. The operator-account test separately verifies empty-workspace provisioning, password recovery, all-session revocation, duplicate-create refusal, and workspace preservation.

Stage 10's verified acceptance candidate is commit `f4ba02699c24210ddd6f4cfaf2b626f7a33b0c40`, GitHub Actions run `31800346837`, which passed the complete accumulated ladder. Machine-readable assurance state is preserved in `audits/stage7-controls.json`, `audits/stage8-evidence.json`, `audits/stage9-evidence.json`, and `audits/stage10-acceptance.json`.

Current `main` continues to run that complete ladder on accepted product batches. Batch 10's merged commit `2b0c03c629fd0025ee185a91bc3c7da85e9215ae` passed post-merge CI run `34760727752` after the remaining live workspace views were extracted and the former legacy view monolith was removed.

## Deployment and recovery notes

- `npm run db:seed` resets the configured demo workspace and should never run automatically against production data.
- `/api/reset-demo` is disabled in production unless `ALLOW_DEMO_RESET=true` is deliberately enabled.
- Public registration is closed by default in production unless explicitly enabled.
- With registration closed, a trusted operator can create a real empty-workspace account with `npm run account:create -- user@example.com --generate-password` or `--password-stdin`.
- Forgotten passwords can be recovered from a trusted operator shell with `npm run account:reset-password -- user@example.com --generate-password` or `--password-stdin`; the reset revokes all server sessions and preserves workspace rows.
- Passwords are never accepted as operator CLI arguments. See `docs/OPERATOR_ACCOUNTS.md` for the trust and password-handling boundary.
- Browser-originated state-changing API requests must match the application origin.
- All `/api/*` responses receive an explicit no-store policy and service-worker caching excludes API traffic.
- `GET /api/health` reports minimal application/database availability with `Cache-Control: no-store`.
- Stage 8 demonstrated a real HTTPS Vercel preview on an isolated Neon branch, a same-origin service-worker upgrade, PostgreSQL-native `pg_dump`/`pg_restore` recovery into a fresh non-production database, and application rollback for the exact Stage 7→8 release pair whose migration state was unchanged.
- Those rehearsals are engineering evidence, not a claim of provider-native PITR, production disaster-recovery SLA, or arbitrary migration reversibility.

See `docs/DEPLOYMENT.md`, `docs/OPERATOR_ACCOUNTS.md`, `docs/RUN_PROTOCOL.md`, `docs/LOCAL_FIRST_CONTRACT.md`, and the stage verification reports for the deeper operational and assurance workflow.

## Scope and limitations

Current boundaries include:

- no collaborative merge interface or CRDT semantics;
- no email verification or self-service password-reset flow; bounded self-hosted recovery is available only to a trusted database operator;
- no supported general OAuth/SSO product surface;
- no distributed provider/WAF rate limiting in this repository;
- no calendar-provider integration or task recurrence;
- no semantic search;
- no external AI dependency for core operation;
- no third-party penetration test or compliance certification;
- no provider-native backup/PITR rehearsal;
- no production SLA/on-call/disaster-recovery guarantee;
- no remote erasure of another offline device after account deletion;
- no irreversible user-facing per-record purge without a proven anti-resurrection protocol; and
- no offline first-time authentication, true logout, or permanent account deletion.

Historical note: Stage 10 closed in August 2026 against a deliberately narrower **portfolio-stage** local-first acceptance boundary. That phrase records the scope of the historical acceptance exercise; current product positioning is self-hostable application software. The security, deployment, collaboration, recovery, and lifecycle limitations above remain unchanged.
