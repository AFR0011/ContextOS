# ContextOS Full Product Audit

Date started: 2026-09-22  
Branch: `c10-product-acceptance`  
Baseline: C9 merge `16dffb7ad52dbcb9f2a8fd3ffbf0128c1a896d1f`

This audit is intentionally split into independent phases. Findings are not mixed across categories, because functional/data defects, accessibility defects, visual defects, and product-gap decisions require different evidence and remediation.

## Audit sequence

- **A — Functional behavior + data integrity/core-feature completeness**
- **B — Interaction, keyboard, and accessibility**
- **C — Responsive/layout/visual-risk, clipping, overlap, and visually untested panels**
- **D — Product/feature gaps and workflow critique**
- **E — Cross-category consolidation, prioritization, and release decision**

---

# Phase A — Functional behavior + data integrity

Status: **source audit complete; identified correctness defects fixed; product-gap items deferred to Phase D**

## Scope reviewed

- canonical Area / Project / Task / Date / DailyNote creation and update paths;
- local optimistic state and IndexedDB durability;
- outbox creation, sync replay, stale-write behavior, and reconnect;
- server ownership/reference validation;
- demo reset;
- portability export/import/replace/merge;
- restore barrier;
- session/account lifecycle;
- first-run setup;
- canonical routing and compatibility redirects;
- current E2E/static assurance contracts.

## A-01 — Failed optimistic state could hitchhike into a later durable commit

Severity: **High**  
Status: **Fixed on audit branch**

### Problem

The UI applied mutations optimistically before the IndexedDB transaction completed.

`commitLocalMutationBatch()` then persisted the entire in-memory workspace snapshot plus the new outbox mutations.

If mutation A failed to write locally, its optimistic state remained in React memory. A later unrelated successful mutation B could persist that entire optimistic workspace snapshot. Mutation A would then exist durably in the workspace even though its mutation never entered the outbox, so it could survive reload while having no synchronization path.

### Fix

- `commitLocalMutationBatch()` now reads the durable IndexedDB workspace and applies only the mutation payloads belonging to that transaction.
- later successful mutations cannot carry unrelated failed optimistic state into durable storage;
- the commit returns the actual durable workspace/outbox result;
- failed commits trigger reconciliation from durable IndexedDB state after queued local writes settle;
- recovery messaging distinguishes successful reconciliation from reconciliation failure.

### Regression

Added E2E coverage proving:
1. a Daily Note local transaction is forced to fail;
2. that failed content is absent from durable workspace and outbox;
3. an unrelated Area mutation then succeeds;
4. the Area persists and queues;
5. the failed Daily Note still does not appear in durable workspace or outbox.

## A-02 — Demo reset local/server replacement was not atomic or safely scoped

Severity: **Medium-High**  
Status: **Fixed on audit branch**

### Problems

1. Client demo reset could clear the local outbox even when `/api/reset-demo` failed.
2. Successful reset wrote local workspace and cleared the local outbox in separate IndexedDB transactions.
3. Server reset cleared/reseeded records through multiple database operations outside a transaction.
4. Whenever demo reset was enabled, any authenticated account could call the endpoint, despite it being a demo-only operation.

### Fix

- failed demo reset returns without touching the local outbox;
- successful local reset atomically replaces workspace + outbox in one IndexedDB transaction;
- server clear/reseed now runs inside one Prisma transaction;
- reset is restricted to `SEED_DEMO_EMAIL` (default `demo@contextos.local`);
- added regression proving a fresh non-demo account receives 403 and its empty workspace remains unchanged.

## A-03 — Portability restore could report false local success

Severity: **Medium-High**  
Status: **Fixed on audit branch**

### Problem

After a successful server-side import/replace, Settings called `forceRefreshFromServer()`.

That function swallowed refresh failures and returned `void`, so Settings could display:

> Workspace restored from export.

even when the current tab still contained the pre-restore local snapshot.

The server restore barrier limited stale replay risk, but the success message itself was false and encouraged further edits against stale local state.

### Fix

- `forceRefreshFromServer()` now returns `Promise<boolean>`;
- Settings only reports successful restore/merge after the current tab successfully refreshes the new server workspace;
- if server import succeeds but local refresh fails, the UI explicitly says the server operation succeeded while this tab still needs **Refresh from server**.

### Regression

Added E2E coverage that:
1. restores a valid workspace on the server;
2. injects a `/api/bootstrap` failure for the follow-up refresh;
3. verifies no success banner appears;
4. verifies the partial-success warning appears;
5. removes the injected failure;
6. performs explicit refresh;
7. verifies the restored Area becomes visible.

## A-04 — Active assurance still contained stale pre-redesign contracts

Severity: **Medium**  
Status: **Fixed on audit branch**

### Problems found

- first-run E2E still used old Project-create placeholder/button labels;
- maturity test asserted an obsolete claims-audit sentence;
- Blueprint contract test was built almost entirely around wording removed by the canonical C7-C10 product redesign;
- local-first verification prose still referred to “current C7 tests”;
- Security assurance prose could be read as if recoverable tombstones were still part of the current product.

### Fix

- first-run test now uses current `Project name` / `Create Project` UI;
- maturity test matches the current claims-audit boundary;
- Blueprint contract test now guards semantic invariants:
  - `Area -> Project -> Task`;
  - flat Projects;
  - five canonical persisted collections;
  - atomic workspace + outbox commits;
  - canonical upsert-only sync;
  - retired Inbox/Resources/Reviews/Archive semantics;
  - honest LifeOS/Insight provider boundaries;
- current assurance docs now distinguish historical Stage 9/10 tombstone evidence from active C8-C10 behavior.

## A-05 — Replace-restore anti-resurrection barrier trusted a client clock

