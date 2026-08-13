# Stage 6 — Cache-complete application shell

Stage 6 starts only after Stage 5 local routing reached its acceptance boundary: core offline navigation, local history, query-string navigation, search-to-record routing, and dynamic project offline hard refresh are green; cold offline reopen is the sole remaining characterization failure.

## Scope

1. Cache a versioned, user-neutral application shell and every asset required to bootstrap the core workspace without a network connection.
2. Expose an explicit shell-readiness state. “Offline ready” must only be reported after the service worker has verified that the required shell is cached.
3. Keep API requests network-only. A failed `/api/*` request must fail as a network/API operation and must never be satisfied by an HTML or stale application-shell cache entry.
4. Preserve the Stage 5 local router and the Stage 2–4 user-scoped IndexedDB/offline mutation model.

## Acceptance

- A previously authenticated user can close and reopen the application while offline.
- Core workspace routes can be hard-refreshed and reopened offline, including dynamic project URLs through the cached shell fallback.
- Shell readiness is explicit and corresponds to actual required cached resources, rather than browser online/offline state alone.
- API requests are never impersonated by cached shell responses.
- The production-style offline matrix covers reopen and reload behavior across the core workspace.
