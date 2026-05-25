# ContextOS — BLUEPRINT.md

## 0. Purpose

ContextOS is a lightweight personal context-management app for maintaining project documentation, tasks, open loops, decisions, risks, and agent-readable handoffs across multiple life/work domains.

It is **not** a full Notion clone.

It is a focused system for:

- reading and writing structured project documentation
- capturing ideas/tasks quickly from web/mobile
- organizing life/work using PARA
- maintaining current project state with low friction
- exposing safe APIs for agents to read/update context
- exporting durable Markdown context packs
- protecting private/interpersonal context from default agent access

The core product rule:

> The app is for humans. Markdown/API context packs are for agents.

---

## 1. Locked Product Decisions

### 1.1 App model

- Cloud-hosted web app.
- Installable PWA.
- Online-first for MVP.
- Offline capture/sync planned later.
- Docker-deployable architecture preferred.
- Avoid platform lock-in.

### 1.2 Auth

MVP:

- Email/password authentication.

Later:

- GitHub OAuth.
- Google OAuth.
- Possibly university SSO if ever needed.

### 1.3 Tenancy

MVP UI:

- Single-user focused.

Database:

- Multi-user-ready from the beginning.

Implication:

- Include `users`, `workspaces`, ownership fields, and access flags.
- Do not build collaboration UI in MVP.
- Do not hardcode all data as global/userless.

### 1.4 Editor

MVP:

- Rich editor from the start.
- Slash commands from the start.
- Markdown stored alongside editor JSON.

Content storage rule:

- `content_json` = rich editor rendering/state.
- `content_md` = durable export/agent-readable representation.

Agents should primarily read Markdown or structured context endpoints, not opaque editor JSON.

### 1.5 Checkboxes and tasks

Checkboxes inside pages are local writing/thinking tools by default.

They should **not** automatically become structured tasks.

Required feature:

- User can explicitly convert a checkbox block into a structured task.

Converted task should retain:

- source page
- source block reference if possible
- title copied from checkbox text
- default status: `inbox` or `next`

### 1.6 Dashboards

MVP:

- One global dashboard.

Later:

- Per-workspace dashboards.
- Per-project/area dashboards can be expanded.

### 1.7 PARA

ContextOS uses PARA as the organizing layer:

- Projects
- Areas
- Resources
- Archive

Definitions:

- Project = finite outcome.
- Area = ongoing responsibility/standard.
- Resource = reusable reference.
- Archive = inactive but preserved material.

### 1.8 Privacy

Private/interpersonal context lives in the same app, but inside a separate locked workspace.

Default:

- Interpersonal/private workspace has agent access disabled.
- Agents cannot read private/interpersonal content unless explicitly enabled.

Access flags should exist at:

- workspace level
- project/item level
- page level

### 1.9 Agent access

Agents may directly perform low-risk writes:

- append work logs
- create agent run records
- add open loops
- add risks
- update task status
- create draft handoffs

Agents must create proposals for high-risk writes:

- rewrite Project State
- edit Blueprint
- edit Decisions
- delete/archive pages
- bulk edit documentation
- change workspace/project structure
- access private/interpersonal workspace

### 1.10 Export

MVP:

- Manual/on-demand Markdown export.

Later:

- Scheduled exports.
- Optional Git snapshots.

---

## 2. Non-Goals for MVP

Do not build these in MVP:

- full Notion-style databases
- template marketplace
- public sharing
- real-time collaboration
- comments
- mentions
- calendar
- Kanban
- file uploads
- native mobile app
- embeddings/RAG
- automation builder
- offline sync engine
- complex permissions UI
- graph visualization
- workspace analytics
- full MCP server

These may be added later only if they reduce context loss or maintenance friction.

---

## 3. Recommended Tech Stack

### Frontend

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui or equivalent component base
- PWA support

### Editor

Recommended:

- Tiptap / ProseMirror

Required editor features:

- paragraphs
- headings
- bullet lists
- numbered lists
- checkbox lists
- toggles/details blocks
- code blocks
- block quotes
- links
- horizontal dividers
- slash commands

### Backend

- Next.js route handlers or separate API layer
- PostgreSQL
- Drizzle ORM
- Zod validation
- Email/password auth with secure password hashing
- Session-based or token-based auth

### Search

MVP:

- PostgreSQL full-text search over page title and `content_md`.

Later:

- semantic/vector search if needed.

### Deployment

MVP target:

- cloud-hosted web app
- managed Postgres acceptable
- Docker deployable later

---

## 4. High-Level Architecture

```text
ContextOS
├── Human UI
│   ├── dashboard
│   ├── inbox
│   ├── PARA navigation
│   ├── page tree
│   ├── rich editor
│   ├── tasks/open loops/decisions/risks
│   └── agent proposal review
│
├── Backend API
│   ├── auth
│   ├── workspaces
│   ├── pages
│   ├── tasks
│   ├── open loops
│   ├── decisions
│   ├── risks
│   ├── work sessions
│   ├── agent runs
│   ├── agent proposals
│   └── exports
│
├── Database
│   ├── users
│   ├── workspaces
│   ├── pages
│   ├── page_versions
│   ├── tasks
│   ├── open_loops
│   ├── decisions
│   ├── risks
│   ├── work_sessions
│   ├── agent_runs
│   └── agent_proposals
│
└── Agent Layer
    ├── project context endpoint
    ├── page read endpoints
    ├── safe structured write endpoints
    ├── proposal endpoints
    └── Markdown export/context pack
```

---

## 5. Core Data Model

### 5.1 users

Fields:

- id
- email
- password_hash
- display_name
- created_at
- updated_at

### 5.2 workspaces

Fields:

- id
- owner_id
- name
- slug
- description
- para_type: `projects | areas | resources | archive | custom`
- privacy_level: `normal | private | locked`
- agent_access_enabled: boolean
- created_at
- updated_at
- archived_at

Default workspaces:

- Projects
- Areas
- Resources
- Archive
- Interpersonal / Private
- Research
- Creative / Piano
- Career / Outreach
- Personal Systems

Not all need to be seeded at once, but schema must support them.

### 5.3 contexts

Use a general context entity for projects, areas, resources, and archive items.

Fields:

- id
- workspace_id
- owner_id
- title
- slug
- context_type: `project | area | resource | archive_item`
- status: `active | paused | waiting | blocked | completed | archived`
- priority: `low | medium | high | urgent`
- current_objective
- current_phase
- next_action
- agent_access_enabled
- last_reviewed_at
- last_updated_at
- created_at
- updated_at
- archived_at

### 5.4 pages

Fields:

- id
- workspace_id
- context_id nullable
- parent_id nullable
- owner_id
- title
- slug
- page_type:
  - normal_page
  - project_state
  - blueprint
  - handoff
  - changelog
  - meeting_note
  - scratch_note
  - reference
  - archived_note
- content_json
- content_md
- sort_order
- status: `active | archived`
- version
- agent_access_enabled
- created_by
- updated_by
- created_at
- updated_at
- archived_at

### 5.5 page_versions

Fields:

- id
- page_id
- version
- content_json
- content_md
- change_summary
- changed_by_type: `human | agent | system`
- changed_by_id nullable
- created_at

Every meaningful page edit should create a version row.

### 5.6 tasks

Fields:

- id
- workspace_id
- context_id nullable
- source_page_id nullable
- source_block_id nullable
- owner_id
- title
- description
- status: `inbox | next | doing | waiting | blocked | done | dropped`
- priority: `low | medium | high | urgent`
- due_date nullable
- definition_of_done nullable
- verification_method nullable
- blocked_by nullable
- created_at
- updated_at
- completed_at nullable

### 5.7 decisions

Fields:

- id
- workspace_id
- context_id nullable
- title
- decision
- reason
- alternatives_considered
- consequences
- revisit_condition
- created_by
- created_at
- updated_at

### 5.8 open_loops

Fields:

- id
- workspace_id
- context_id nullable
- title
- question_or_issue
- severity: `low | medium | high | critical`
- status: `open | investigating | waiting | resolved | dropped`
- next_step
- owner
- created_at
- updated_at
- closed_at nullable

### 5.9 risks

Fields:

- id
- workspace_id
- context_id nullable
- title
- risk
- severity: `low | medium | high | critical`
- probability: `low | medium | high`
- signal
- mitigation
- status: `open | monitoring | mitigated | closed`
- created_at
- updated_at
- closed_at nullable

### 5.10 work_sessions

Fields:

- id
- workspace_id
- context_id
- date
- summary
- what_changed
- blockers
- next_action
- created_at

### 5.11 agent_runs

Fields:

- id
- workspace_id nullable
- context_id nullable
- agent_name
- task
- input_summary
- output_summary
- pages_read jsonb
- pages_changed jsonb
- tasks_changed jsonb
- verification_status: `not_run | passed | passed_with_risks | failed | blocked`
- created_at

### 5.12 agent_proposals

Fields:

- id
- workspace_id nullable
- context_id nullable
- agent_run_id nullable
- proposal_type:
  - page_edit
  - context_update
  - decision_update
  - task_update
  - open_loop_update
  - risk_update
  - archive_request
- target_type
- target_id
- proposed_patch jsonb
- proposed_markdown nullable
- status: `pending | approved | rejected | applied`
- human_feedback nullable
- created_at
- reviewed_at nullable
- applied_at nullable

---

## 6. Required API Surface

### 6.1 Auth

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

### 6.2 Workspaces

```http
GET    /api/workspaces
POST   /api/workspaces
GET    /api/workspaces/:workspaceId
PATCH  /api/workspaces/:workspaceId
```

### 6.3 Contexts

```http
GET    /api/contexts
POST   /api/contexts
GET    /api/contexts/:contextId
PATCH  /api/contexts/:contextId
GET    /api/contexts/:contextId/dashboard
GET    /api/contexts/:contextId/context-pack
```

### 6.4 Pages

```http
GET    /api/pages/:pageId
POST   /api/pages
PATCH  /api/pages/:pageId
POST   /api/pages/:pageId/append
GET    /api/contexts/:contextId/pages
GET    /api/contexts/:contextId/page-tree
GET    /api/pages/:pageId/versions
POST   /api/pages/:pageId/restore-version
```

### 6.5 Tasks

```http
GET    /api/tasks
POST   /api/tasks
PATCH  /api/tasks/:taskId
POST   /api/tasks/from-checkbox
```

### 6.6 Open Loops

```http
GET    /api/open-loops
POST   /api/open-loops
PATCH  /api/open-loops/:openLoopId
```

### 6.7 Decisions

```http
GET    /api/decisions
POST   /api/decisions
PATCH  /api/decisions/:decisionId
```

### 6.8 Risks

```http
GET    /api/risks
POST   /api/risks
PATCH  /api/risks/:riskId
```

### 6.9 Work Sessions

```http
GET    /api/work-sessions
POST   /api/work-sessions
GET    /api/contexts/:contextId/work-sessions
```

### 6.10 Dashboard

```http
GET /api/dashboard/global
```

Should return:

- today/next tasks
- high-priority tasks
- open loops
- stale contexts
- pending agent proposals
- recent work sessions
- blocked items
- contexts needing review

### 6.11 Agent API

```http
GET  /api/agent/contexts
GET  /api/agent/contexts/:contextId/context-pack
GET  /api/agent/pages/:pageId
POST /api/agent/work-sessions
POST /api/agent/open-loops
POST /api/agent/risks
PATCH /api/agent/tasks/:taskId/status
POST /api/agent/runs
POST /api/agent/proposals
```

Agent API must enforce:

- auth/token checks
- workspace/page agent access flags
- no access to locked/private workspace unless explicitly enabled
- proposal-only edits for high-risk targets

### 6.12 Export

```http
GET  /api/export/context/:contextId/markdown
GET  /api/export/context/:contextId/context-pack
GET  /api/export/workspace/:workspaceId/markdown
```

---

## 7. UI Requirements

### 7.1 Global layout

Desktop:

- left sidebar
- main content/editor area
- optional right context panel later

Mobile:

- quick capture must be easy
- dashboard must be readable
- editor must be usable, not necessarily luxurious

### 7.2 Sidebar

Required:

- Dashboard
- Inbox
- Projects
- Areas
- Resources
- Archive
- Agent Activity
- Settings

Private workspace should be visually distinct and locked.

### 7.3 Global Dashboard MVP

Must show:

- Next tasks
- High-priority tasks
- Open loops
- Stale contexts
- Pending agent proposals
- Recent work sessions
- Blocked items
- Quick capture input

### 7.4 Editor MVP

Required blocks:

- paragraph
- heading 1
- heading 2
- heading 3
- bullet list
- numbered list
- checkbox list
- toggle/details block
- quote
- code block
- horizontal divider
- link

