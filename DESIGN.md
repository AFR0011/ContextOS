---
version: 0.1
name: ContextOS Design System
status: active-draft
product: ContextOS
primary_mode: mobile-first personal command sheet
last_updated: 2026-06-04
influences:
  primary_spine: Linear
  editable_workspace: Notion
  date_deadline_surfaces: Cal.com
  future_command_palette: Raycast
  reflective_reviews: Claude
---

# ContextOS DESIGN.md

## 0. Purpose

ContextOS is a personal context-management system. It is not a generic SaaS dashboard, a Notion clone, a habit toy, or an analytics page with decorative rectangles pretending to be insight.

The product should feel like a **calm personal command sheet**: fast enough for daily capture, structured enough for real tasks/projects/deadlines, and quiet enough that the user can think.

The central design sentence:

> ContextOS is a mobile-first personal command sheet for capturing, organizing, and recovering context across tasks, projects, deadlines, notes, and reviews.

The UI should help the user answer:

```text
What is on my mind?
What is dated or time-sensitive?
What do I need to do next?
What projects need recovery?
What open loops should I close, defer, or drop?
```

Design should optimize for **clarity under load**, not aesthetic spectacle. If a design choice looks impressive but slows capture or recovery, it is wrong. Tragic, yes. Still wrong.

---

## 1. Source Influences and Responsibility Boundaries

ContextOS should not copy any single brand system. Use these references by responsibility, not as wholesale skins.

### 1.1 Linear: Primary Visual Spine

Use Linear as the main reference for:

- precise product feel
- restrained surfaces
- dense but readable lists
- technical seriousness
- issue/task/project state clarity
- subtle borders and low-drama hierarchy
- small accent usage

ContextOS should inherit Linear's discipline, not its exact dark marketing page.

### 1.2 Notion: Editable Workspace Behavior

Use Notion as the reference for:

- collapsible sections
- document-like dashboard flow
- editable project/status surfaces
- plain text comfort
- low-friction capture
- workspace calm

Do not make every object a Notion block. Tasks, deadlines, projects, and reviews remain structured ContextOS records.

### 1.3 Cal.com: Dates and Deadline Clarity

Use Cal.com as the reference for:

- dated item lists
- calendar/deadline legibility
- white/light surfaces
- simple scheduling language
- clear overdue/upcoming states
- mobile-friendly time-sensitive rows

Dates should be obvious without visual shouting.

### 1.4 Raycast: Future Command Layer

Use Raycast later for:

- command palette
- quick capture launcher
- keyboard-first actions
- searchable action menus
- compact command rows
- fast global navigation

Do not make the whole app Raycast-dark by default. Raycast is an interaction influence, not the base theme.

### 1.5 Claude: Reviews and Reflective Surfaces

Use Claude's warmth only for:

- daily shutdown
- weekly review
- reflective summaries
- empty states that should feel human, not corporate

Do not over-soften execution pages. The app must push action, not become a cream-colored meditation pamphlet with buttons.

---

## 2. Product Design Principles

### 2.1 Mobile First, Desktop Capable

The primary daily use case is opening ContextOS on a phone and immediately seeing what matters.

Rules:

- Design single-column first.
- Tap targets must be comfortable.
- Section headers must be easy to hit.
- Avoid hover-only controls.
- Avoid dense desktop tables as the primary interaction.
- Desktop may add width, not complexity.

### 2.2 Capture Before Organization

Capture should be faster than organizing.

Rules:

- Quick capture should always be one obvious action away.
- Notepad should accept messy thoughts.
- Structured conversion can happen later.
- Do not require project/domain selection before capture.

### 2.3 Structured Data Where It Matters

ContextOS is not just a text document.

Rules:

- Tasks are real tasks.
- Deadlines are real deadlines.
- Projects are real projects.
- Reviews are real reviews.
- The scratchpad is freeform.
- Do not duplicate tasks as fake plain-text checkboxes unless explicitly marked as scratch content.

