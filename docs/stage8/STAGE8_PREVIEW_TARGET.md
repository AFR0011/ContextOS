# Stage 8.2 Preview Target Record

## Vercel project

- Team: `Ali Farrokhnejad's projects` (`team_UTzwmT69DAxIBkP2XMiZtTWf`)
- Project: `context-os` (`prj_9Cs4hnVbT5D5YgkhtsRiIo1GJxVv`)
- Repository observed in deployment metadata: `AFR0011/ContextOS`
- Stage 8 branch: `feat/local-first-completion-stage8`
- Stable branch alias observed: `context-os-git-feat-local-fir-97ad48-ali-farrokhnejads-projects.vercel.app`

## Verified candidate deployment

The Stage 8 preview deployment `dpl_2kjDgzfWQTL29tCHDscYwS8czEug` is READY and runs commit `35b9c0a6698c711b6f71cf6a9b4b3d1fc07de7e4` (`feat: log Stage 8 preview Neon branch identity internally`).

A request to `/api/health` on that deployment returned HTTP 200 with:

- `status: ok`
- `service: contextos`
- `database: ok`
- `version: 0.2.8`
- `Cache-Control: no-store`
- CSP, HSTS, frame, content-type, referrer, permissions, opener/resource-policy headers present
- `x-robots-tag: noindex`

The public health payload does not expose provider or credential details.

## Dedicated preview database

- Neon project: `ContextOS SocialOS` (`purple-mud-49896812`)
- Production branch: `production` (`br-weathered-wildflower-agz8u649`)
- Dedicated Stage 8 branch: `contextos-stage8-preview` (`br-steep-heart-agxfhkxb`)
- Parent: production branch

The Vercel Preview environment was configured manually with a Preview-only `DATABASE_URL` for `contextos-stage8-preview`; the Production value was left unchanged.

To prove the running deployment uses the intended database rather than relying on dashboard configuration alone, the Stage 8 candidate logs Neon `neon.branch_id` only for Vercel Preview health requests. The runtime log for deployment `dpl_2kjDgzfWQTL29tCHDscYwS8czEug` recorded:

`[stage8-preview-db] branch=br-steep-heart-agxfhkxb`

This exactly matches the dedicated Neon preview branch. The branch identifier is not returned to clients.

## Preview-only hosted fixture

A minimal Stage 8 test identity and workspace fixture was created in a single transaction on `br-steep-heart-agxfhkxb` for hosted smoke testing. The fixture contains one domain, one project, one task, one dashboard scratchpad, and one dashboard-preference record. Its credential is stored outside the repository.

A separate read against the Neon production branch verified that the Stage 8 test identity does not exist there. Hosted mutation testing is therefore permitted against the preview deployment without using the production database.

## Hosted-browser boundary

Vercel Deployment Protection remains enabled. The available repository connector refuses to write hosted-browser automation/configuration, including provider-neutral Playwright configuration, so Stage 8.2 browser behavior must currently be recorded as a manual hosted smoke or added from a normal developer checkout. This limitation does not weaken preview protection and does not change the Stage 8 acceptance criteria.

The remaining Stage 8.2 browser checks are login/session behavior, Dashboard, capture/Inbox, project navigation/recovery, Dates/Search, offline queued mutation, reconnect/sync drain, hard refresh, dynamic project route, mobile navigation, and final security/no-store verification.
