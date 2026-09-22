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

## Phase A assurance follow-up discovered during Phase B

Two active Stage 9 lifecycle test assumptions had not been carried through the A-02/A-06 protocol changes:

1. stage9-lifecycle.spec.ts still opened contextos-offline-v1 with IndexedDB version 3 even though production now requires the revision-aware v4 boundary. Opening an existing v4 database with an explicitly lower version can fail with VersionError.
2. the disposable non-demo account helper still called /api/reset-demo and expected HTTP 200 even though A-02 intentionally restricts demo reset to the configured demo identity.

Both stale assumptions are fixed:
- Stage 9 lifecycle helpers now open IndexedDB v4;
- the account-deletion lifecycle test stays on a genuinely clean first-run account instead of relying on demo reseeding.

These were assurance defects rather than new product-state defects, but they would have made the active regression ladder fail or test the wrong contract.

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

Status: **source audit complete; identified interaction/accessibility defects fixed; runtime verification pending**

## Scope reviewed

- keyboard reachability and visible focus;
- modal/drawer focus containment and focus return;
- route-change and first-run focus transitions;
- skip navigation;
- semantic names for controls and quick-entry fields;
- disclosure, filter, selection, and pressed state;
- command-palette combobox/listbox semantics;
- dynamic status, warning, error, autosave, sync, and loading announcements;
- authentication and public-page landmark structure;
- IME-safe Enter handling;
- reduced-motion support;
- light/dark theme text contrast;
- active accessibility/lifecycle regression coverage.

## B-01 — Closed mobile navigation remained offscreen but keyboard-reachable

Severity: **High for keyboard users**  
Status: **Fixed on audit branch**

The mobile navigation drawer was translated offscreen when closed, but it remained in the DOM with live buttons and links. CSS position does not remove controls from sequential keyboard navigation or the accessibility tree.

The shell now tracks the desktop breakpoint. When the drawer is closed on mobile it is both inert and aria-hidden. Opening removes those constraints and the existing dialog focus trap takes ownership. Escape closes the drawer and restores focus to the menu trigger.

C10 regression coverage now proves the closed/open/closed inert state, focus containment, Escape behavior, and trigger focus return.

## B-02 — Dynamic product state was not consistently available to assistive technology

Severity: **Medium-High**  
Status: **Fixed on audit branch**

The audit found visually understandable but inconsistently announced state across global sync/offline state, offline-shell readiness, logout failures, account deletion, Settings sync/import results, password validation/results, session-management results, Daily Note autosave, Search result count/selection, and handoff loading/authentication.

The affected surfaces now use appropriate status, live-region, alert, busy, invalid, and described-by semantics without duplicating noisy announcements.

## B-03 — Interactive state was visually encoded without enough semantic state

Severity: **Medium**  
Status: **Fixed on audit branch**

- Date filters now expose pressed state.
- completed-task disclosure exposes expanded state and its controlled region.
- Search result selection exposes pressed state and result-count status.
- the command palette exposes complete combobox/listbox ownership and active-descendant state.
- Area/Project/Task/Date quick-entry fields have explicit accessible names.

## B-04 — Focus could be lost across local navigation and transient UI removal

Severity: **Medium-High**  
Status: **Fixed on audit branch**

The workspace now provides a Skip to main content link. Local route changes focus the new page heading without scrolling. Programmatically focused headings are valid focus targets.

New Area, New Project, and Add Date expose expanded/controls state. Cancelling returns focus to the trigger. Successful Area/Date creation returns focus after the form disappears. Project creation navigates into the new Project, where route focus takes over.

First-run completion is handled separately because the setup view disappears without a URL change: when the first Area is created, focus moves to the new Home heading.

## B-05 — Enter shortcuts were unsafe during IME composition

Severity: **Medium for IME users**  
Status: **Fixed on audit branch**

Quick-entry and inline-edit Enter handlers now avoid submitting or committing while native IME composition is active.

## B-06 — Light-theme subtle text token failed AA contrast on common surfaces

Severity: **Medium**  
Status: **Fixed on audit branch**

