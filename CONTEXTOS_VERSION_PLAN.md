# ContextOS Version Plan Blueprint

**Project:** ContextOS  
**Current base:** v0.1.0  
**Planning style:** 24-48 hour implementation sprints  
**Primary goal:** turn the existing demo into a daily-use personal context recovery system before adding heavier intelligence or automation.

---

## 0. Product North Star

ContextOS should help the user do four things fast:

1. **Capture** loose thoughts, tasks, notes, deadlines, and statuses without breaking focus.
2. **Triage** captured material into real records instead of letting it rot in an inbox.
3. **Recover project context** after time away: objective, next action, latest status, blockers, decisions, notes.
4. **Choose today’s work** from projects, deadlines, overdue tasks, and priorities.

Anything that does not improve one of those four is secondary.

---

## 1. Current v0.1.0 Snapshot

### Already implemented

- Next.js App Router project.
- Prisma + PostgreSQL persistence.
- Local email/password auth.
- HTTP-only session handling.
- Seeded demo account.
- Core workspace data model:
  - domains
  - projects
  - tasks
  - captures
  - notes
  - deadlines
  - reviews
  - priorities
  - sync mutations
- Offline IndexedDB cache.
- Outbox-based offline mutation queue.
- Service worker app-shell caching.
- Core routes:
  - Dashboard
  - Inbox
  - Today
  - This Week
  - Projects
  - Project Detail
  - Deadlines
  - Reviews
  - Search
  - Archive
  - Settings
- Basic E2E tests.
- Existing docs:
  - `BLUEPRINT.md`
  - `docs/PROJECT_STATE.md`
  - `docs/REPO_MAP.md`
  - `docs/RUN_PROTOCOL.md`

### Critical issues to fix before serious use

- `.env` was included in the zip. Treat exposed credentials as leaked.
- Vercel build command appears to run seeding during deployment. That should be removed.
- Current local date key uses UTC slicing and can be wrong near midnight in non-UTC zones.
- Some editing paths appear too eager, especially domain name edits and note/project text edits.
- Task editing is too shallow for daily use.
- Project status overwrites history instead of preserving a timeline.

---

## 2. Version Gates

Each version must pass a concrete usage gate before the next one starts.

| Version | Theme | Gate |
|---|---|---|
| v0.1.x | Hardening the base | App can run, sync, deploy safely, and survive basic offline use. |
| v0.2.x | Daily execution | User can run one full week using only ContextOS for capture, daily tasks, project status, and review. |
| v0.3.x | Context recovery | User can return to any active project after 3+ days and resume in under 2 minutes. |
| v0.4.x | Read-only intelligence | App can suggest cleanup/recovery actions without directly editing user data. |
| v0.5.x | Production-quality personal system | App has robust backup/export/import, stronger testing, deployment hygiene, and data ownership controls. |
| v1.0 | Stable personal operating system | Safe enough for daily long-term use without constant developer babysitting. |

---

## 3. Sprint Rules

Each sprint is 24-48 hours.

### Sprint definition of done

Every sprint must end with:

```bash
npm run typecheck
npm run build
npm run test:e2e
```

And a manual smoke test relevant to that sprint.

### Sprint output format

Each sprint should produce:

```md
## Sprint N Result
Goal:
Changed files:
Schema changes:
Manual test result:
Known issues:
Next sprint recommendation:
```

### Anti-bloat rule

Do not add a major feature unless it supports one of these:

- faster capture
- better triage
- better daily choice
- better project recovery
- better data safety

If a feature mainly makes the app look impressive, delay it.

---

# 4. Sprint-by-Sprint Plan

---

## Phase 1 — v0.1.x Hardening

Goal: make the current base safe, stable, and trustworthy enough for real use.

---

## Sprint 1 — v0.1.1 Security + deploy hygiene

**Duration:** 24 hours  
**Priority:** Critical

### Goal

Remove obvious security/deployment footguns before the project is shared, pushed, or deployed.

### Tasks

1. Remove `.env` from any shared archive or git history.
2. Confirm `.env` is ignored in `.gitignore`.
3. Keep only `.env.example` committed.
4. Rotate the Neon/Postgres database password and connection string.
5. Generate a fresh `AUTH_SECRET`.
6. Change seed demo credentials.
7. Remove `npm run db:seed` from `vercel.json` build command.
8. Add a `README` warning that seeding resets demo data and should not run during normal production deploys.
9. Add `DEPLOYMENT.md` with local deploy, Vercel deploy, and manual migration steps.

### Likely files

- `.gitignore`
- `.env.example`
- `README.md`
- `vercel.json`
- `docs/DEPLOYMENT.md`

### Acceptance criteria

- No real credentials exist in committed files.
- Production build does not automatically reseed the DB.
- Deployment docs clearly separate:
  - local migration
  - local seeding
  - production migration
  - production seeding, if ever intentionally needed

### Verification

```bash
npm run typecheck
npm run build
npm run test:e2e
```

Manual:

- Search project for `DATABASE_URL=`, real passwords, and seed password leaks.
- Deploy command does not include `db:seed`.

### Failure modes

