# ContextOS Local-First Contract

## Purpose

This document defines the product boundary for completing ContextOS as a single-user local-first workspace with server-backed synchronization.

The contract is intentionally narrower than "all functionality works without a server." It defines which product surfaces and behaviors must remain usable after a user has successfully authenticated on a device at least once, and which operations are allowed to require connectivity.

This contract is the Stage 1 target for the local-first completion work. Later implementation and verification stages must satisfy it before the project documentation or portfolio claims are strengthened.

## Local-First Operating Model

After one successful online sign-in on a device, ContextOS must support reopening and using the core workspace while offline. Local workspace state is durable on the device, supported changes are committed locally first, and pending mutations synchronize with the server when connectivity returns.

PostgreSQL remains the canonical server state after successful synchronization. Local-first behavior does not imply collaborative real-time editing, peer-to-peer synchronization, or arbitrary server functionality while offline.

## Core Offline Surfaces

The following surfaces are inside the local-first boundary and must be navigable, readable, and usable without network access after the device has been prepared by a prior successful authenticated session:

- `/dashboard` — Dashboard command page, scratchpad, live Tasks and Dates, and local view controls.
- `/inbox` — Capture, review, triage, conversion, archive, and delete workflows that operate on local workspace data.
- `/projects` — Project listing and local project creation/update operations.
- `/projects/:id` — Dynamic project detail, recovery notes, Tasks, Dates, subcontexts, archive/delete operations, and local project editing.
- `/dates` — Important Dates browsing and supported CRUD operations.
- `/areas` — Area browsing and supported local edits.
- `/resources` — Resource browsing, Markdown editing, and supported local edits.
- `/search` — Search over locally available workspace state and navigation to local records.
- `/archive` — Browsing archived local records and supported restore/delete actions.
- `/reviews` — Review views and review records that operate on local workspace state.
- `/settings` — Local settings/domain editing and visibility into offline/synchronization state, excluding explicitly network-required controls.

Compatibility routes such as `/today`, `/this-week`, and `/deadlines` do not define additional offline product surfaces. Their final behavior may continue to resolve to the canonical local surfaces they already represent.

## Required Offline Behaviors

For the core offline surfaces above, the completed implementation must guarantee:

1. A previously authenticated user can open ContextOS with no network connection.
2. Core surfaces can be reached through normal application navigation while offline.
3. Browser back/forward navigation works across core surfaces while offline.
4. Hard refresh on a core route restores the correct local view while offline.
5. Dynamic project URLs can reopen and render the correct locally cached project while offline.
6. Closing and reopening the tab or browser while offline preserves the workspace.
7. Supported create, edit, archive, restore, delete, and triage operations update local state without waiting for the server.
8. Local changes survive reloads and browser restarts before synchronization.
9. Pending work is visibly distinguishable from synchronized work where relevant.
10. Search operates over the locally available workspace and does not require a remote query.
11. Controls that cannot operate offline fail explicitly or are disabled with a connectivity explanation; they must not silently do nothing.
12. Reconnection attempts synchronization without discarding pending local work.

## Network-Required Operations

The following operations are explicitly outside the offline guarantee and may require a reachable server:

- first-time sign-in on a device;
- registration;
- online session verification when connectivity is available;
- synchronization with PostgreSQL through the sync API;
- explicit refresh-from-server operations;
- demo reset/server reset operations;
- any future operation whose purpose inherently requires a remote provider or server and is explicitly labeled as such.

A first-time visitor with no previously authenticated local identity and no cached workspace must not be admitted into a fabricated or anonymous offline workspace. The product must present a clear connectivity/sign-in requirement instead.

## Authentication Boundary

Offline workspace access is allowed only for an identity that was previously authenticated successfully on that device. Offline access must never be treated as proof of a currently valid remote session.

The completed design must not store a password, authentication secret, reusable server credential, or equivalent sensitive credential in IndexedDB merely to make offline startup possible.

User-scoped local data must remain isolated. Data belonging to one previously authenticated user must never be displayed as the workspace of another user on the same browser/device.

Detailed logout, local-data removal, pending-change handling, and multi-user switching semantics are intentionally deferred to Stage 9 of the implementation plan.

## Synchronization Boundary

Local state is authoritative for offline interaction until synchronization occurs. After successful synchronization, PostgreSQL is canonical.

The synchronization system must preserve pending local changes until the server acknowledges them. Retries and reconnection must not silently duplicate accepted mutations. Stale or conflicting server/local state must be surfaced according to the existing synchronization conflict model rather than silently overwriting newer state.

The implementation is not required to provide CRDTs, simultaneous multi-user collaborative editing, or a merge-conflict editor.

## Offline-Ready Definition

The application must not claim that the device is "offline ready" merely because a service worker has registered or an IndexedDB database exists.

A device is offline ready only when all resources required to launch and render the local application shell for the core offline surfaces are available locally, a previously authenticated local identity is available, and a local workspace snapshot can be opened.

The precise readiness mechanism and UI are implementation work for later stages.

## Explicit Non-Goals

The local-first completion project does not require:

- collaborative real-time editing;
- CRDT-based merge semantics;
- peer-to-peer synchronization;
- offline registration or first-time authentication;
- arbitrary API/server functionality while offline;
- remote integrations while offline;
- pretending a network-required operation succeeded when it has only been queued locally unless that operation is explicitly part of the supported mutation model.

## Verification Rule

Implementation claims must follow automated evidence. The characterization tests introduced in Stage 0 remain expected to expose current failures until later stages make them pass. The broader acceptance matrix defined for Stage 10 will be the final evidence for strengthening the public "local-first" claim.
