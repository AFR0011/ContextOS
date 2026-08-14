# ContextOS Run Protocol

## Local Setup

1. Copy `.env.example` to `.env` if `.env` does not exist.
2. Start PostgreSQL:
   ```bash
   docker compose up -d
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Generate Prisma Client and migrate:
   ```bash
   npx prisma generate
   npm run db:migrate
   ```
5. Seed the disposable demo account:
   ```bash
   npm run db:seed
   ```
6. Start the app:
   ```bash
   npm run dev
   ```

## Demo Login

- Email: `demo@contextos.local`
- Password: `contextos-demo-v011`

The starter workspace is neutral test/demo data. Do not point `db:seed` at a database containing user data that must be preserved.

## Verification Ladder

Run verification commands sequentially. `npm run build` can rewrite generated `.next` route types while `npm run typecheck` is reading them, and Playwright suites start their own runtime boundaries. Parallelizing these steps creates impressive-looking failures with very little informational value.

The accepted Stage 10 ladder is:

1. Dependency advisory gate:
   ```bash
   npm audit --audit-level=low
   ```
2. Stage 7 repository/security controls and evidence mapping:
   ```bash
   npm run audit:stage7
   npm run audit:stage7:evidence
   ```
3. Stage 8 deployment and operational controls:
   ```bash
   npm run audit:stage8:preflight
   npm run audit:stage8:preflight:test
   npm run audit:stage8:ops
   ```
   The deployment preflight expects production-like safe values, including HTTPS canonical origin and closed registration/reset controls.
4. Stage 9 lifecycle/destructive-data controls:
   ```bash
   npm run audit:stage9:lifecycle
   npm run audit:stage9:evidence
   ```
5. Stage 10 acceptance-registry integrity and public-claims audit:
   ```bash
   npm run audit:stage10:acceptance
   npm run audit:stage10:claims
   ```
6. Prisma schema/client verification and migration application:
   ```bash
   npx prisma validate
   npx prisma generate
   npm run db:deploy
   npm run db:seed
   ```
   Use `db:migrate` only for local migration development.
7. Typecheck and optimized build:
   ```bash
   npm run typecheck
   npm run build
   ```
8. Production/offline/security/final-acceptance browser matrix:
   ```bash
   npx playwright test --config=playwright.production.config.ts --workers=1
   ```
9. Development-server regression suite:
   ```bash
   npm run test:e2e -- --workers=1
   ```
10. Deliberate database-outage smoke, as implemented in `.github/workflows/ci.yml`.

The committed GitHub Actions workflow runs this ladder against disposable PostgreSQL 16. Stage 10 final acceptance is closed against verified candidate commit `f4ba02699c24210ddd6f4cfaf2b626f7a33b0c40`, CI run `31800346837`, which passed every gate in the accumulated ladder.

## Runtime Ownership

Offline service-worker behavior belongs to the optimized production matrix. Development/HMR chunks are not deployment artifacts and must not be used as evidence for cold offline hard refresh.

The production matrix owns:

- previously authenticated cold offline reopen;
- core workspace route cold open and hard refresh;
- dynamic project route reconstruction;
- offline browser back/forward navigation;
- a functional local Search query returning cached workspace data;
- verified complete application-shell readiness;
- durable offline workspace mutations and queued outbox state across hard reload;
- production offline tombstone hard reload and Archive/Trash reconstruction;
- production response-security and request-origin boundaries; and
- proof that `/api/*` requests remain network-only and absent from shell caches.

The development suite owns broader interactive behavior, local atomic persistence, synchronization, lifecycle/account deletion, stale-state handling, user isolation, accessibility, compatibility, and fixture regression checks that do not require the installed production service worker.

## Stage 7 Assurance Controls

The human-readable scope is `docs/stage7-audit-plan.md`; the machine-readable registry is `audits/stage7-controls.json`.

`npm run audit:stage7` checks repository hygiene, tracked environment/generated files, session/security implementation invariants, authentication input bounds, browser mutation-origin guards, API no-store headers, synchronization request integrity, local credential isolation, production CSP branching, service-worker replacement rules, user-scoped Prisma models, mutation-ledger uniqueness, documentation boundaries, and CI coverage.

Stage 7 is an internal engineering assurance layer, not a penetration test or compliance certification.

## Core Manual Product Checks

Automated tests are the acceptance evidence; manual checks remain useful for human-visible browser/device behavior:

- Confirm `GET /api/health` reports application/database availability with `Cache-Control: no-store`.
- Log in with the demo account and confirm Dashboard renders its command page, Tasks, and Dates.
- Confirm desktop/mobile primary navigation remains usable.
- Confirm `/today` and `/this-week` resolve to Dashboard and `/deadlines` resolves to `/dates`.
- Add `/task` and `/date` commands from the Dashboard editor and confirm real structured records are created.
- Convert an Inbox capture and verify archive/delete triage behavior.
- Add/edit Tasks and Dates and confirm reload persistence.
- Open a project and verify Recovery, Tasks, Dates, and Subcontexts remain coherent.
- Search for a Project, Task, and standalone Resource and confirm results route to local surfaces.
- Toggle dark mode and reload to confirm persistence.
- Check a narrow mobile viewport for reachable task/editor controls and menu semantics.

## Offline Verification

The local-first contract is `docs/LOCAL_FIRST_CONTRACT.md`. After prior successful authentication and verified local preparation, the production matrix proves:

- the workspace cold-reopens offline;
- core routes and dynamic project URLs cold-open/hard-refresh offline;
- browser back/forward remains usable offline;
- local Search returns results from cached workspace state;
- `Offline ready` corresponds to a complete verified shell;
- supported offline mutation state and its queued mutation survive hard reload;
- recoverable tombstone state survives production hard reload;
- reconnect applies pending supported changes without silently discarding them;
- API requests fail as network/API requests rather than receiving cached HTML; and
- no API request is present in the shell caches.

A first-time browser with no verified local workspace remains blocked. When several verified local identities are eligible and remote identity cannot be determined, the user must choose explicitly; ContextOS does not guess.

## Authentication and Request Boundary

Production authentication requires a fresh configured `AUTH_SECRET` of at least 32 characters. Session-token database hashes are keyed by this secret; rotating it intentionally invalidates existing sessions.

Browser-originated state-changing requests use the exact-origin mutation guard. Controlled CLI/API calls may omit browser `Origin`/`Sec-Fetch-Site` metadata.

Application login/registration throttling remains per-process/in-memory. Public deployment should combine it with trusted proxy IP handling and provider/WAF-level distributed abuse protection.

## Synchronization Integrity

Sync controls bound total request bytes, mutation count, per-mutation UTF-8 payload bytes, identifiers/keys, timestamps, and `entityId === payload.id` for upserts. Server application separately verifies record and relationship ownership.

Accepted mutation IDs are scoped per user and replay idempotently. Stale updates are surfaced rather than silently replacing newer server state. Startup/bootstrap and explicit refresh also refuse to replace a newer local mutation with an older in-flight server snapshot.

The historical `operation: "delete"` wire value remains compatibility-only and records an idempotent ledger no-op. Stage 9 formalized ordinary user deletion as synchronized recoverable state instead: Projects, Tasks, standalone Notes, and Dates use `trashedAt`; Inbox captures use `status = "deleted"`. Irreversible per-record purge remains unsupported until an anti-resurrection generation/version protocol exists.

## Lifecycle Verification

Stage 9 closed the lifecycle boundary and Stage 10 reran it as part of final acceptance:

- ordinary online logout preserves isolated local workspace/outbox state by default;
- pending changes expose explicit sync/retain/discard/remove-device choices;
- discard removes affected cached workspace together with its outbox;
- current-device removal is scoped to one verified user;
- true logout is blocked offline because the HttpOnly server session cannot be revoked locally;
- multiple eligible local identities require explicit offline selection; and
- permanent account deletion is online, same-origin guarded, password re-verified, locally cleaned first, and then committed through the `User` cascade root.

Other offline devices cannot be remotely erased after account deletion and irreversible per-record purge is not claimed.

## Deployment and Recovery Evidence

Stage 8 already recorded non-production engineering evidence for:

- a real HTTPS Vercel preview against an isolated Neon branch;
- reconnect synchronization on hosted infrastructure;
- a same-origin application-shell upgrade from v3 to v4 while preserving local state;
- PostgreSQL-native `pg_dump`/`pg_restore` into a fresh isolated database plus authenticated application bootstrap;
- the exact Stage 7→8 application rollback pair, whose migration ledger was unchanged; and
- minimal health/diagnostic behavior with sanitized operational logging.

See `docs/stage8/STAGE8_VERIFICATION.md`. These results do **not** prove provider-native PITR, arbitrary migration reversibility, a production disaster-recovery SLA, or an external monitoring/on-call program.

For an actual public production environment, still verify provider backups, production environment configuration, migration compatibility, rollback procedures for the exact release pair, WAF/abuse controls, and operational ownership appropriate to that deployment. Historical non-production rehearsal is evidence, not a permission slip to skip production operations.

## Database-Unavailable Smoke

The CI outage smoke deliberately stops disposable PostgreSQL after the optimized build and verifies structured database-unavailable behavior.

Expected boundaries include:

- auth/database-backed requests return a structured `503` with `code: "database_unavailable"` where applicable;
- raw Prisma/driver details are not exposed to the browser; and
- the application returns to the normal DB-up ladder when PostgreSQL is restored/recreated in the next disposable run.

## Local Dev Cache Notes

- `playwright.config.ts` defaults to port 3000 and can reuse an existing server. Confirm the port is serving current code after substantial changes.
- After an external seed/reset, an already-open browser may retain stale IndexedDB data. Use the Refresh action when no pending mutations exist or use a clean browser context for verification.
- Start PostgreSQL with `docker compose up -d` before DB-up verification.

## Notes

- `.env` is ignored; `.env.example` is the only environment file intended to be committed.
- `npm run db:seed` recreates the configured demo workspace. Do not run it as a normal production deploy step.
- Public registration and demo reset are disabled by default in production unless deliberately enabled.
- Review dependency updates deliberately; do not use `npm audit fix --force` as an assurance strategy.
