# Stage 8.2 Preview Target Record

## Vercel project

- Team: `Ali Farrokhnejad's projects` (`team_UTzwmT69DAxIBkP2XMiZtTWf`)
- Project: `context-os` (`prj_9Cs4hnVbT5D5YgkhtsRiIo1GJxVv`)
- Repository observed in deployment metadata: `AFR0011/ContextOS`
- Stage 8 branch: `feat/local-first-completion-stage8`
- Stable branch alias observed: `context-os-git-feat-local-fir-97ad48-ali-farrokhnejads-projects.vercel.app`

## Read-only hosted evidence

A READY preview deployment for Stage 8 was observed at deployment `dpl_7JXzcNwq7rNrfHjddxPNgQ1PzG5z`, commit `bcefda007d51e1c0c7e30b05ecd05dc7de0e1db4`.

A read-only request to `/api/health` on that deployment returned HTTP 200 with:

- `status: ok`
- `service: contextos`
- `database: ok`
- `version: 0.2.8`
- `Cache-Control: no-store`
- production CSP, HSTS, frame, content-type, referrer, permissions, opener/resource-policy headers present

This proves that the hosted preview can boot and reach a PostgreSQL database. It does **not** prove that Preview is using a database isolated from Production.

## Mutation boundary

No Stage 8.2 mutating smoke has been run against the hosted preview yet.

Before mutating tests are allowed, the Stage 8 branch must use a dedicated non-production Neon target and the test runner must pass `scripts/stage8-hosted-preview-guard.mjs` with:

- `HOSTED_PREVIEW_DATABASE_ROLE=dedicated-preview`
- `HOSTED_PREVIEW_EXPECTED_REF=feat/local-first-completion-stage8`
- `HOSTED_PREVIEW_ACK=stage8-preview-only`

Known production aliases are rejected by the guard.

## Remaining setup

A dedicated Neon preview/staging target does not currently exist. The connected tooling can inspect Vercel deployments but cannot provision Neon resources or change Vercel environment variables, so creation and binding of that non-production database requires explicit provider-side setup before Stage 8.2 can continue with mutating tests.
