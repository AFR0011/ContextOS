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
- the last READY production deployment is C3 main at `4b452711c50baf8a301c79f298fcc9a613432d61`, which is too old to serve as C10 visual evidence;
- C4 main at `81670fb7d3c3a8467af57fdbb2f4fdd69de5893e` failed during `npm run build` with a lint/type error;
- C9 main at `16dffb7ad52dbcb9f2a8fd3ffbf0128c1a896d1f` also failed during `npm run build`;
- later previews include install-stage failures;
- the latest C10 status is additionally blocked by Vercel build-rate limiting.

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

### Capture slices implemented

The dedicated runner now includes:
- 320x720 hostile-content visual stress in light/dark;
- clean first-run and empty-workspace surfaces in desktop/mobile light/dark;
- production-runtime online/offline/pending/reconnecting/reconnected states in mobile light/dark.

Still pending:
- successful execution against the current C10 candidate;
- actual manual review of every generated image;
- correction and recapture of any defects found.

### Current blocker

This environment cannot clone/install/run the repository because outbound sandbox network access is unavailable, while the current Vercel path is build-rate limited and the advertised Vercel build-log connector is not operational.

Therefore C-00 is complete, but **Phase C visual acceptance remains open**. The next runtime-capable environment must first get the current C10 candidate building, then run `npm run capture:c10:visual`.

## C-00.5 — Build and preview prerequisite hardening

Status: **source remediation complete; runtime verification blocked by Vercel build-rate limit**

The render audit exposed two independent deployment concerns.

### Preview install failure

Branch previews repeatedly failed during `npm install` before any application build occurred. Repository Stage 8 evidence already documented the cause pattern: `postinstall` runs `prisma generate`, while `prisma.config.ts` used `env("DATABASE_URL")`, which throws when preview/install contexts do not expose database credentials.

Prisma ORM v7 explicitly states that `prisma generate` does not require a database URL, even though `env()` can make config loading fail. The config now reads `process.env.DATABASE_URL ?? ""` directly. Database-dependent commands still require a valid URL when they actually connect.

**Runtime evidence:** Vercel deployment `dpl_TuCb8Y4P8aHXaw6YnRbkYQmJGybo` for commit `c38fdabe14ddb2dfbf64875cd99261b7bf29ea4e` progressed past installation and failed later in the build step with `lint_or_type_error`. That verifies the preview-install blocker itself is resolved.

### Production build typecheck boundary

The root TypeScript configuration intentionally checks the full repository, including Playwright tests and scripts. Next production builds previously used the same config, coupling deployment compilation to non-runtime tooling.

The branch now contains `tsconfig.build.json`, limited to `src/**` plus generated Next route types, and `next.config.ts` points Next's production checker to that file. The existing repository-wide `npm run typecheck` remains unchanged and strict.

This is not `ignoreBuildErrors`; application/runtime TypeScript errors still fail production builds.

### Verification boundary

New Vercel builds cannot currently start because the account reports its build-rate limit. Therefore these fixes are source-complete but not runtime-verified yet.

## C-00.6 — Source-level responsive and hostile-content preflight

Status: **source remediation complete; executable regressions added; rendered verification still pending**

Source inspection was used only to identify deterministic layout risks before browser capture. It does not close Phase C.

### C-PRE-01 — Logout dialog could exceed short mobile viewports

Severity: **Medium**  
Status: **Fixed on audit branch**

The logout dialog can contain:
- offline warning;
- pending-mutation warning;
- sync failure error;
- multiple logout/discard/remove choices;
- account-deletion entry;
- Cancel.

It previously had no viewport cap or internal scrolling. The dialog now uses a dynamic-viewport maximum height and its own vertical scroll container.

Regression coverage creates pending state plus a forced sync error at 320x568, verifies the dialog remains fully inside the viewport, verifies it becomes internally scrollable, and verifies the final Cancel control remains reachable.

### C-PRE-02 — Command palette could clip on short or landscape viewports

Severity: **Medium**  
Status: **Fixed on audit branch**

The palette previously combined a responsive top offset with a fixed results ceiling but no exact viewport-bound dialog height.

The palette now:
- uses dynamic viewport units;
- becomes a bounded flex column;
- gives only the results region the remaining scrollable height;
- accounts for the 12dvh top offset at the `sm` breakpoint.

Regression coverage checks:
- 320x400 portrait;
- 700x400 landscape / `sm` breakpoint;
- active-option scrolling remains inside the visible listbox.

