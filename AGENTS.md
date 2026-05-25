# ContextOS Repo Guide

## Repo Type
This repository is the early foundation for ContextOS, a planned Next.js App Router + TypeScript + PostgreSQL web app.

Primary evidence:
- `BLUEPRINT.md` defines the product, architecture, data model, API surface, and sprint order.
- No app scaffold exists yet; implementation should begin with Sprint 0.

## Primary Source Of Truth
- `BLUEPRINT.md` for product scope, architecture, MVP boundaries, and sprint acceptance criteria
- `DEV_STATE.md` for the current implementation state and active batch
- `DEV_LOG.md` for chronological development history
- `QA_REPORT.md` for verification results and known test gaps
- `RISK_REGISTER.md` for active implementation risks
- `docs/PROJECT_STATE.md` for the current repo snapshot
- `docs/REPO_MAP.md` for structure and entrypoints

## Operating Rules
- Prefer minimal, local diffs over broad refactors.
- Preserve the current repo shape unless the task explicitly requires restructuring.
- Read the local docs pack before substantial work.
- Treat manifests, entrypoints, and schema files as stronger sources of truth than scratch notes.
- Do not add dependencies, rename major paths, or rewrite runtime wiring without a clear need.
- Follow `BLUEPRINT.md` sprint order unless the user explicitly redirects.
- Keep agent-facing context durable: update the dev-loop docs after meaningful changes.
- Keep private/interpersonal access protections explicit when auth, schema, API, or export code changes.

## Required Local Docs
- `BLUEPRINT.md`
- `DEV_STATE.md`
- `DEV_LOG.md`
- `QA_REPORT.md`
- `RISK_REGISTER.md`
- `docs/PROJECT_STATE.md`
- `docs/REPO_MAP.md`

## Verification Rules
- Do not claim completion without verification.
- Start with the least expensive valid check for the change:
  - static inspection
  - existing lint or test commands
  - targeted runtime or manual checks
- Use `docs/RUN_PROTOCOL.md` as the verification ladder when it exists.
- Before the app scaffold exists, verification is limited to repository inspection and document consistency.
- After the app scaffold exists, prefer `npm run lint`, `npm run typecheck`, `npm test`, and build/migration checks when those scripts are present.
- If full runtime validation was not run, explicitly say what was not run, why, and what remains unverified.

## Documentation Sync Rules
- `DEV_STATE.md` when the active batch, implementation status, blockers, or next actions change
- `DEV_LOG.md` after each meaningful implementation batch
- `QA_REPORT.md` when checks are run or verification gaps change
- `RISK_REGISTER.md` when implementation risks are added, mitigated, or closed
- `docs/PROJECT_STATE.md` when repo status, blockers, or validation state changes
- `docs/REPO_MAP.md` when structure or entrypoints change materially

## Done Means
1. changed files are identified
2. commands run are listed
3. outputs or docs created or updated are named
4. verification performed is stated clearly
5. remaining risks or assumptions are stated clearly
