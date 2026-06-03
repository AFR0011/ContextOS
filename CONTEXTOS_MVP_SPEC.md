# ContextOS MVP Specification

## 1. Product Definition

ContextOS is an execution-first context recovery system for managing tasks, open loops, projects, deadlines, lightweight notes, and daily/weekly reviews.

The MVP must replace:

- Notion for planning/project context
- Todo/task apps for basic task control
- Phone notes for quick capture

The MVP must sit beside:

- GitHub
- AI chats
- Local folders
- Google Docs/Sheets

## 2. MVP Goal

The MVP succeeds if the user can:

1. Open the dashboard and know what matters today.
2. Capture a task/idea/status update quickly without choosing a destination.
3. Track tasks, overdue items, and deadlines.
4. Resume a paused or half-finished project using latest status and next action.
5. Reduce reliance on Notion, task apps, and phone notes.

## 3. Non-Goals for MVP

Do not build these in MVP:

- Journaling system
- Finance tracker
- Health tracker
- Social/relationship tracker
- Book notes system
- Full life archive
- Calendar/meeting integration
- Offline capture/sync
- Full autonomous agent workflow
- Agent write/edit permissions
- Semantic search
- Complex task priority system
- Heavy project nesting
- Full Notion-style database builder

## 4. Top-Level Navigation

MVP navigation:

1. Dashboard
2. Inbox
3. Today
4. This Week
5. Projects
6. Deadlines
7. Archive
8. Search
9. Settings

No top-level Workspaces page.
No dedicated Agents page in MVP.

## 5. Default Domains

Domains are filters/groupings, not top-level navigation items.

Default domains:

- Research
- Dev / Freelance
- University
- Career / PhD
- Long-Term Goals
- AI Agent Context
- Piano / Content
- Notes

Domain behavior:

- Defaults are created automatically.
- User can rename domains.
- User can add domains.
- User can archive domains.

## 6. Core MVP Objects

The MVP includes these objects:

- Domain
- Project
- Task
- Capture
- Note
- Deadline
- Review

Agent suggestions may appear as generated read-only suggestions, but they should not be a full object workflow in MVP.

## 7. Project Model

A project is a larger container with an outcome. Smaller work items are tasks.

Examples:

- MSc Thesis
- ContextOS
- KPMG Application
- Orbit Wars Week 4

Required project fields:

- Name
- Domain
- Current objective

Optional project fields:

- Next action
- Latest status
- Deadlines
- Notes

Project statuses:

- Active
- Paused
- Done
- Archived

Project detail page layout:

1. Header
2. Status
3. Current Objective
4. Next Action
5. Open Loops / Blockers
6. Deadlines
7. Latest Status
8. Active Tasks, collapsed by default
9. Notes / Decisions
10. Agent Handoff
11. Agent Suggestions

Rules:

- Next Action must always be visible.
- Latest Status must be a special field, separate from notes.
- Active Tasks are collapsed by default on the project page.
- Blockers live inside the project, not as a project status.

## 8. Task Model

Required task fields:

- Title

Optional task fields:

- Planned date
- Due date
- Project/context

Task statuses:

- Todo
- In Progress
- Blocked
- Waiting
- Done
- Dropped

Rules:

- No global task priority field in MVP.
- Use daily top 1-3 priorities instead.
- Planned date and due date must be separate.

Definitions:

- Planned date: when the user intends to work on the task.
- Due date: when the task must be completed.

## 9. Deadline Model

Required deadline fields:

- Title
- Date

Optional deadline fields:

- Related project
- Related tasks
- Notes

Rules:

- Deadlines are separate objects.
- Deadlines may relate to many tasks.
- MVP does not include meeting objects.
- MVP does not include calendar integration.

## 10. Capture and Inbox

Default capture behavior:

- Raw text is saved immediately to Inbox.
- No destination is required.
- The smallest useful capture item is a sentence.

MVP slash commands:

- `/task`
- `/note`
- `/project`
- `/deadline`
- `/status`

Examples:

```text
/task finish RF baseline rerun
/note dashboard should show overdue before inbox
/project ContextOS
/deadline submit thesis draft June 10
/status MSc Thesis: RF rerun done, next action is compare calibration tables
```

Capture parsing:

- Basic date parsing only.
- Do not infer project/domain automatically in MVP.

Inbox item lifecycle:

- Unprocessed
- Converted
- Attached
- Archived
- Deleted

No deferred state in MVP.

Inbox triage actions:

- Convert to Task
- Convert to Project
- Convert to Note
- Attach to Existing Project
- Set Deadline
- Archive
- Delete

Inbox review:

- Prompt daily.
- Prompt must be skippable.
- Daily clearing is encouraged but not enforced.

## 11. Dashboard

Dashboard purpose:

The dashboard must answer within 30 seconds:

- What matters today?
- What is overdue?
- What did I capture?
- What was I recently working on?
- What needs recovery?