Shared DetailSheet height is also bounded against its responsive outer padding.

### C-PRE-03 — Full-screen shells used static viewport height

Severity: **Low-Medium**  
Status: **Fixed on audit branch**

Authentication, workspace gate/loading, handoff verification, the workspace shell, and the desktop navigation rail used `100vh`-style utilities.

Those surfaces now use dynamic viewport height so mobile browser chrome does not create false centering, clipped full-screen states, or sidebar height mismatch.

### C-PRE-04 — Several hostile-content strings could dictate layout width

Severity: **Medium**  
Status: **Fixed on audit branch**

Explicit arbitrary-word wrapping is now applied at user/server-controlled display boundaries including:
- logout/account email identity;
- handoff title/body/errors;
- workspace-gate diagnostics;
- shell and Settings sync errors/warnings;
- authentication diagnostics;
- password/session-management feedback.

This complements the existing long Area/Project/Date/import-filename coverage instead of globally changing ordinary typography.

### C-PRE-05 — Date composer was unusably dense at the 1024px sidebar breakpoint

Severity: **Medium**  
Status: **Fixed on audit branch**

At 1024px the permanent 15.5rem sidebar becomes active. After page and surface padding, the Project/Area Date composer had roughly 688px of inner width while its five fixed-width controls, action, and gaps consumed about 628px before the flexible Date-title column.

The layout could therefore remain technically free of horizontal overflow while compressing the Date title field to roughly 60px.

Project Detail and Area Detail now:
- use a two-column Date composer from `md` through `lg`;
- switch to the dense six-column composer only at `xl`;
- span Details across two columns below `xl` and all six columns at `xl`.

A dedicated 1024x768 E2E regression requires the Date-title input to retain at least 200px of width in both detail views and still rejects horizontal document overflow.

The screenshot baseline now also includes 1024x768 light and dark compact-desktop variants for all canonical surfaces.

### Build-boundary refinement discovered during preflight

The first `tsconfig.build.json` draft still included unit tests under `src/**`. The branch contains three such files. Production build exclusions now explicitly remove `*.test.*` and `*.spec.*` under `src`, while the root `npm run typecheck` continues to check them.

### Verification boundary

All fixes above are source-complete and structurally guarded by C10 acceptance checks. Their Playwright regressions and screenshot matrix have not yet executed on the current candidate because Vercel remains build-rate limited and this environment cannot install/run the repository.

## C-00.7 — Complete executable visual evidence pipeline

Status: **implemented; execution blocked by current build/rate-limit boundary**

The visual evidence command now performs the complete required sequence:

1. `npm run build` — visual capture refuses to proceed on an unbuildable candidate.
2. production-browser capture, before any dev server can mutate `.next`:
   - online-ready;
   - offline;
   - offline with a queued local mutation;
   - reconnecting while sync is deliberately held;
   - healthy state after the outbox drains.
3. standard browser capture:
   - canonical desktop/mobile/compact-desktop surfaces;
   - overlay/transient states;
   - 320x720 hostile-content stress in light/dark;
   - clean-account first-run/empty states in desktop/mobile light/dark.

The production offline suite also contained two stale explicit IndexedDB v3 opens; those are now aligned to the current v4 local-state boundary.

No screenshot evidence is considered accepted until this pipeline runs successfully and a human reviews the generated images.

## C-00.8 — Production browser matrix findings

Status: **remediated in source; rerun in progress**

The first current-candidate production browser run passed 21/26 executed tests and exposed five failures.

### C-PROD-01 — stale IndexedDB v3 test helpers

Three WorkspaceGate scenarios explicitly opened IndexedDB version 3 after the approved v4 clean boundary. They failed with `VersionError` before exercising the intended behavior.

The WorkspaceGate helpers now open v4. The same sweep also found and fixed a v3 open in the local-first characterization helper.

These are assurance defects, not product-state defects.

### C-PROD-02 — authenticated production characterization used the wrong request surface

The local-first convergence characterization logged in through the real browser, then called demo reset/bootstrap through Playwright's separate API request surface. In the optimized production runtime this returned 401 while browser-origin authenticated requests remained valid.

The characterization now performs those authenticated operations through same-origin browser `fetch`, matching the actual HttpOnly-session path used by the product.

No authentication/session implementation was weakened.

### C-PROD-03 — Area detail lacked a physical App Router route

