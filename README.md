# ContextOS

ContextOS is a self-hostable local-first application for operational context: deciding what to do today, keeping active Projects recoverable, and maintaining enough temporal/contextual state to resume work without rebuilding it from memory.

It combines a Next.js application with PostgreSQL-backed user data, a user-scoped IndexedDB workspace, an offline mutation outbox, and a verified application-shell cache. After a successful authenticated bootstrap on a device, the documented core workspace can continue through ordinary connectivity failures and synchronize supported mutations when connectivity returns.

> **Project status:** self-hostable local-first application with an evidence-backed core workflow. The repository is not an operated hosted production SaaS service, a compliance-certified system, or a collaborative distributed-data platform. High-sensitivity/public production deployments still require target-specific operational and security review. The local-first completion program is complete through Stage 10 final acceptance within the documented boundary.

**Current stable release:** `v1.0.0`. Historical Stage 7–10 evidence remains repository provenance. The post-release canonical redesign is complete through C9; C10 is the current product-acceptance and baseline-freeze phase.

## Product

The definitive hierarchy is:

```text
Area -> Project -> Task
```

- Every Project belongs to exactly one Area.
- Projects are flat; there are no nested Projects in the definitive UI.
- A Task belongs to a Project or directly to an Area.
- A ContextDate is an Event or Deadline and belongs to exactly one Project or Area.
- Daily Notes provide one unstructured note per local calendar day.
- Search covers canonical Projects, Areas, Tasks, Dates, and Daily Notes, including historical canonical records.
- Cmd/Ctrl+K provides canonical Search/navigation plus direct New Task and New Date flows.
- LifeOS is a shallow entry point for Ravel, SocialOS, Ledger, and Canon without duplicating their internals.

The current primary surfaces are:

- **Home** — Today Dayline, Daily Notes, Insights when genuinely available, In Context Today, and Upcoming;
- **Projects** — Active/Archived flat Projects and Project Detail;
- **Areas** — Active/Archived Areas, with direct Projects, Tasks, and Dates;
- **Dates** — Today/Upcoming/Past Events and Deadlines;
- **Search** — canonical operational/history search;
- **LifeOS** — module entry points and real provider-backed summaries only;
- **Settings** — Account, Appearance, Offline & Sync, Data, Security, and Advanced.

### Retired first-class surfaces

C7 retires Inbox, Resources, Reviews, and the standalone Archive page. Their compatibility URLs remain explicit migrations for old bookmarks:

```text
/inbox     -> /dashboard
/resources -> /lifeos
/reviews   -> /lifeos
/archive   -> /search
```

Historical aliases also remain:

```text
/today     -> /dashboard
/this-week -> /dashboard
/deadlines -> /dates
```

C8 completes the persistence clean break. Canonical storage is now Area / Project / Task / Date / DailyNote only; retired Capture, standalone Note, Review, legacy Deadline, Dashboard, recovery, nesting, and tombstone storage is removed. IndexedDB v3 preserves verified local identity but discards incompatible pre-C8 workspace/outbox snapshots so they can be rebuilt from authenticated canonical bootstrap.

The historical `/handoff` route can still validate and preview `lifeos-handoff/v1` proposals, but C7 deliberately stops writing new legacy Inbox captures. Until a canonical inter-module action contract exists, the preview does not save the proposal.

## Engineering highlights

- **User-scoped persistence:** PostgreSQL + Prisma with authenticated, user-owned records and relationship ownership checks.
- **Local-first core workflow:** IndexedDB caches each verified user's workspace and stores a durable mutation outbox.
- **Verified offline shell:** a versioned service-worker shell reports ready only after its manifest and required static assets are available.
- **Idempotent synchronization:** queued mutations replay through `/api/sync` with user-scoped mutation IDs, bounds, ownership validation, stale-update handling, and conflict warnings.
- **Atomic local commits:** supported local mutations write workspace state and outbox state in one IndexedDB transaction.
- **Lifecycle semantics:** ordinary logout retains isolated local state by default; device removal is explicit and user-scoped; multiple eligible local identities require explicit selection.
- **Deployment:** the repository includes a non-root standalone application image, one-shot migration service, persistent PostgreSQL service, and unexposed operator image.
- **Canonical persistence:** Prisma, bootstrap, IndexedDB, sync, and export v2 use the same Area / Project / Task / Date / DailyNote shape; obsolete local cache/outbox state is reset at the v3 boundary instead of being half-migrated.
- **Failure-aware UX:** database, synchronization, offline-shell, pending-work, and conflict states are surfaced instead of silently discarding work.

