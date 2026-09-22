# C10 definitive product acceptance

Date: 2026-09-22  
Baseline: C9 merge commit `16dffb7ad52dbcb9f2a8fd3ffbf0128c1a896d1f`  
Branch: `c10-product-acceptance`

## Status

**Open.** C10 is the post-redesign acceptance and baseline-freeze program for the canonical C8-C9 product.

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

1. Realign the active assurance ladder with canonical C8-C9 semantics.
2. Add one explicit end-to-end workflow acceptance test.
3. Refresh active documentation and terminology.
4. Establish screenshot/baseline documentation for the definitive UI.
5. Capture and review the canonical screenshot baseline defined in `docs/c10/SCREENSHOT_BASELINE.md`.
6. Run the complete current verification ladder.
7. Record exact verification evidence and freeze the baseline.

## Historical assurance rule

Closed Stage 9 and historical Stage 10 registries are not rewritten to pretend they tested today's product. When an old implementation artifact was deliberately removed later, `audits/historical-artifact-retirements.json` records that retirement and points to the active canonical replacement coverage.

A missing historical artifact is acceptable to the repository validators only when:
- it is explicitly listed in that retirement map; and
- every listed current replacement artifact exists.

## Closure rule

C10 remains open while any `pending` entry exists in `audits/c10-product-acceptance.json`.

C10 closes only after:
- the canonical workflow acceptance passes;
- current production/offline and development interaction matrices pass;
- the active CI ladder references no removed legacy tests;
- active docs match the canonical product;
- the real-browser screenshot baseline has been captured and manually reviewed;
- the final baseline evidence records the exact verified commit/run;
- no unsupported maturity/security/recovery claim is introduced.
