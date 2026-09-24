# C10 definitive product acceptance

Date: 2026-09-22  
Baseline: C9 merge commit `16dffb7ad52dbcb9f2a8fd3ffbf0128c1a896d1f`  
Branch: `c10-product-acceptance`

## Status

**Open.** C10 is the definitive post-redesign acceptance and baseline-freeze program for the current candidate built on the C8-C9 product. The candidate now also includes the remediations approved during the C10 A-E full-product audit.

This is distinct from the historical **Stage 10** program completed in August 2026. Historical Stage 9/10 evidence remains immutable provenance for the product boundary verified at that time. C10 does not rewrite those historical claims after the later C7/C8 clean break removed Inbox/Resources/Reviews/Archive and tombstone-era persistence.

## Acceptance workflow

C10 accepts the real user path:

```text
Open
-> understand the day
-> execute
-> note
-> open context
-> resume a Project
-> see upcoming temporal context
-> find history
-> enter a LifeOS module only when deeper context is needed
```

## Current work

Completed in source:
1. Realign the active assurance ladder with canonical persistence and lifecycle semantics.
2. Add one explicit end-to-end workflow acceptance test.
3. Refresh active documentation and terminology.
4. Establish an executable screenshot/baseline contract for the definitive UI.
5. Complete the sequential full-product audit:
   - Phase A — functional behavior and data integrity;
   - Phase B — interaction / keyboard / accessibility;
   - Phase C — responsive / layout / visual risk;
   - Phase D — product / feature gaps and workflow critique;
   - Phase E — consolidation / remediation.
6. Apply approved Phase D product changes: shared Task editing, Area rename, archive/open-work invariants, and the explicit no-per-record-delete boundary.

Still required for closure:
7. Run the complete current verification ladder on the final repository candidate.
8. Record exact full-ladder verification evidence and update the remaining pending controls.
9. Freeze the baseline only after the registry has no pending non-boundary evidence.

Completed visual evidence:
- the canonical real-browser screenshot matrix passed and was human-reviewed on candidate `bfd60db891aa54b96480bbca9e2f89f0dd2f3962`;
- `VISUAL-001` is accepted independently of the still-pending full runtime ladder.

## Historical assurance rule

Closed Stage 9 and historical Stage 10 registries are not rewritten to pretend they tested today's product. When an old implementation artifact was deliberately removed later, `audits/historical-artifact-retirements.json` records that retirement and points to the active canonical replacement coverage.

A missing historical artifact is acceptable to the repository validators only when:
- it is explicitly listed in that retirement map; and
- every listed current replacement artifact exists.

## Closure rule

C10 remains open while any `pending` entry exists in `audits/c10-product-acceptance.json`.

C10 closes only after:
- the canonical workflow acceptance passes;
- current production/offline, unit, lifecycle, accessibility, responsive, and development interaction matrices pass;
- all A-E audit remediations required for the accepted product are present;
- the active CI ladder references no removed legacy tests and executes the repository unit suite;
- active docs match the current C10 candidate rather than a retired historical model;
- the real-browser screenshot baseline has been captured and manually reviewed;
- the final baseline evidence records the exact verified commit/run;
- no unsupported maturity/security/recovery claim is introduced.
