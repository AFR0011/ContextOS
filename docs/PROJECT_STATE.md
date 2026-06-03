# ContextOS Project State

## Current Objective
Harden the v0.1.0 demo into a safe v0.1.x base before daily-use feature work.

## Current Architecture
- Next.js App Router under `src/app`.
- Prisma 7 + PostgreSQL for server persistence.
- Local email/password auth with hashed passwords and HTTP-only sessions.
- IndexedDB stores cached workspace data and an outbox of idempotent sync mutations.
- Service worker caches the app shell and visited static assets/routes for offline loading.

## Implemented Surfaces
- Auth: login, register, logout, current user endpoint.
- Data APIs: bootstrap, sync, reset demo data.
- Core routes: Dashboard, Inbox, Today, This Week, Projects, Project Detail, Deadlines, Reviews, Search, Archive, Settings.
- Demo seed: default domains, projects, tasks, captures, deadlines, notes, review, daily and weekly priorities.

## Known Boundaries
- Offline support covers cached core views and queued CRUD-style mutations, not full collaborative conflict resolution or merge UI.
- Conflict policy is server-canonical, last-write-wins by `updatedAt`, with visible stale-mutation warnings when older offline changes are skipped.
- Email verification, password reset, OAuth, semantic search, calendar integration, and external AI suggestions are deferred.
- PWA icons are not yet added; manifest and service worker are functional placeholders.
- Production credential rotation is partly external: any previously shared Neon/Postgres credential must be rotated in the provider, then copied into deployment environment variables.

## Latest Verified State
- v0.1.4 offline sync visibility and conflict warnings are implemented locally.
- The global shell now shows online/offline, syncing, pending, error, and stale-warning sync state.
- Settings now exposes pending count, last successful sync, last server refresh, stale warning count, retry sync, and guarded refresh-from-server controls.
- Draft-save fields warn while editing offline so users know saves will queue locally.
- Sync API responses now include stale warnings while still acknowledging stale mutations so the outbox can clear.
- Offline persistence was tightened: workspace cache writes complete before outbox mutations are queued, IndexedDB helper connections close after transactions, and e2e verifies cached offline work survives a browser reload before syncing when online.
- v0.1.3 mutation hygiene and draft-save behavior is implemented locally.
- High-churn text edits now use local drafts and commit intentionally instead of creating one sync mutation per keystroke.
- Project recovery fields, domain names, note title/content, deadline title, and deadline notes use draft-save controls with unsaved/saved status.
- Offline draft-save behavior was verified: a 30+ character project field edit queued one mutation and synced back to zero pending changes.
- v0.1.2 local date/time correctness is implemented locally.
- Date-only UI keys now use local calendar dates instead of UTC slicing.
- Task/deadline date-only fields are parsed from `YYYY-MM-DD`, stored as canonical UTC-midnight dates, and serialized back to date keys without timezone shifts.
- Today and This Week priorities use shared local date/week helpers.
- `.env.example` is intended to be committed; real `.env` remains ignored.
- The local ignored `.env` was reset to localhost Postgres defaults with a fresh `AUTH_SECRET`.
- `ContextOS v0.1.zip` was sanitized to remove `.env`.
- Vercel build no longer runs `npm run db:seed`.
- `/api/reset-demo` is disabled in production unless `ALLOW_DEMO_RESET=true` is explicitly set.
- Verification on 2026-06-03: `npm run typecheck`, `npm run build`, `npm run db:migrate`, `npm run db:seed`, and `npm run test:e2e` all passed against local Postgres.
- v0.1.4 verification on 2026-06-03: `npm run typecheck`, `npm run build`, `npm run db:seed`, and `npm run test:e2e` all passed against local Postgres; `npm run db:migrate` was already in sync with no schema changes.
- Manual browser smoke on 2026-06-03: local app opened at `http://localhost:3000`; Today rendered; Deadlines rendered hydrated `YYYY-MM-DD` date inputs.
- Manual draft-save smoke on 2026-06-03: local browser edit of Latest Status while offline showed unsaved state, queued one pending mutation after save, then synced back to zero.

## Next Useful Work
- Sprint 5 from `CONTEXTOS_VERSION_PLAN.md`: real usage trial and friction audit.
- Run the one-day usage trial after the v0.1.x hardening sprints.
