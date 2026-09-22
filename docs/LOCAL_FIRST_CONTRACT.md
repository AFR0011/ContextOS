# ContextOS Local-First Contract

## Purpose

This document defines the current local-first boundary for ContextOS as a **single-user local-first workspace** for one active identity at a time, with PostgreSQL-backed synchronization and user-scoped local persistence.

The contract is deliberately narrower than "all functionality works without a server."

Historical Stage 10 final acceptance remains provenance for the boundary verified at commit `f4ba02699c24210ddd6f4cfaf2b626f7a33b0c40` / CI run `31800346837`. C7 updates the visible product surfaces while preserving the applicable identity, synchronization, lifecycle, and anti-resurrection guarantees.

## Operating Model

After one successful online authentication/bootstrap on a device:

- an eligible verified identity and workspace snapshot can be stored locally;
- canonical workspace surfaces can reopen from the verified application shell;
- supported mutations commit locally first;
- workspace state and its outbox update atomically;
- queued mutations synchronize when connectivity returns.

PostgreSQL is canonical after successful synchronization.

## Core Offline Surfaces

The current first-class offline surfaces are:

- `/dashboard` — Home, Today, Daily Notes, Context Today, Upcoming;
- `/projects` — Active/Archived Projects;
- `/projects/:id` — Project Detail, Tasks, Dates, Linked Knowledge boundary;
- `/dates` — canonical Events/Deadlines;
- `/areas` — Areas;
- `/areas/:id` — Area Detail;
- `/lifeos` — shallow module hub;
- `/search` — canonical local Search/history;
- `/settings` — local-safe settings/sync visibility plus network-gated controls.

Compatibility aliases remain cached only so old bookmarks resolve safely:

```text
/today      -> /dashboard
/this-week  -> /dashboard
/deadlines  -> /dates
/inbox      -> /dashboard
/resources  -> /lifeos
/reviews    -> /lifeos
/archive    -> /search
```

Those aliases do not define additional product surfaces and do not restore retired UI.

## Required Offline Behaviors

Within the tested boundary:

1. A previously authenticated eligible identity can reopen ContextOS offline.
2. Canonical routes can render from the verified cached shell.
3. Browser back/forward works across locally owned canonical routes.
4. Hard refresh reconstructs canonical static and dynamic routes.
5. Dynamic Project and Area URLs resolve from local state.
6. Supported local mutations survive reload before synchronization.
7. Workspace state and outbox changes commit atomically.
8. Pending work is not silently discarded.
9. Search uses locally available canonical workspace data.
10. unsupported/network-required controls fail explicitly or are disabled.
11. reconnect attempts synchronization without replacing newer local work with a stale bootstrap.
12. multiple eligible local identities require explicit selection.

## Authentication and Device Boundary

**Offline workspace access is allowed only for an identity that was previously authenticated successfully on that device.**

ContextOS does not store a password or reusable server authentication secret in IndexedDB to fabricate offline login.

When several local workspaces are eligible and remote identity cannot be verified, ContextOS must not guess which person to open.

Ordinary logout preserves the selected user's isolated local data by default on a trusted device. Current-device removal is explicit and user-scoped.

**Offline logout is blocked** because browser code cannot truthfully revoke the server-side HttpOnly session without connectivity.

Permanent account deletion is an online authenticated operation requiring password confirmation and exact destructive confirmation. Other offline devices cannot be remotely erased; stale copies must never be rebound implicitly to another account.

## Synchronization Boundary

Local state is authoritative for offline interaction until synchronization. PostgreSQL becomes canonical after accepted synchronization.

The synchronization system:

- uses per-user mutation IDs;
- replays accepted IDs idempotently;
- validates ownership and payload/reference boundaries;
- retains pending work until acknowledged;
- warns/skips stale writes rather than silently overwriting newer state;
- skips stale canonical writes rather than silently overwriting newer server state.

The implementation does not promise CRDTs, peer-to-peer sync, simultaneous collaborative editing, or a merge-conflict editor.

## C8 Canonical Persistence Boundary

C8 removes the retired compatibility storage rather than carrying it forward indefinitely.

The canonical persisted workspace is Area / Project / Task / Date / DailyNote across PostgreSQL, bootstrap serialization, user-scoped IndexedDB, sync, and portability export v2.

IndexedDB v3 is an intentional clean break: remembered verified identities survive the database upgrade, while incompatible pre-C8 workspace and outbox snapshots are discarded and rebuilt from authenticated server bootstrap. No rolling old-client/outbox protocol is promised because the product had no real users at this migration point.

The sync contract accepts canonical entity types only and ordinary client mutations are upsert-only. Retired Capture/Resource/Review/legacy Deadline/Dashboard/recovery/tombstone fields are not synchronized.

## Deletion / Lifecycle Boundary

Canonical Area and Project lifecycle is archival in place. Tasks use Open/Done. Dates have no completion/archive state. There is no standalone Archive/Trash page and no canonical per-record tombstone protocol.

ContextOS does not present irreversible per-record purge as a user-facing workflow. Account deletion remains a separate authenticated lifecycle operation, and remote erasure of data already stored on another offline device is not claimed.

## Network-Required Operations

Network access is required for operations that inherently change or verify server state, including:

- first-time sign-in on a device;
- registration;
- remote session verification;
- synchronization;
- refresh-from-server;
- demo reset;
- true logout;
- permanent account deletion;
- remote/provider integrations that have not been locally cached by design.

A first-time offline visitor with no verified local workspace must not be admitted to a fabricated anonymous workspace.

## Offline-Ready Definition

"Offline ready" means more than "a service worker exists."

The application may report ready only when:

- the versioned application shell manifest is complete;
- required static resources are actually cached;
- at least one previously authenticated local identity has an eligible local workspace snapshot.

Retired compatibility aliases can be part of shell routing only as migrations to canonical surfaces.

## Explicit Non-Goals

- collaborative real-time editing;
- CRDT semantics;
- peer-to-peer synchronization;
- offline registration/first-time authentication;
- offline permanent account deletion;
- arbitrary server/API functionality offline;
- irreversible per-record purge without anti-resurrection evidence;
- pretending a network-required operation succeeded when it did not.

## Verification Rule

Claims follow automated evidence. The optimized production runtime owns service-worker, cold-open, hard-refresh, offline alias migration, local mutation durability, Search, and API/cache-separation claims. Development E2E owns broader interactions, identity isolation, local atomicity, synchronization, route compatibility, accessibility, and fixture regression.

Stage 9/10 historical verification documents remain unmodified provenance for what was tested at those stages. Current C8-C10 assurance validates the canonical persistence/sync model, retired-route redirects, C9 responsive/offline behavior, and the definitive C10 workflow without reviving the old tombstone UI contract.
