# Stage 6 Verification

Stage 6 implements a cache-complete, versioned application shell on `feat/local-first-completion-stage6`.

The service worker now caches the dashboard shell plus its required static assets, records a shell manifest, exposes an explicit readiness protocol, keeps API requests network-only, and falls back to the cached shell for core workspace navigation including dynamic project URLs. The workspace UI reports `Offline ready` only after the current shell manifest has been verified complete.

Verification includes a production-mode Playwright matrix for shell completeness, cold offline reopen, offline scratchpad persistence across a hard reload, cold-open and hard-refresh coverage across core workspace routes plus a dynamic project route, network-only API behavior, and the Stage 4 workspace-gate characterization. Offline hard-reload and cold-start characterization runs against the optimized production server; the ordinary development-server suite continues to cover interactive application behavior without treating Next.js HMR runtime as an offline deployment artifact.

Final Stage 6 closure is pending the complete CI run on this branch: dependency audit, Prisma validation/generation/migrations/seed, typecheck, production build, the production offline matrix, and the development-server Playwright suite must all pass before the stage is considered closed.
