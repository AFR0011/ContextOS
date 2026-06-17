# ContextOS UI/UX Improvement Modification List

## Phase 1: Fix the main product experience first

### 1. Reframe Dashboard as the primary daily command sheet

**Change:** Make `/dashboard` feel like one editable operating sheet, not a stack of separate widgets.

**Files likely involved:**

* `src/components/workspace/Dashboard2.tsx`
* `src/components/workspace/DailySchedule.tsx`
* `src/app/globals.css`

**Implementation:**

* Keep `QuickCapture` at the top.
* Make `NotepadSection` the dominant visual area.
* Make Dates, Daily Timeline, Tasks, and Projects visually secondary.
* Reduce full card borders between every section.
* Use lighter dividers and section headers instead of heavy boxes.

**Acceptance criteria:**

* At mobile width, user sees capture + notepad immediately.
* Dashboard no longer feels like five equal cards stacked together.
* Existing dashboard features still work.

---

### 2. Make Dashboard Notepad the future home for inline structured records

**Change:** Prepare the Notepad to eventually contain tasks and dates directly as editable structured blocks.

**Files likely involved:**

* `src/components/workspace/Dashboard2.tsx`
* `src/components/workspace/editor/BlockMarkdownEditor.tsx`
* `src/components/workspace/editor/SlashCommandMenu.tsx`
* local/offline workspace store files if structured rendering needs data access

**Implementation:**

* Do **not** destroy existing task/date models.
* Add a visual path where structured records can appear inside the Notepad as special editable rows.
* Start with rendering today’s tasks/dates as embedded blocks or reserved rows near the top of Notepad.
* They should be editable/removable through the same task/date logic, not fake markdown text.
* Preserve syntax support:

```txt
Task text (DDMMYY) [HHMM] {Location}
```

**Acceptance criteria:**

* Existing date/task data remains structured.
* Notepad can visually host structured rows.
* Editing a structured row updates the real record.
* Removing a structured row archives/deletes/removes the linked record according to existing behavior.

---

### 3. Add a compact “Today pressure strip” under Quick Capture

**Change:** Add a small summary strip before Notepad.

**Files likely involved:**

* `src/components/workspace/Dashboard2.tsx`

**Implementation:**
Show compact counts/links:

* overdue tasks
* today’s dated items
* active projects
* pending inbox items

Example:

```txt
Today: 2 overdue · 3 due today · 4 active projects · 6 inbox
```

**Why:** The user needs immediate situational awareness before drowning in their own thoughts, humanity’s favorite hobby.

**Acceptance criteria:**

* Strip is compact, one row where possible.
* Items link or scroll to relevant dashboard sections.
* Does not become another big card.

---

### 4. Reduce Dashboard guidance/banner prominence

**Change:** The current explanatory banner should not compete with the actual operating surface.

**Files likely involved:**

* `src/components/workspace/Dashboard2.tsx`

**Implementation:**

* Convert guidance banner into a dismissible/help text area or subtle note.
* Make it less visually dominant than Quick Capture and Notepad.
* Persist dismissal locally if easy.

**Acceptance criteria:**

* First-time users still understand the concept.
* Returning users are not forced to reread onboarding text forever like some productivity purgatory.

---

### 5. Move “Show completed” into a small dashboard control row

**Change:** Do not let completion filtering sit as its own visual block.

**Files likely involved:**

* `src/components/workspace/Dashboard2.tsx`

**Implementation:**

* Place it near section controls.
* Use a small segmented/toggle control.
* Keep behavior unchanged.

**Acceptance criteria:**

* Completed toggle is still discoverable.
* It no longer visually interrupts Dashboard flow.

---

## Phase 2: Standardize core UI components

### 6. Extract a reusable `Section` component

**Change:** Replace one-off card/section wrappers with a reusable primitive.

**Files likely involved:**

* create `src/components/workspace/ui/Section.tsx`
* update `Dashboard2.tsx`
* update `Views.tsx`
* update `DailySchedule.tsx`

**Implementation:**
Support variants:

```txt
primary
secondary
compact
plain
warning
collapsible
```

**Acceptance criteria:**

* Dashboard sections use consistent spacing.
* Project detail sections use the same visual grammar.
* No new duplicated section/card wrappers are introduced.

---

### 7. Extract a reusable `RecordRow` component

**Change:** Standardize task/date/project/resource/search rows.

**Files likely involved:**

* create `src/components/workspace/ui/RecordRow.tsx`
* `Dashboard2.tsx`
* `DailySchedule.tsx`
* `Views.tsx`

**Implementation:**
Slots:

* leading icon/control
* title/content
* metadata
* status pill
* trailing actions

**Acceptance criteria:**

* Task rows, date rows, project rows, and search rows feel related.
* Clickable rows clearly look clickable.
* Non-clickable rows do not pretend to be buttons.

---

### 8. Extract a reusable `InlineComposer`

**Change:** Unify “add task/date/project/resource” inputs.

**Files likely involved:**

* create `src/components/workspace/ui/InlineComposer.tsx`
* `Dashboard2.tsx`
* `Views.tsx`
* `DailySchedule.tsx`

**Implementation:**
Support:

* text input
* optional date input
* optional time input
* optional location input
* submit button
* disabled state
* Enter to submit
* Escape to clear

**Acceptance criteria:**

* Adding records behaves consistently across screens.
* Empty submit is disabled.
* User always receives visible feedback.

---

### 9. Extract a reusable `EmptyState`

**Change:** Replace scattered empty states with one component.

**Files likely involved:**

* create `src/components/workspace/ui/EmptyState.tsx`
* `Dashboard2.tsx`
* `DailySchedule.tsx`
* `Views.tsx`

**Implementation:**
Variants:

* plain
* dashed
* action
* warning

**Acceptance criteria:**

* Empty Inbox, Dashboard sections, Projects, Dates, Resources, and Search use the same pattern.
* Empty states explain what to do next.

---

### 10. Extract a reusable `Notice`

**Change:** Standardize sync/offline/error/success banners.

**Files likely involved:**

* create `src/components/workspace/ui/Notice.tsx`
* `Views.tsx`
* `Dashboard2.tsx`
* settings/sync areas

**Implementation:**
Variants:

* info
* success
* warning
* danger
* sync

**Acceptance criteria:**

* Offline/sync messages look intentional.
* Error states do not look like random red text taped onto the page.

---

### 11. Extract a reusable `SegmentedControl`

**Change:** Standardize tabs/filters.

**Files likely involved:**

* create `src/components/workspace/ui/SegmentedControl.tsx`
* `Views.tsx`

**Implementation:**
Use for:

* Inbox processed/unprocessed filters
* Archive filters
* future Dashboard view filters if needed

**Acceptance criteria:**

* Same active/inactive/hover/focus styles everywhere.
* Keyboard focus is visible.

---

## Phase 3: Improve mobile UX

### 12. Add mobile bottom navigation

**Change:** Add persistent mobile navigation for the most common destinations.

**Files likely involved:**

* `src/components/workspace/WorkspaceShell.tsx`
* `src/app/globals.css`

**Tabs:**

1. Dashboard
2. Inbox
3. Today
4. Projects
5. Search

**Implementation:**

* Keep desktop sidebar unchanged.
* Keep hamburger drawer for secondary destinations.
* Add bottom padding to pages so content is not hidden behind the nav.

**Acceptance criteria:**

* At mobile width, Dashboard → Inbox → Today requires one tap.
* Bottom nav active state is obvious.
* No horizontal overflow.
* No content hidden behind nav.

---

### 13. Make hover-hidden actions visible on mobile

**Change:** Controls that only appear on hover must be visible or reachable on touch devices.

**Files likely involved:**

* `src/components/workspace/DailySchedule.tsx`
* `src/components/workspace/editor/BlockMarkdownEditor.tsx`
* `Dashboard2.tsx`
* `Views.tsx`

**Implementation:**

* Desktop: hover-reveal can remain.
* Mobile: show compact visible action buttons or a visible `More` button.
* Ensure delete/edit/archive controls are not invisible on touch.

**Acceptance criteria:**

* User can edit/delete/reschedule tasks on mobile without guessing.
* No essential action depends only on hover.

---

### 14. Improve mobile spacing and tap targets

**Change:** Normalize touch target sizes.

**Files likely involved:**

* `src/app/globals.css`
* shared UI components

**Implementation:**

* Buttons: minimum 40-44px height on mobile.
* Section toggles: minimum 44px.
* Inputs: comfortable vertical padding.
* Metadata controls should wrap instead of shrinking into microscopic nonsense.

**Acceptance criteria:**

* Dashboard usable at 390px width.
* Project Detail usable at 390px width.
* Forms do not create cramped horizontal rows on mobile.

---

## Phase 4: Fix specific UX issues

### 15. Route task search results to `/today`

**Change:** Search task results currently should not dead-click.

**Files likely involved:**

* `src/components/workspace/Views.tsx`

**Implementation:**

* For task results, route to `/today`.
* Later, add task highlighting if useful.
* Until highlighting exists, at least navigate to the task context.

