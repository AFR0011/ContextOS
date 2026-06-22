# ContextOS Product Specification v1

## Status

**Version:** v1.0 (implementation batch v0.2.8)
**Product Type:** Execution-first context recovery system  
**Primary User:** Single-user MVP  
**Platform:** Online-first PWA, offline capture later  
**Architecture Direction:** Next.js + PostgreSQL  
**Purpose:** Replace Notion, task apps, and phone notes for daily execution, project recovery, open-loop tracking, and lightweight context management.

### Deployment Readiness - 2026-06-15 Audit

v0.2.8 keeps the v0.2.7 production-readiness foundation and repairs the first remote GitHub Actions failure path: Dashboard Notepad slash-command timing/hydration. It also adds a first mobile accessibility foundation for touched task/editor controls.

Remaining deployment-hardening work:

1. Run a production-like preview plus migration, backup/restore, monitoring, and rollback rehearsal.
2. Decide whether provider/WAF-level auth protection is needed in addition to the v0.2.6 app-level limiter.
3. Run deeper installed-PWA upgrade smoke from an older cached worker.
4. Finish broader mobile editor/action accessibility work outside the task-title wrapping fixed in v0.2.3 and touched controls fixed in v0.2.8.
5. Polish Dashboard hierarchy so Quick Capture, Notepad, Today pressure, and project recovery read with clearer priority.

Deployment acceptance requires two-user isolation tests, sequential Prisma/typecheck/build/e2e checks, desktop/mobile browser smoke, and documented recovery evidence. The detailed audit is in `docs/AUDIT_2026-06-15.md`.

---

## 1. Product Definition

ContextOS is an execution-first context recovery system for managing tasks, open loops, projects, important dates, lightweight notes, and review-based recovery.

Its core promise is:

> Capture fast. Know what matters today. Recover project context after breaks. Track half-finished work. Replace Notion, task apps, and phone notes.

ContextOS should help the user answer, within roughly 30 seconds:

- What matters today?
- What is overdue?
- What did I capture?
- What was I recently working on?
- What needs recovery?
- What is blocked, waiting, or half-finished?

---

## 2. Non-Goals

ContextOS is **not**:

- A journal.
- A finance tracker.
- A health tracker.
- A social or relationship analysis system.
- A book note system.
- A general life archive.
- A full autonomous agent platform.
- A general Notion clone or arbitrary database builder.
- A task-manager clone with excessive metadata.
- A maintenance-heavy productivity system.

The MVP should optimize for execution and recovery, not broad life capture. It may replace Notion pages that support execution, recovery, PARA organization, or searchable resources; it should not recreate Notion's fully customizable database/platform surface.

---

## 3. Core Product Principles

### 3.1 Execution First

The system is organized around what needs action, what is open, what is blocked, and what should be resumed.

### 3.2 Fast Capture

Capture must be possible without choosing a destination, project, tag, or type.

Default behavior:

```text
Raw sentence -> Inbox
```

### 3.3 Project Recovery

Every active project should make it easy to resume after a break.

A project page should answer:

> I have not touched this in a day or two. What was happening, and what do I do next?

### 3.4 Minimal Required Metadata

Required fields should be minimal. Optional structure should exist, but should not block capture or creation.

### 3.5 Human Applies AI Suggestions

Agents may suggest next actions, triage, summaries, and status updates, but they cannot directly write, edit, delete, archive, or modify records in MVP.

### 3.6 Actionable Surfacing Only

The app should surface items the user can act on. It should avoid guilt pings, abstract reminders, or vague productivity noise.

### 3.7 PARA Foundation

ContextOS should use PARA as its organizational foundation:

```text
Projects = outcomes and nested subcontexts
Areas = ongoing responsibilities and systems
Resources = reusable notes, lists, and reference material
Archives = inactive records hidden from active work
```

PARA is used to make execution context recoverable. It should not add capture friction or require the user to classify every thought before saving it.

---

## 4. MVP Scope

### 4.1 Included in MVP

- Authentication with email/password.
- Online-first PWA.
- Offline capture/edit queue for core CRUD-style mutations.
- Sync-when-online.
- Responsive mobile UI.
- Dashboard.
- Inbox.
- Today view.
- This Week view.
- Projects.
- Project detail pages.
- Project subcontexts / nested projects.
- Areas.
- Resources.
- Dates.
- Archive.
- Search.
- Settings.
- Dashboard markdown canvas.
- Rich text editor with Markdown shortcuts.
- Slash-command capture.
- Daily startup review.
- Daily shutdown review.
- Weekly review.
- Markdown export.
- Soft delete / trash.
- Read-only/manual AI suggestions.