### 2.4 Recovery Over Display

A good ContextOS screen helps the user resume work.

Every project surface should expose:

- current objective
- latest status
- next action
- blockers/open loops
- relevant dated pressure

A pretty project page that does not help recovery is just a scrapbook with login.

### 2.5 Calm Density

The app should show enough information to act without overwhelming the user.

Rules:

- Lists should be compact.
- Typography should be readable.
- Borders should organize without boxing everything into visual prison cells.
- Empty space should separate ideas, not inflate the interface.

### 2.6 Action Bias

Every important item should have a next possible action.

Examples:

- Task: complete, edit, reschedule, drop.
- Deadline: open, mark handled, create task.
- Project: update status, set next action, open detail.
- Inbox item: convert, archive, delete.

### 2.7 No Fake Intelligence

Do not display speculative AI suggestions as if they are truth.

Future intelligence should be:

- explainable
- read-only by default
- approval-gated
- clearly marked as suggestion

No autonomous life management gremlins. We have suffered enough as a species.

---

## 3. Visual Identity

### 3.1 Desired Feel

ContextOS should feel:

```text
calm
precise
private
mobile-first
structured
editable
quietly technical
human enough for reflection
serious enough for execution
```

### 3.2 Avoided Feel

ContextOS should not feel:

```text
corporate analytics dashboard
Notion clone
calendar clone
Jira clone
AI-agent cockpit
habit tracker toy
marketing landing page
crypto finance dashboard
startup KPI shrine
```

---

## 4. Color System

The default theme is light. Dark mode can come later, but the token structure should support it.

The palette combines:

- Linear-like precision and restrained accent use
- Notion-like warm white workspace calm
- Cal.com-like date/deadline clarity
- small Raycast-like accent potential for command actions

### 4.1 Light Theme Tokens

```css
:root {
  color-scheme: light;

  /* Canvas */
  --cos-bg: #f7f8fb;
  --cos-bg-soft: #fafafa;
  --cos-bg-elevated: #ffffff;
  --cos-bg-inset: #f1f3f7;

  /* Text */
  --cos-text: #172033;
  --cos-text-strong: #0f172a;
  --cos-text-muted: #64748b;
  --cos-text-subtle: #94a3b8;
  --cos-text-inverse: #ffffff;

  /* Borders */
  --cos-border: #e2e8f0;
  --cos-border-soft: #edf2f7;
  --cos-border-strong: #cbd5e1;

  /* Primary accent: Linear-inspired blue/lavender */
  --cos-primary: #5e6ad2;
  --cos-primary-hover: #4f5bc4;
  --cos-primary-soft: #eef0ff;
  --cos-primary-border: #cfd4ff;
  --cos-primary-text: #3841a3;

  /* Operational semantic colors */
  --cos-success: #16a34a;
  --cos-success-soft: #ecfdf3;
  --cos-success-border: #bbf7d0;
  --cos-success-text: #166534;

  --cos-warning: #d97706;
  --cos-warning-soft: #fffbeb;
  --cos-warning-border: #fde68a;
  --cos-warning-text: #92400e;

  --cos-danger: #dc2626;
  --cos-danger-soft: #fef2f2;
  --cos-danger-border: #fecaca;
  --cos-danger-text: #991b1b;

  --cos-info: #2563eb;
  --cos-info-soft: #eff6ff;
  --cos-info-border: #bfdbfe;
  --cos-info-text: #1d4ed8;

  /* Project/status accents */
  --cos-project: #7c3aed;
  --cos-project-soft: #f5f3ff;
  --cos-date: #0891b2;
  --cos-date-soft: #ecfeff;
  --cos-review: #cc785c;
  --cos-review-soft: #faf1ed;

  /* Focus */
  --cos-focus: rgba(94, 106, 210, 0.38);
}
```

### 4.2 Dark Theme Tokens

