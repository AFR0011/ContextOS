# ContextOS Version Log

## v0.1.4 Sprint 4 - Offline Sync Visibility + Conflict Warnings

Goal:
Make offline sync state visible and trustworthy: pending work, retry, refresh, errors, and stale overwrite warnings should be obvious to the user.

Changed files:
- `src/lib/types.ts`
- `src/lib/sync-server.ts`
- `src/app/api/sync/route.ts`
- `src/lib/client-store.tsx`
- `src/components/workspace/WorkspaceShell.tsx`
- `src/components/workspace/Views.tsx`
- `tests/e2e/contextos.spec.ts`
- `docs/PROJECT_STATE.md`
- `docs/VERSION_LOG.md`

Schema changes:
None.

Manual/e2e behavior covered:
- Settings shows sync status, pending count, last sync, last refresh, stale warning count, retry sync, and refresh-from-server controls.
- The global shell shows online/offline, syncing, pending, error, and stale-warning state.
- Draft-save fields show an offline queue warning while editing offline.
- The sync API returns stale warnings for older offline mutations while acknowledging them so the outbox can clear.
- Offline capture data is verified durable in IndexedDB across a browser reload, then visible and synced after reconnect.

Verification:
- `npm run typecheck` - passed.
- `npm run build` - passed.
- `npm run db:migrate` - passed earlier in the sprint against local Postgres; no schema changes.
- `npm run db:seed` - passed against local Postgres.
- `npm run test:e2e` - passed, 11 tests.
- `git diff --check` - passed with CRLF warnings only.

Known issues:
- Stale conflict handling is warning-only; there is no merge/diff UI yet.
- In the dev server e2e environment, offline route reloads prove durable cache state directly before reconnecting; production offline hydration still depends on the app shell and chunks being cached by the service worker.

Next sprint recommendation:
Sprint 5 - real usage trial and friction audit.

## v0.1.3 Sprint 3 - Mutation Hygiene + Draft-Save Behavior

Goal:
Stop high-churn text fields from creating sync mutations on every keystroke, while keeping offline edits recoverable and easy to understand.

Changed files:
- `src/components/workspace/Views.tsx`
- `tests/e2e/contextos.spec.ts`
- `docs/PROJECT_STATE.md`
- `docs/VERSION_LOG.md`

Schema changes:
None.

Manual test result:
- Ran a focused local browser smoke against `http://localhost:3000`.
- Went offline on a project detail page.
- Edited Latest Status with a 30+ character draft.
- Confirmed unsaved state appeared.
- Saved the draft and confirmed pending count became `1`, not one mutation per typed character.
- Went online, synced, and confirmed pending count returned to `0`.

Verification:
- `npm run typecheck` - passed.
- `npm run build` - passed.
- `npm run db:migrate` - passed against local Postgres; no schema changes.
- `npm run db:seed` - passed against local Postgres.
- `npm run test:e2e` - passed, 9 tests.

Known issues:
- Draft fields save on blur as well as explicit Save. This protects against accidental navigation, but a future richer editor may want clearer cancel/discard behavior.
- Date inputs and select controls still sync immediately because each change is a discrete intentional edit.

Next sprint recommendation:
Sprint 4 - offline sync visibility and conflict warnings.

## v0.1.2 Sprint 2 - Local Date + Time Correctness

Goal:
Fix date handling so Today, This Week, priorities, task planned/due dates, and deadlines use the user's local calendar day instead of UTC slicing.

Changed files:
- `src/lib/dates.ts`
- `src/lib/client-store.tsx`
- `src/lib/data.ts`
- `src/lib/sync-server.ts`
- `src/lib/starter.ts`
- `src/components/workspace/Views.tsx`
- `tests/e2e/contextos.spec.ts`
- `docs/PROJECT_STATE.md`
- `docs/VERSION_LOG.md`

Schema changes:
None.

Manual test result:
- Opened the local app in the in-app browser at `http://localhost:3000`.
- Logged in with the seeded local demo account.
- Confirmed Today rendered.
- Confirmed Deadlines hydrated date inputs as `YYYY-MM-DD` values after workspace data loaded.

Verification:
- `npm run typecheck` - passed.
- `npm run build` - passed.
- `npm run db:migrate` - passed against local Postgres; no schema changes.
- `npm run db:seed` - passed against local Postgres.
- `npm run test:e2e` - passed, 7 tests.

Known issues:
- Existing records previously stored as local-midnight `DateTime` values may need a one-off correction if they were created before this fix and display one day off. Fresh seed/sync writes now use canonical UTC-midnight date-only values.

Next sprint recommendation:
Sprint 3 - mutation hygiene and intentional draft-save behavior.

## v0.1.1 Sprint 1 - Security + Deploy Hygiene

Goal:
Remove obvious security and deployment footguns before sharing or deploying the project.

Changed files:
- `.gitignore`
- `.env.example`
- `ContextOS v0.1.zip`
- `README.md`
- `docs/DEPLOYMENT.md`
- `docs/RUN_PROTOCOL.md`
- `docs/PROJECT_STATE.md`
- `prisma/seed.ts`
- `src/app/api/reset-demo/route.ts`
- `src/components/AuthForm.tsx`
- `tests/e2e/contextos.spec.ts`
- `vercel.json`

Local-only updates:
- Ignored `.env` was reset to localhost Postgres defaults, given a fresh `AUTH_SECRET`, and updated to the new demo seed password.

Schema changes:
None.

Manual test result:
- Confirmed `ContextOS v0.1.zip` no longer contains `.env`.
- Confirmed `vercel.json` does not run `npm run db:seed`.
- Confirmed non-ignored source only contains local/example credentials and the public demo seed password.
- Confirmed local `.env` now targets localhost before destructive seed/reset verification.

Verification:
- `npm run typecheck` - passed.
- `npm run build` - passed.
- `npm run db:migrate` - passed against local Postgres.
- `npm run db:seed` - passed against local Postgres.
- `npm run test:e2e` - passed, 5 tests.

Known issues:
- External Neon/Postgres credential rotation cannot be completed from this repo alone. Rotate it in the provider and update deployment environment variables.
- Git history contains previous `.env.example` commits, but `.env` itself was not tracked in the checked history.

Next sprint recommendation:
Sprint 2 - local date and timezone correctness.