The production offline matrix proved a real asymmetry:
- cold offline `/projects/:id` opened and hard-refreshed successfully;
- cold offline `/areas/:id` returned the cached shell but never reached Area Detail.

Projects had a physical `src/app/(workspace)/projects/[id]/page.tsx` handoff route; Areas did not.

Added `src/app/(workspace)/areas/[id]/page.tsx` with the same `WorkspaceRouteHandoff` boundary. The local workspace router remains the canonical client renderer, while Next now has an equivalent direct-navigation route for Area detail.

### C-PROD-04 — production characterization selector became ambiguous

Severity: **Assurance defect, Low**  
Status: **Fixed on audit branch**

After the auth and Area-route fixes, the local-first convergence scenario reached Project creation and exposed an ambiguous Playwright selector: `getByLabel("Area")` also matched the navigation control named “Areas.”

The test now scopes the exact Area select to `project-create-form`. Product accessibility names were not weakened to satisfy the test.

### Controlled rerun evidence

The intermediate commits provide direct isolation evidence:
- WorkspaceGate v4 correction removed all three `VersionError` failures, leaving only the pre-existing auth/Area-route failures.
- browser-origin auth correction removed the reset 401; that run then exposed the selector ambiguity and still lacked the Area route.
- adding the physical Area route made the offline Area cold-open/hard-refresh test pass; that run had 25/26 production tests pass, with only the selector ambiguity remaining.

### Evidence boundary

The final candidate includes all four remediations and structural guards. It is not considered passed until the full production browser rerun confirms the complete set.

## C-00.9 — READY preview evidence boundary

Status: **partial runtime evidence only; no current-head visual equivalence claim**

Vercel produced READY previews during the audit, including:
- `4cecf13bb1112cb5b4e89bb92f4db8fe0e132da8` during Phase C;
- `dc8fa7499811f2dabd4b7206ba8a70211a3e3897` after clean-account visual-harness work;
- `ebb2d994d225b5fa26221378e265144716c0ea28` during Phase D.

The `ebb2d994...` preview is meaningful partial runtime evidence because it already contains:
- the shared Task editor;
- Area rename;
- the archive-policy domain layer;
- the Project-list archive blocker.

However, later Phase D/E commits changed rendered behavior and presentation, including:
- Area/Project detail archive blockers;
- archived-context labels across Home/Dates/Search/Project metadata;
- Task reopen guards under archived parents;
- Area archive-blocked presentation;
- documentation/acceptance consolidation that must be verified against the final candidate.

Therefore no READY preview currently available is visually equivalent to the final audit head.

The current branch head is again blocked by Vercel build-rate limiting, and GitHub Actions is unavailable for this account. The local connector browser also cannot navigate the preview because outbound browser access is blocked.

So:
- partial runtime evidence exists for an intermediate Phase D candidate;
- final current-head build/runtime verification remains pending;
- actual current-head screenshot capture and human visual review remain pending.

## C-00.10 — Local runtime recovery and mobile-drawer visual closure

Status: **Passed for the mobile-drawer slice; full visual matrix still pending**

A local Windows runtime became available for current C10 verification and exposed two environment/harness issues before the drawer regression itself could execute:

1. the local checkout was still on C9 `main` rather than `c10-product-acceptance`; after preserving local changes, the checkout was fast-forwarded to the C10 branch and a clean `.next` rebuild passed;
2. the local PostgreSQL Compose service was stopped, causing the login page to fail closed on its database health check; restarting the existing `contextos-postgres` service restored connectivity with all 12 migrations already current;
3. the dedicated visual suite runs `next start`, which correctly uses production runtime semantics and therefore rejected `/api/reset-demo` while `ALLOW_DEMO_RESET=false`. The visual harness now opts into demo reset explicitly without changing the application's production-safe default.

The mobile-drawer identity defect is now closed with both automated and human evidence:
- implementation commit `07d75216a1fc547127f7766c1288a54740b02761` gives the drawer identity row enough flexible width to preserve the full `ContextOS` label;
- `c10-visual-stress.spec.ts` asserts the 320x720 drawer identity is visible and not internally clipped;
- `c10-visual-baseline.spec.ts` asserts the same invariant at the canonical 390x844 mobile viewport;
- light and dark variants passed in both targeted suites;
- human review confirmed full `ContextOS` text, clean identity/close-control alignment, no horizontal clipping, no navigation/control overlap, and no theme-specific defect.