Dark mode should feel closer to Linear/Raycast: precise, low-glare, command-capable.

```css
[data-theme="dark"] {
  color-scheme: dark;

  --cos-bg: #07080a;
  --cos-bg-soft: #0d0f12;
  --cos-bg-elevated: #111318;
  --cos-bg-inset: #090a0d;

  --cos-text: #f4f6fb;
  --cos-text-strong: #ffffff;
  --cos-text-muted: #a1a8b3;
  --cos-text-subtle: #707887;
  --cos-text-inverse: #050608;

  --cos-border: #242832;
  --cos-border-soft: #1a1e26;
  --cos-border-strong: #343a46;

  --cos-primary: #828fff;
  --cos-primary-hover: #a2aaff;
  --cos-primary-soft: rgba(130, 143, 255, 0.14);
  --cos-primary-border: rgba(130, 143, 255, 0.32);
  --cos-primary-text: #c8ceff;

  --cos-success: #22c55e;
  --cos-success-soft: rgba(34, 197, 94, 0.12);
  --cos-success-border: rgba(34, 197, 94, 0.30);
  --cos-success-text: #86efac;

  --cos-warning: #f59e0b;
  --cos-warning-soft: rgba(245, 158, 11, 0.12);
  --cos-warning-border: rgba(245, 158, 11, 0.30);
  --cos-warning-text: #fcd34d;

  --cos-danger: #f87171;
  --cos-danger-soft: rgba(248, 113, 113, 0.12);
  --cos-danger-border: rgba(248, 113, 113, 0.30);
  --cos-danger-text: #fecaca;

  --cos-info: #60a5fa;
  --cos-info-soft: rgba(96, 165, 250, 0.12);
  --cos-info-border: rgba(96, 165, 250, 0.30);
  --cos-info-text: #bfdbfe;

  --cos-project: #a78bfa;
  --cos-project-soft: rgba(167, 139, 250, 0.12);
  --cos-date: #22d3ee;
  --cos-date-soft: rgba(34, 211, 238, 0.12);
  --cos-review: #e8a55a;
  --cos-review-soft: rgba(232, 165, 90, 0.12);

  --cos-focus: rgba(130, 143, 255, 0.45);
}
```

### 4.3 Color Usage Rules

- Primary accent is for current navigation, focus rings, primary actions, and rare highlights.
- Success is for completed/healthy state.
- Warning is for stale, risky, soon, needs attention.
- Danger is for overdue, failed, destructive, or blocked.
- Project/date/review colors are subtle section identifiers, not decorative confetti.
- Do not use more than one strong accent in the same small component.

---

## 5. Typography

Use system-first typography. Do not depend on custom commercial fonts.

### 5.1 Font Stack

```css
--cos-font-sans: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--cos-font-mono: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
```

If Inter is not installed/imported, system UI is acceptable.

### 5.2 Type Scale

```css
--cos-text-xs: 0.75rem;     /* 12px */
--cos-text-sm: 0.875rem;    /* 14px */
--cos-text-md: 1rem;        /* 16px */
--cos-text-lg: 1.125rem;    /* 18px */
--cos-text-xl: 1.25rem;     /* 20px */
--cos-text-2xl: 1.5rem;     /* 24px */
--cos-text-3xl: 1.875rem;   /* 30px */
```

### 5.3 Type Roles

```css
--cos-page-title-size: var(--cos-text-2xl);
--cos-page-title-weight: 700;
--cos-section-title-size: var(--cos-text-md);
--cos-section-title-weight: 650;
--cos-card-title-size: var(--cos-text-sm);
--cos-card-title-weight: 650;
--cos-body-size: var(--cos-text-sm);
--cos-body-line-height: 1.5;
--cos-caption-size: var(--cos-text-xs);
--cos-caption-line-height: 1.35;
```

### 5.4 Typography Rules