**Acceptance criteria:**

* Clicking a task result navigates to `/today`.
* No clickable search row performs no action.
* Project/resource/date search behavior remains unchanged.

---

### 16. Make all clickable rows honest

**Change:** Any row rendered as a button/link must perform a visible action.

**Files likely involved:**

* `Views.tsx`
* `Dashboard2.tsx`
* `DailySchedule.tsx`

**Implementation:**

* Audit all `button`, `Link`, and `onClick` rows.
* If there is no action, render as `div`.
* If row opens/navigates, add clear hover/focus styling.

**Acceptance criteria:**

* No fake clickable rows.
* Keyboard users can tab only to meaningful controls.

---

### 17. Improve task completion feedback

**Change:** When a task is checked/done, the UI should clearly reflect the change.

**Files likely involved:**

* `DailySchedule.tsx`
* task rows inside `Views.tsx`
* Dashboard task sections

**Implementation:**

* Completed tasks should visually de-emphasize.
* Completion should update immediately.
* If sync is pending, show subtle pending state.

**Acceptance criteria:**

* User never wonders “did that task complete?”
* Completed visibility respects Show completed toggle.

---

### 18. Improve date item hierarchy

**Change:** Dates should make time pressure obvious.

**Files likely involved:**

* `Dashboard2.tsx`
* `Views.tsx`
* date-related helpers

**Implementation:**
Group or visually tag:

* overdue
* today
* tomorrow
* this week
* later

**Acceptance criteria:**

* Date title and actual date are the most visible parts.
* Time/location/project are secondary.
* Overdue/today items are visually distinct without screaming.

---

### 19. Make destructive actions safer and clearer

**Change:** Archive/delete/remove actions need consistent treatment.

**Files likely involved:**

* `Views.tsx`
* `Dashboard2.tsx`
* `DailySchedule.tsx`

**Implementation:**

* Use consistent danger styling.
* For low-risk archive, no modal needed.
* For permanent/destructive reset, require confirmation.
* Keep reset/demo actions visually separate from normal settings actions.

**Acceptance criteria:**

* User can distinguish archive vs delete/reset.
* Dangerous settings actions do not sit beside normal actions casually like a landmine in a lunchbox.

---

## Phase 5: Redesign Project Detail for recovery

### 20. Re-layout Project Detail around recovery

**Change:** Project Detail should answer: “What is this, where did I leave off, what do I do next?”

**Files likely involved:**

* `src/components/workspace/Views.tsx`
* later extract into `src/components/workspace/projects/ProjectDetailView.tsx`

**New hierarchy:**

1. Project title/status/domain
2. Next Action
3. Latest Status
4. Active Tasks
5. Important Dates
6. Recovery Notes
7. Subcontexts
8. Suggestions/actions

**Acceptance criteria:**

* Next Action appears before long notes.
* Latest Status appears above secondary metadata.
* User can recover a project in under 10 seconds.

---

### 21. Convert project “Next Action” and “Latest Status” into hero fields

**Change:** These should not look like ordinary metadata fields.

**Files likely involved:**

* `Views.tsx`

**Implementation:**

* Use a two-card or stacked hero layout.
* Make them inline editable.
* Empty state should directly invite input:

```txt
No next action yet. Add the next physical step.
```

**Acceptance criteria:**

* Empty project still tells the user what to fill first.
* Editing remains inline and simple.

---

### 22. Make Project tasks and dates use the same components as Dashboard

**Change:** Avoid separate visual systems for the same objects.

**Files likely involved:**

* `Views.tsx`
* `Dashboard2.tsx`
* `DailySchedule.tsx`
* shared `RecordRow`, `InlineComposer`

**Implementation:**

* Use shared task row.
* Use shared date row.
* Use shared add composer.

**Acceptance criteria:**

* A task looks like a task everywhere.
* A date looks like a date everywhere.
* Behavior remains unchanged.

---

## Phase 6: Clean up visual system

### 23. Tighten card usage

**Change:** Stop wrapping everything in full bordered cards.

**Files likely involved:**

* `Dashboard2.tsx`
* `Views.tsx`
* `globals.css`

**Implementation:**
Use:

* full card for main sections
* row surfaces for records
* dividers for internal grouping
* no unnecessary nested cards

**Acceptance criteria:**

* Fewer nested borders.
* Dashboard feels lighter.
* Project Detail feels less boxed-in.

---

### 24. Normalize typography scale

**Change:** Create consistent title/body/metadata styles.

**Files likely involved:**

* `globals.css`
* shared UI components

