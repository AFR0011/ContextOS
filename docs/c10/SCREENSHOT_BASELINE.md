# ContextOS C10 Screenshot Baseline

Date: 2026-09-23  
Program: C10 definitive product acceptance  
Status: **captured and human-reviewed against C10 candidate `bfd60db891aa54b96480bbca9e2f89f0dd2f3962` on 2026-09-24.**

## Purpose

The screenshot baseline exists to catch visual regressions that source-level assertions are bad at detecting: clipping, overlap, awkward wrapping, hidden actions, accidental card stacking, mobile-nav collisions, dark-theme leakage, and controls that technically exist but look broken.

This document defines the minimum canonical visual set. Screenshots themselves must come from a real rendered browser. Source inspection, DOM assertions, or generated mockups do not count as screenshot evidence.

## Capture rules

Use the demo seed after a clean reset unless the scenario explicitly creates hostile content.

Capture:
- desktop at 1440x1000;
- compact desktop at 1024x768, the breakpoint where the permanent sidebar first appears;
- mobile at 390x844;
- narrow stress at 320x720 where specified;
- light and dark for every primary surface;
- no browser zoom;
- no open developer tools affecting viewport;
- stable demo data;
- no unrelated browser chrome inside the image when practical.

Do not capture:
- retired Inbox/Resources/Reviews/Archive UI;
- fabricated module summaries;
- temporary debug state;
- personally identifying real data.

## Executable capture harness

The repository now includes an explicit browser-capture matrix:

- `tests/e2e/c10-visual-baseline.spec.ts`
- `scripts/capture-c10-visual.mjs`
- `npm run capture:c10:visual`

The capture runner is intentionally separate from the normal E2E ladder. Visual specs are skipped unless `CAPTURE_C10_VISUAL=1`, and the npm command sets that flag cross-platform. The runner now fails fast on `npm run build`, runs production offline/pending/reconnect capture immediately against that build through `playwright.production.config.ts`, then runs standard/hostile/clean-account captures through the normal dev-browser config. Production runs first so `next dev` cannot mutate `.next` before `next start` uses it.

Current automated capture coverage:
- 1440x1000 desktop light/dark;
- 1024x768 compact desktop light/dark;
- 390x844 mobile light/dark;
- Home;
- Projects;
- Project Detail;
- Areas;
- Area Detail;
- Dates;
- Search with a selected result;
- LifeOS;
- Settings;
- Dates creation panel;
- command palette;
- New Task sheet;
- New Date sheet;
- long Settings import filename;
- mobile navigation drawer;
- logout dialog;
- 320x720 hostile long Area/Project/Date/Search/import content in light/dark;
- clean first-run, empty Home, empty Projects, and empty Dates in desktop/mobile light/dark;
- production-runtime online-ready, offline, offline-with-pending, reconnecting, and post-sync states in mobile light/dark.

Every capture first asserts that the rendered document has no horizontal page overflow. Screenshots are attached to the Playwright report and written into the test output directory for human review.

CI artifact handling:
- production-runtime images are written under `test-results/c10-production`;
- standard/hostile/empty-account images are written under `test-results/c10-standard`;
- the GitHub Actions workflow is configured to run `npm run capture:c10:visual` on pushes to `c10-product-acceptance` after the ordinary browser suites;
- the workflow is configured to upload both PNG trees as `c10-visual-audit-<commit>` with 14-day retention;
- artifact upload still runs when the visual-capture step itself fails, preserving any images created before the failure;
- GitHub Actions is currently unavailable for this account, so this configuration has not yet produced a current-head artifact run.

## Final real-browser evidence — 2026-09-24

The canonical C10 visual matrix was executed locally from candidate commit `bfd60db891aa54b96480bbca9e2f89f0dd2f3962` using:

```bash
npm run capture:c10:visual
```

Final canonical result trees:
- `test-results/c10-standard`: 276 PNG captures;
- `test-results/c10-production`: 20 PNG captures;
- both Playwright `.last-run.json` markers reported `status: passed` with no failed tests.

The final capture includes all visual remediations discovered during the C10 audit:
- mobile Home no longer inherits the desktop Dayline balancing height;
- archive blockers remain quiet until user intent and then render contextually;
- disconnected LifeOS modules use status pills rather than pseudo-actions;
- compact mobile sync distinguishes plain `Offline` from `Offline · N pending`;
- mobile drawer identity remains unclipped at 390x844 and 320x720.

Human review covered:
- 1440x1000 desktop light/dark;
- 1024x768 compact desktop light/dark;
- 390x844 mobile light/dark;
- 320x720 hostile-content stress light/dark;
- first-run and empty states;
- command palette, Task/Date sheets, logout, archive-warning and long-import transients;
- production online-ready, offline, offline-with-pending, reconnecting, and reconnected states.

No unresolved clipping, overlap, horizontal overflow, fixed-navigation collision, theme leakage, misleading action/state affordance, or other product-level visual defect was found in the final candidate.

Some full-page Playwright screenshots repeat fixed headers or bottom navigation after scrolling. Viewport captures and shell padding confirm those are screenshot-compositing artifacts rather than runtime overlap.

