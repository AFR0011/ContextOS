---
version: 1.0
name: ContextOS Design System
status: canonical
product: ContextOS
last_updated: 2026-09-22
baseline: C9
---

# ContextOS Design System

## 1. Purpose

ContextOS is the operational-context module of LifeOS. Its interface exists to help a person:

1. understand the day;
2. execute planned work;
3. hold lightweight working memory;
4. reopen the right context without reconstructing it from memory;
5. see relevant temporal pressure;
6. recover historical operational state; and
7. leave ContextOS for a deeper LifeOS module only when that module owns the information.

The design goal is **quiet operational clarity**.

ContextOS is not a generic dashboard, document editor, calendar replacement, analytics console, habit tracker, or AI cockpit. It should feel calm enough for daily use and precise enough that state, ownership, and actions remain obvious under load.

The active product model and information architecture are defined by `BLUEPRINT.md`. This document defines how that product should look and behave.

## 2. Design principles

### 2.1 Orient before asking for input

Home should first answer what matters today. Creation is available, but the interface should not force users into capture mode before they can understand existing context.

### 2.2 Structured data where structure matters

Tasks, Projects, Areas, Events, and Deadlines are structured records. Daily Notes are intentionally unstructured.

Do not recreate retired generic Inbox, scratchpad, Resource, Review, recovery-field, or nested-project concepts under new labels.

### 2.3 Recovery over decoration

Project and Area surfaces should help users resume work quickly. Show the small amount of information that changes the next useful action.

For Projects, that means:
- name;
- Area;
- objective;
- open/completed Tasks;
- Dates;
- Linked Knowledge boundary.

Do not add progress percentages, fake activity feeds, status prose, open-loop dashboards, or decorative metrics without a real product requirement.

### 2.4 Quiet hierarchy

Use typography, spacing, alignment, and subtle borders before adding cards, shadows, or color.

A surface should exist because it groups meaningful content, not because every concept apparently deserves its own rectangle.

### 2.5 Honest intelligence

Insights and LifeOS summaries must come from an explicit provider or evidence source. Empty is better than fabricated intelligence.

### 2.6 Local-first state must remain visible

Offline, pending, warning, and synchronization states are product states, not backend trivia. Surface them clearly without letting them dominate ordinary use.

### 2.7 Accessibility is part of the visual system

Keyboard, touch, contrast, focus, reduced motion, long content, and narrow screens are baseline requirements.

## 3. Canonical product surfaces

### Home

Home is the operational entry point.

Desktop hierarchy:

```text
Today | Daily Notes + Insights | In Context Today + Upcoming
```

Mobile hierarchy:

```text
Today
Daily Notes
Insights when present
In Context Today
Upcoming
```

Rules:
- Dayline is dominant.
- Timed planned Tasks and today's Events appear chronologically.
- Untimed planned Tasks appear under Anytime.
- Completed Tasks remain visible and visually subdued.
- Daily Notes provide one freeform note for the local day.
- In Context Today links to relevant Projects and Areas.
- Upcoming shows future Events and Deadlines.
- Same-day Deadline records are not rendered as fake timeline events.

### Projects

Projects are flat bounded outcomes.

List surfaces:
- separate Active and Archived groups;
- show Area, objective excerpt, and open Task count;
- Archive/Restore is secondary to opening the Project;
- long names and Area labels must wrap safely.

Project Detail:
- read-first summary with Name, Area, state, and Objective visible without form chrome;
- explicit Edit details mode exposes editable Name, Area, and Objective;
- open Tasks with shared post-creation Task editing;
- optional completed Task history, also editable without changing Done state;
- Dates;
- Linked Knowledge integration boundary;
- Archive/Restore, with Archive blocked while Open Project Tasks remain.

There are no nested Projects or project recovery dashboards.

### Areas

Areas are long-lived responsibilities.

List surfaces:
- separate Active and Archived groups;
- show active Project and direct open Task counts;
- Archive/Restore is local to the Area lifecycle.

Area Detail:
- read-first Area header with explicit Edit details mode for the Area name;
- Active Projects as the primary operational region, with Project creation disclosed on demand;
- Direct Tasks with shared post-creation Task editing and creation disclosed on demand;
- Direct Dates with creation disclosed on demand;
- Archived Projects shown only when present.