Harness follow-up commits:
- `bf42a731906b20bf16e3d73f215c3372fbf1d46a` — dedicated visual runtime explicitly enables disposable demo reset;
- `d9e8b615efb15fd09541134079ea11a127dd7611` — the canonical capture command carries the same explicit opt-in.

This closes only the mobile-drawer slice. It does not satisfy the remaining primary-surface, empty-state, hostile-content, or production-offline screenshot matrix.

## C-01 — Primary surface rendered inspection

Status: **Partially executed; mobile drawer and mobile Home rhythm passed, remaining matrix pending**

### C-01.1 — Mobile Home inherited desktop Dayline balancing height

Severity: **Medium visual hierarchy / responsive rhythm defect**  
Status: **Fixed and human-verified**

The full screenshot matrix exposed a large dead vertical band between Today and Daily Notes on 390px mobile Home. Source inspection confirmed that the Dayline container applied `min-h-[18rem]` unconditionally. That minimum was useful for desktop column balancing but unnecessary on mobile, where it delayed the next primary surface by roughly 180–200px when Today contained only a small amount of content.

Fix:
- mobile now uses `min-h-0`;
- the 18rem balancing minimum begins at the `md` breakpoint;
- desktop/tablet composition remains unchanged.

Regression coverage verifies:
- the computed mobile minimum height remains compact at 390x844;
- the desktop/compact-desktop minimum remains at least 18rem at 1024x768.

Verification:
- repository build passed on the fixed head;
- responsive regression passed;
- targeted mobile light/dark visual capture passed;
- human review confirmed Daily Notes now follows Today with natural spacing and no new overlap or clipping.

Commits:
- `ad7283a07b4444a4edf78617db8ae84a84ad3d9f` — remove desktop Dayline height from mobile Home;
- `d047eca22f330b7c97b2a8717ca1ba50f2f68ac0` — guard compact mobile Home rhythm.

Required evidence still pending across the remaining matrix:
- Home beyond the closed mobile spacing defect;
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



---

# Phase D — Product / feature gaps and workflow critique

Status: **approved product decisions implemented in source; runtime and visual verification pending**

Phase D audited missing and contradictory user workflows, then implemented the approved set: **1A / 2A / 3B / 4A**.

## D-01 — Shared Task editor

Severity: **High product gap**  
Status: **Fixed on audit branch**

Tasks can now be edited after creation without introducing a Task-detail route.

The shared `TaskEditSheet` is reachable from:
- Home timed Tasks;
- Home Anytime Tasks;
- Project open Tasks;
- Project completed Tasks;
- Area direct open Tasks;
- Area direct completed Tasks.

It edits:
- title;
- Project/Area context;
- planned day;
- scheduled time.

Clearing the planned day also clears/disables scheduled time. The editor does not duplicate Open/Done state; checkmark interaction remains the only Task-state control.

Context choices include active Projects/Areas plus the Task's current parent when that parent is archived, so historical Tasks can still be moved out of an archived context.

Regression coverage verifies:
- rename;
- reschedule;
- clear plan/time;
- move Project -> Area -> Project;
- completed Task editing without changing Done state.

The visual baseline now captures the Task editor in every standard viewport/theme variant.

## D-02 — Area rename

Severity: **Medium product gap**  
Status: **Fixed on audit branch**

Area Detail now exposes the canonical Area name as an editable field.

Behavior:
- Enter commits;
- blur commits;
- Escape restores the canonical value;
- an empty value is rejected and restored.

No list-view editor was added. Area Detail remains the single canonical editing surface.

Regression coverage verifies rename propagation back to the Areas list while preserving lifecycle state.

## D-03 — Archive/open-work semantics

Severity: **Medium-High semantic gap**  
Status: **Fixed on audit branch using approved Option B**

The canonical rule is now:

### Projects

A Project cannot be archived while it has any Open Task directly parented to that Project.

The rule is enforced in:
- Projects list;
- Project Detail;
- Project rows nested in Area Detail.

The UI:
- leaves Archive actionable so the constraint is discoverable through intent rather than persistent warning noise;
- reveals an accessible contextual explanation only after a blocked archive attempt;
- removes that explanation automatically once the blocking Open Tasks are resolved or moved;
- guards the mutation handler as the authoritative second boundary.

### Areas

An Area cannot be archived while it has direct Open Tasks.

Child Project Tasks do **not** block Area archive. Project lifecycle remains independent, so an Area may be archived while active Projects remain inside it.

