# Batch 3 — Clean first run

## Contract

- Real account registration creates only technical workspace scaffold records, not demo Areas, Projects, Tasks, Dates, captures, Resources, or Reviews.
- Normal authenticated bootstrap may repair missing technical scaffold records but must never inject demo user content.
- Demo fixtures remain available only through the explicit demo seed/reset paths used by local development, disposable previews, and automated tests.
- A truly empty real account is routed through one required first-run action: create the first Area.
- Accounts that already contain Areas are never forced back through first run.
- If all existing Areas are archived, Project and Resource creation direct the user to manage Areas instead of presenting a silent dead end.
- Normal Settings no longer exposes demo reset.
- Inbox Resource conversion may prefer an Area named `Notes`; Project conversion must not silently choose `Notes`. One-click Project conversion uses the first active non-Notes Area, while review mode requires an explicit Area when no such default exists.

## Acceptance

`tests/e2e/batch3-clean-first-run.spec.ts` verifies:

1. fresh registration starts with no user-content fixtures;
2. bootstrap/reload does not resurrect demo content;
3. first Area setup unlocks the normal workspace;
4. the new account can create a real Project and Resource;
5. the first-run surface fits a narrow mobile viewport;
6. quick Project conversion does not silently file work into Notes.

The complete repository CI matrix remains the merge gate.