## Local-first boundary

Offline workspace access is available only after a successful authenticated bootstrap on that device. Canonical cached surfaces include Home, Projects and Project Detail, Dates, Areas and Area Detail, LifeOS, Search, and Settings. Retired aliases may resolve offline to their canonical destinations; they do not restore retired UI.

PostgreSQL remains canonical after successful synchronization. ContextOS does not claim collaborative CRDT semantics, arbitrary offline server functionality, offline first-time authentication, or true offline logout/account deletion.

## Quick start

Requirements:

- Node.js 22+
- Docker with Docker Compose

```bash
npm install
cp .env.example .env
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

The demo seed contains neutral canonical Areas, Projects, Tasks, and ContextDates. It no longer creates demo Inbox Captures, standalone Resources, or Reviews. Production startup never seeds demo data.

## Configuration

Required for a real deployment:

- `DATABASE_URL`
- `AUTH_SECRET` with a fresh high-entropy value
- `NEXT_PUBLIC_APP_URL` or `APP_URL` for the canonical public origin

Optional deployment/demo controls include:

- `AUTH_RATE_LIMIT_WINDOW_MS`
- `AUTH_LOGIN_MAX_FAILURES`
- `AUTH_REGISTER_MAX_ATTEMPTS`
- `SEED_DEMO_EMAIL`
- `SEED_DEMO_PASSWORD`
- `ALLOW_PUBLIC_REGISTRATION`
- `ALLOW_DEMO_RESET`

Optional browser-visible LifeOS module entry points:

- `NEXT_PUBLIC_LIFEOS_RAVEL_URL`
- `NEXT_PUBLIC_LIFEOS_SOCIALOS_URL`
- `NEXT_PUBLIC_LIFEOS_LEDGER_URL`
- `NEXT_PUBLIC_LIFEOS_CANON_URL`

An optional ContextOS-to-SocialOS bridge also recognizes `CONTEXTOS_SSO_SECRET` and `SOCIALOS_APP_URL`. Browser module destinations are deliberately separate from SSO configuration.

## Verification

The repository separates optimized production/offline verification from development-server interaction tests.

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
npm run audit:c10:product
npm run audit:release
npx prisma validate
npx prisma generate
npm run db:deploy
npm run db:seed
npm run test:account-operator
npm run typecheck
npm run build
npm run test:container-distribution
npx playwright test --config=playwright.production.config.ts --workers=1
npm run test:e2e -- --workers=1
```

Stage 10's verified acceptance candidate is commit `f4ba02699c24210ddd6f4cfaf2b626f7a33b0c40`, GitHub Actions run `31800346837`. Those historical results remain evidence for the boundary tested at that time; post-release product changes must keep the active docs and regression suite aligned with current behavior.

## Deployment and recovery boundaries

The repository supplies self-hostable software and engineering evidence, not an operated service. A real production deployment still needs target-specific review of TLS/reverse proxy configuration, provider/WAF abuse controls, monitoring/on-call ownership, migration compatibility, backups, and rollback.

Stage 8 recorded PostgreSQL-native `pg_dump`/`pg_restore` recovery on isolated non-production infrastructure. This does not constitute provider-native backup/PITR rehearsal or a production RTO/RPO guarantee.

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
- no irreversible user-facing per-record purge without a proven anti-resurrection protocol; and
- no offline first-time authentication, true logout, or permanent account deletion.

Historical note: Stage 10 closed in August 2026 against a deliberately narrower **portfolio-stage** local-first acceptance boundary. That phrase records the scope of the historical acceptance exercise; current product positioning is self-hostable application software.

## Documentation

- `BLUEPRINT.md` — canonical product and persistence model
- `docs/PROJECT_STATE.md` — current implementation state
- `docs/REPO_MAP.md` — active repository ownership
- `docs/LOCAL_FIRST_CONTRACT.md` — current offline/sync/lifecycle contract
- `docs/RUN_PROTOCOL.md` — verification procedure
- `docs/DEPLOYMENT.md` — deployment and operational boundaries
- `docs/CONTAINER_DEPLOYMENT.md` — production-style Docker Compose procedure
- `SECURITY.md` — security assumptions and vulnerability reporting
- `docs/stage8/`, `docs/stage9/`, `docs/stage10/` — historical assurance provenance

## License

MIT. See `LICENSE`.
