# ContextOS Project State

## Status

ContextOS is a self-hostable, local-first workspace application with an evidence-backed core workflow. The repository is a deployable application, not merely an engineering demonstration; it is not, however, presented as an operated hosted SaaS service or as a compliance-certified/high-sensitivity platform.

Package version: `0.2.8`.

The local-first completion program is complete through **Stage 10 final local-first acceptance and public-claims verification**. Stage 9 closed against GitHub Actions run `31798664757` on verified code/test commit `68b1543e5083e9064fe909101047fa5e57e7f563`. Stage 10's verified acceptance candidate is commit `f4ba02699c24210ddd6f4cfaf2b626f7a33b0c40`, CI run `31800346837`, which passed the complete accumulated verification ladder.

Subsequent product/refactor batches retain that acceptance boundary and rerun the complete ladder. Batch 10 removed the former workspace-view monolith after extracting all live views into focused modules; merged `main` commit `2b0c03c629fd0025ee185a91bc3c7da85e9215ae` passed post-merge CI run `34760727752` including optimized production/offline coverage, lifecycle browser coverage, full E2E, and database-outage smoke.

Batch 17 adds a repository-owned production-style container distribution. Its PR-head candidate passed GitHub Actions run `34778947459` with the full accumulated ladder plus a fresh-volume container acceptance test covering image build, migrations, non-root runtime separation, closed registration, operator first-account creation, authentication, and empty production bootstrap. Release versioning/tagging remains a separate release-closure step.

## Architecture

- Next.js App Router application under `src/app`.
- React 19 and TypeScript.
- PostgreSQL as canonical server persistence after synchronization.
- Prisma 7 for schema, migrations, and database access.
- Local email/password authentication with bcrypt-hashed passwords and HTTP-only sessions.
- User-scoped records and ownership validation on data-changing paths.
- Fixed-window throttling for repeated failed login and registration attempts.
- Trusted-shell operator commands for closed-registration account creation and password recovery without exposing a public reset endpoint.
- Production-style Docker distribution with a non-root Next.js standalone app image, a separate non-root migration/operator image, PostgreSQL 16, and Compose dependency/health ordering.
- Per-user IndexedDB identities, workspace snapshots, and mutation outboxes.
- Idempotent offline mutation synchronization with per-user mutation IDs and stale-write warnings.
- Service-worker caching for the complete versioned application shell and static assets; API traffic remains network-only.
- Baseline production response security headers with `X-Powered-By` disabled.
- Minimal `GET /api/health` application/database availability checks.

## Current Product Surface

The primary workflow consists of:

- Dashboard command page and scratchpad;
- Inbox capture and one-by-one triage;
- Projects and nested subcontexts;
- editable Tasks and important Dates;
- Areas and Markdown-backed standalone Resources;
- Search, Archive, Reviews, and Settings;
- authenticated `/handoff` previews that create unprocessed Inbox suggestions only after user approval.

`/today` and `/this-week` remain compatibility routes and redirect to `/dashboard`. `/dates` is canonical while `/deadlines` remains a compatibility redirect.

New production registrations start with an empty workspace scaffold rather than demo records. First-run setup asks the user to create an Area or restore an existing ContextOS export. Full fictional starter data is reserved for deliberate seed/reset-demo paths. The trusted operator create command uses the same empty production scaffold and refuses to overwrite an existing account.

## Offline And Synchronization Model

Core workspace state is cached per verified user in IndexedDB. Supported create/edit/archive/restore/delete operations mutate local state first and queue idempotent upserts while offline. PostgreSQL becomes canonical after successful synchronization.

The sync API validates ownership, bounds payloads, scopes mutation IDs per user, checks relationship ownership, and rejects stale updates instead of silently overwriting newer server state.

Initial workspace interaction waits for the verified user's IndexedDB snapshot. Startup bootstrap and explicit server refresh capture a local mutation generation and refuse to replace newer local mutations with an older in-flight server snapshot.

The optimized production acceptance matrix verifies previously authenticated offline cold reopen, core route and dynamic-project hard refresh, browser history, a functional local Search query, durable offline mutations, API/cache separation, and recoverable tombstone hard reload. The application is deliberately not collaborative real-time editing. There is no CRDT layer or merge-conflict UI for simultaneous multi-user edits.

