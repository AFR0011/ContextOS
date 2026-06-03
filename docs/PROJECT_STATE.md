# ContextOS Project State

## Current Objective
Create a fully usable demo of ContextOS as a Next.js + PostgreSQL app with real local auth, seeded demo data, and offline core-view sync.

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
- Offline support covers cached core views and queued CRUD-style mutations, not full collaborative conflict resolution.
- Conflict policy is server-canonical, last-write-wins by `updatedAt`.
- Email verification, password reset, OAuth, semantic search, calendar integration, and external AI suggestions are deferred.
- PWA icons are not yet added; manifest and service worker are functional placeholders.

## Next Useful Work
- Run the app for one real workday and tighten any friction in capture, triage, and project recovery.
- Add richer markdown editing if the simple editor becomes limiting.
- Improve sync conflict visibility if real use shows stale overwrite risk.
