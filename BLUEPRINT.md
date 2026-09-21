# ContextOS Product Blueprint

Status: canonical product specification after C7 surface retirement, September 2026.

ContextOS is the operational-context module of LifeOS. It is a self-hostable local-first application for deciding what to do today, keeping active work recoverable, and carrying just enough temporal/contextual state to resume without reconstructing everything from memory.

It is deliberately **not** the universal home for finance, relationships, reflection history, or deep knowledge. Those belong to other LifeOS modules.

## 1. Product model

The definitive work hierarchy is:

```text
Area -> Project -> Task
```

- Areas are long-lived responsibilities.
- Projects are bounded outcomes and belong to exactly one Area.
- Projects do not contain Projects.
- Tasks belong to exactly one Project or directly to one Area.
- ContextDates belong to exactly one Project or Area.
- Deep knowledge is not stored as a second project-document system inside ContextOS.

The visible product should remain small enough that ordinary use does not require maintaining a taxonomy about the taxonomy.

## 2. Definitive navigation

Desktop:

```text
Home
Work
  Projects
  Areas
  Dates
LifeOS
Search
Settings
```

Mobile:

```text
Home
Projects
Search
LifeOS
```

Supporting detail routes include Project Detail and Area Detail.

Compatibility aliases remain only to migrate old bookmarks:

```text
/today      -> /dashboard
/this-week  -> /dashboard
/deadlines  -> /dates
/inbox      -> /dashboard
/resources  -> /lifeos
/reviews    -> /lifeos
/archive    -> /search
```

The aliases are not independent product surfaces.

## 3. Home

Home answers, in order:

1. What should I do today?
2. Where can I put unstructured working memory today?
3. Is there a useful explainable Insight?
4. Which Projects/Areas are in context today?
5. What temporal facts are coming up?

Desktop hierarchy:

```text
Today | Daily Notes + Insights | In Context Today + Upcoming
```

Mobile hierarchy:

```text
Today
Daily Notes
Insights
In Context Today
Upcoming
```

### Dayline

The Dayline contains:

- Tasks planned for today with a scheduled time.
- Events occurring today.
- untimed planned Tasks under **Anytime**.
- completed Tasks faded in place.

A same-day Deadline is not a Dayline event. Future Events and Deadlines appear under Upcoming.

### Daily Notes

Daily Notes are the frictionless unstructured capture surface.

- one note per local calendar day;
- no required Area, Project, type, tag, or status;
- today's note is edited on Home;
- historical Daily Notes are discoverable and readable through Search.

Daily Notes are not the old Dashboard Scratchpad and do not inherit its structure.

### Insights

Insights are temporary, evidence-backed suggestions.

- no user-facing backlog/archive;
- existence means currently relevant;
- actions may include Create Task, Add Date, Open Context, Open Module, or Dismiss;
- no fake fixtures when no real provider exists.

## 4. Area

Canonical fields:

```text
id
name
state: Active | Archived
```

Area Detail shows:

- Active Projects
- Direct Tasks
- Direct Dates
- Archived Projects

Archiving an Area does not archive its Projects. Project lifecycle remains independent.

## 5. Project

Canonical fields:

```text
id
name
areaId
objective
state: Active | Archived
```

Project Detail shows:

- Project metadata / objective
- Tasks
- Dates
- Linked Knowledge

Linked Knowledge is an honest integration boundary with Canon. ContextOS must not invent durable knowledge content when Canon is not connected.

There are no:

- nested Projects;
- nextAction;
- latestStatus;
- openLoops;
- recovery-note subsystems;
- progress percentages;
- extra project workflow states.

Legacy persistence fields may remain until C8 migration, but definitive UI and Search do not expose them.

## 6. Task

Canonical fields:

```text
id
title
Project OR Area parent
plannedDate?
scheduledTime? (only when plannedDate exists)
state: Open | Done
```

There is no canonical:

- dueDate;
- archive state;
- blocked/waiting/dropped state;
- priority subsystem.

Legacy surviving non-done Task states map to Open during the compatibility period. Legacy `dropped` also maps to Open.

## 7. ContextDate

ContextDate kinds:

```text
Event
Deadline
```

Canonical fields:

```text
id
title
kind
date
startTime?
endTime?        # Event only
details
exactly one parent: Project OR Area
```

Global/orphan Dates are not allowed.

Dates have no completion checkbox and no archive lifecycle.

Derived temporal groups:

- Today
- Upcoming
- Past

The Dates page provides All / Events / Deadlines filters.

## 8. Search

Definitive Search indexes only:

- Projects
- Areas
- Tasks
- ContextDates
- Daily Notes

Historical canonical records remain discoverable:

- Archived Projects/Areas
- Done Tasks
- Past Dates
- historical Daily Notes

Search deliberately excludes retired legacy Captures, Resources, Reviews, Dashboard Scratchpad content, legacy Deadline rows, Task due dates, and recovery metadata.

Selecting a result opens exact Search detail. Contextual actions use ordinary language such as **Open project**, **Open area**, or **Open Today**.