- Accidentally committing new secrets.
- Keeping demo reset endpoints enabled in production without guardrails.
- Running seed on production and overwriting data like a tiny vandal with CI access.

---

## Sprint 2 — v0.1.2 Local date + time correctness

**Duration:** 24 hours  
**Priority:** Critical

### Goal

Fix date handling so Today/This Week/Priorities work correctly in the user’s local timezone.

### Tasks

1. Replace UTC-based `toISOString().slice(0, 10)` date keys with local date keys.
2. Create a shared `src/lib/dates.ts` utility.
3. Standardize date-only parsing and formatting.
4. Audit all places using date strings:
   - Today view
   - This Week view
   - daily priorities
   - weekly priorities
   - task planned date
   - task due date
   - deadlines
5. Add unit-like tests or E2E assertions for local date behavior if practical.

### Likely files

- `src/lib/dates.ts`
- `src/lib/client-store.tsx`
- `src/components/workspace/Views.tsx`
- `src/lib/sync-server.ts`
- `tests/e2e/contextos.spec.ts`

### Acceptance criteria

- `todayKey()` uses local date, not UTC date.
- A task planned for today appears under Today in local time.
- A deadline date does not shift when saved/synced.

### Verification

```bash
npm run typecheck
npm run build
npm run test:e2e
```

Manual:

- Create task planned for today.
- Create deadline for today.
- Refresh.
- Sync.
- Confirm the dates remain unchanged.

### Failure modes

- Mixing ISO datetime and date-only strings inconsistently.
- Date shifting after server sync.
- UI showing local date while server stores a shifted UTC date.

---

## Sprint 3 — v0.1.3 Mutation hygiene + draft-save behavior

**Duration:** 24-48 hours  
**Priority:** Critical

### Goal

Stop the app from creating sync mutations on every keystroke in fields that should save intentionally.

### Tasks

1. Audit every `onChange` that directly calls update/mutate.
2. Replace high-churn edits with local draft state.
3. Save on:
   - blur
   - Enter where appropriate
   - explicit Save button for longer text
4. Apply to:
   - domain names
   - project objective
   - project next action
   - latest status
   - notes
   - deadline notes
5. Add visual unsaved/saved states where useful.
6. Add mutation count sanity check during manual testing.

### Likely files

- `src/components/workspace/Views.tsx`
- `src/lib/client-store.tsx`
- possibly new components:
  - `src/components/workspace/DraftInput.tsx`
  - `src/components/workspace/DraftTextarea.tsx`

### Acceptance criteria

- Typing 20 characters into a domain name does not create 20 pending mutations.
- Long note edits are saved intentionally, not per keystroke.
- Offline edits still queue and sync correctly.

### Verification

```bash
npm run typecheck
npm run build
npm run test:e2e
```

Manual:

1. Go offline.
2. Edit one project field with 30+ characters.
3. Confirm pending count increases by 1, not 30.
4. Go online.
5. Confirm sync clears.

### Failure modes

- Losing unsaved draft content on navigation.
- Not saving on blur.
- Creating duplicate mutations for the same intended save.

---

## Sprint 4 — v0.1.4 Offline sync visibility + conflict warnings

**Duration:** 24-48 hours  
**Priority:** High

### Goal

Make offline/sync behavior understandable enough that the user trusts the system.

### Tasks

1. Improve Settings sync panel:
   - pending mutations count
   - last successful sync
   - last sync error
   - retry button
   - offline status
2. Add a global sync indicator in the workspace shell.
3. Show warning if user is editing offline.
4. Add basic stale overwrite warning if server rejects/applies older mutation logic.
5. Add manual “force refresh from server” action.

### Likely files

- `src/components/workspace/WorkspaceShell.tsx`
- `src/components/workspace/Views.tsx`
- `src/lib/client-store.tsx`
- `src/lib/sync-server.ts`

### Acceptance criteria

- User always knows whether changes are pending.
- User can manually retry sync.
- Sync error is visible and does not silently disappear.
- Offline changes survive refresh.

### Verification

```bash
npm run typecheck
npm run build
npm run test:e2e
```

Manual:

1. Go offline.
2. Add capture.
3. Reload.
4. Confirm capture remains.
5. Go online.
6. Confirm pending count clears.

### Failure modes

- False sense of sync success.
- Pending count gets stuck.
- Server overwrites local data without warning.

---

## Sprint 5 — v0.1.5 Real usage trial + friction audit

**Duration:** 24 hours active use + 2 hours fixes  
**Priority:** Critical

### Goal

Use the system for one real day before adding more features.

### Tasks

1. Use ContextOS for one day only, no fallback notes unless necessary.
2. Capture every open loop.
3. Process inbox twice.
4. Use Today view for execution.
5. Update at least 2 project statuses.
6. Complete daily shutdown review.
7. Record friction log.
8. Fix only obvious small bugs found during use.

### Friction log template

```md
Date:
What I tried:
Where I hesitated:
What felt too slow:
What I avoided using:
What data I wished existed:
Bug/friction:
Feature needed or discipline problem:
```

### Acceptance criteria