### 4.2 Later

- Full offline conflict merge UI.
- Production-grade offline app-shell/chunk hydration validation.
- Full Agents page.
- Agent runs/logs/profiles.
- Agent write permissions.
- Calendar integration.
- Meeting objects.
- Semantic search.
- More advanced automation.
- More advanced mobile-native features.

---

## 5. Top-Level Navigation

MVP navigation:

```text
Dashboard
Inbox
Today
This Week
Projects
Areas
Resources
Archive
Dates
Reviews
Search
Settings
```

There is no top-level `Workspaces` page in MVP.

There is no top-level `Agents` page in MVP.

Agent suggestions appear only inside project pages and a collapsed dashboard section.

---

## 6. PARA, Areas, and Domains

Areas are ongoing responsibilities, skills, and systems. In v0.1.x, the existing `Domain` object acts as the lightweight Area model.

Domains/Areas are default organizational groupings. They are visible through the Areas page and are also used for filtering and grouping projects, notes, tasks, dates, and resources.

Default domains:

```text
Research
Dev / Freelance
University
Career / PhD
Long-Term Goals
AI Agent Context
Piano / Content
Notes
```

### 6.1 Area / Domain Behavior

- Domains are used for filtering and grouping projects, notes, tasks, dates, and resources.
- Defaults are provided.
- User can rename domains.
- User can add domains.
- User can archive domains.
- Domains should not become mandatory friction during quick capture.
- The Areas page should summarize each domain's projects, open tasks, resources, and important dates.

### 6.2 Resources

Resources are standalone notes and reference lists that do not belong to a single active project.

Examples:

```text
Piano song repertoire
Vocabulary list
Useful tools / links
Practice theory notes
```

Rules:

```text
Resources are searchable.
Resources can contain Markdown and checklists.
Resources do not surface in Today unless converted into tasks, dates, or project context.
Resources live under an Area/Domain.
```

---

## 7. Main Data Objects

MVP objects:

```text
Domain
Project
Task
Capture
Note
Date
Review
```

Derived/lightweight concepts:

```text
Area = Domain
Resource = standalone Note
Subcontext = Project with parentProjectId
```

Lightweight or generated object:

```text
Agent Suggestion
```

Agent suggestions should not be a full workflow object in MVP. They are generated suggestions that the user may apply manually.

---

## 8. Project Model

### 8.1 Definition

A project is a larger container with an outcome.

Examples:

```text
MSc Thesis
ContextOS
KPMG Application
Orbit Wars Week 4
Semester 12-3 Assistantship
```

Smaller work items belong as tasks, not separate projects. However, large projects may contain subcontexts when the child has its own recovery context, next action, recovery notes, dates, or open loops.

Examples of valid subcontexts:

```text
Assistantship -> CMPE211
University Course -> Assignment 2
ContextOS -> Dashboard 2.0 Foundation
Research -> Medical XAI Paper
```

### 8.2 Required Fields

```text
Project name
Domain
Current objective
```

### 8.3 Optional Fields

```text
Status
Date
Next action
Freeform recovery notes
Parent project
```

### 8.4 Project Statuses

```text
Active
Paused
Done
Archived
```

### 8.5 Project Detail Layout

Project pages should prioritize recovery and execution.

Recommended order:

```text
Header
Status
Active Tasks, expanded
Dates
Recovery Canvas: Next Action, Latest Status, Current Objective, Open Loops, Freeform Recovery Notes
Subcontexts
Agent Suggestions
Project actions
```

### 8.6 Subcontexts / Nested Projects

Projects can be nested through `parentProjectId`.

Rules:

```text
Root projects appear on the Projects page.
Child projects appear as subcontexts under their parent.
Child projects use the same recovery fields as root projects.
Parent project pages roll up non-archived, non-trashed descendant tasks and dates.
Rolled-up child tasks/dates must be labeled with their subcontext.
Adding a task or date from a parent page creates it directly on the parent unless the user navigates into a child.
Archiving/trashing a parent does not automatically archive/trash children.
If a parent is hidden or missing, visible children should be promoted to root visibility.
```