Visible dashboard sections:

1. Quick Capture
2. Today’s Top 1-3 Priorities
3. Today
4. Overdue
5. Inbox
6. Recent Contexts

Collapsed dashboard sections:

1. This Week
2. Deadlines
3. Agent Suggestions

Dashboard first-load behavior:

- Show Today’s priorities first.
- Quick Capture must always be visible near the top.

## 12. Today View

Today view includes:

- Tasks due today
- Tasks planned for today
- Overdue tasks
- In-progress tasks
- Tasks from active projects
- Daily top 1-3 priorities
- Deadlines

Rules:

- Due today and planned today must be separate concepts.
- A task should not be repeated across many sections.
- Prefer a deduplicated task list with labels.

Example labels:

- Planned Today
- Due Today
- Overdue
- In Progress
- Research
- MSc Thesis

## 13. This Week View

This Week uses a hybrid model:

- Automatic rollup
- Manual pinned weekly priorities

This Week should show:

- Pinned weekly priorities
- Tasks due this week
- Deadlines this week
- Active projects
- Overdue tasks
- Tasks planned for the week

## 14. Reviews

Reviews are stored and searchable.

### Daily Startup

Daily startup asks only:

- What are today’s top 1-3 priorities?

### Daily Shutdown

Daily shutdown asks:

1. What changed today?
2. What is still open?
3. What should be resumed tomorrow?
4. Any inbox items to triage?

### Weekly Review

Weekly review asks:

1. What are this week’s top outcomes?
2. Which projects are active?
3. Which projects are stale?
4. What deadlines are coming?
5. What should be dropped, deferred, or blocked?
6. What should be planned for this week?

Review behavior:

- Shutdown entries may suggest project latest-status updates.
- User must manually apply suggestions.
- Reviews help recover context after breaks.

## 15. Notes

Notes behavior:

- Notes are mostly attached to projects.
- Standalone notes are allowed.
- Standalone notes live under the Notes domain.

Editor:

- Rich text editor
- Markdown shortcuts supported

Required editor shortcuts:

- Headings
- Bullets
- Checkboxes
- Quotes
- Code blocks
- Slash commands

## 16. Search

MVP search:

- Basic text search across projects, tasks, captures, notes, deadlines, and reviews.

MVP filters:

- Type
- Domain
- Project
- Status
- Date

Later:

- Semantic search

## 17. Archive and Trash

Archive behavior:

- Archived items move to Archive.
- Archived items are hidden from active views.
- Archived items remain searchable.
- Archived items are restorable.

Deletion behavior:

- Delete moves item to Trash.
- Trash uses soft delete for 30 days.
- Items can be restored during the 30-day window.
- Items may be permanently deleted after 30 days.

## 18. Agent Behavior in MVP

Agents are suggestion-only in MVP.

Agents cannot:

- Create records directly
- Edit records directly
- Delete records
- Archive records
- Modify project/task/deadline/review state

Agents can suggest:

- Tasks
- Next actions
- Project status updates
- Inbox triage actions
- Deadline extraction
- Handoff summaries
- Stale project review notes

Agent suggestions appear in:

- Project detail pages
- Dashboard collapsed section

Agent access:

- Agents can read allowed domains.
- AI Agent Context is readable by default.
- Private notes are excluded.
- Archived items are excluded by default.
- Deleted items are excluded.

## 19. Markdown Export

MVP export supports Markdown export for:

- Project summaries
- Notes
- Tasks
- Deadlines
- Daily reviews
- Weekly reviews
- Agent handoff summaries

## 20. Mobile MVP

Mobile MVP requirements:

- Installable PWA
- Responsive mobile layout
- Mobile-friendly quick capture
- No offline capture in MVP

Primary mobile flow:

1. Open app.
2. Type sentence.
3. Save to Inbox.
4. Close app.

## 21. 7-Day Validation Criteria

The MVP succeeds if, after one week:

1. User opens Dashboard at least once per workday.
2. User captures ideas/tasks in ContextOS instead of phone notes.
3. User uses Today view for daily work selection.
4. User resumes at least one paused or half-finished project using Latest Status + Next Action.
5. Notion/task app usage drops sharply.

## 22. Build Priority

Recommended implementation order:

1. Auth and core layout
2. Domains
3. Projects
4. Tasks
5. Dashboard
6. Inbox and quick capture
7. Today view
8. Deadlines
9. Reviews
10. Notes editor
11. Search
12. Archive and trash
13. Agent suggestions as read-only/manual suggestions
14. Markdown export
15. PWA polish

## 23. MVP Feature Decision Rule

Include a feature in MVP only if it directly helps one of these:

- Capture fast
- Choose today’s work
- Recover project context
- Track open loops
- Prevent forgotten half-finished work

Defer anything mainly about:

- Customization
- Decoration
- Complex automation
- Long-term archiving
- Analytics
- Full agent workflows
- Integrations