- At least 10 captures created.
- Inbox processed to zero or intentionally deferred.
- At least 1 daily startup or shutdown review completed.
- At least 2 project pages updated.
- A ranked friction list exists.

### Verification

```bash
npm run typecheck
npm run build
npm run test:e2e
```

Manual:

- Read friction log and sort into:
  - bug
  - UX friction
  - missing feature
  - user discipline problem

### Failure modes

- Inventing features instead of using the app.
- Over-optimizing before real friction appears.
- Treating vague discomfort as architecture feedback. Humans do this constantly. Very artisanal nonsense.

---

## Phase 2 — v0.2.x Daily Execution

Goal: make ContextOS good enough for a full 7-day personal operating loop.

---

## Sprint 6 — v0.2.0 Task editor foundation

**Duration:** 24-48 hours  
**Priority:** Critical

### Goal

Make tasks first-class records instead of one-line TODO fossils.

### Tasks

1. Add task detail/edit UI.
2. Editable fields:
   - title
   - status
   - planned date
   - due date
   - project
   - domain
3. Add task actions:
   - start
   - mark done
   - block
   - wait
   - drop
   - archive
   - trash
   - plan for today
   - clear planned date
4. Add task detail modal or route.
5. Update TaskRow actions.

### Likely files

- `src/components/workspace/Views.tsx`
- `src/components/workspace/TaskEditor.tsx`
- `src/lib/client-store.tsx`
- `src/lib/types.ts`

### Acceptance criteria

- User can fully edit a task after creation.
- User can plan/replan tasks for today.
- Today view becomes actionable, not just informational.

### Verification

```bash
npm run typecheck
npm run build
npm run test:e2e
```

Manual:

- Create task from Inbox.
- Edit title/project/domain/due date/status.
- Plan it for today.
- Complete it from Today.

### Failure modes

- Modal state complexity becomes buggy.
- Task status options become too many without clear behavior.
- Dates shift after sync.

---

## Sprint 7 — v0.2.1 Better capture parser

**Duration:** 24-48 hours  
**Priority:** Critical

### Goal

Make Quick Capture powerful enough to create structured records quickly.

### Supported syntax

```txt
/task Finish report @MSc Thesis #University due:2026-06-10 plan:today
/note @ContextOS Draft-save bug in notes
/project ContextOS v0.2 #Personal objective:Use daily for one week
/deadline Submit report date:2026-06-15 @MSc Thesis
/status @ContextOS Offline sync works. Next: task editor.
```

### Tasks

1. Create parser utility.
2. Parse command type.
3. Parse project reference via `@Project Name`.
4. Parse domain reference via `#Domain`.
5. Parse `due:YYYY-MM-DD`.
6. Parse `plan:today`.
7. Parse `date:YYYY-MM-DD` for deadlines.
8. Parse `/status @Project text`.
9. Store parsed data on capture.
10. Show parse preview in Inbox before conversion.

### Likely files

- `src/lib/capture-parser.ts`
- `src/lib/client-store.tsx`
- `src/components/workspace/Views.tsx`
- `tests/e2e/contextos.spec.ts`

### Acceptance criteria

- Slash commands create useful parsed previews.
- Inbox conversion respects parsed project/domain/dates.
- Parser fails gracefully and never destroys original text.

### Verification

```bash
npm run typecheck
npm run build
npm run test:e2e
```

Manual:

- Enter each supported command.
- Convert each to target record.
- Confirm fields are correct.

### Failure modes

- Parser becomes too clever and unpredictable.
- `@` project matching fails with spaces.
- Ambiguous names silently attach to wrong project.

---

## Sprint 8 — v0.2.2 Inbox triage workflow

**Duration:** 24-48 hours  
**Priority:** High

### Goal

Make Inbox processing fast and decisive.

### Tasks

1. Add keyboard shortcuts:
   - `t` convert to task
   - `n` convert to note
   - `p` convert to project
   - `d` convert to deadline
   - `a` archive
   - `x` delete/trash
2. Add bulk actions.
3. Add deferred status: “later” or “someday” only if genuinely needed.
4. Add conversion preview/edit before final conversion.
5. Preserve original capture link/reference where useful.

### Likely files

- `src/components/workspace/Views.tsx`
- `src/components/workspace/InboxItem.tsx`
- `src/lib/client-store.tsx`

### Acceptance criteria

- 20 captures can be triaged in under 5 minutes.
- User can correct parsed fields before conversion.
- Converted captures keep `convertedToId`.

### Verification

```bash
npm run typecheck
npm run build
npm run test:e2e
```

Manual:

- Create 20 mixed captures.
- Process them with keyboard and buttons.
- Confirm records are created correctly.

### Failure modes

- Keyboard shortcuts interfere with typing.
- Bulk actions delete/convert unintentionally.
- Inbox gets more complex than useful.

---

## Sprint 9 — v0.2.3 Daily startup/shutdown flows

**Duration:** 24-48 hours  
**Priority:** Critical

### Goal

Turn Reviews from passive records into guided operating rituals.

### Daily startup prompts

```txt
1. What matters today?
2. What is already overdue?
3. Which project needs recovery?
4. What can be dropped or ignored?
5. What is the next concrete action?
```

### Daily shutdown prompts

