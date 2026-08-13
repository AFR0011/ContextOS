# Stage 6 Verification

Stage 6 implements a cache-complete, versioned application shell on `feat/local-first-completion-stage6`.

The service worker now caches the dashboard shell plus its required static assets, records a shell manifest, exposes an explicit readiness protocol, keeps API requests network-only, and falls back to the cached shell for core workspace navigation including dynamic project URLs. The workspace UI reports `Offline ready` only after the current shell manifest has been verified complete.

Verification includes a production-mode Playwright matrix for shell completeness, cold offline reopen, cold-open and hard-refresh coverage across core workspace routes plus a dynamic project route, and network-only API behavior. The existing end-to-end deployment assertions have been updated from the former v2 route list to the Stage 6 v3 shell contract.

Final Stage 6 closure is pending the complete CI run on this branch: dependency audit, Prisma validation/generation/migrations/seed, typecheck, production build, the production offline matrix, and the full existing Playwright suite must all pass before the stage is considered closed.