Required interactions:

- slash command menu
- convert checkbox to structured task
- save page
- view version history
- restore version

### 7.5 Context page

For any project/area/resource item, show:

- title
- status
- priority
- current objective
- next action
- pages
- linked tasks
- open loops
- decisions
- risks
- work sessions
- handoff/export actions

---

## 8. Agent Permission Rules

### 8.1 Read access

Agents may read only items where:

- workspace `agent_access_enabled = true`
- context/item `agent_access_enabled = true`
- page `agent_access_enabled = true`

Private/interpersonal workspace default:

- `agent_access_enabled = false`

### 8.2 Direct write allowed

Agents may directly:

- append work sessions
- create agent run logs
- create open loops
- create risks
- update task status
- create draft handoff page or proposal

### 8.3 Proposal required

Agents must create proposals for:

- editing pages of type `project_state`
- editing pages of type `blueprint`
- editing decisions
- deleting pages
- archiving contexts/workspaces
- accessing private/interpersonal context
- changing access flags
- bulk updates

### 8.4 Every agent write must log

Required fields:

- agent name
- target
- action
- summary
- verification status
- timestamp

---

## 9. Markdown Export Format

For each context/project, export:

```text
<context-slug>/
├── PROJECT_STATE.md
├── BLUEPRINT.md
├── HANDOFF.md
├── TASKS.md
├── OPEN_LOOPS.md
├── DECISIONS.md
├── RISKS.md
├── WORK_SESSIONS.md
├── AGENT_RUNS.md
├── ARTIFACTS.md
└── pages/
    └── ...
```

Export rules:

- preserve page hierarchy
- include metadata frontmatter
- include timestamps
- exclude private/agent-disabled pages unless explicitly requested
- convert toggles to `<details>` blocks
- convert checkbox lists to Markdown checkboxes
- include source links/backlinks where relevant

Example frontmatter:

```yaml
---
title: EMU RAG Assistant
type: project_state
context_id: ctx_123
workspace: Research
status: active
priority: high
last_updated: 2026-05-22
agent_access_enabled: true
---
```

---

## 10. Freshness System

Each context has freshness based on `last_reviewed_at`.

Rules:

- Fresh: reviewed within 7 days
- Aging: reviewed 8–21 days ago
- Stale: reviewed 22+ days ago
- Unknown: never reviewed

Global dashboard should surface:

- stale active projects
- stale high-priority areas
- stale contexts with open tasks
- stale contexts with pending agent proposals

Do not spam notifications in MVP.

Visibility first. Nagging later, if ever.

---

## 11. Implementation Sprints

## Sprint 0 — Repository and Foundation

Goal:

Create the base app and infrastructure.

Tasks:

- initialize Next.js + TypeScript project
- configure Tailwind
- configure component library
- configure PostgreSQL connection
- configure Drizzle ORM
- create initial database schema
- add migrations
- implement email/password auth
- add protected routes
- create basic app shell
- seed default workspaces

Acceptance criteria:

- app runs locally
- user can register/login/logout
- database migrations run cleanly
- protected dashboard route works
- default PARA workspaces exist for new user

Verification:

- run typecheck
- run lint
- run migrations on clean database
- manually create/login user
- verify unauthorized users cannot access protected routes

---

## Sprint 1 — Workspaces, PARA, and Context Items

Goal:

Build the structure layer.

Tasks:

- create workspace CRUD
- create context/item CRUD
- support item types:
  - project
  - area
  - resource
  - archive_item
- implement sidebar navigation
- show PARA sections
- implement context detail page shell
- add status/priority/current objective/next action fields
- add agent access flag fields
- add privacy level to workspaces

Acceptance criteria:

- user can create/edit/archive workspaces
- user can create projects/areas/resources
- sidebar shows PARA structure
- private workspace can be created with agent access disabled
- context detail page displays core metadata

Verification:

- create one project, one area, one resource
- confirm they appear in correct PARA sections
- confirm agent access defaults respect privacy rules

---

## Sprint 2 — Pages, Page Tree, and Versioning

Goal:

Build the documentation core.

Tasks:

- create pages table/API
- implement nested page tree
- implement create/edit/archive pages
- implement page version creation on save
- implement version history viewer
- implement restore previous version
- connect pages to workspaces and contexts
- add page type field