Archiving an Area does not archive its Projects. Area archive is blocked only by direct Open Tasks; child Project lifecycle remains independent. Archive controls remain actionable, and the blocking explanation appears only after a blocked attempt rather than as persistent list noise.

### Dates

Dates represent temporal facts, not Tasks.

Kinds:
- Event;
- Deadline.

Groups:
- Today;
- Upcoming;
- Past.

Filters:
- All;
- Events;
- Deadlines.

Rules:
- Dates have no completion checkbox.
- A Date belongs to exactly one Project or Area.
- Events may have start/end time.
- Deadlines may have a time but no end time.
- Task planning remains visually and semantically separate.

### Search

Search is the canonical history/recovery surface for:
- Projects;
- Areas;
- Tasks;
- Dates;
- Daily Notes.

Rules:
- archived, done, past, and historical records remain discoverable;
- result rows identify type and useful context;
- selection opens a detail pane without forcing immediate navigation;
- contextual navigation uses plain actions such as Open project, Open area, or Open Today;
- long result content wraps instead of truncating critical identity.

### Command palette

Cmd/Ctrl+K is the keyboard-first canonical command/search layer.

It supports:
- canonical search;
- page navigation;
- New Task;
- New Date;
- Arrow navigation;
- Enter activation;
- Escape close;
- contained Tab focus;
- focus restoration after close.

The selected option must stay visible while navigating a long result list.

### LifeOS

LifeOS is a shallow module hub for:
- Ravel;
- SocialOS;
- Ledger;
- Canon.

Rules:
- do not duplicate module internals;
- do not invent metrics or activity;
- unconfigured destinations say Not connected;
- real destinations may be opened;
- module summaries appear only through the explicit provider contract.

### Settings

Canonical sections:
- Account;
- Appearance;
- Offline & Sync;
- Data;
- Security;
- Advanced.

Settings is for account/application controls, not Area management.

## 4. Navigation

Desktop primary navigation:

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

Mobile bottom navigation:

```text
Home
Projects
Search
LifeOS
```

Secondary mobile navigation lives in the drawer.

Compatibility routes may redirect old bookmarks, but retired concepts must never return as primary navigation.

## 5. Visual character

Desired qualities:

```text
calm
precise
quietly technical
low-chrome
readable
private
responsive
purposeful
```

Avoid:

```text
card-everything dashboards
dense admin tables as primary UI
glowing AI cockpit aesthetics
excessive gradients
decorative KPI tiles
rainbow taxonomies
hover-only actions
fake activity
visual hierarchy based mainly on shadows
```

## 6. Theme and tokens

The implementation source of truth is `src/app/globals.css`.

### Theme behavior

- Light and dark are both first-class.
- If no preference is stored, use the operating-system preference.
- Persist the explicit user choice in local storage.
- Shell and Settings must use the same theme preference.
- Theme changes must not alter information hierarchy or interaction semantics.

### Core palette

Light mode uses a warm neutral canvas with restrained indigo accent:
- background: `#f6f5f2`;
- elevated: `#ffffff`;
- strong text: `#151923`;
- primary: `#626bd9`.

Dark mode uses low-glare near-black neutrals:
- background: `#0a0c11`;
- elevated: `#141820`;
- strong text: `#ffffff`;
- primary: `#8b93ff`.

Semantic colors exist for success, warning, danger, and information states. Use them only when the state itself is meaningful.

### Typography

System-first sans-serif stack:
```text
Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif
```

Rules:
- app headings should be strong but not display-scale;
- dense operational rows use 12–14px supporting text;
- meaningful metadata must remain contrast-safe;
- long labels wrap using safe word-breaking rather than hiding identity;
- prose remains width-limited where reading comfort matters.

### Shape and surfaces

Current geometry:
- inputs: 12px radius;
- default surfaces: 16px radius;
- buttons: 8px radius;
- pills: fully rounded.