- Use compact text for lists.
- Use stronger weight, not size, for hierarchy inside dense views.
- Avoid giant headings inside app screens.
- Reserve larger display type for onboarding or empty states.
- Keep line lengths comfortable on desktop: `max-width: 72ch` for prose/review content.

---

## 6. Spacing, Radius, Borders, Elevation

### 6.1 Spacing Scale

```css
--cos-space-1: 0.25rem;  /* 4px */
--cos-space-2: 0.5rem;   /* 8px */
--cos-space-3: 0.75rem;  /* 12px */
--cos-space-4: 1rem;     /* 16px */
--cos-space-5: 1.25rem;  /* 20px */
--cos-space-6: 1.5rem;   /* 24px */
--cos-space-8: 2rem;     /* 32px */
--cos-space-10: 2.5rem;  /* 40px */
```

### 6.2 Radius

```css
--cos-radius-xs: 0.375rem; /* 6px */
--cos-radius-sm: 0.5rem;   /* 8px */
--cos-radius-md: 0.75rem;  /* 12px */
--cos-radius-lg: 1rem;     /* 16px */
--cos-radius-xl: 1.25rem;  /* 20px */
--cos-radius-pill: 999px;
```

Usage:

- Buttons: `8px` to `999px` depending on style.
- Cards/sections: `16px`.
- Inputs: `10px` to `12px`.
- Small pills/badges: `999px`.

### 6.3 Borders

- Default border: 1px solid `--cos-border`.
- Use borders more than shadows.
- Hairline structure is preferred over floating card drama.

### 6.4 Elevation

```css
--cos-shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.05);
--cos-shadow-md: 0 8px 24px rgba(15, 23, 42, 0.08);
--cos-shadow-lg: 0 18px 48px rgba(15, 23, 42, 0.12);
```

Usage:

- Default app surfaces should use no shadow or `shadow-sm`.
- Modals/sheets may use `shadow-md`.
- Avoid `shadow-lg` unless the element truly overlays the app.

---

## 7. Layout System

### 7.1 App Shell

The app shell should be simple:

```text
Top/header area
Main content
Optional bottom/mobile nav
```

Mobile:

- single column
- sticky bottom nav or reachable primary actions
- quick capture always obvious
- avoid left sidebar dependence

Desktop:

- optional left nav/sidebar
- main content max width
- dashboard may use two columns only when it improves scanability

### 7.2 Main Content Width

```css
--cos-content-narrow: 720px;
--cos-content-default: 960px;
--cos-content-wide: 1180px;
```

Rules:

- Dashboard mobile: full width with safe padding.
- Review/prose pages: narrow.
- Data-heavy project/task lists: default/wide.

### 7.3 Mobile Padding

```css
.main-mobile {
  padding: 16px;
  padding-bottom: calc(88px + env(safe-area-inset-bottom));
}
```

Keyboard-safe surfaces should not hide the active input.

---

## 8. Core Components

### 8.1 Button

Button hierarchy:

1. Primary
2. Secondary
3. Ghost
4. Destructive
5. Inline text action

Primary:

```text
Use for one main action per region: Add task, Save, Start review.
```

Secondary:

```text
Use for safe alternatives: Open project, View all.
```

Ghost:

```text
Use for row actions and low-weight controls.
```

Destructive:

```text
Use only for delete/drop/archive destructive flows.
```

Rules:

- Minimum tap height on mobile: 40px.
- Icon-only buttons need accessible labels.
- Primary buttons should be scarce.

### 8.2 Input/Textarea

Inputs should feel like tools, not forms from a government website.

Rules:

- Use 12px radius.
- Border by default.
- Clear focus ring.
- Placeholder text should be useful, not cute.
- Textarea should autosize or have comfortable fixed height.
- Avoid saving every keystroke to the server. Debounce or save-on-blur where appropriate.

### 8.3 Card/Surface

Use cards for grouped operational information:

- Dashboard sections
- Project summaries
- Review blocks
- Deadline groups

Rules:

- Default card background: `--cos-bg-elevated`.
- Use subtle border.
- Avoid nested cards beyond one level unless absolutely necessary.

### 8.4 List Row

List rows are the main unit of ContextOS.

A row may contain:

- checkbox/status icon
- title
- secondary metadata
- date/status badge
- compact actions

Rows should support comfortable mobile tapping.

Recommended row structure:

```text
[status] Main title                         [badge/date]
         Secondary metadata / project / note
```

### 8.5 Badge/Pill

Use badges for:

- overdue
- today
- soon
- blocked
- stale
- project/domain labels

Rules:

- Small text.
- Soft background.
- Do not create a rainbow taxonomy unless the user explicitly asks for visual chaos, which they should not.

### 8.6 Collapsible Section

Collapsible sections are central to Dashboard 2.0.

Required behavior:

- Header includes chevron, title, optional count, optional right action.
- Tap/click header toggles open state.
- Open/closed state persists per user.
- Body has clear vertical rhythm.

Example:

```text
▾ Tasks  7
  [ ] Fix local date handling
  [ ] Draft ContextOS design file

▸ Projects  4
```

### 8.7 Empty State

Empty states should be useful and calm.

Bad:

```text
No data yet!
```

Good:

```text
No tasks planned for today.
Capture one, or pull a next action from an active project.
```

Empty states should offer one next action, not a philosophical essay.

---

## 9. Dashboard 2.0: Mobile Command Sheet

The dashboard is the signature product surface.

### 9.1 Concept

Dashboard 2.0 is a mobile-first editable command sheet combining:

- Notepad
- Dates
- Tasks
- Projects
- Reviews later

It should feel like an operating page, not a report.

### 9.2 Default Structure

```text
Dashboard

▾ Notepad
  Freeform scratch area...

▾ Dates
  Overdue / upcoming items

▾ Tasks
  Today / overdue tasks

▾ Projects
  Active project recovery cards
```

### 9.3 Notepad Section

Purpose:

- scratch thinking
- temporary notes
- fast capture
- messy ideas before structure

Behavior:

- multiline text area
- debounced autosave
- offline compatible
- clear/archive action
- no project required

Style:

- slightly inset surface
- calm placeholder
- minimal toolbar or no toolbar

Placeholder examples:

```text
Scratch what is on your mind...
Capture first. Organize later.
```

### 9.4 Dates Section

Purpose:

- expose time pressure
- prevent deadline blindness

Content:

- overdue deadlines
- upcoming deadlines
- tasks with due dates
- tasks planned for today/this week if applicable

Style:

- compact rows
- date aligned right or under title on narrow screens
- overdue uses danger styling
- today uses primary/info styling
- soon uses warning styling

Rules:

- Date calculations must use local date keys.
- Do not use UTC ISO slicing for user-facing dates.

### 9.5 Tasks Section

Purpose:

- show executable work

Content:

- overdue tasks
- planned today tasks
- optionally next actions from projects

Actions:

- complete/uncomplete
- add inline
- edit/open
- reschedule later

Style:

- checkbox-first rows
- completed tasks subdued
- overdue tasks flagged but not visually screaming

### 9.6 Projects Section

Purpose:

- recover active project context

Each project card/row should show:

- title
- next action
- latest status
- stale/missing-next-action indicator
- linked deadline pressure if relevant

Style:

- compact recovery cards
- next action visually more prominent than description
- status muted but readable

Good project card:

```text
ContextOS
Next: Fix dashboard date handling
Status: Offline sync works; task editing is still weak.
⚠ No weekly review in 5 days
```

### 9.7 Dashboard Anti-Patterns

Do not add:

- charts
- KPI cards
- decorative metrics
- giant inspirational headers
- AI chat panel as default
- complex drag-and-drop before basic usage works
- separate fake checklist layer detached from real tasks

---

## 10. Navigation

### 10.1 Primary Navigation

Recommended top-level areas:

```text
Dashboard
Inbox
Today / Tasks
Projects
Deadlines
Reviews
Search
Archive
Settings
```

Mobile may use fewer visible tabs:

```text
Dashboard
Inbox
Projects
Search
More
```

### 10.2 Quick Capture

Quick capture should be globally accessible.

Patterns:

- floating action button on mobile
- top bar button on desktop
- future command palette shortcut

Quick capture should accept plain text and slash commands.

Examples:

```text
/task Fix ContextOS local date bug @ContextOS due:2026-06-06
/note Ask IT about server Docker support @EMU RAG
/status @MSc Thesis RF weighted baseline done; next run LOAO scenarios.
/deadline Submit final report date:2026-06-18
```

---

## 11. Page-Level Design Guidance

### 11.1 Dashboard

Mood:

```text
command sheet
```

Priorities:

- current day
- quick capture
- dated pressure
- executable tasks
- project recovery

### 11.2 Inbox

Mood:

```text
triage table, not storage closet
```

Priorities:

- process quickly
- convert/archive/drop
- show age of items
- keep rows compact

### 11.3 Tasks / Today

Mood:

```text
execution list
```

Priorities:

- what is due/overdue/planned
- completion
- reschedule/drop
- project linkage

### 11.4 Projects

Mood:

```text
recovery index
```

Priorities:

- active project status
- next action
- open loops
- linked tasks/deadlines
- stale indicators

### 11.5 Project Detail

Mood:

```text
working memory file
```

Required visible fields:

- Objective
- Latest Status
- Next Action
- Open Loops
- Tasks
- Deadlines
- Notes
- Decisions later

### 11.6 Deadlines

Mood:

```text
time pressure ledger
```

Priorities:

- overdue
- upcoming
- linked project/tasks
- handled/archive state
- create task from deadline

### 11.7 Reviews

Mood:

```text
structured reflection
```

Priorities:

- daily shutdown
- weekly review
- what moved
- what stuck
- next action
- what to drop

Use slightly warmer tone and review accent here.

### 11.8 Search

Mood:

```text
recovery tool
```

Priorities:

- fast results
- type filters
- project/domain filters
- date filters
- recent queries later

### 11.9 Settings

Mood:

```text
boring and safe, as settings should be
```

Priorities:

- account
- data export
- sync status
- theme
- offline state

---

## 12. Interaction Patterns

### 12.1 Save Behavior

Rules:

- Use explicit Save for high-stakes edits.
- Use debounced autosave for scratchpad and low-risk notes.
- Use save-on-blur for compact inline edits.
- Show saving/saved/error states where relevant.
- Do not create one sync mutation per keystroke.

### 12.2 Offline-First Behavior

Offline behavior should be visible but not noisy.

States:

```text
Synced
Saving...
Offline: changes queued
Sync issue: needs attention
```

Rules:

- Queue local changes.
- Show pending outbox count if useful.
- Do not block capture while offline.
- Avoid silent data loss above all else.

### 12.3 Destructive Actions

Actions such as delete/drop/archive should be clear.

Rules:

- Archive is softer than delete.
- Delete should require confirmation if irreversible.
- Dropping a task should be distinct from completing it.

### 12.4 Keyboard and Command Behavior

Future command palette should use Raycast-like patterns:

- `Cmd/Ctrl + K`: command palette
- `N`: quick note/capture where safe
- `/`: slash command in capture input
- `Esc`: close modal/palette

Do not require keyboard mastery for mobile use.

---

## 13. Accessibility

Minimum requirements:

- All icon buttons must have accessible labels.
- Focus states must be visible.
- Color cannot be the only indicator of status.
- Touch targets should be at least 40px high on mobile.
- Text contrast must be readable in light and dark modes.
- Collapsible section state should be communicated with `aria-expanded`.
- Form fields need labels, even if visually hidden.

---

## 14. Motion

Motion should clarify state, not perform theater.

