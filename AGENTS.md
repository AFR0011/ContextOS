# ContextOS Repo Instructions

## Source Of Truth
- Treat `BLUEPRINT.md` as the product source of truth.
- Treat `docs/PROJECT_STATE.md`, `docs/REPO_MAP.md`, and `docs/RUN_PROTOCOL.md` as the current operating state for implementation work.
- Preserve user changes in this repo. The deleted legacy spec files and untracked/current `BLUEPRINT.md` may be intentional.

## Working Style
- Prefer focused, local diffs over broad refactors.
- Keep ContextOS execution-first: fast capture, today selection, project recovery, open-loop visibility, and review/search durability.
- Do not add external AI calls for agent suggestions in v0.1; suggestions are rule-based and manually applied.
- For auth and persistence, keep records user-scoped.
- For offline behavior, use IndexedDB plus queued sync mutations. Server data is canonical after sync.

## Verification
- Use the documented ladder in `docs/RUN_PROTOCOL.md`.
- Minimum for implementation changes: `npm run typecheck` and `npm run build`.
- For data/auth/offline changes, also run database setup/seed and Playwright smoke tests when possible.