## 9. Command palette

Cmd/Ctrl+K is the universal canonical search/navigation palette.

It supports:

- keyboard navigation with Up/Down;
- Enter to activate;
- Escape to close;
- canonical Search results;
- navigation to Home, Projects, Areas, Dates, Search, LifeOS, Settings;
- direct **New Task**;
- direct **New Date**.

Task/Date quick-create requires an explicit Project or Area context.

## 10. LifeOS hub

ContextOS includes a shallow LifeOS hub for:

- Ravel
- SocialOS
- Ledger
- Canon

The hub renders only information exposed through an explicit module provider.

It must not:

- duplicate full module internals;
- invent placeholder metrics;
- imply a connection that does not exist.

Optional module destinations are configured through:

```text
NEXT_PUBLIC_LIFEOS_RAVEL_URL
NEXT_PUBLIC_LIFEOS_SOCIALOS_URL
NEXT_PUBLIC_LIFEOS_LEDGER_URL
NEXT_PUBLIC_LIFEOS_CANON_URL
```

Unconfigured/invalid destinations render **Not connected**.

Browser-visible module destinations are separate from authentication/SSO configuration.

## 11. Settings

Definitive sections:

```text
Account
Appearance
Offline & Sync
Data
Security
Advanced
```

Area management does not belong in Settings.

Appearance and the shell use one shared theme preference.

Advanced remains empty until a legitimate product-level advanced setting exists.

## 12. Retired first-class surfaces

### Inbox

Retired in C7.

Replacement:

- Daily Notes for frictionless unstructured capture;
- contextual creation;
- Cmd/Ctrl+K New Task / New Date.

Existing Capture rows remain preserved during C7 for C8 migration, but no new demo/handoff Inbox captures are created.

### Resources

Retired in C7.

Durable knowledge belongs to future Canon/Knowledge Base. Existing standalone Note rows remain preserved until C8 migration.

### Reviews

Retired in C7.

Reflection/history belongs primarily to Ledger. Existing Review rows remain preserved until C8 migration.

### Archive / Trash page

Retired in C7.

- Area/Project archival is visible in-place.
- canonical historical state is discoverable through Search.
- legacy tombstone state remains preserved behind the compatibility boundary until C8 so old offline state cannot be silently lost or resurrected.

There is no standalone Archive page in the definitive product.

## 13. LifeOS handoff compatibility

The historical `lifeos-handoff/v1` fragment parser remains readable for compatibility.

C7 does **not** convert accepted handoffs into retired Inbox Captures.

Until a canonical inter-module action contract is defined:

- `/handoff` may preview a valid private proposal;
- it does not save the proposal;
- the user may explicitly create a Task/Date through Home or Cmd/Ctrl+K.

This is preferable to silently writing invisible legacy data.

## 14. Local-first contract

After a successful authenticated bootstrap on a device, the canonical workspace supports cached reopen and supported local mutations while offline.

Canonical offline surfaces:

- `/dashboard`
- `/projects`
- `/projects/:id`
- `/dates`
- `/areas`
- `/areas/:id`
- `/lifeos`
- `/search`
- `/settings`

Retired aliases may still resolve through the cached shell to their canonical destinations; they do not restore retired UI.

Local-first rules include:

- user-scoped IndexedDB state;
- atomic workspace + outbox commits;
- pending mutations retained until acknowledged;
- explicit stale/conflict warnings;
- no fabricated first-time offline authentication;
- explicit local identity selection when multiple verified workspaces exist;
- true logout/account deletion remain network-bound where server state must change.

## 15. Persistence compatibility boundary

C7 is a **surface retirement**, not the broad persistence migration.

Until C8, storage/sync/import/export may still contain:

- legacy Capture rows;
- standalone Note rows;
- Review rows;
- legacy Deadline rows;
- old Task fields/statuses;
- Dashboard Scratchpad/Preference rows;
- project recovery metadata;
- nested-project fields.

Rules during this compatibility period:

1. definitive UI must not revive retired concepts;
2. Search must not index them;
3. demo reset must not seed new retired Capture/Resource/Review data;
4. old rows must remain scoped, exportable, and migration-safe;
5. tombstone/stale-write protection remains intact;
6. C8 owns destructive schema/storage migration after migration behavior is verified.

## 16. Ownership across LifeOS

- **ContextOS:** operational execution context.
- **Ravel:** finances.
- **SocialOS:** relationships.
- **Ledger:** reflection/history.
- **Canon:** durable knowledge and deep documentation.

ContextOS may expose links/summaries/actions across modules, but it should not become a duplicate database for their internals.

## 17. Product constraints

ContextOS remains:

- single-user oriented within one active identity;
- self-hostable;
- local-first within the documented boundary;
- explicit about sync/offline failure;
- conservative about destructive migration;
- free of fake AI/module data;
- optimized for a small, understandable operational model rather than maximal configurability.

Historical Stage 7-10 evidence remains repository provenance. Current product semantics are defined by this blueprint and the active implementation, while C8 will complete the persistence migration behind the already-retired legacy surfaces.