**Implementation:**
Use clear levels:

* page title
* section title
* row title
* body text
* metadata
* caption

**Acceptance criteria:**

* Tiny uppercase labels are reduced.
* Metadata no longer competes with actual content.
* Page hierarchy is obvious.

---

### 25. Normalize button variants

**Change:** Buttons should use a small number of variants.

**Files likely involved:**

* `globals.css`
* shared `Button` component if created
* `Views.tsx`
* `Dashboard2.tsx`

**Variants:**

* primary
* secondary
* ghost
* danger
* icon

**Acceptance criteria:**

* Main action is visually obvious.
* Secondary actions do not look equally important.
* Icon-only buttons have accessible names.

---

### 26. Normalize status pills/badges

**Change:** Use consistent badges for task status, project status, date urgency, domains.

**Files likely involved:**

* `globals.css`
* `Views.tsx`
* `Dashboard2.tsx`

**Implementation:**
Create variants:

* neutral
* active
* done
* blocked
* overdue
* today
* project
* domain

**Acceptance criteria:**

* Same status has same color/style everywhere.
* Badges stay secondary, not visually louder than titles.

---

## Phase 7: Accessibility and interaction quality

### 27. Add ARIA/menu semantics to slash command menu

**Change:** Slash command menu should behave like an accessible command list.

**Files likely involved:**

* `src/components/workspace/editor/SlashCommandMenu.tsx`
* `BlockMarkdownEditor.tsx`

**Implementation:**

* Add `role="listbox"` or appropriate menu role.
* Add `aria-selected` to highlighted command.
* Ensure ArrowUp/ArrowDown/Enter/Escape work.
* Maintain focus in the editor.

**Acceptance criteria:**

* Keyboard-only interaction works.
* Screen-reader semantics are not garbage confetti.

---

### 28. Add menu semantics to block action menus

**Change:** Floating editor block actions should be accessible.

**Files likely involved:**

* `src/components/workspace/editor/BlockMarkdownEditor.tsx`

**Implementation:**

* Menu trigger has `aria-haspopup`.
* Menu has `role="menu"`.
* Items have `role="menuitem"`.
* Escape closes the menu.
* Focus returns to trigger/editor.

**Acceptance criteria:**

* Keyboard user can access block actions.
* Mobile user can discover block actions.

---

### 29. Audit icon-only buttons

**Change:** Every icon-only button needs an accessible label.

**Files likely involved:**

* `WorkspaceShell.tsx`
* `Dashboard2.tsx`
* `DailySchedule.tsx`
* `Views.tsx`
* `BlockMarkdownEditor.tsx`

**Implementation:**
Add `aria-label` for:

* close
* open menu
* delete
* archive
* expand/collapse
* move block
* add item

**Acceptance criteria:**

* No unlabeled icon-only buttons.
* Screen-reader names describe the actual action.

---

### 30. Strengthen focus states

**Change:** Make keyboard focus visible everywhere.

**Files likely involved:**

* `globals.css`
* shared button/input/row components

**Implementation:**

* Use consistent `focus-visible` ring.
* Avoid relying only on browser defaults.
* Ensure dark mode focus is visible.

**Acceptance criteria:**

* Full app can be navigated with keyboard.
* Current focus position is always obvious.

---

## Phase 8: Split giant files without changing behavior

### 31. Split `Views.tsx` by screen

**Change:** Break the huge workspace views file into screen-level components.

**Files likely involved:**

* `src/components/workspace/Views.tsx`
* create:

  * `src/components/workspace/views/InboxView.tsx`
  * `TodayView.tsx`
  * `WeekView.tsx`
  * `ProjectsView.tsx`
  * `ProjectDetailView.tsx`
  * `AreasView.tsx`
  * `ResourcesView.tsx`
  * `DatesView.tsx`
  * `ReviewsView.tsx`
  * `SearchView.tsx`
  * `ArchiveView.tsx`
  * `SettingsView.tsx`

**Implementation:**

* Extract one screen at a time.
* Do not redesign during extraction.
* Preserve exports used by route pages.

**Acceptance criteria:**

* No behavior changes.
* Imports still work.
* Typecheck passes.
* Future screen redesigns are safer.

---

### 32. Split Dashboard components

**Change:** Break `Dashboard2.tsx` into smaller dashboard components.

**Files likely involved:**

* `src/components/workspace/Dashboard2.tsx`
* create:

  * `dashboard/DashboardShell.tsx`
  * `dashboard/QuickCapture.tsx`
  * `dashboard/NotepadSection.tsx`
  * `dashboard/DashboardDatesSection.tsx`
  * `dashboard/DashboardTimelineSection.tsx`
  * `dashboard/DashboardTasksSection.tsx`
  * `dashboard/DashboardProjectsSection.tsx`