Surface hierarchy:
- Level 0 — canvas/uncontained content: use spacing, alignment, and dividers with no enclosing rectangle;
- Level 1 — grouped operational surface: use `.cos-surface` for content that genuinely belongs together;
- Inset — secondary content within a Level 1 surface: use `.cos-surface-muted` sparingly;
- Level 2 — focus-owning/transient elevation: use `.cos-surface-raised` for overlays, palettes, sheets, and similarly dominant temporary surfaces.

Use borders before shadows. Default app surfaces are not floating cards. Do not promote ordinary sections to Level 1 merely to make them look designed; containment must communicate a real grouping relationship.

Empty states:
- compact empty states are the default for absence inside an otherwise useful section;
- full empty states are reserved for an empty page, blocked prerequisite, or genuinely primary empty condition;
- absence should consume less space than the content that would replace it.

### Content width

`--cos-content-wide` is currently 1480px. Individual components constrain themselves further when reading density requires it.

## 7. Spacing and density

ContextOS should feel compact without becoming cramped.

Rules:
- primary page padding scales from mobile to desktop;
- rows generally target at least 44px visual rhythm;
- interactive touch targets must be at least 40px in both dimensions;
- larger whitespace separates sections, not every row;
- responsive layouts recompose relationships before merely stacking desktop containers;
- metadata and secondary controls compress before primary content does;
- compact or empty states shrink on narrow screens instead of preserving desktop-sized vacant surfaces;
- authored content may retain more room when its content warrants it, but an empty editor must not reserve the same visual mass as a substantive one;
- avoid horizontal scrolling for ordinary application content at 320px and above;
- long names/objectives/details must wrap without pushing lifecycle controls off-screen.

## 8. Product copy

Persistent interface copy must earn its space.

Rules:
- explain the next action or a non-obvious consequence, not the product's internal data model;
- do not repeat concepts already made clear by headings, labels, placement, or controls;
- keep recurring helper text short enough to scan rather than reread;
- implementation terms such as provider contracts, persistence mechanics, or internal architecture belong in documentation unless the user must act on them;
- progressive disclosure is preferred for detail that matters only during a specific action;
- an optional section description should be omitted when the heading and content already explain the region.

## 9. Component rules

### Buttons

Hierarchy:
1. Primary
2. Secondary
3. Ghost
4. Destructive

Rules:
- one visually dominant action per local region when possible;
- icon-only controls require accessible labels;
- disabled state must remain visibly distinct;
- Archive is a lifecycle action, not equivalent to permanent deletion;
- interactive hit target is at least 40px.

### Inputs

Rules:
- minimum height 40px;
- clear focus treatment;
- useful labels and placeholders;
- disabled state remains legible;
- date/time controls must not imply unsupported semantics;
- autosave/debounce should expose enough status to avoid uncertainty.

### Entity rows

Use rows for Projects, Areas, Tasks, Dates, and search results.

Rows should:
- make the main identity visually obvious;
- keep secondary metadata subordinate;
- provide enough vertical hit area;
- wrap hostile long content;
- avoid invisible click targets;
- render text as non-focusable content when there is no action.

### Pills

Pills are for compact type/state/context labels. They are not a substitute for prose or a license to turn the interface into a taxonomy conference.

### Empty states

A useful empty state:
- explains what is absent;
- does not imply an error when absence is legitimate;
- offers at most one obvious next action when one exists.

### Dialogs and sheets

Modal surfaces must:
- use `role="dialog"` and `aria-modal="true"`;
- contain Tab/Shift+Tab focus;
- support Escape when dismissal is safe;
- return focus to the previous trigger;
- keep destructive/in-progress states from being accidentally dismissed;
- remain usable on narrow/mobile viewports.

### Sync indicator

Sync state is visible but secondary during healthy operation.

States:
- Online;
- Offline;
- Syncing;
- pending mutations;
- warning/error.

Refresh from server must be unavailable when doing so could conflict with pending local work.

## 10. Responsive behavior

### Mobile

- single-column content flow;
- persistent four-item bottom navigation;
- secondary destinations in drawer;
- safe-area-aware bottom spacing;
- creation forms stack vertically;
- dialogs/sheets fit within dynamic viewport height;
- no dependency on hover.

### Tablet

Two-column Home may appear where useful. Controls should not become dense simply because width exists.

