# ContextOS C10 Screenshot Baseline

Date: 2026-09-22  
Program: C10 definitive product acceptance  
Status: capture specification complete; image capture pending a runnable browser against the C10 branch.

## Purpose

The screenshot baseline exists to catch visual regressions that source-level assertions are bad at detecting: clipping, overlap, awkward wrapping, hidden actions, accidental card stacking, mobile-nav collisions, dark-theme leakage, and controls that technically exist but look broken.

This document defines the minimum canonical visual set. Screenshots themselves must come from a real rendered browser. Source inspection, DOM assertions, or generated mockups do not count as screenshot evidence.

## Capture rules

Use the demo seed after a clean reset unless the scenario explicitly creates hostile content.

Capture:
- desktop at 1440x1000;
- mobile at 390x844;
- narrow stress at 320x720 where specified;
- light and dark for every primary surface;
- no browser zoom;
- no open developer tools affecting viewport;
- stable demo data;
- no unrelated browser chrome inside the image when practical.

Do not capture:
- retired Inbox/Resources/Reviews/Archive UI;
- fabricated module summaries;
- temporary debug state;
- personally identifying real data.

## Baseline set

### 01 Home

Desktop light + dark:
- Today Dayline;
- Daily Notes;
- In Context Today;
- Upcoming;
- sync state visible in ordinary healthy mode.

Mobile light + dark:
- four-item bottom navigation;
- Today;
- Daily Notes;
- In Context Today;
- Upcoming;
- no content hidden behind bottom navigation.

Stress:
- one long Task title;
- one long Project context label;
- Daily Note with several paragraphs;
- verify no horizontal page overflow.

### 02 Projects

Desktop light + dark:
- Active group;
- Archived group;
- Area pills;
- objectives;
- Archive/Restore actions.

Mobile light + dark:
- Project rows remain readable;
- lifecycle controls remain reachable;
- long Project/Area names wrap without covering controls.

### 03 Project Detail

Desktop light + dark:
- Project metadata;
- objective;
- open Tasks;
- completed-task toggle when applicable;
- Dates;
- Linked Knowledge empty boundary.

Mobile light + dark:
- metadata controls stack cleanly;
- Task creation row stacks without clipping;
- Date creation controls remain usable;
- Archive/Restore remains visible.

### 04 Areas

Desktop + mobile, light + dark:
- Active and Archived groups;
- counts;
- lifecycle actions;
- long Area-name stress case.

### 05 Area Detail

Desktop + mobile, light + dark:
- Active Projects;
- direct Tasks;
- direct Dates;
- Archived Projects;
- long Project title and objective stress.

### 06 Dates

Desktop + mobile, light + dark:
- All/Events/Deadlines filters;
- Today/Upcoming/Past grouping;
- Event with start/end;
- Deadline;
- Add Date form open;
- long Date-title stress at 320px.

### 07 Search

Desktop + mobile, light + dark:
- result list plus selected detail;
- Project result;
- completed Task result;
- Daily Note result;
- long-result stress;
- contextual action remains visible.

### 08 Command palette

Desktop + mobile, light + dark:
- palette open with navigation/search results;
- long result label;
- New Task sheet;
- New Date sheet;
- selected option visibly highlighted.

### 09 LifeOS

Desktop + mobile, light + dark:
- all four module cards;
- unconnected state;
- configured destination state if a safe test destination is available;
- no invented summary data.

### 10 Settings

Desktop + mobile, light + dark:
- Account;
- Appearance;
- Offline & Sync;
- Data;
- Security;
- Advanced;
- long import filename stress;
- destructive account-delete entry remains visually distinct.

### 11 Mobile shell drawer

390x844 and 320x720, light + dark:
- drawer open;
- close;
- theme control;
- sync state;
- refresh;
- logout;
- primary/secondary navigation;
- no overlap with viewport edge or bottom navigation.

### 12 Offline / pending state

Production runtime only:
- Offline indicator;
- one queued local mutation;
- warning/pending state;
- reconnect/syncing state if deterministically capturable.

The visual must not suggest successful synchronization while offline.

### 13 Logout dialog

Desktop + mobile, light + dark:
- no pending mutations;
- pending-mutation choices;
- buttons fit without wrapping into unusable layouts;
- destructive/local-removal options remain clearly distinguishable.

### 14 Empty states

At least one clean real-account/empty-workspace capture:
- first Area requirement;
- empty Project/Date state as applicable;
- no demo content leaking into real-account baseline.

## Visual acceptance questions

For every baseline image, inspect:

1. Is any text clipped, ellipsized where identity matters, or visually overlapping?
2. Is there any horizontal page scroll at the target viewport?
3. Are primary and secondary actions visually distinguishable?
4. Are touch targets visually compact but spatially reachable?
5. Does dark mode contain any obviously hard-coded light surface/text?
6. Do empty states look intentional rather than broken?
7. Does mobile navigation cover content or forms?
8. Do long labels force buttons off-screen?
9. Do dialogs/sheets remain within the visible viewport?
10. Does the information hierarchy match the canonical design rather than old card-heavy layouts?
11. Is any technical implementation language exposed unnecessarily?
12. Is any retired product concept visible?
13. Are offline/sync states truthful and understandable?
14. Are module/Insight surfaces honest when providers are absent?

## Evidence rule

C10 screenshot acceptance remains pending until these images are captured from a real browser on the C10 candidate and manually reviewed.

A future automated visual-regression suite may use this set as its initial golden baseline, but the first baseline must be human-reviewed before pixel-diff automation can be trusted. Otherwise the machine will faithfully preserve whatever visual mistake happened to be present on baseline day. Very efficient, in the worst possible sense.