Acceptance criteria:

- user can create nested pages
- user can edit page content
- each save creates a version record
- user can view and restore versions
- pages belong to correct workspace/context

Verification:

- create nested page structure
- edit page multiple times
- verify versions are created
- restore earlier version and confirm content changes

---

## Sprint 3 — Rich Editor and Slash Commands

Goal:

Add the main writing experience.

Tasks:

- integrate Tiptap/ProseMirror editor
- support required blocks:
  - paragraph
  - headings
  - bullet list
  - numbered list
  - checkbox list
  - toggle/details
  - quote
  - code block
  - divider
  - links
- implement slash command menu
- implement content_json save
- implement content_md generation
- implement autosave or explicit save
- implement basic mobile editor usability

Acceptance criteria:

- user can write and format pages
- slash commands insert required blocks
- page saves both JSON and Markdown
- Markdown output is readable
- checkboxes remain page-local by default

Verification:

- create page using every block type
- inspect generated Markdown
- reload page and confirm editor state restores
- verify checkbox does not create structured task automatically

---

## Sprint 4 — Structured Context Objects

Goal:

Add tasks, open loops, decisions, risks, and work sessions.

Tasks:

- implement tasks CRUD
- implement open loops CRUD
- implement decisions CRUD
- implement risks CRUD
- implement work sessions CRUD
- link all objects to workspace/context
- implement `Convert checkbox to task`
- add source page/block references for converted tasks
- show objects on context detail page

Acceptance criteria:

- user can create/update/complete tasks
- user can create/resolve open loops
- user can log decisions
- user can log risks
- user can close a work session
- user can convert a checkbox into a structured task
- global task list excludes casual page checkboxes

Verification:

- create page checkbox
- convert it to task
- verify task appears globally
- verify original checkbox remains page content
- add decision/open loop/risk/work session and confirm context page updates

---

## Sprint 5 — Global Dashboard

Goal:

Build the MVP command center.

Tasks:

- implement `/api/dashboard/global`
- create dashboard UI
- show next/high-priority tasks
- show open loops
- show stale contexts
- show pending agent proposals
- show recent work sessions
- show blocked items
- add quick capture input
- quick capture can create note/task/open loop into Inbox or selected context

Acceptance criteria:

- global dashboard aggregates across workspaces
- private workspace respects visibility/access rules
- user can capture item quickly
- stale contexts are visible
- dashboard does not require per-workspace dashboards

Verification:

- create tasks/open loops across multiple workspaces
- confirm dashboard aggregation
- create private workspace item and verify visibility behavior
- test quick capture under 10 seconds

---

## Sprint 6 — Agent API v1

Goal:

Allow agents to safely read/update context.

Tasks:

- implement API token model
- implement agent auth middleware
- implement agent context list endpoint
- implement context-pack endpoint
- implement agent page read endpoint
- implement append work session endpoint
- implement create open loop/risk endpoint
- implement update task status endpoint
- implement agent run logging
- enforce agent access flags

Acceptance criteria:

- agent can fetch accessible contexts
- agent cannot access locked/private workspace by default
- agent can fetch context pack
- agent can append work session
- agent can create open loop/risk
- agent can update task status
- every agent action is logged

Verification:

- create agent token
- call endpoints with token
- attempt private workspace access and confirm denial
- append agent work session
- inspect agent_runs/work_sessions records

---

## Sprint 7 — Agent Proposals and Approval Flow

Goal:

Protect canonical context from unsafe edits.

Tasks:

- implement agent_proposals table/API
- implement proposal creation endpoint
- implement proposal review UI
- implement diff view for page edits
- implement approve/reject/apply actions
- create page version when proposal is applied
- support proposal statuses

Acceptance criteria:

- agent can propose page edit
- user can view diff
- user can approve/reject
- approved edit updates page and creates version
- rejected proposal stores feedback
- high-risk agent edits require proposals

Verification:

- submit fake agent proposal
- approve it
- verify page changed and version created
- reject another proposal and verify no page change
- test high-risk direct edit attempt and confirm blocked

---

## Sprint 8 — Markdown Export and Context Packs

Goal:

Make context portable and agent-readable.

Tasks:

- implement context Markdown export
- implement workspace Markdown export
- implement context pack generation
- include pages, tasks, decisions, open loops, risks, work sessions, agent runs
- exclude private/agent-disabled content unless explicitly included
- add export button in UI
- add API endpoint for export

Acceptance criteria:

- user can export context as Markdown
- export preserves hierarchy
- export includes metadata frontmatter
- export is readable by humans and agents
- export respects privacy flags

Verification:

- export test project
- inspect generated files
- confirm private pages excluded by default
- feed exported context to agent and verify it can understand project state

---

## Sprint 9 — PWA and Mobile Polish

Goal:

Make the app usable on phone.

Tasks:

- add PWA manifest
- add installability basics
- improve mobile sidebar/nav
- optimize quick capture on mobile
- ensure editor works acceptably on mobile
- ensure dashboard is readable on mobile

Acceptance criteria:

- app can be installed as PWA
- quick capture usable from phone
- dashboard usable from phone
- basic page editing works on phone

Verification:

- test on mobile browser
- install PWA
- capture note/task
- edit page
- review dashboard

---

## Sprint 10 — Stabilization and Hardening

Goal:

Prepare MVP for real usage.

Tasks:

- add loading/error states
- add empty states
- add basic tests for API routes/services
- add permission tests
- add data validation
- add seed/demo data
- add backup/export documentation
- write README
- write AGENTS.md
- write deployment notes

Acceptance criteria:

- app is usable end-to-end
- core flows do not break under normal use
- permissions are not obviously broken
- README explains setup/development/deployment
- AGENTS.md explains how coding agents should work on repo

Verification:

- clean install test
- run migrations
- run lint/typecheck/tests
- manually complete full usage flow:
  1. login
  2. create context
  3. create page
  4. edit rich content
  5. create task/open loop/decision/risk
  6. view dashboard
  7. call agent context endpoint
  8. submit proposal
  9. approve proposal
  10. export Markdown context pack

---

## 12. MVP Definition of Done

ContextOS MVP is done when:

1. User can register/login with email/password.
2. User can create workspaces using PARA structure.
3. User can create projects/areas/resources.
4. User can create nested pages.
5. User can write using rich editor and slash commands.
6. Pages save both JSON and Markdown.
7. Page versions are created and restorable.
8. User can create tasks, open loops, decisions, risks, and work sessions.
9. Checkboxes stay local unless explicitly converted to tasks.
10. Global dashboard aggregates tasks/open loops/stale contexts/proposals.
11. Agent API can read allowed context.
12. Agent API cannot read private/interpersonal workspace by default.
13. Agents can directly perform low-risk updates.
14. High-risk edits require proposals.
15. User can approve/reject agent proposals.
16. Context can be exported as Markdown.
17. Mobile/PWA experience is usable enough for capture and review.

---

## 13. Agent Development Rules

When using coding agents on this repository:

### Required reading order

Before making changes, agents must read:

1. `BLUEPRINT.md`
2. `AGENTS.md`
3. `DEV_STATE.md` if present
4. `CHANGELOG.md` if present
5. relevant source files

### Work rule

Agents must work in small batches.

Each batch must include:

- goal
- affected files
- exact intended changes
- acceptance criteria
- verification plan
- rollback/reversal plan

### After each meaningful change

Agents must update or propose updates to:

- `DEV_STATE.md`
- `CHANGELOG.md`
- `OPEN_LOOPS.md` if new uncertainty appears
- `RISK_REGISTER.md` if risk appears

### Verification rule

Agents must not claim done unless they ran or clearly stated verification.

Acceptable verification:

- typecheck
- lint
- tests
- migration dry run
- manual flow checklist
- API call test
- UI smoke test

If verification cannot run, agent must say why.

### Scope rule

Agents must not add features outside this blueprint unless explicitly requested.

No surprise features.

No clever rewrites.

No “while I was here” refactors.

No turning ContextOS into a doomed productivity cathedral.

---

## 14. Suggested Repository Structure

