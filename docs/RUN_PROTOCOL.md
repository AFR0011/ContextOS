# ContextOS Run Protocol

## Local Setup

```bash
cp .env.example .env
docker compose up -d
npm install
npx prisma generate
npm run db:migrate
npm run db:seed
npm run dev
```

Demo login:

- Email: `demo@contextos.local`
- Password: `contextos-demo-v011`

The demo seed is disposable neutral test data. C7 no longer seeds retired Inbox Captures, standalone Resources, or Reviews.

## Verification Ladder

Run sequentially. Typecheck/build and browser runtimes intentionally own different generated/runtime boundaries, because running everything in parallel mostly produces expensive interpretive dance.

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
npm run test:unit
npm run typecheck
npm run build
npm run test:container-distribution
npx playwright test --config=playwright.production.config.ts --workers=1
npm run test:e2e -- --workers=1
```

The committed CI workflow runs the corresponding ladder against disposable PostgreSQL when GitHub Actions is available. Historical Stage 9/10 validators preserve exact provenance; `audit:c10:product` owns the current post-redesign acceptance registry.

Historical Stage 10 final acceptance is recorded at commit `f4ba02699c24210ddd6f4cfaf2b626f7a33b0c40`, run `31800346837`. Later product phases update current tests when intentional semantics change rather than pretending obsolete UI is still part of acceptance.

## Runtime Ownership

Service-worker/cold-offline evidence belongs to the **optimized production** runtime.

The production matrix owns:

- previously authenticated cold offline reopen;
- canonical route cold open/hard refresh;
- dynamic Project and Area route reconstruction;
- compatibility-alias resolution to canonical surfaces;
- offline browser history;
- a **functional local Search query** returning cached canonical data;
- verified application-shell completeness;
- durable local supported mutations/outbox state;
- production response-security boundaries; and
- proof that `/api/*` traffic is network-only and absent from shell caches.

The development suite owns broader interaction, local atomicity, synchronization, route redirects, account lifecycle, stale-state handling, user isolation, accessibility, and fixture regression.

## Definitive Workflow Acceptance

The current C10 product path is:

```text
Open -> understand day -> execute -> note -> open context -> resume Project -> see upcoming -> find history -> LifeOS boundary
```

`tests/e2e/c10-product-workflow.spec.ts` exercises that path through normal UI interactions.

## Core Manual Product Checks

- Confirm `GET /api/health` is minimal and `no-store`.
- Log in and verify Home: Today, Daily Notes, Context Today, Upcoming.
- Create/edit a Project and confirm Area ownership.
- Create a direct Area Task and direct Area Date.
- Edit an existing Task: rename it, move Project/Area context, change/clear planned day, and verify scheduled time clears with the plan.
- Rename an Area from Area Detail and confirm the name propagates to Project/Search context.
- Verify Project Archive remains clickable with Open Tasks, reveals the blocker only after the attempted archive, clears that warning after the blocker is resolved, and then archives successfully.
- Verify Area Archive behaves the same for direct Open Tasks while remaining independent from child Project lifecycle.
- Create Event/Deadline records and verify Today/Upcoming/Past grouping.
- Use Cmd/Ctrl+K entirely by keyboard.
- Create Task and Date through Cmd/Ctrl+K.
- Search for Project, Area, Task, Date, and historical Daily Note.
- Confirm archived Project/Area and Done Task history remains discoverable.
- Confirm Settings sections: Account / Appearance / Offline & Sync / Data / Security / Advanced.
- Confirm light/dark theme persists and stays synchronized with shell control.
- Confirm LifeOS shows only configured entry points/real summaries.
- Confirm compatibility aliases:
  - `/inbox -> /dashboard`
  - `/resources -> /lifeos`
  - `/reviews -> /lifeos`
  - `/archive -> /search`
  - `/today -> /dashboard`
  - `/this-week -> /dashboard`
  - `/deadlines -> /dates`
- Confirm `/handoff` can preview a valid handoff without persisting a retired Inbox record.

## Offline Verification

After a previously authenticated device reports Offline ready:

- cold-reopen Home;
- hard-refresh canonical routes;
- hard-refresh dynamic Project/Area detail;
- navigate Search locally;
- edit a Daily Note and confirm workspace + outbox durability;
- verify retired aliases resolve to canonical destinations without restoring deleted UI;
- reconnect and confirm pending supported mutations synchronize;
- confirm API fetches fail as network requests rather than receiving cached HTML.

A first-time browser without a verified local workspace remains blocked. Multiple eligible local identities require explicit selection.

## Synchronization / Deletion Integrity

Accepted mutation IDs remain user-scoped and idempotent. Stale updates are surfaced rather than silently replacing newer state. Startup/bootstrap and explicit refresh refuse to replace a newer local mutation with an older in-flight snapshot.

Historical Stage 9 verified recoverable tombstone behavior for the pre-C8 model. C8 intentionally removes that per-record tombstone protocol from the canonical workspace.

Current sync accepts canonical entity types and upsert operations only. Area/Project archival and Task Open/Done are ordinary canonical state transitions; Dates have no deletion lifecycle state. Stale canonical writes remain warning/skipped rather than silently overwriting newer server state.

## Authentication / Lifecycle

- true logout requires connectivity;
- ordinary logout retains local data by default;
- remove-from-device is explicit and user-scoped;
- pending changes receive explicit handling;
- permanent account deletion is online and password-confirmed;
- other offline devices cannot be remotely erased;
- public registration and demo reset are closed by default in production.

## Deployment / Recovery Evidence

Stage 8 recorded a real HTTPS preview and PostgreSQL-native `pg_dump`/`pg_restore` recovery on isolated non-production infrastructure. Those results do not imply provider-native PITR, arbitrary migration reversibility, or a production disaster-recovery SLA.

The production-style container distribution is documented in `docs/CONTAINER_DEPLOYMENT.md`.

## Notes

- `.env` is ignored; tracked env templates contain placeholders/demo values only.
- `npm run db:seed` is destructive for the configured demo workspace and is never a normal production deploy step.
- Production container startup never seeds demo records.
- Use `db:migrate` for local migration development and `db:deploy` for applying committed migrations.
- Do not use `npm audit fix --force` as an assurance strategy.