The former light-theme subtle token (#7a8190) produced approximately 3.91:1 on white and 3.59:1 on the primary canvas, despite being used for meaningful 10–12px metadata.

The light token is now #646c79. It reaches at least 4.5:1 on the canonical light canvas, soft, elevated, inset, and primary-soft surfaces. The dark-theme subtle token already clears that threshold on the canonical dark surfaces.

C10 accessibility coverage calculates the contrast ratio from the actual runtime CSS custom properties and requires at least 4.5:1 on those light surfaces.

## B-07 — Landmark/loading semantics were inconsistent on non-workspace entry surfaces

Severity: **Low-Medium**  
Status: **Fixed on audit branch**

Authentication now has a main landmark; public header/footer remain outside main; WorkspaceGate checking/blocked states are announced; verified local-workspace choices are grouped semantically; and handoff checking/error/headings expose appropriate status/focus semantics.

## B-08 — Existing modal and keyboard foundations were verified rather than reimplemented

Status: **Verified by source inspection; runtime regression retained**

The audit confirmed the existing C9/C6 foundation remains appropriate:
- shared dialog focus trap filters CSS-hidden controls;
- Tab and Shift+Tab are contained;
- Escape closes when permitted;
- focus returns to the invoking control;
- palette ArrowUp/ArrowDown/Enter/Escape behavior remains explicit;
- active palette option scrolls into view;
- reduced-motion CSS collapses transition/animation duration;
- global focus-visible treatment remains present.

## Accessibility regression surface

Active coverage now includes:
- tests/e2e/c10-accessibility.spec.ts;
- tests/e2e/c6-search-palette.spec.ts;
- tests/e2e/stage9-lifecycle.spec.ts;
- tests/e2e/batch3-clean-first-run.spec.ts;
- existing responsive/reduced-motion/theme coverage under tests/e2e/contextos.spec.ts.

## Runtime verification limitation

The connector-only environment cannot execute TypeScript typecheck, Next.js build, Playwright, or production-offline Playwright.

Therefore **Phase B source remediation is complete, but ACCESS-001 remains pending until the current branch runs the acceptance ladder in an executable environment.**

---

# Phase C — Responsive / layout / visual risk

Status: **C-00 render-evidence infrastructure complete; current-candidate visual inspection blocked pending a runnable build**

Phase C must inspect real rendered panels and breakpoints for clipping, overlap, overflow, hidden/offscreen controls, stacking, safe-area behavior, visually untested states, and light/dark presentation. It must not be marked complete from source inspection alone.

## C-00 — Render evidence infrastructure and deployment boundary

Status: **Complete**

### Deployment history finding

The current product cannot truthfully use the old hosted preview as C10 visual evidence.

Vercel history shows:
- C3 main at `4b452711c50b4937193c07e7df957c55f155297a` is not the relevant baseline and must not be reused for C10 screenshots;
- the last READY production deployment is C3 main at `4b452711c50baf8a301c79f298fcc9a613432d61`;
- C4 main at `81670fb7d3c3a8467af57fdbb2f4fdd69de5893e` failed during `npm run build` with a lint/type error;
- C9 main at `16dffb7ad52dbcb9f2a8fd3ffbf0128c1a896d1f` also failed during `npm run build`;
- later previews include install-stage failures;
- the latest C10 status is additionally blocked by Vercel build-rate limiting.

The first bullet above intentionally distinguishes the older C3 implementation checkpoint in project history from the exact last READY Vercel commit in the deployment history. Only the exact deployment commit may be used as hosted evidence.

### Capture harness added

The prose-only screenshot contract is now executable through:
- `tests/e2e/c10-visual-baseline.spec.ts`;
- `scripts/capture-c10-visual.mjs`;
- `npm run capture:c10:visual`.

The standard capture matrix covers:
- desktop 1440x1000 light and dark;
- mobile 390x844 light and dark;
- Home;
- Projects;
- Project Detail;
- Areas;
- Area Detail;
- Dates;
- Search selected-detail state;
- LifeOS;
- Settings;
- Add Date open state;
- command palette;
- New Task sheet;
- New Date sheet;
- long Settings import filename;
- mobile drawer;
- logout dialog.

Each screenshot capture first requires no horizontal document overflow.

The visual capture suite is gated behind `CAPTURE_C10_VISUAL=1` so ordinary E2E runs do not create screenshot artifacts accidentally.

### Still pending as separate Phase C slices

- 320x720 hostile-content visual stress;
- production-runtime Offline / pending / reconnect screenshots;
- clean first-run / empty-account screenshots;
- actual manual review of every generated image;
- correction and recapture of any defects found.

### Current blocker

This environment cannot clone/install/run the repository because outbound sandbox network access is unavailable, while the current Vercel path is build-rate limited and the advertised Vercel build-log connector is not operational.

Therefore C-00 is complete, but **Phase C visual acceptance remains open**. The next runtime-capable environment must first get the current C10 candidate building, then run `npm run capture:c10:visual`.

## C-01 — Primary surface rendered inspection

Status: **Pending runnable current candidate**

Required evidence:
- Home;
- Projects;
- Project Detail;
- Areas;
- Area Detail;
- Dates;
- Search;
- LifeOS;
- Settings;
- desktop/mobile;
- light/dark.