This model supports massive projects without introducing a separate subproject object too early.

### 8.7 Special Project Fields

#### Next Action

- Always visible.
- Separate from the task list.
- Used as the primary recovery handle.

#### Latest Status

- Special field, separate from notes.
- Should be near the top of the project page.
- Used to resume after breaks or half-finished work.

Example:

```text
Protocol B support audit is complete. RF baseline still needs rerun with corrected threshold logic.
```

### 8.8 Open Loops / Blockers

Open loops and blockers should be visible near the top of the project page. They should not be buried inside notes.

---

## 9. Task Model

### 9.1 Required Fields

```text
Title
```

### 9.2 Optional Fields

```text
Planned date
Due date
Scheduled time
Project/context
```

### 9.3 Statuses

```text
Todo
In Progress
Blocked
Waiting
Done
Dropped
```

### 9.4 Planned Date vs Due Date

The UI must distinguish between planned date and due date.

```text
Planned date = when the user intends to work on the task.
Due date = when the task must be completed.
```

A task can be planned today without being due today. A task can be due today without being manually planned.

### 9.5 Scheduled Time

A task may have one optional `scheduledTime` value. It represents when the task is intended to happen, not a start/finish range or duration.

Daily task surfaces show only occupied times plus untimed tasks. They do not render a full empty-day grid.

### 9.6 No Priority Subsystem

There is no global task priority field in MVP.

There is no separate daily or weekly priority object. Today selection is expressed through planned dates, due dates, task state, and the dedicated Daily Timeline.

---

## 10. Date Model

### 10.1 Required Fields

```text
Title
Date
```

### 10.2 Optional Fields

```text
Related project
Related tasks
Notes
```

### 10.3 Date Behavior

Dates are separate objects from task due dates.

A Date records an important real-world date such as an exam, flight, appointment, event, or final milestone. It is not a task and is not completed with a checkbox.

A Date can govern multiple related tasks.

Example:

```text
Date: Submit thesis proposal
Date: June 10
Related project: MSc Thesis
Related tasks:
- Finish methodology
- Proofread
- Send to advisor
```

Dates can be edited, archived, restored, or deleted. Visible UI uses `Date`/`Dates`; the internal `Deadline` storage and `/deadline` capture command remain compatibility aliases during v0.2.x.

---

## 11. Capture and Inbox

### 11.1 Default Capture Behavior

Default capture should require no destination.

```text
Raw sentence -> Inbox
```

The smallest useful captured item is a sentence.

### 11.2 Slash Commands

MVP slash commands:

```text
/task
/note
/project
/date
/deadline (compatibility alias)
/status
```

Examples:

```text
/task finish RF baseline rerun
/note dashboard should show overdue before inbox
/project ContextOS
/date final exam June 10
/status MSc Thesis: RF rerun done, next action is compare calibration tables
```

### 11.3 Capture Parsing

MVP supports basic date parsing only.

Example:

```text
/date submit report June 10
```

Should create:

```text
Title: submit report
Date: June 10
```

MVP should not attempt heavy natural-language parsing, project inference, or domain inference.

### 11.4 Inbox Item Lifecycle

Inbox items are either unprocessed or acted upon.

```text
Unprocessed -> converted / attached / archived / deleted
```

No deferred inbox state in MVP.

### 11.5 Inbox Triage Actions

```text
Convert to Task
Convert to Project
Convert to Note
Attach to Existing Project
Set Date
Archive
Delete
```

### 11.6 Inbox Cadence

Inbox should be cleared daily, but the prompt must be skippable.

The app should encourage daily triage without enforcing it.

---

## 12. Dashboard

### 12.1 Dashboard Purpose

The dashboard is the daily command center.

It should answer:

```text
What matters today?
What is overdue?
What did I capture?
What was I working on recently?
What needs recovery?
```

### 12.2 Visible by Default

```text
Quick Capture
Notepad
Dates
Daily Timeline
Tasks
Projects
```

### 12.3 Collapsed by Default

```text
Agent Suggestions
```

### 12.4 First-Load Behavior

When opening the dashboard:

- Quick capture should always be visible at the top.
- Daily Timeline should remain a fast, notepad-like task-writing surface.

The dashboard should orient the user before asking for more input.

### 12.5 Dashboard Canvas

The Dashboard should include a persistent Markdown canvas inspired by the user's Notion Dashboard 2.0.

Purpose:

```text
Loose daily notepad
Ad hoc dates/checklists
Short goal reminders
Scratch planning that is not yet structured
```

Rules:

```text
Quick Capture remains above the canvas.
The canvas is stored as a standalone Resource note titled "Dashboard Canvas".
The canvas supports Markdown/checklist text.
Checkboxes inside the canvas stay local unless explicitly converted into structured tasks.
The canvas should sit below Quick Capture and before structured execution sections.
Fixed widgets remain responsible for execution surfacing.
```

The Dashboard should feel markdown-friendly without becoming a full Notion page builder.

---

## 13. Today View

### 13.1 Today Includes

```text
Tasks due today
Tasks manually planned for today
Overdue tasks
In-progress tasks
Tasks from active projects
Dates occurring today
```

### 13.2 Deduplication

The Today view should avoid repeating the same task across multiple sections.

Recommended UI:

```text
Deduplicated task list with labels.
```

Example:

```text
Finish Protocol B table
Labels: Planned Today, Due Today, MSc Thesis
```

---

## 14. This Week View

This Week is an automatic rollup of dated work and active project context.

### 14.1 This Week Includes

```text
Tasks due this week
Dates this week
Active projects
Overdue tasks
Tasks planned for the week
```

---

## 15. Reviews

Reviews are stored and searchable. They support context recovery.

### 15.1 Daily Startup

Daily startup asks only:

```text
What needs focus today?
```

### 15.2 Daily Shutdown

Daily shutdown asks:

```text
What changed today?
What is still open?
What should be resumed tomorrow?
Any inbox items to triage?
```

### 15.3 Weekly Review

Weekly review asks:

```text
What outcomes matter this week?
Which projects are active?
Which projects are stale?
What important dates are coming?
What should be dropped, deferred, or blocked?
What should be planned for this week?
```

### 15.4 Review Storage

All reviews should be:

```text
Stored
Searchable
Usable for project recovery
```

### 15.5 Review-to-Project Suggestions

When a review mentions a project, the system may suggest attaching the entry to that project or updating the project’s Latest Status.

The user must apply this manually.

Example:

```text
Shutdown note:
Worked on ContextOS. Finished MVP screen decisions. Need to update blueprint tomorrow.

Suggested project update:
Project: ContextOS
Latest Status: MVP screen decisions finalized. Next action is to update blueprint/spec.
```

---

## 16. Notes

### 16.1 Notes Behavior

Notes are mostly attached to projects, but standalone notes are allowed.

Rules:

```text
Project notes are default when inside a project.
Standalone notes are Resources.
Standalone notes live under an Area/Domain, often Notes.
Notes are searchable.
Notes support execution and recovery, but should not dominate the system.
```

### 16.2 Notes Editor

Use a rich text editor with Markdown shortcuts.

Supported shortcuts should include:

```text
# headings
## subheadings
- lists
[] checkboxes
> quotes
``` code blocks ```
```

### 16.3 Checkboxes in Notes

Checkboxes inside notes stay local unless explicitly converted into structured tasks.

---

## 17. Search

### 17.1 MVP Search

Basic text search across:

```text
Projects
Tasks
Captures
Notes
Resources
Dates
Reviews
```

### 17.2 MVP Filters

Light filters:

```text
Type
Domain
Project
Status
Date
```

### 17.3 Later Search

Later versions may add semantic search.

---

## 18. Archive and Trash

### 18.1 Archive Behavior

Archived items are:

```text
Moved to Archive page
Hidden from active views
Still searchable
Restorable
```

### 18.2 Delete Behavior

Use soft delete / trash.

```text
Delete -> Trash
Trash retained for 30 days
Restore available
Permanent delete after 30 days
```

---

## 19. Agent Behavior

### 19.1 Agent Access

Agents can read allowed domains.

Default readable domains:

```text
Research
Dev / Freelance
University
Career / PhD
Long-Term Goals
AI Agent Context
Piano / Content
Notes, except private notes
```

Excluded by default:

```text
Archived items
Deleted items
Private notes
```

### 19.2 Agent Writes

Agents cannot directly write in MVP.

Agents cannot directly:

```text
Create records
Edit records
Delete records
Archive records
Modify fields
```

Agents can only suggest actions. The user applies suggestions manually.

### 19.3 Allowed Agent Suggestions

```text
Suggested tasks
Suggested next actions
Suggested project status updates
Suggested inbox triage
Suggested important-date extraction
Suggested handoff summaries
Suggested stale project review
```