Severity: **High**  
Status: **Fixed on audit branch — user selected Option A**

### Problem

Replace restore originally compared the server restore-barrier time with client-supplied `mutation.createdAt`.

A stale offline device could therefore bypass the barrier when:
- its wall clock was ahead; or
- it made a stale edit after the restore occurred while still offline.

### Fix

Queued mutations now carry `baseServerSyncedAt`, the last server snapshot observed by the client before that mutation chain.

After a replace restore:
- a mutation with no server baseline fails closed;
- a mutation whose baseline is at/before the latest restore barrier is acknowledged with a stale warning but not applied;
- only work based on a server snapshot observed after the restore can pass the anti-resurrection gate.

The decision no longer depends on the device clock.

### Regression

Portability coverage now deliberately submits:
1. a stale mutation with a client timestamp one day in the future but a pre-restore server baseline;
2. a stale mutation with no baseline.

Both must be rejected as stale and leave the restored workspace unchanged.

## A-06 — General stale-write ordering trusted client `updatedAt`

Severity: **Medium-High**  
Status: **Fixed on audit branch — user selected stronger Option B**

### Problem

Existing-record conflict ordering was previously client-clock last-write-wins:

```text
incoming payload.updatedAt >= server record.updatedAt
```

A future-skewed device clock could dominate later legitimate writes. The check also did not provide a server-owned causal precondition for concurrent requests.

### Fix: server-owned record revisions

Every canonical server record now carries an internal integer `revision`:
- Area;
- Project;
- Task;
- ContextDate;
- DailyNote.

Client behavior:
- bootstrap/sync returns the current server revision;
- a queued existing-record mutation carries `baseRevision`;
- a newly created record uses a null base revision;
- optimistic local edits advance the local revision speculatively so several offline edits form an ordered mutation chain.

Server behavior:
- new records are created at revision 1;
- an existing-record mutation is accepted only when `baseRevision` equals the current server revision;
- accepted updates increment the revision;
- the database update itself uses atomic compare-and-swap through `updateMany(... revision: baseRevision)`;
- if another request wins the race first, the CAS updates zero rows and the mutation becomes a stale conflict;
- once one queued mutation for a record conflicts, later mutations for that same record in the same request are rejected as dependent conflicts rather than leapfrogging the failed edit.

Client `createdAt`/`updatedAt` remain metadata only. They no longer decide conflicts.

### Portability behavior

Revision metadata is intentionally internal sync state:
- JSON/Markdown export format v2 does **not** include revisions;
- replace import creates fresh revision-1 records;
- merge import increments revisions for matching server records;
- stale clients therefore cannot overwrite a merge-imported change using an old revision.

### Local cache boundary

Revisionless IndexedDB v3 state cannot provide a trustworthy `baseRevision`.

Because the already-approved migration boundary still has no real users:
- IndexedDB is bumped to v4;
- remembered verified identities survive;
- v3 workspace/outbox snapshots are discarded;
- authenticated bootstrap rebuilds revision-aware local state.

The active v3 test is retired and replaced with `local-db-v4.spec.ts`.

### Regression coverage

Added/updated coverage for:
- future-dated stale writes losing to server revision state;
- dependent queued edits not leapfrogging an earlier conflict;
- sequential queued edits advancing revisions in order;
- two simultaneous requests racing the same base revision, with exactly one winner;
- export v2 containing no revision fields;
- merge import incrementing matching server revisions;
- v3 -> v4 local clean break preserving identity while discarding revisionless workspace/outbox state;
- server bootstrap repopulating positive revisions after the v4 reset.

## A-07 — Tasks are not editable after creation

Severity: **Product gap, Medium**  
Status: **Deferred to Phase D product/feature audit**

Current Task UI supports:
- create;
- Open/Done toggle.

It does not support:
- rename;
- reschedule;
- remove a planned day;
- change scheduled time;
- move between Project/Area contexts.

The underlying `updateTask()` store already normalizes `scheduledTime` to null when `plannedDate` is cleared, so the data model supports a proper editor.

This is likely a real daily-use gap, but adding the editor is a product/UI decision rather than an Audit A correctness patch.

## A-08 — Areas cannot be renamed

Severity: **Product gap, Low-Medium**  
Status: **Deferred to Phase D product/feature audit**

Areas can be created and archived/restored, but no UI calls `updateArea(..., { name })`.

The store/server support the operation already.

This is probably worth adding in Area Detail, but it is not required for data integrity and will be decided in the product-gap phase.

## Verified canonical invariants

Source inspection confirmed:
- Projects can edit name / Area / objective and archive/restore;
- Project Area choices use active Areas plus the Project's current Area when archived;
- Tasks cannot retain `scheduledTime` without `plannedDate`;
- Dates enforce Event/Deadline semantics and Deadline `endTime = null`;
- Task/Date parents are ownership-validated server-side;
- Project parent Area ownership is validated;
- mutation replay remains idempotent by per-user mutation ID;
- Daily Note `localDate` is immutable;
- one Daily Note per user/local day is server-enforced;
- portability relationships are schema-validated before restore;
- account deletion uses the User cascade root and explicit current-device cleanup;
- first-run accounts remain empty until the first Area is created;
- canonical compatibility routes remain redirects, not restored legacy product surfaces.

## Runtime verification limitation

This phase used branch source inspection and added runtime regression tests, but the connector-only environment cannot execute:
- TypeScript typecheck;
- Next.js build;
- Playwright;
- production-offline Playwright.

Those remain mandatory before C10 closure.

---

# Phase B — Interaction / keyboard / accessibility

Status: **Not started**

Phase A protocol decisions are resolved. Phase B may proceed independently.