The rule is enforced in:
- Areas list;
- Area Detail.

As with Projects, Archive remains actionable. A blocked attempt reveals the direct-Open-Task explanation in context; the warning is not shown pre-emptively.

### Archived Task reopen boundary

A completed Task whose actual parent Project/Area is archived cannot be reopened in place.

It may still be:
- inspected;
- edited;
- moved to an active context;
- left Done.

The user must move it to an active context or restore its parent before reopening it.

Legacy/imported Open Tasks inside an archived parent may still be completed or moved, giving the user a path out of invalid state without silently rewriting Task state.

### Archived-context visibility

Archived parent state is now explicit rather than visually masquerading as active context across:
- Home Dayline/Anytime Task metadata;
- Home Upcoming Dates;
- Home In Context Today;
- Dates rows/editors;
- Search result subtitles/details;
- Project list/detail Area metadata when the Project's Area is archived.

An active Project inside an archived Area remains active; only its Area metadata is labelled archived.

### Demo fixture correction

The demo seed previously contained an archived `Release Planning` Project with an Open Task. That contradicted the approved policy. The historical release Task is now seeded as Done.

Regression coverage includes:
- Project Archive remains actionable, reveals its blocker only after intent, and succeeds once Open Tasks are resolved;
- completed Task reopen blocked after Project archive;
- future Date context remains visible and labelled archived;
- Search/Date/Home archived-context labelling;
- Area Archive remains actionable, reveals its direct-Task blocker only after intent, and succeeds once the blocker is resolved;
- Area archive allowed while active child Projects remain;
- archived Area labelling on those still-active Projects;
- unit tests proving Area policy ignores child-Project Tasks.

## D-04 — Per-record Task/Date deletion

Severity: **Low-Medium product gap**  
Status: **Explicitly out of C10 by approved Option A**

No per-record Task or Date delete button was added.

Reason:
- canonical sync is currently upsert-only;
- correct deletion requires tombstone/anti-resurrection protocol semantics;
- adding a button without reopening that data contract would create a misleading or unsafe local-first claim.

Task editing removes the main correction/rescheduling pain without silently expanding C10's synchronization model.

This remains a future protocol decision, not an unfinished C10 UI task.

## D-05 — Search remains inspection/navigation

Status: **Verified boundary**

Search does not edit records in place.

That remains coherent because canonical editing surfaces now exist for:
- Tasks via the shared Task editor;
- Dates via Dates;
- Projects via Project Detail;
- Areas via Area Detail.

## D-06 — Canon / Insights / other LifeOS modules remain honest disconnected boundaries

Status: **Verified boundary**

- Linked Knowledge remains intentionally empty until Canon integration exists.
- Insights remain absent when no provider exists.
- LifeOS module cards expose configured destinations without inventing module summaries.

## D-07 — Date editing already satisfies C10

Status: **Verified**

Dates already support editing:
- title;
- kind;
- context;
- date;
- start/end time;
- details.

No additional Date editor was added.

## Verification boundary

Source implementation and regression coverage are complete for the approved Phase D decisions.

Still pending:
- repository-wide typecheck/build on the current head;
- browser execution of the new Task/Area/archive E2E specs;
- refreshed visual capture including the Task editor and new archive-warning states;
- final human review of those rendered states.

Therefore Phase D is **implemented but not runtime-accepted**.


---

# Phase E — Cross-category consolidation, prioritization, and release decision

Status: **source consolidation complete; runtime/visual closure pending**

Phase E reconciles the complete A-D audit against the final candidate rather than introducing another product feature batch.

## E-01 — Active documentation still described obsolete IndexedDB v3 as the live boundary

Severity: **Medium assurance defect**  
Status: **Fixed**

Confirmed stale active claims existed in:
- README;
- SECURITY;
- REPO_MAP.

They described IndexedDB v3 as the current clean persistence boundary even though Phase A introduced the revision-aware IndexedDB v4 boundary.

Fix:
- active documentation now consistently describes v4 as the live boundary;
- historical v3 references remain only where they describe the actual earlier migration/provenance;
- the C10 structural audit now rejects reintroduction of live-v3 wording in active docs.

## E-02 — Current Phase D product semantics were missing from canonical specs

Severity: **Medium documentation/product-contract defect**  
Status: **Fixed**