### 19.4 Agent Suggestions UI

Agent suggestions may appear in:

```text
Project detail pages
Dashboard collapsed section
```

There is no full Agents page in MVP.

---

## 20. Markdown Export

Markdown export should support:

```text
Project summaries
Notes
Tasks
Dates
Daily reviews
Weekly reviews
Agent handoff summaries
```

Export is required to preserve durability and prevent lock-in.

---

## 21. Mobile and PWA

### 21.1 MVP Mobile Behavior

```text
Installable PWA
Responsive mobile layout
Mobile-friendly quick capture
Online-first
```

### 21.2 Later Mobile Behavior

```text
Offline capture
Sync when online
```

MVP mobile goal:

```text
Open phone -> capture sentence -> done
```

---

## 22. Authentication

MVP authentication:

```text
Email/password
```

Later authentication options may include:

```text
Google
GitHub
Other OAuth providers
```

---

## 23. Review and Surfacing Rules

### 23.1 Useful Surfacing

The app should surface:

```text
Overdue tasks
Recent contexts
Upcoming important dates
Daily planning prompts
Weekly planning/review prompts
Agent-suggested actions
```

### 23.2 Maybe Surfacing

These may be useful but should be handled carefully:

```text
Stale projects
Abandoned captures
Unresolved decisions
```

### 23.3 Avoid Surfacing

Do not proactively nag about:

```text
“You mentioned this before” reminders
Contexts missing summaries
Non-actionable notifications
Things the user cannot act on
```

---

## 24. Existing Tool Replacement Strategy

ContextOS should replace:

```text
Notion execution dashboards
Notion project/area/resource recovery pages
Todo/task apps
Phone notes
```

ContextOS should sit beside:

```text
GitHub
AI chats
```

ContextOS should ignore or not attempt to replace:

```text
Local folders
Paper notebook/journals
Google Docs
Google Sheets
Obsidian
Formula-heavy Notion databases
Specialized spaced-repetition or practice engines
```

Piano repertoire, vocabulary lists, and similar personal systems should start as Areas plus Resources. If they need dynamic scheduling, rotations, formulas, or review algorithms, those capabilities belong in v0.2+ after the execution-first loop is validated.

---

## 25. 7-Day Validation Test

ContextOS succeeds if, after one week:

```text
1. User opens Dashboard at least once per workday.
2. User captures ideas/tasks in ContextOS instead of phone notes.
3. User uses Today view for daily work selection.
4. User resumes at least one paused or half-finished project using Latest Status + Next Action.
5. User uses at least one subcontext for a large project.
6. User writes or edits the Dashboard Canvas at least once.
7. Notion/task app usage drops sharply.
```

If these do not happen, the product has failed its primary purpose.

---

## 26. Implementation Priority

Recommended implementation order:

```text
1. Auth + core layout
2. Domains
3. PARA navigation: Projects, Areas, Resources, Archive
4. Projects
5. Project subcontexts and parent rollups
6. Tasks
7. Dashboard + Dashboard Canvas
8. Inbox + quick capture
9. Today view
10. Dates
11. Reviews
12. Notes / Resources editor
13. Search
14. Archive/trash
15. Agent suggestions as read-only/manual suggestions
16. Markdown export
17. PWA polish
```

---

## 27. Final MVP Decision Rule

Use this rule for scope decisions:

> If it helps capture fast, choose today’s work, recover project context, or prevent forgotten open loops, it belongs in MVP.
>
> If it mainly helps organize, customize, decorate, automate, or archive, it waits.

---

## 28. Open Questions for Later Versions

These are intentionally not MVP blockers:

- Should meetings/calendar be added later?
- Should offline capture be implemented as service-worker local queue or local-first storage?
- Should semantic search use local embeddings or external service?
- Should agent suggestions become persistent objects with apply/dismiss history?
- Should agents eventually create tasks or project updates with approval?
- Should domains have access-control presets?
- Should project templates exist?
- Should recurring tasks exist?
- Should Areas become a separate model from Domains?
- Should Resources become a separate model from standalone Notes?
- Should personal systems such as piano practice have routines/rotations?
- Should vocabulary resources gain flashcard or spaced-repetition behavior?
- Should weekly review generate a weekly plan automatically?

These should not be solved before the MVP validates the execution-first workflow.