The Vercel/GitHub Actions limitations remain relevant only to hosted CI provenance: Vercel was build-rate-limited and GitHub Actions was unavailable for the account. They no longer block C10 visual acceptance because the final candidate was exercised by the repository's real-browser capture harness locally.

Clean-account capture reuses one fresh account across desktop/mobile and light/dark empty-state variants rather than registering four accounts. Because automated account deletion is intentionally not embedded into the capture harness, one disposable `c10-visual-clean-*` account remains after a complete capture run and may be removed later through the normal account-lifecycle/operator path.

## Baseline set

### 01 Home

Desktop light + dark:
- Today Dayline;
- Daily Notes;
- In Context Today;
- Upcoming;
- sync state visible in ordinary healthy mode.

Mobile light + dark:
- four-item bottom navigation;
- Today;
- Daily Notes;
- In Context Today;
- Upcoming;
- no content hidden behind bottom navigation.

Stress:
- one long Task title;
- one long Project context label;
- Daily Note with several paragraphs;
- verify no horizontal page overflow.

### 02 Projects

Desktop light + dark:
- Active group;
- Archived group;
- Area pills;
- objectives;
- Archive/Restore actions.

Mobile light + dark:
- Project rows remain readable;
- lifecycle controls remain reachable;
- long Project/Area names wrap without covering controls.

### 03 Project Detail

Desktop light + dark:
- Project metadata;
- objective;
- open Tasks;
- completed-task toggle when applicable;
- Dates;
- Linked Knowledge empty boundary.

Mobile light + dark:
- metadata controls stack cleanly;
- Task creation row stacks without clipping;
- Date creation controls remain usable;
- Archive/Restore remains visible.

### 04 Areas

Desktop + mobile, light + dark:
- Active and Archived groups;
- counts;
- lifecycle actions;
- Area rename field on Area Detail;
- archive-blocked state after creating a direct Open Task;
- long Area-name stress case.

Verify archive blocking is visibly explained rather than represented only by a disabled control.

### 05 Area Detail

Desktop + mobile, light + dark:
- Active Projects;
- direct Tasks;
- direct Dates;
- Archived Projects;
- long Project title and objective stress.

### 06 Dates

Desktop + mobile, light + dark:
- All/Events/Deadlines filters;
- Today/Upcoming/Past grouping;
- Event with start/end;
- Deadline;
- Add Date form open;
- long Date-title stress at 320px.

### 07 Search

Desktop + mobile, light + dark:
- result list plus selected detail;
- Project result;
- completed Task result;
- Daily Note result;
- long-result stress;
- contextual action remains visible.

### 08 Command palette and Task editor

Desktop + mobile, light + dark:
- palette open with navigation/search results;
- long result label;
- New Task sheet;
- New Date sheet;
- shared Edit Task sheet opened from canonical Task rows;
- selected option visibly highlighted.

Verify the Edit Task sheet exposes title, context, planned day, and scheduled time without duplicating Open/Done state.

### 09 LifeOS

Desktop + mobile, light + dark:
- all four module cards;
- unconnected state;
- configured destination state if a safe test destination is available;
- no invented summary data.

### 10 Settings

Desktop + mobile, light + dark:
- Account;
- Appearance;
- Offline & Sync;
- Data;
- Security;
- Advanced;
- long import filename stress;
- destructive account-delete entry remains visually distinct.

### 11 Mobile shell drawer

390x844 and 320x720, light + dark:
- drawer open;
- close;
- theme control;
- sync state;
- refresh;
- logout;
- primary/secondary navigation;
- no overlap with viewport edge or bottom navigation.

### 12 Offline / pending state

Production runtime only:
- Offline indicator;
- one queued local mutation;
- warning/pending state;
- reconnect/syncing state if deterministically capturable.

The visual must not suggest successful synchronization while offline.

### 13 Logout dialog

Desktop + mobile, light + dark:
- no pending mutations;
- pending-mutation choices;
- buttons fit without wrapping into unusable layouts;
- destructive/local-removal options remain clearly distinguishable.

### 14 Empty states

At least one clean real-account/empty-workspace capture:
- first Area requirement;
- empty Project/Date state as applicable;
- no demo content leaking into real-account baseline.

## Visual acceptance questions

For every baseline image, inspect:

1. Is any text clipped, ellipsized where identity matters, or visually overlapping?
2. Is there any horizontal page scroll at the target viewport?
3. Are primary and secondary actions visually distinguishable?
4. Are touch targets visually compact but spatially reachable?
5. Does dark mode contain any obviously hard-coded light surface/text?
6. Do empty states look intentional rather than broken?
7. Does mobile navigation cover content or forms?
8. Do long labels force buttons off-screen?
9. Do dialogs/sheets remain within the visible viewport?
10. Does the information hierarchy match the canonical design rather than old card-heavy layouts?
11. Is any technical implementation language exposed unnecessarily?
12. Is any retired product concept visible?
13. Are offline/sync states truthful and understandable?
14. Are module/Insight surfaces honest when providers are absent?

## Evidence rule

C10 screenshot acceptance is satisfied for candidate commit `bfd60db891aa54b96480bbca9e2f89f0dd2f3962` by the passing real-browser matrix and human review recorded above.

A future automated visual-regression suite may use this set as its initial golden baseline. Any later rendered product change must produce new evidence rather than inheriting this acceptance by implication.