```txt
1. What moved today?
2. What changed?
3. What is unresolved?
4. What should tomorrow start with?
5. Which project status needs updating?
```

### Tasks

1. Add guided Daily Startup view.
2. Add guided Daily Shutdown view.
3. Show suggested overdue/today/project data alongside prompts.
4. Allow review answers to create priorities or status updates.
5. Add “complete review” confirmation.

### Likely files

- `src/components/workspace/Views.tsx`
- `src/components/workspace/ReviewFlow.tsx`
- `src/lib/client-store.tsx`

### Acceptance criteria

- User can complete startup in under 5 minutes.
- User can complete shutdown in under 5 minutes.
- Review output influences next day priorities/statuses.

### Verification

```bash
npm run typecheck
npm run build
npm run test:e2e
```

Manual:

- Complete startup.
- Execute tasks.
- Complete shutdown.
- Confirm review appears in Reviews.

### Failure modes

- Review becomes journaling bloat.
- Prompts are too vague.
- Review does not connect back to tasks/projects.

---

## Sprint 10 — v0.2.4 Weekly planning/review flow

**Duration:** 24-48 hours  
**Priority:** High

### Goal

Make weekly planning useful enough to decide the week, not just record feelings in a productivity scrapbook.

### Weekly prompts

```txt
1. What must move this week?
2. Which deadlines are dangerous?
3. Which projects are stale?
4. What should be dropped, paused, or archived?
5. What are the top 3 outcomes for the week?
```

### Tasks

1. Improve This Week view.
2. Show:
   - deadlines this week
   - overdue tasks
   - active projects without next action
   - stale projects
3. Add weekly review flow.
4. Let weekly priorities link to tasks/projects.
5. Add weekly reset action: carry forward, drop, pause.

### Likely files

- `src/components/workspace/Views.tsx`
- `src/components/workspace/WeeklyReviewFlow.tsx`
- `src/lib/client-store.tsx`

### Acceptance criteria

- Weekly view produces 1-3 concrete weekly outcomes.
- Stale projects are visible.
- Deadlines without tasks are flagged.

### Verification

```bash
npm run typecheck
npm run build
npm run test:e2e
```

Manual:

- Create 3 projects, 5 tasks, 2 deadlines.
- Run weekly review.
- Confirm the system exposes risks and missing next actions.

### Failure modes

- Weekly review duplicates daily review.
- Too many priorities.
- User spends more time planning than executing. Classic trap. Avoid.

---

## Sprint 11 — v0.2.5 Mobile/PWA capture polish

**Duration:** 24-48 hours  
**Priority:** High

### Goal

Make mobile capture good enough for real use outside the laptop.

### Tasks

1. Improve mobile layout for Dashboard, Inbox, Today, Project Detail.
2. Add sticky Quick Capture on mobile.
3. Add PWA icons.
4. Improve manifest metadata.
5. Improve offline fallback UI.
6. Add install instructions to docs.

### Likely files

- `public/manifest.webmanifest`
- `public/sw.js`
- `public/icons/*`
- `src/components/workspace/WorkspaceShell.tsx`
- `src/components/workspace/Views.tsx`
- `docs/PWA.md`

### Acceptance criteria

- App can be installed as PWA.
- Mobile capture takes under 10 seconds from opening app.
- Offline visited routes remain usable.

### Verification

```bash
npm run typecheck
npm run build
npm run test:e2e
```

Manual:

- Install on phone/browser.
- Go offline.
- Open app.
- Add capture.
- Return online.
- Confirm sync clears.

### Failure modes

- PWA caching stale JS forever.
- Mobile layout hides key actions.
- Offline state feels broken even if technically working.

---

## Sprint 12 — v0.2.6 7-day daily-use trial

**Duration:** 7 calendar days, with 24-48h fix windows  
**Priority:** Critical

### Goal

Prove v0.2 is usable as the real daily system.

### Usage requirements

For 7 days:

1. Use Quick Capture for all open loops.
2. Process Inbox at least once per day.
3. Use Today view for execution.
4. Update project status before stopping work on any serious project.
5. Complete daily shutdown at least 5 of 7 days.
6. Complete one weekly review.

### Metrics

Track:

- captures created
- captures processed
- inbox count at end of day
- tasks completed
- projects updated
- daily reviews completed
- time to recover project context
- friction events

### Acceptance criteria

- Inbox does not become a graveyard.
- User does not need external notes for task/project recovery.
- At least 80% of captured items are processed within 48 hours.
- Project context recovery takes under 3 minutes.

### Failure modes

- User avoids Inbox.
- Today view is not trusted.
- Project pages are not updated because editing is too annoying.
- Reviews feel like homework and get skipped.

---

## Phase 3 — v0.3.x Context Recovery

Goal: make projects self-explanatory after time away.

---

## Sprint 13 — v0.3.0 Project status timeline

**Duration:** 24-48 hours  
**Priority:** Critical

### Goal

Preserve status history instead of overwriting it.

### Schema addition