```text
contextos/
├── app/
│   ├── (auth)/
│   ├── (app)/
│   │   ├── dashboard/
│   │   ├── workspaces/
│   │   ├── contexts/
│   │   ├── pages/
│   │   ├── agent-activity/
│   │   └── settings/
│   └── api/
│       ├── auth/
│       ├── workspaces/
│       ├── contexts/
│       ├── pages/
│       ├── tasks/
│       ├── open-loops/
│       ├── decisions/
│       ├── risks/
│       ├── work-sessions/
│       ├── agent/
│       ├── agent-proposals/
│       └── export/
│
├── components/
│   ├── editor/
│   ├── layout/
│   ├── dashboard/
│   ├── pages/
│   ├── tasks/
│   ├── proposals/
│   └── ui/
│
├── db/
│   ├── schema.ts
│   ├── migrations/
│   └── seed.ts
│
├── lib/
│   ├── auth/
│   ├── api/
│   ├── markdown/
│   ├── permissions/
│   ├── agent/
│   ├── export/
│   └── validation/
│
├── docs/
│   ├── DEV_STATE.md
│   ├── CHANGELOG.md
│   ├── OPEN_LOOPS.md
│   ├── RISK_REGISTER.md
│   └── API.md
│
├── BLUEPRINT.md
├── AGENTS.md
├── README.md
├── package.json
└── docker-compose.yml
```

---

## 15. Initial Seed Data

For a new user, create default workspaces:

1. Projects
2. Areas
3. Resources
4. Archive
5. Interpersonal / Private

Default properties:

```text
Projects:
  para_type = projects
  agent_access_enabled = true

Areas:
  para_type = areas
  agent_access_enabled = true

Resources:
  para_type = resources
  agent_access_enabled = true

Archive:
  para_type = archive
  agent_access_enabled = false by default

Interpersonal / Private:
  para_type = custom
  privacy_level = locked
  agent_access_enabled = false
```

---

## 16. First Manual Test Scenario

Use this as the first end-to-end test.

1. Register/login.
2. Confirm default workspaces exist.
3. Create context:
   - workspace: Projects
   - type: project
   - title: EMU RAG Assistant
   - priority: high
   - status: active
4. Create nested pages:
   - Project State
   - Blueprint
   - Handoff
5. Edit Project State using:
   - heading
   - bullet list
   - checkbox list
   - toggle
   - code block
6. Save page.
7. Confirm version created.
8. Convert one checkbox to structured task.
9. Create one decision.
10. Create one open loop.
11. Create one risk.
12. Add one work session.
13. View global dashboard.
14. Create agent token.
15. Fetch project context through API.
16. Try fetching Interpersonal workspace through API.
17. Confirm access denied.
18. Submit agent proposal to edit Project State.
19. Approve proposal.
20. Confirm page changed and version created.
21. Export context as Markdown.
22. Inspect exported files.

MVP is not real until this scenario works.

---

## 17. Current Risks

| Risk | Severity | Mitigation |
|---|---:|---|
| Building too much like Notion | High | Strict MVP scope; no databases/views/templates in v1 |
| Rich editor complexity | High | Start with limited block set and stable JSON/Markdown conversion |
| Markdown export mismatch | High | Treat export as core acceptance criterion from Sprint 3 |
| Agent writes corrupting context | High | Proposal system and version history |
| Private context leakage | Critical | Agent access disabled by default for private workspace |
| Offline mode scope creep | Medium | Online PWA first; offline only after MVP |
| Dashboard becoming cluttered | Medium | Do not auto-promote page checkboxes to tasks |
| App becomes another maintenance burden | High | Work session closeout and quick capture must be low-friction |

---

## 18. Open Loops

- Decide exact auth library.
- Decide exact editor implementation details.
- Decide whether private workspace metadata appears in global dashboard.
- Decide whether agent tokens are global or scoped per workspace/context.
- Decide how Markdown conversion handles unsupported editor blocks.
- Decide deployment target for first hosted version.
- Decide whether to use server actions, route handlers, or a separate API service style.

---

## 19. Immediate Next Actions

1. Create repository.
2. Add this `BLUEPRINT.md` to project root.
3. Create `AGENTS.md` with coding-agent rules.
4. Scaffold Next.js + TypeScript + Tailwind.
5. Add PostgreSQL + Drizzle.
6. Implement schema for users/workspaces/contexts/pages/page_versions.
7. Build auth.
8. Build basic dashboard shell.
9. Build workspace/context CRUD.
10. Build page tree.

---

## 20. One-Sentence Build Principle

Build the smallest reliable system that lets future-you and agents recover project context without digging through chats, folders, screenshots, and whatever other archaeological garbage humans call “workflow.”