## Lifecycle And Deletion Model

Stage 9 defines and verifies lifecycle behavior, and Stage 10 re-runs those controls as part of final acceptance:

- normal online logout preserves that user's isolated local workspace by default;
- a separate logout path removes only the current account's local identity/workspace/outbox from the browser;
- pending changes have explicit sync, retain, discard, and device-removal behavior and are never silently dropped;
- logout is blocked while offline because browser code cannot invalidate the HttpOnly server session without reaching the server;
- when several verified local workspaces exist and server verification is unavailable, ContextOS presents an explicit local account chooser rather than guessing;
- permanent account deletion requires the current password, exact `DELETE` confirmation, user-scoped local cleanup, and a second password-verified server deletion commit;
- Projects, Tasks, standalone Notes, and Dates use synchronized `trashedAt` tombstones and can be restored from Archive/Trash;
- Inbox capture deletion is synchronized as `status = "deleted"`;
- the historical sync `delete` operation remains a compatibility ledger no-op and is not emitted by the current client for ordinary deletion;
- irreversible per-record purge remains intentionally unavailable until old-offline-client resurrection can be prevented by an explicit version/generation protocol.

The production offline browser matrix includes a Date tombstone hard-reload rehearsal under the installed service-worker runtime. Development coverage separately verifies durable IndexedDB tombstone state, reconnect synchronization, restore, stale-resurrection rejection, logout/device handling, account deletion, and multi-user isolation.

## Deployment And Recovery State

Stage 8 produced non-production evidence for:

- deterministic production deployment preflight;
- a real HTTPS Vercel preview against an isolated Neon branch;
- offline/reconnect synchronization on hosted infrastructure;
- same-origin service-worker/PWA upgrade from shell v3 to v4 while preserving local workspace state;
- PostgreSQL-native `pg_dump`/`pg_restore` recovery into a fresh database with application-level verification;
- Stage 7 to Stage 8 release-pair migration/rollback compatibility; and
- minimal operational health and sanitized error logging.

Batch 17 adds a second, provider-neutral deployment path owned directly by the repository: `compose.production.yml` builds the app and operator images, starts PostgreSQL, waits for database health, applies committed migrations through a one-shot container, and starts the standalone application only after migration success. Normal container startup never seeds demo data. `docs/CONTAINER_DEPLOYMENT.md` is the canonical procedure for this path.

The container acceptance test uses an isolated Compose project and fresh named volume. It verifies the public app image runs non-root, excludes repository operator scripts and the Prisma migration tree, keeps public registration closed, supports first-account creation through the unexposed operator image, authenticates that account, and returns only the empty production scaffold from bootstrap.

Stage 10 inherits the Stage 8 results with their original scope. Provider-native snapshot/PITR rehearsal, production RTO/RPO, and arbitrary future migration rollback are not claimed. Container packaging does not broaden those claims.

## Authentication And Deployment Defaults

- Public registration is closed in production unless `ALLOW_PUBLIC_REGISTRATION=true` is explicitly configured.
- With registration closed, a trusted operator can create a real account with `npm run account:create`; this creates an empty production scaffold and never demo fixtures.
- Container deployments expose the same account tooling only through the unexposed operator Compose profile; it is not copied into the long-running public app image.
- A trusted operator can recover a forgotten password with `npm run account:reset-password`; the reset revokes all server sessions for that account and leaves workspace rows unchanged.
- Operator account commands require either generated temporary credentials or password data on stdin and never accept a password as a process argument.
- `/api/reset-demo` is disabled in production unless `ALLOW_DEMO_RESET=true` is deliberately enabled.
- Demo seeding is intended for local or disposable preview environments only and is not part of production container startup.
- Database failures are surfaced as structured service errors rather than raw Prisma/database exceptions.
- Deployment secrets must be supplied through environment variables; `.env.example` and `.env.production.example` contain placeholders/demo values only and are included in repository secret scanning.
- Account deletion is same-origin guarded, authenticated, password re-verified, and implemented through the `User` cascade root rather than ad hoc child-table deletion.