**Implementation:**

* Extract without changing logic first.
* Redesign after extraction or in small commits.

**Acceptance criteria:**

* Dashboard still passes all existing tests.
* Each section can be edited without touching unrelated sections.

---

### 33. Split editor menu/components

**Change:** Reduce `BlockMarkdownEditor.tsx` complexity.

**Files likely involved:**

* `BlockMarkdownEditor.tsx`
* `SlashCommandMenu.tsx`
* possible new editor components

**Implementation:**
Extract:

* block row
* block controls
* block action menu
* editor toolbar/status
* parser helpers if embedded

**Acceptance criteria:**

* Editor behavior unchanged.
* Slash commands still work.
* Autosave still works.
* Accessibility pass becomes easier.

---

## Phase 9: Improve Settings and sync clarity

### 34. Make sync state human-readable first, technical second

**Change:** Settings should answer “is my data safe?” before showing metrics.

**Files likely involved:**

* `Views.tsx`
* `Notice` component

**Implementation:**
Top status examples:

* “All changes synced”
* “Offline, 3 changes waiting”
* “Sync error, retry available”
* “Refresh blocked because local changes are pending”

**Acceptance criteria:**

* User understands state without reading technical metrics.
* Existing refresh/reset behavior unchanged.

---

### 35. Visually separate dangerous settings actions

**Change:** Demo reset/clear actions should not look like normal controls.

**Files likely involved:**

* `Views.tsx`

**Implementation:**

* Put destructive/demo reset actions in a separate danger zone section.
* Require explicit confirmation.
* Use danger styling.

**Acceptance criteria:**

* User cannot accidentally reset data.
* Danger zone is visually distinct.

---

## Phase 10: Verification and regression

### 36. Add/adjust Playwright tests for Dashboard redesign

**Change:** Ensure the redesigned dashboard does not break core behavior.

**Files likely involved:**

* existing `tests` or `e2e` directory

**Test cases:**

* Dashboard renders
* Quick Capture creates inbox item
* Notepad autosaves
* Sections collapse/expand
* Daily timeline task add/edit/done/delete
* Date add/edit/archive
* Show completed toggle works

**Acceptance criteria:**

* Tests pass before and after redesign.
* No functionality silently dies for aesthetics, the classic frontend crime.

---

### 37. Add mobile viewport regression checks

**Change:** Test common mobile widths.

**Files likely involved:**

* Playwright config/tests

**Viewports:**

* 390px
* 430px
* 768px
* 1024px
* 1440px

**Acceptance criteria:**

* No horizontal overflow.
* Bottom nav visible only on mobile/tablet breakpoint as intended.
* Sidebar visible on desktop.
* Main actions reachable.

---

### 38. Add keyboard/accessibility smoke checks

**Change:** Verify interaction basics.

**Files likely involved:**

* Playwright tests
* manual QA checklist

**Checks:**

* Tab through Dashboard
* Enter submits composers
* Escape closes menus
* Slash menu keyboard navigation
* Focus visible on controls
* Icon buttons labelled

**Acceptance criteria:**

* Keyboard user can operate the main flows.
* No invisible focus traps.

---

# Recommended implementation order

1. Fix Search task result route to `/today`.
2. Add mobile bottom nav with Dashboard, Inbox, Today, Projects, Search.
3. Rework Dashboard hierarchy visually.
4. Extract `Section`, `RecordRow`, `InlineComposer`, `EmptyState`, `Notice`.
5. Make mobile hidden actions visible.
6. Re-layout Project Detail around recovery.
7. Prepare Notepad for embedded structured task/date rows.
8. Standardize buttons, pills, empty states, and notices.
9. Improve accessibility on slash/block menus.
10. Split `Views.tsx`, `Dashboard2.tsx`, and editor components.

# Developer handoff rule

Do **not** do all of this in one monster patch. The correct sequence is:

```txt
Patch 1:
Search task route + mobile bottom nav

Patch 2:
Dashboard visual hierarchy

Patch 3:
Shared UI primitives

Patch 4:
Project Detail recovery layout

Patch 5:
Embedded structured records inside Notepad

Patch 6:
Accessibility + mobile interaction pass

Patch 7:
File/component cleanup
```

# Verification commands

```bash
npm run typecheck
npm run build
npm run test:e2e
```

If tests are missing or partial:

```bash
npx playwright test
```
