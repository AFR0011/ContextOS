# ContextOS Project State

## Current Objective
Run the v0.1.x PARA foundation trial with Dashboard Canvas, subcontexts, Areas, and Resources.

## Current Architecture
- Next.js App Router under `src/app`.
- Prisma 7 + PostgreSQL for server persistence.
- Local email/password auth with hashed passwords and HTTP-only sessions.
- IndexedDB stores cached workspace data and an outbox of idempotent sync mutations.
- Service worker caches the app shell and visited static assets/routes for offline loading.

## Implemented Surfaces
- Auth: login, register, logout, current user endpoint.
- Data APIs: bootstrap, sync, reset demo data.
- Core routes: Dashboard, Inbox, Today, This Week, Projects, Project Detail, Areas, Resources, Deadlines, Reviews, Search, Archive, Settings.
- PARA foundation: Domains act as Areas, standalone Notes act as Resources, and Projects can be nested with `parentProjectId`.
- Demo seed: default domains, nested ContextOS Demo subcontexts, dashboard canvas resource, projects, tasks, captures, deadlines, notes, review, daily and weekly priorities.

## Known Boundaries
- Offline support covers cached core views and queued CRUD-style mutations, not full collaborative conflict resolution or merge UI.
- Conflict policy is server-canonical, last-write-wins by `updatedAt`, with visible stale-mutation warnings when older offline changes are skipped.
- Project hierarchy is intentionally lightweight: `parentProjectId` is nullable and user-scoped in app logic, without a strict database foreign key in v0.1.x.
- Resources are markdown notes, not rich Notion-style databases; formula-heavy resources, routines, rotations, and spaced repetition are deferred.
- Email verification, password reset, OAuth, semantic search, calendar integration, and external AI suggestions are deferred.
- PWA icons are not yet added; manifest and service worker are functional placeholders.
- Production credential rotation is partly external: any previously shared Neon/Postgres credential must be rotated in the provider, then copied into deployment environment variables.

## Latest Verified State
- v0.1.9 dashboard deadlines and recovery-note changes are implemented locally.
- Dashboard Dates can create project-linked deadlines with optional local time and location; dashboard tasks can optionally select a project.
- Deadlines now store optional `time` and `location` fields and expose them across creation/edit surfaces.
- Projects now show top-level root projects first with expandable subcontexts.
- Expanded Areas can create root projects and soft-delete projects into Archive/Trash.
- Dashboard shows dismissible in-app review prompts for due daily/weekly reviews.
- Project recovery pages now keep fixed fields structured while adding freeform markdown `recoveryNotes`.
- Verification on 2026-06-04: `npx prisma generate`, `npm run db:migrate`, `npm run db:seed`, `npm run typecheck`, `npm run build`, and `npm run test:e2e` passed; e2e now has 19 passing tests.
- DESIGN.md visual design-system alignment is implemented locally as a visual-only pass.
- Shared ContextOS tokens now define app backgrounds, text, borders, primary accent, status colors, focus rings, radii, shadows, and light/dark aliases.
- Auth, shell/navigation, Dashboard, Inbox, Today, This Week, Projects, Project Detail, Deadlines, Reviews, Search, Archive, Settings, markdown editor surfaces, cards, rows, badges, buttons, inputs, and empty states now use the calmer operational styling direction from `DESIGN.md`.
- No functionality, data flow, database schema, Prisma model, API contract, auth/session behavior, offline sync semantics, route behavior, or business logic was intentionally changed in the design pass.
- Verification on 2026-06-04: `npx prisma generate`, `npm run db:migrate`, `npm run db:seed`, `npm run typecheck`, `npm run build`, and `npm run test:e2e` passed; e2e now has 18 passing tests.
- Browser/mobile visual smoke on 2026-06-04: desktop Dashboard/Today/Projects/Search/Settings navigation passed, mobile 390x844 Dashboard plus drawer navigation to Today passed with 0px horizontal overflow; screenshots saved to `test-results/contextos-design-desktop.png` and `test-results/contextos-design-mobile.png`.
- v0.1.7 workspace markdown canvas changes are implemented locally.
- Dashboard quick capture is now integrated into the Dashboard Canvas markdown editor; slash captures such as `/task`, `/note`, `/project`, `/deadline`, and `/status` still enter the existing capture/inbox flow.
- The shared markdown editor renders editable headings, subheadings, bullets, checkboxes, quotes, and code fences while preserving markdown storage.
- Dashboard and Today keep completed scheduled tasks visible as crossed-off, interactable rows.
- Areas can be opened in place to reveal project and subcontext trees.
- Project detail pages now use one recovery markdown editor for current objective, next action, latest status, and open loops.
- Workspace dark mode is available from the shell and persists locally.
- Verification on 2026-06-04: `npm run typecheck`, `npm run build`, and `npm run test:e2e` passed; e2e now has 16 passing tests. Manual visual smoke captured the dark dashboard at `test-results/dashboard-dark-smoke.png`.
- v0.1.x PARA foundation is implemented locally.
- `BLUEPRINT.md` now defines ContextOS as an execution-first PARA system: Projects/subcontexts, Areas, Resources, Archives, Dashboard Canvas, and deferred personal-system engines.
- Project schema now includes nullable `parentProjectId`; sync, serialization, local IndexedDB/outbox mutation payloads, and seed data carry it.
- Projects page now shows root projects with subcontext previews and rollup counts.
- Project detail pages now show subcontexts and roll up descendant tasks/deadlines with child labels.
- Dashboard now has a persisted markdown Dashboard Canvas backed by a standalone Resource note.
- Sidebar now groups navigation into Execution, PARA, and Review sections, with new Areas and Resources routes.
- Verification on 2026-06-04: `npm run db:migrate`, `npm run db:seed`, `npm run typecheck`, `npm run build`, and `npm run test:e2e` all passed; e2e now has 14 passing tests.
- Browser smoke on 2026-06-04: demo login reached Dashboard, and Dashboard Canvas, Projects/subcontexts, Areas, and Resources rendered at `http://localhost:3000`.
- v0.1.5 trial preparation is implemented locally, but the real usage trial is not complete.
- `docs/FRICTION_LOG.md` now provides the trial rules, acceptance tracker, checkpoint table, friction entry template, ranked friction list, and closeout fields.
- `docs/RUN_PROTOCOL.md` now includes the v0.1.5 trial procedure and clarifies local-dev offline reload verification boundaries.
- Trial-readiness verification on 2026-06-03: `npm run typecheck`, `npm run build`, `npm run test:e2e`, and a login-to-Dashboard browser smoke all passed.
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
- Use the v0.1.x PARA foundation for one real workday and record friction in `docs/FRICTION_LOG.md`.
- During the trial, pay special attention to whether the markdown canvas reduces context-switching and whether slash capture inside the editor feels faster than the old separate capture field.
- Pay special attention to whether subcontexts solve course/assistantship nesting and whether Dashboard Canvas reduces Notion dashboard use.
- After the trial, sort friction into bug, UX friction, missing feature, and user discipline problem, then fix only obvious small bugs before v0.2.0 planning.