Allowed:

- subtle expand/collapse transitions
- small hover/focus changes
- modal/sheet entrance
- saving state feedback

Avoid:

- bouncy animations
- long transitions
- scroll hijacking
- decorative loaders

Timing:

```css
--cos-motion-fast: 120ms;
--cos-motion-normal: 180ms;
--cos-motion-slow: 240ms;
--cos-ease-standard: cubic-bezier(0.2, 0, 0, 1);
```

---

## 15. Content Voice

ContextOS should speak plainly.

Tone:

```text
clear
brief
calm
operational
occasionally warm in review contexts
never corporate
```

Good labels:

```text
Next action
Latest status
Open loops
Planned today
Overdue
Handled
Drop
Archive
Recover project
```

Bad labels:

```text
Boost productivity
Unlock your potential
Optimize your life
AI-powered synergy dashboard
```

The app should not motivate the user with slogans. It should reduce ambiguity and make the next action visible. Apparently that is too advanced for many products.

---

## 16. Implementation Guidance for Current ContextOS Stack

Current stack context:

```text
Next.js App Router
React
TypeScript
Prisma/Postgres
Tailwind CSS v4
lucide-react
offline IndexedDB/outbox sync patterns
```

### 16.1 CSS Token Integration

Add design tokens to `src/app/globals.css` under `:root`.

Current app has:

```css
:root {
  color-scheme: light;
  --background: #f7f8fb;
  --foreground: #172033;
}
```

Keep compatibility aliases:

```css
:root {
  --background: var(--cos-bg);
  --foreground: var(--cos-text);
}
```

Do not rewrite the whole styling system just to satisfy a design doc. That is how refactors become unpaid internships.

### 16.2 Tailwind Usage

Prefer semantic utility combinations based on the CSS variables.

Examples:

```tsx
className="rounded-2xl border border-[var(--cos-border)] bg-[var(--cos-bg-elevated)]"
```

Use component abstractions for repeated patterns:

- `Button`
- `Surface`
- `Badge`
- `CollapsibleSection`
- `ListRow`
- `StatusPill`

If the app does not yet have a component library, introduce only the pieces needed for the current feature.

### 16.3 Icons

Use `lucide-react` consistently.

Recommended icons:

```text
Dashboard: LayoutDashboard
Inbox: Inbox
Tasks: CheckSquare / CircleCheck
Projects: FolderKanban / Folder
Deadlines: CalendarClock
Reviews: NotebookPen
Search: Search
Archive: Archive
Settings: Settings
Collapse: ChevronRight / ChevronDown
Warning: TriangleAlert
Status: Circle / Dot
Quick capture: Plus / PenLine
```

### 16.4 Component Naming

Use boring clear names:

```text
DashboardCommandSheet
DashboardSection
DashboardNotepad
DashboardDates
DashboardTasks
DashboardProjects
TaskRow
DatedItemRow
ProjectRecoveryCard
StatusPill
```

Avoid vague names like:

```text
MagicPanel
SmartCard
ProductivityBlock
AIWidget
```

Humanity has endured enough vague abstractions.

---

## 17. Data Display Rules

### 17.1 Dates

All user-facing date keys must be local-date based.

Do not use:

```ts
new Date().toISOString().slice(0, 10)
```

Use:

```ts
export function localDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}
```

### 17.2 Completion vs Handling

A task can be completed.

A deadline should be handled, archived, or linked to a completed deliverable. Do not pretend a deadline is the same object as a task unless the data model explicitly says so.

### 17.3 Staleness

Use staleness indicators carefully.

Suggested defaults:

```text
Project latest status stale after: 7 days
Project with no next action: warning immediately
Overdue task: danger immediately
Deadline within 3 days: warning
Deadline today: danger/info depending on tone
```

### 17.4 Counts

Counts should be useful.

Good:

```text
Tasks 6
Dates 4
Projects 3
Inbox 12
```

Bad:

```text
Total life objects: 287
Productivity score: 94%
```

No fake life scoring.

---

## 18. Responsive Behavior

### 18.1 Mobile

Dashboard:

```text
Header
Quick capture / notepad
Collapsible sections
Bottom nav / safe area
```

Rules:

- one column
- section spacing: 12px to 16px
- rows: minimum 44px when interactive
- inline edit controls must not crowd row text

### 18.2 Tablet/Desktop

Possible dashboard layout:

```text
Left column:
- Notepad
- Tasks

Right column:
- Dates
- Projects
```

Only use two columns if it keeps reading order sane. The mobile experience is the source of truth.

---

## 19. Design QA Checklist

Use this checklist before merging UI changes.

```text
[ ] Does this screen work on a phone first?
[ ] Is the primary action obvious?
[ ] Does the user know what changed after an action?
[ ] Are tasks/deadlines/projects still structured records?
[ ] Can the user recover context faster than before?
[ ] Is any visual element decorative without helping action or comprehension?
[ ] Are offline/sync states visible where needed?
[ ] Are dates local-date safe?
[ ] Are tap targets large enough?
[ ] Does the empty state tell the user what to do next?
[ ] Did we avoid adding charts/KPIs unless explicitly needed?
[ ] Did we avoid rebuilding Notion, Jira, or an AI cockpit by accident?
```

---

## 20. Feature-Specific Design Specs

### 20.1 Dashboard 2.0 Must-Haves

```text
[ ] Collapsible Notepad section
[ ] Collapsible Dates section
[ ] Collapsible Tasks section
[ ] Collapsible Projects section
[ ] Persist collapsed state per user
[ ] Dashboard scratchpad with debounced autosave
[ ] Dates from real deadlines/tasks
[ ] Tasks from real task records
[ ] Projects from active project records
[ ] Mobile-first layout
[ ] Local date handling
[ ] Offline-compatible actions
```

### 20.2 Dashboard 2.0 Should-Haves

```text
[ ] Add task inline
[ ] Complete task inline
[ ] Edit task title inline or via sheet
[ ] Mark deadline handled/archive if supported
[ ] Project missing-next-action indicator
[ ] Project stale-status indicator
[ ] Clear/archive notepad
[ ] Section counts
```

### 20.3 Dashboard 2.0 Later

```text
[ ] Reorder sections
[ ] Command palette
[ ] Project status timeline
[ ] Review-generated next actions
[ ] Local LLM suggestions
[ ] Drag/drop planning
[ ] Calendar integration
```

---

## 21. Anti-Goals

Do not build these unless a later spec explicitly requests them:

```text
full Notion block editor
analytics dashboard
habit score dashboard
AI agent home screen
calendar clone
collaboration workspace
public sharing
team SaaS interface
large marketing hero inside the app
complex theme builder
visual gamification system
```

---

## 22. Codex / Agent Instructions

When an AI coding agent uses this file:

1. Inspect the current code before changing anything.
2. Reuse existing data models, components, and offline sync patterns where possible.
3. Make the smallest coherent implementation.
4. Do not refactor unrelated systems.
5. Preserve existing functionality and tests.
6. Use semantic design tokens from this file.
7. Prioritize mobile dashboard usability.
8. Keep structured records structured.
9. Do not add AI features unless the task explicitly asks for them.
10. Run verification before reporting completion.

Verification commands:

```bash
npm run typecheck
npm run build
npm run test:e2e
```

Final report should include:

```text
Summary
Files changed
Schema/migration changes
Design tokens/components added
Verification results
Known limitations
Follow-up tasks
```

---

## 23. Ownership Rule

A ContextOS UI change is good only if it improves at least one of these:

```text
capture speed
context recovery
next-action clarity
deadline visibility
project continuity
review usefulness
offline trust
```

If it does not improve one of those, it is probably decoration. Decoration has its place. That place is not blocking the user from finding the next action.