Canonical active documents now explicitly include:
- shared post-creation Task editing;
- Area rename;
- Project archive blocked by Open Project Tasks;
- Area archive blocked only by direct Open Tasks;
- independent child-Project lifecycle under archived Areas;
- archived-parent Task reopen boundary;
- continued upsert-only/no-per-record-delete boundary.

Updated:
- README;
- DESIGN;
- BLUEPRINT;
- PROJECT_STATE;
- LOCAL_FIRST_CONTRACT;
- RUN_PROTOCOL;
- REPO_MAP;
- SECURITY.

## E-03 — Published changelog history could be mistaken for current product behavior

Severity: **Medium documentation ambiguity**  
Status: **Fixed without rewriting history**

The published `1.0.0` entry correctly records the September 14 release, including now-retired Subcontexts/Resources/Inbox/Archive/tombstone behavior.

Rather than rewriting that historical release:
- an `Unreleased — C10 candidate` section now records the current simplified product and C10 changes;
- published `1.0.0` history remains intact.

## E-04 — Repository unit tests existed but CI never executed them

Severity: **High assurance gap**  
Status: **Fixed**

`npm run test:unit` already covered library-level invariants, including the new archive-policy semantics, but CI did not run it.

CI now includes an explicit **Run unit tests** step before typecheck/build.

The C10 structural audit now requires that step, so unit coverage cannot silently become decorative.

## E-05 — CI contained a misleading duplicate WorkspaceGate reference

Severity: **Low-Medium assurance-path defect**  
Status: **Fixed**

The development lifecycle command explicitly named `workspace-gate.spec.ts`, but the default Playwright config ignores that file. The test is intentionally owned by the production Playwright configuration.

Fix:
- removed the misleading default-config duplicate reference;
- retained the real production-config execution path;
- added a structural guard proving production config owns WorkspaceGate and local-first characterization coverage.

## E-06 — Historical IndexedDB retirement provenance mixed C8 v3 and C10 v4

Severity: **Low provenance defect**  
Status: **Fixed**

The retirement map incorrectly labelled the old v2 test removal as a “C8 v4” boundary while its reason described v3.

Correct history is now explicit:
- C8 retired v2 through the v3 identity-preserving workspace/outbox reset;
- C10 later superseded active replacement coverage with v4 revision-aware tests.

## E-07 — Phase C preview-equivalence claim became false after Phase D UI changes

Severity: **High evidence-integrity defect**  
Status: **Fixed**

Phase C had correctly established visual equivalence between an earlier READY preview and the then-current source head. Phase D later changed rendered components, making that statement stale.

The audit now records:
- `ebb2d994...` as useful partial runtime evidence for an intermediate Phase D candidate;
- no available READY preview as equivalent to the final current head;
- final screenshot/runtime evidence as still pending.

## E-08 — C10 acceptance language still described an untouched C8-C9 candidate

Severity: **Medium acceptance-contract defect**  
Status: **Fixed**

C10 acceptance now identifies the candidate as:
- built on C8-C9;
- modified by approved A-E audit remediations;
- still open until final current-head verification and human visual review.

## E-09 — Evidence registry and file/path integrity

Status: **Verified at source level**

Confirmed:
- every artifact referenced by the current C10 registry exists;
- every package-script file target exists;
- no obsolete `local-db-v3` file remains;
- the only active v3 database open is deliberate fixture construction inside `local-db-v4.spec.ts` to prove the v4 clean-break migration;
- historical retirement replacements resolve to live current files.

## Final release decision

**Do not freeze or merge the C10 baseline yet.**

Source-level A-E audit work is consolidated. No additional product decision is currently blocking closure.

Remaining blockers are evidence execution, not known product-design ambiguity:
1. run the complete final-candidate CI ladder, including unit, typecheck/build, production/offline, lifecycle, accessibility/responsive, and development E2E;
2. run the new Task-editing / Area-editing / archive-policy regressions;
3. execute `npm run capture:c10:visual` on the final candidate;
4. manually inspect the resulting screenshots;
5. record the exact verified commit/run and only then mark pending C10 registry controls passed/freeze the baseline.

Current environment boundary:
- newest useful READY preview: `ebb2d994d225b5fa26221378e265144716c0ea28`, partial Phase D evidence only;
- final branch head: current-head Vercel status is build-rate-limit failure;
- GitHub Actions unavailable for the account;
- connector browser outbound navigation blocked.

Therefore Phase E is **source-complete but C10 remains open**.