```prisma
model ProjectStatusUpdate {
  id        String   @id
  userId    String
  projectId String
  text      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

Optional later fields:

```prisma
source ReviewType?
sourceCaptureId String?
```

### Tasks

1. Add Prisma model and migration.
2. Add client/server types.
3. Add store actions:
   - add project status update
   - list by project
4. When latest status is saved, optionally append to timeline.
5. Show timeline in project detail.
6. Keep `project.latestStatus` as current summary for fast display.

### Likely files

- `prisma/schema.prisma`
- migration file
- `src/lib/types.ts`
- `src/lib/client-store.tsx`
- `src/lib/sync-server.ts`
- `src/lib/data.ts`
- `src/components/workspace/Views.tsx`

### Acceptance criteria

- Updating latest status creates a timeline entry.
- Project page shows recent status updates.
- Offline status updates sync correctly.

### Verification

```bash
npm run db:migrate
npm run typecheck
npm run build
npm run test:e2e
```

Manual:

- Update project status three times.
- Refresh.
- Confirm latest status and timeline both persist.

### Failure modes

- Duplicate timeline entries from draft-save.
- Latest status and timeline drift apart confusingly.
- Sync server does not support new collection.

---

## Sprint 14 — v0.3.1 Decision log

**Duration:** 24-48 hours  
**Priority:** High

### Goal

Capture project decisions so reasoning is recoverable, not buried in note sludge.

### Schema addition

```prisma
model Decision {
  id          String   @id
  userId      String
  projectId   String?
  domainId    String?
  title       String
  context     String   @default("")
  decision    String
  consequence String   @default("")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  archivedAt  DateTime?
  trashedAt   DateTime?
}
```

### Tasks

1. Add Decision model and migration.
2. Add decision creation from project page.
3. Add `/decision` capture command.
4. Show decisions on project page.
5. Add decisions to search.

### Acceptance criteria

- User can record decisions separately from notes.
- Decisions are searchable.
- Project recovery shows important decisions clearly.

### Verification

```bash
npm run db:migrate
npm run typecheck
npm run build
npm run test:e2e
```

Manual:

- Create decision from capture.
- Attach to project.
- Find it in search.

### Failure modes

- Decisions become duplicate notes.
- User records too much because the field exists.
- No consequence field means decisions lose usefulness later.

---

## Sprint 15 — v0.3.2 Project artifacts and links

**Duration:** 24-48 hours  
**Priority:** Medium-High

### Goal

Let projects reference files, repos, docs, URLs, and important resources.

### Schema addition

```prisma
model ArtifactLink {
  id        String   @id
  userId    String
  projectId String?
  domainId  String?
  title     String
  url       String
  kind      String   @default("link")
  notes     String   @default("")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Tasks

1. Add ArtifactLink model.
2. Add artifact section on project page.
3. Add quick add URL.
4. Add artifact links to search.
5. Add markdown export including artifacts.

### Acceptance criteria

- Project page can store important external links.
- User can recover repo/doc/deployment links quickly.
- Links export in markdown.

### Verification

```bash
npm run db:migrate
npm run typecheck
npm run build
npm run test:e2e
```

Manual:

- Add GitHub link.
- Add Google Doc link.
- Search link title.
- Export project markdown.

### Failure modes

- Artifact section turns into a bookmark manager.
- Broken URLs are not validated.
- Too many low-value links pollute project page.

---

## Sprint 16 — v0.3.3 Project templates

**Duration:** 24-48 hours  
**Priority:** Medium

### Goal

Create projects with useful starting structure instead of blank fields.

### Templates

Minimum templates:

1. Research project
2. Software project
3. Course/teaching project
4. Content/media project
5. Personal/life project

### Tasks

1. Add template definitions in code first, not DB.
2. On project creation, allow template selection.
3. Templates may prefill:
   - current objective
   - first next action
   - default open loops
   - starter notes
   - starter tasks
4. Add docs for creating new templates.

### Acceptance criteria

- Creating a research/software project gives useful starter prompts.
- Blank project is still available.
- Templates do not force a rigid workflow.

### Verification

```bash
npm run typecheck
npm run build
npm run test:e2e
```

Manual:

- Create project from each template.
- Confirm generated fields/tasks/notes are useful.

### Failure modes

- Templates become bloated.
- User spends more time choosing templates than working.
- Generated tasks are generic garbage.

---

## Sprint 17 — v0.3.4 Search and filter upgrade

**Duration:** 24-48 hours  
**Priority:** High

### Goal

Make search useful once data volume grows.

### Tasks

1. Add type filters:
   - projects
   - tasks
   - captures
   - notes
   - deadlines
   - reviews
   - decisions
   - artifacts
2. Add project/domain filters.
3. Add status filters.
4. Add date filters.
5. Improve result snippets.
6. Add recent searches if useful.

### Acceptance criteria

- User can quickly find project-specific context.
- Search works across all major records.
- Search does not show trashed records unless requested.

### Verification

```bash
npm run typecheck
npm run build
npm run test:e2e
```

Manual:

- Create records across domains/projects.
- Search specific term.
- Filter by project/domain/type.

### Failure modes

- Filter UI becomes too busy.
- Search remains client-only and slows with large data.
- Results are accurate but not useful because snippets are weak.

---

## Sprint 18 — v0.3.5 Project recovery scorecard

**Duration:** 24-48 hours  
**Priority:** High

### Goal

Expose projects that are active but not recoverable.

### Recovery checks

Flag project if:

- no current objective
- no next action
- no latest status
- no status update in 7+ days
- open loops exist but no tasks
- deadline exists but no task path
- too many stale tasks

### Tasks

1. Implement project health/recovery utility.
2. Show score/status on Projects list.
3. Add “Needs Recovery” section on Dashboard.
4. Add one-click recovery flow.

### Acceptance criteria

- User can see which projects are stale/confusing.
- Dashboard highlights at-risk projects.
- Recovery flow produces next action and latest status.

### Verification

```bash
npm run typecheck
npm run build
npm run test:e2e
```

Manual:

- Create project with missing next action.
- Confirm it appears in recovery list.
- Complete recovery flow.
- Confirm it disappears.

### Failure modes

- Health score becomes moral judgment instead of practical signal.
- Too many warnings create alert fatigue.
- System nags instead of helping.

---

## Sprint 19 — v0.3.6 3-day project recovery trial

**Duration:** 3 calendar days + 24h fix pass  
**Priority:** Critical

### Goal

Prove that project recovery actually works after time away.

### Test protocol

1. Choose 3 active projects.
2. Update each with:
   - objective
   - latest status
   - next action
   - open loops
   - status timeline
   - at least one note/decision/artifact if relevant
3. Do not open them for 3 days.
4. Return and time recovery.
5. Record what was missing.

### Acceptance criteria

- Each project can be resumed in under 2 minutes.
- Missing context is obvious and fixable.
- User trusts the project page more than memory.

### Failure modes

- Project pages are too verbose.
- Latest status lacks enough detail.
- Decisions/artifacts are not visible enough.

---

## Phase 4 — v0.4.x Read-Only Intelligence

Goal: add useful assistant-like behavior without letting automation corrupt the system.

---

## Sprint 20 — v0.4.0 Rule-based suggestions

**Duration:** 24-48 hours  
**Priority:** High

### Goal

Add deterministic suggestions before LLM suggestions.

### Suggestion examples

- “This project has no next action.”
- “This deadline has no linked tasks.”
- “This task is overdue by 5 days.”
- “This project has not been updated in 12 days.”
- “You have 14 unprocessed captures.”
- “This weekly priority has no linked task.”

### Tasks

1. Add suggestion engine utility.
2. Add suggestions to Dashboard.
3. Add suggestions to Project Detail.
4. Allow dismissing suggestions.
5. Allow applying safe actions manually.

### Acceptance criteria

- Suggestions are explainable and deterministic.
- No suggestion directly edits data without user action.
- Dismissed suggestions stay dismissed for a reasonable period.

### Verification

```bash
npm run typecheck
npm run build
npm run test:e2e
```

Manual:

- Create stale project.
- Create deadline without tasks.
- Confirm suggestions appear.

### Failure modes

- Too many suggestions.
- Suggestions feel like nagging.
- Dismissal logic becomes messy.

---

## Sprint 21 — v0.4.1 Context summary generator, manual only

**Duration:** 24-48 hours  
**Priority:** Medium

### Goal

Generate structured project summaries from existing data, initially rule-based/template-based.

### Summary format

```md
Current objective:
Latest status:
Next action:
Open loops:
Recent status updates:
Upcoming deadlines:
Active tasks:
Recent decisions:
Important artifacts:
```

### Tasks

1. Add project summary utility.
2. Add “Copy context summary” button.
3. Add markdown export using the same summary format.
4. Add summary preview.

### Acceptance criteria

- User can copy a project summary into ChatGPT/Codex/Claude manually.
- Summary contains enough context to resume work.
- Summary does not invent missing data.

### Verification

```bash
npm run typecheck
npm run build
npm run test:e2e
```

Manual:

- Create project with tasks, notes, decisions, artifacts.
- Copy summary.
- Verify it is accurate.

### Failure modes

- Summary becomes too long.
- Missing fields are hidden instead of explicit.
- User mistakes generated summary for complete truth.

---

## Sprint 22 — v0.4.2 Local LLM read-only integration spike

**Duration:** 24-48 hours  
**Priority:** Medium

### Goal

Test local LLM usefulness without making it part of the trusted data path.

### Strict boundary

The LLM may suggest text. It may not directly edit records.

### Tasks

1. Add optional local LLM config in Settings.
2. Support Ollama endpoint configuration.
3. Add one feature only:
   - “Suggest project recovery summary”
4. Show generated text in preview.
5. User manually applies/copies if useful.
6. Add timeout and fallback.

### Acceptance criteria

- App still works without LLM.
- LLM failure does not break core workflows.
- Generated suggestions are clearly marked as suggestions.

### Verification

```bash
npm run typecheck
npm run build
npm run test:e2e
```

Manual:

- Run with Ollama unavailable.
- Run with Ollama available.
- Confirm app behaves safely in both cases.

### Failure modes

- LLM latency damages UX.
- User starts trusting generated summaries over source data.
- Local model hallucinates project facts because context is incomplete.

---

## Sprint 23 — v0.4.3 Capture classification suggestions

**Duration:** 24-48 hours  
**Priority:** Medium

### Goal

Suggest where captures belong, without auto-processing them.

### Tasks

1. Rule-based first:
   - command prefix
   - project/domain name mentions
   - keywords
2. Optional LLM assist only after rule-based baseline.
3. Show suggested conversion target.
4. Show suggested project/domain.
5. Require user confirmation.

### Acceptance criteria

- Suggestions speed up triage.
- User can override easily.
- No capture is auto-converted silently.

### Verification

```bash
npm run typecheck
npm run build
npm run test:e2e
```

Manual:

- Create captures mentioning known project names.
- Confirm suggestions appear.
- Override one suggestion.

### Failure modes

- Bad suggestions create wrong records.
- User stops reading and rubber-stamps.
- LLM becomes a crutch for unclear capture writing.

---

## Sprint 24 — v0.4.4 Agent-safe action queue

**Duration:** 24-48 hours  
**Priority:** Medium

### Goal

Prepare for future agents by creating an approval queue for suggested actions.

### Suggested action examples

- create task
- update project next action
- archive stale capture
- link task to deadline
- create status update

### Tasks

1. Add SuggestedAction type/model if needed.
2. Add UI for pending suggestions.
3. Add accept/reject/edit before apply.
4. Log accepted suggestions.
5. Never apply automatically.

### Acceptance criteria

- Suggestions are reviewable.
- User can edit before accepting.
- Action history is auditable.

### Verification

```bash
npm run db:migrate
npm run typecheck
npm run build
npm run test:e2e
```

Manual:

- Generate rule-based suggestion.
- Edit and accept.
- Reject another.
- Confirm resulting records are correct.

### Failure modes

- Approval queue becomes another inbox.
- Too many low-quality suggestions.
- Accepted actions are not traceable.

---

## Phase 5 — v0.5.x Production Personal System

Goal: data safety, portability, deployment quality, and testing depth.

---

## Sprint 25 — v0.5.0 Full workspace export/import

**Duration:** 24-48 hours  
**Priority:** Critical

### Goal

Make user data portable and restorable.

### Tasks

1. Add full JSON export.
2. Add full Markdown export.
3. Add import preview.
4. Add duplicate handling strategy.
5. Add backup warning/confirmation.
6. Add export from Settings.

### Acceptance criteria

- User can export all data.
- Export includes schema version.
- Import can be previewed before applying.
- No destructive import happens without confirmation.

### Verification

```bash
npm run typecheck
npm run build
npm run test:e2e
```

Manual:

- Export workspace.
- Reset demo data.
- Import workspace.
- Confirm key records return.

### Failure modes

- Import duplicates everything.
- Schema version mismatch breaks restore.
- Export excludes hidden but important records.

---

## Sprint 26 — v0.5.1 Account/data controls

**Duration:** 24-48 hours  
**Priority:** High

### Goal

Give user basic ownership controls.

### Tasks

1. Change password.
2. Delete account with confirmation.
3. Delete all workspace data.
4. Export-before-delete prompt.
5. Session list/logout all if practical.

### Acceptance criteria

- User can control account lifecycle.
- Destructive actions require strong confirmation.
- Export is encouraged before deletion.

### Verification

```bash
npm run typecheck
npm run build
npm run test:e2e
```

Manual:

- Change password.
- Log out/in.
- Test delete flow on demo/local account only.

### Failure modes

- Accidental destructive action.
- Session remains valid after password change.
- Delete action leaves orphaned data.

---

## Sprint 27 — v0.5.2 Test expansion

**Duration:** 24-48 hours  
**Priority:** High

### Goal

Cover the workflows that actually matter.

### Test scenarios

1. Auth login/register/logout.
2. Quick capture.
3. Inbox conversion to task/note/project/deadline.
4. Task editing.
5. Project status update.
6. Daily startup/shutdown.
7. Offline capture and sync.
8. Search.
9. Archive/trash/restore.
10. Export.

### Acceptance criteria

- E2E tests cover core daily loop.
- Tests run reliably locally.
- Failing tests identify real breakage, not flaky theatre.

### Verification

```bash
npm run test:e2e
npm run typecheck
npm run build
```

### Failure modes

- Tests become brittle because selectors depend on text only.
- Offline tests are flaky.
- Too much testing slows iteration before core flows stabilize.

---

## Sprint 28 — v0.5.3 Deployment hardening

**Duration:** 24-48 hours  
**Priority:** High

### Goal

Make deployment boring and reproducible. Boring is good. Boring means fewer midnight surprises.

### Tasks

1. Finalize `DEPLOYMENT.md`.
2. Add migration deploy script.
3. Add production environment checklist.
4. Confirm service worker behavior in production.
5. Confirm database pooling/connection behavior.
6. Add production reset-demo guard or remove endpoint in production.
7. Add basic logging for server errors.

### Acceptance criteria

- Production deploy does not seed/reset data.
- Required env vars are documented.
- Reset demo cannot damage production data.
- Build and migration steps are clear.

### Verification

```bash
npm run typecheck
npm run build
npm run test:e2e
```

Manual:

- Deploy staging.
- Login/register.
- Add records.
- Redeploy.
- Confirm records remain.

### Failure modes

- Production uses dev database.
- Service worker caches broken build.
- Reset-demo endpoint remains unsafe.

---

## Sprint 29 — v0.5.4 Performance and data volume pass

**Duration:** 24-48 hours  
**Priority:** Medium

### Goal

Check how the app behaves when it contains real volume.

### Test dataset

Seed synthetic:

- 20 domains
- 100 projects
- 1000 tasks
- 1000 captures
- 500 notes
- 100 deadlines
- 100 reviews

### Tasks

1. Add optional dev seed for volume testing.
2. Measure page load/render behavior.
3. Optimize obvious slow filters/search.
4. Add pagination or virtualization only if needed.
5. Consider moving search server-side if client-only becomes slow.

### Acceptance criteria

- Dashboard remains responsive.
- Search is acceptable under realistic personal data volume.
- Project pages do not lag.

### Verification

```bash
npm run typecheck
npm run build
npm run test:e2e
```

Manual:

- Run volume seed.
- Test Dashboard, Search, Projects, Today.

### Failure modes

- Premature optimization.
- Adding pagination too early and hurting UX.
- Client store becomes too large for IndexedDB sync assumptions.

---

## Sprint 30 — v0.5.5 v1.0 readiness audit

**Duration:** 24-48 hours  
**Priority:** Critical

### Goal

Decide what blocks v1.0 and what is optional fluff.

### Audit categories

1. Capture speed
2. Inbox triage speed
3. Daily execution reliability
4. Project recovery quality
5. Offline trust
6. Data safety/export
7. Deployment safety
8. Test coverage
9. Mobile usability
10. Cognitive load

### Deliverable

Create:

```md
V1_READINESS_AUDIT.md
```

With:

```md
Must fix before v1:
Should fix after v1:
Explicitly deferred:
Known risks:
Manual test results:
User workflow verdict:
```

### Acceptance criteria

- v1 blockers are explicit.
- Optional ideas are not smuggled into v1.
- User can decide whether to stabilize or keep building.

### Failure modes

- Treating v1 as “add everything.”
- Avoiding release because the system is imperfect.
- Confusing polish with usefulness.

---

# 5. Recommended Version Roadmap Summary

## v0.1.x — Base hardening

1. Security/deploy hygiene
2. Local date handling
3. Mutation/draft-save hygiene
4. Sync visibility
5. One-day usage audit

## v0.2.x — Daily execution

1. Real task editor
2. Better capture parser
3. Inbox triage workflow
4. Daily startup/shutdown
5. Weekly planning/review
6. Mobile/PWA capture polish
7. 7-day usage trial

## v0.3.x — Project recovery

1. Project status timeline
2. Decision log
3. Artifacts/links
4. Project templates
5. Search/filter upgrade
6. Project recovery scorecard
7. 3-day recovery trial

## v0.4.x — Read-only intelligence

1. Rule-based suggestions
2. Context summary generator
3. Local LLM read-only spike
4. Capture classification suggestions
5. Agent-safe action queue

## v0.5.x — Data safety and production quality

1. Full export/import
2. Account/data controls
3. Test expansion
4. Deployment hardening
5. Performance/data-volume pass
6. v1 readiness audit

---

# 6. Build Order Decision Rule

When choosing between features, use this order:

1. **Safety:** can I lose data or leak secrets?
2. **Trust:** can I tell what happened and whether it synced?
3. **Capture:** can I get thoughts into the system quickly?
4. **Triage:** can I process captures without friction?
5. **Execution:** can I choose and finish today’s work?
6. **Recovery:** can I resume projects after time away?
7. **Intelligence:** can the system suggest helpful actions without corrupting user judgment?
8. **Polish:** does it feel good enough to keep using?

If two features compete, pick the one higher on this list.

---

# 7. Minimum v1.0 Criteria

ContextOS reaches v1.0 only when all are true:

- User can run 14 consecutive days mostly inside ContextOS.
- Inbox is processed at least every 48 hours.
- Daily startup/shutdown is usable and not annoying.
- Projects can be recovered in under 2 minutes.
- Offline capture and sync are trusted.
- Full export exists.
- Production deployment does not risk data resets.
- E2E tests cover the core loop.
- User can explain the system in one paragraph.

One-paragraph v1 explanation should be:

> ContextOS is where I capture loose thoughts, turn them into tasks/notes/projects/deadlines, choose today’s work, and recover project context through objective, latest status, next action, open loops, notes, decisions, and reviews.

If the user cannot explain it that simply, the app is not done. It is just complexity wearing a nice font.

---

# 8. Immediate Next Actions

Do these now:

1. Run Sprint 1: security + deploy hygiene.
2. Run Sprint 2: local date correctness.
3. Run Sprint 3: mutation/draft-save hygiene.
4. Then force a one-day usage trial before building v0.2 features.

Do not start agents, calendar integration, OAuth, analytics, collaboration, or rich AI features yet.

That would be building a cockpit before checking whether the wheels are attached. Very software-industry, but still dumb.