## Public Demo Fixtures

The publication branch uses neutral sample data rather than personal, academic, employment, or application records. The Playwright suite asserts against the same neutral fixture contract, and `tests/e2e/publication-fixtures.spec.ts` prevents the removed personal/workflow labels from being reintroduced accidentally.

The imported editor reference prototype used during earlier private development is not part of the public application tree.

## Verification

The committed GitHub Actions workflow provisions PostgreSQL 16 and runs, in sequence:

1. `npm ci` and dependency audit;
2. Stage 7 repository/security/evidence guards;
3. Stage 8 deployment-preflight and operational-log guards;
4. Stage 9 lifecycle and evidence guardrails;
5. Stage 10 acceptance-registry and public-claims audits;
6. Prisma validation/generation and committed migration deployment;
7. disposable demo seed;
8. operator account provisioning/recovery checks against the disposable database;
9. TypeScript checks;
10. production build;
11. production container-distribution acceptance against a fresh isolated PostgreSQL volume;
12. optimized production/offline Stage 10 Playwright matrix, including offline history, functional local Search, mutation durability, and tombstone hard-reload evidence;
13. dedicated Stage 9 lifecycle browser matrix;
14. full database-backed development E2E suite; and
15. deliberate database-outage smoke.

The operator-account check verifies empty-workspace creation, duplicate-create refusal, generated and stdin password sources, all-session revocation during operator recovery, and preservation of workspace rows. The container-distribution check separately proves the production images and Compose startup contract rather than substituting the host Node runtime for the claimed deployment path.

Stage 10's verified acceptance candidate, commit `f4ba02699c24210ddd6f4cfaf2b626f7a33b0c40` / run `31800346837`, passed every historical gate above that existed at Stage 10 closure. Stage-specific provenance is recorded under `docs/stage8/`, `docs/stage9/`, `docs/stage10/`, and `audits/`. Current `main` continues to rerun the accumulated ladder on every accepted product batch.

## Known Boundaries

- No email verification or self-service password reset; bounded self-hosted password recovery requires trusted operator access to the deployment database.
- No OAuth as a supported production login path.
- No collaborative merge interface.
- No calendar-provider integration or recurring-task engine.
- No semantic search.
- No external AI service is required for core operation.
- Offline support covers cached workspace views and queued local mutations after a previously authenticated device has an eligible local workspace, not arbitrary server functionality.
- Ordinary logout requires connectivity because a true server-session logout cannot be completed offline.
- Other offline devices cannot be remotely scrubbed after account deletion or an operator password reset.
- Irreversible per-record purge is not exposed without a proven anti-resurrection design.
- Container distribution does not supply TLS termination, external monitoring/on-call, provider-native backup/PITR, or distributed WAF/rate limiting.
- Provider-native backup/PITR rehearsal, external penetration testing, distributed provider-level rate limiting, and production SLA/on-call guarantees are not claimed.

Historical note: Stage 10 closed in August 2026 against a deliberately narrower **portfolio-stage** acceptance boundary. That label records the scope of the historical acceptance exercise; the current repository is positioned as a self-hostable application while retaining every security, deployment, recovery, offline, and lifecycle non-claim listed above.

## Public Repository Documentation

- `README.md` — project overview and engineering highlights.
- `BLUEPRINT.md` — product specification and design intent.
- `docs/REPO_MAP.md` — code and data-flow map.
- `docs/RUN_PROTOCOL.md` — local setup and verification ladder.
- `docs/CONTAINER_DEPLOYMENT.md` — production-style Docker Compose self-hosting and operator workflow.
- `docs/DEPLOYMENT.md` — deployment notes and safety boundaries.
- `docs/OPERATOR_ACCOUNTS.md` — closed-registration account creation and trusted-shell password recovery.
- `docs/LOCAL_FIRST_CONTRACT.md` — offline, lifecycle, and deletion semantics.
- `docs/stage10/STAGE10_ACCEPTANCE.md` — historical Stage 10 final acceptance record.
- `SECURITY.md` — security assumptions and vulnerability reporting.
- `CONTRIBUTING.md` — contribution and verification expectations.