### Desktop

Home may use its three-region hierarchy. Work surfaces can use wide content space while keeping text regions readable.

### Long-content resilience

At minimum, the product must tolerate:
- 140+ character Area names;
- 150+ character Project names;
- long Project objectives;
- long Date titles;
- long Search results;
- long import filenames;
- long Daily Notes.

Long content should wrap and increase vertical height rather than create horizontal page overflow.

## 10. Keyboard and focus

Required:
- visible focus rings;
- logical tab order;
- no inert buttons;
- Cmd/Ctrl+K available from the workspace;
- command-palette focus containment;
- modal focus containment;
- focus restoration;
- selected command remains scrolled into view;
- Enter/Escape behavior matches the control's semantics.

Do not create focusable elements solely for styling.

## 11. Motion

Motion should confirm state rather than decorate it.

Current transition tokens:
- fast: 120ms;
- normal: 180ms;
- slow: 240ms.

Use movement sparingly for:
- hover/focus response;
- state transition;
- overlay appearance;
- navigation affordance.

When `prefers-reduced-motion: reduce` is active, transitions/animations must collapse effectively to zero and smooth scrolling must not be required.

## 12. State semantics

Area:
- Active;
- Archived.

Project:
- Active;
- Archived.

Task:
- Open;
- Done.

Task lifecycle rules:
- title, Project/Area context, planned day, and scheduled time remain editable after creation;
- clearing planned day clears scheduled time;
- a Project cannot archive while it owns Open Tasks;
- an Area cannot archive while it owns direct Open Tasks;
- Archive controls stay actionable; when a guard rejects the action, the relevant explanation is revealed contextually and disappears once the blocker is resolved;
- a Done Task whose actual parent is archived cannot be reopened until moved to an active context or the parent is restored.

Date:
- Event;
- Deadline;
- temporal grouping only.

Daily Note:
- one record per local calendar day.

Insight:
- present only while relevant;
- no user-visible lifecycle backlog.

Do not add visual states that imply unsupported domain states such as blocked, dropped, percent complete, review pending, trash, or task archive.

## 13. Writing and terminology

Canonical visible terms:
- Home;
- Area;
- Project;
- Task;
- Date;
- Event;
- Deadline;
- Daily Notes;
- Search;
- LifeOS;
- Settings;
- Active;
- Archived;
- Open;
- Done.

Avoid implementation jargon in product copy:
- bootstrap;
- mutation;
- outbox;
- canonical record;
- tombstone;
- provider contract.

Those belong in diagnostics/documentation unless a technical setting specifically requires them.

Retired visible concepts:
- Inbox;
- Resources;
- Reviews;
- Archive/Trash page;
- Scratchpad;
- Next Action;
- Latest Status;
- Open Loops;
- Subcontexts/nested Projects.

## 14. Design acceptance checklist

A change is not visually complete until the relevant checks pass.

### Structure
- primary information appears before secondary controls;
- no duplicate ownership across ContextOS/LifeOS modules;
- no retired concept has reappeared accidentally.

### Responsive
- 320px width does not horizontally overflow;
- mobile bottom navigation does not cover actionable content;
- dialogs remain reachable within the viewport;
- long content wraps.

### Touch
- important interactive controls meet the 40px target floor;
- compact visible icons may remain smaller inside a larger hit area.

### Keyboard
- all actions are reachable;
- focus stays inside modal surfaces;
- focus returns after close;
- no inert focus stops.

### Theme
- both light and dark preserve contrast and hierarchy;
- theme does not expose legacy hard-coded light colors.

### Offline/sync
- current state remains understandable offline;
- pending work is visible;
- reconnect does not present stale server state as a successful overwrite.

### Content
- empty states are honest;
- Insights/module summaries are never fabricated;
- text uses current canonical terminology.

## 15. Source-of-truth hierarchy

When documents disagree, use this order:

1. current accepted product decisions in `BLUEPRINT.md`;
2. active implementation and canonical domain types;
3. this `DESIGN.md`;
4. active current-state/run-protocol documentation;
5. historical Stage 7–10 and archived design material for provenance only.

Historical product designs remain available in Git history. They are not active amendments to this specification.
