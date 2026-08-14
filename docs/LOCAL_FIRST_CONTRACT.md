# ContextOS Local-First Contract

## Purpose

This document defines the product boundary for completing ContextOS as a single-user-at-a-time local-first workspace with server-backed synchronization and user-scoped local persistence.

The contract is intentionally narrower than "all functionality works without a server." It defines which product surfaces and behaviors remain usable after a user has successfully authenticated on a device at least once, which operations require connectivity, and how logout, local-device data, account deletion, and recoverable record deletion behave.

The core contract originated in Stage 1 of the local-first completion work. Stage 9 makes the lifecycle and destructive-data semantics explicit before Stage 10 final acceptance.

## Local-First Operating Model

After one successful online sign-in on a device, ContextOS supports reopening and using the core workspace while offline. Local workspace state is durable on the device, supported changes are committed locally first, and pending mutations synchronize with the server when connectivity returns.

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

Account deletion is intentionally not a core offline surface because it changes remote account state and must not pretend to succeed without the server.

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
13. When several previously verified local workspaces exist, ContextOS must not guess an identity. The user must choose a local workspace explicitly or reconnect for server-session verification.

## Network-Required Operations

The following operations are explicitly outside the offline guarantee and require or may require a reachable server:

- first-time sign-in on a device;
- registration;
- online session verification when connectivity is available;
- synchronization with PostgreSQL through the sync API;
- explicit refresh-from-server operations;
- demo reset/server reset operations;
- logout, because the HttpOnly server session cannot be truthfully invalidated by offline browser code;
- permanent account deletion;
- any future operation whose purpose inherently requires a remote provider or server and is explicitly labeled as such.

A first-time visitor with no previously authenticated local identity and no cached workspace must not be admitted into a fabricated or anonymous offline workspace. The product must present a clear connectivity/sign-in requirement instead.

## Authentication and Device Lifecycle Boundary

Offline workspace access is allowed only for an identity that was previously authenticated successfully on that device. Offline access is not proof of a currently valid remote session.

The completed design does not store a password, authentication secret, reusable server credential, or equivalent sensitive credential in IndexedDB merely to make offline startup possible.

User-scoped local data remains isolated. Data belonging to one previously authenticated user must never be displayed as the workspace of another user on the same browser/device.

Stage 9 fixes the following lifecycle semantics:

1. **Normal logout preserves local data by default.** It invalidates the server session while leaving the current user's remembered local identity, cached workspace, and pending outbox available on the device.
2. **Removing device data is explicit and user-scoped.** The user can log out and remove that account's remembered identity, workspace, and outbox from the current browser. Other local users must remain untouched.
3. **Pending changes are never silently discarded.** When pending mutations exist, logout exposes explicit synchronization, local-retention, or discard/device-removal choices. A requested synchronization that does not drain the outbox cancels logout rather than claiming success.
4. **Discarding pending changes removes the affected cached workspace together with its outbox.** ContextOS must not clear the outbox while retaining locally mutated state that could later be mistaken for synchronized truth.
5. **Offline logout is blocked.** Browser code cannot revoke an HttpOnly server session without reaching the server, so ContextOS must not claim that logout completed while offline.
6. **Multiple verified local workspaces require explicit selection.** When remote identity verification is unavailable and more than one eligible local workspace exists, ContextOS presents those verified identities and opens only the one the user selects.
7. **Permanent account deletion is password-confirmed and online.** The current password and an explicit destructive confirmation are verified before local cleanup. The current browser's local data is removed before the irreversible server deletion is committed. The server then deletes the `User` cascade root, removing its sessions and user-owned rows.
8. **Other offline devices cannot be remotely erased.** A deleted account may leave stale local copies on devices that were offline at deletion time. Those copies cannot authenticate or synchronize after the account is gone and must never be rebound implicitly to another account.

A retained local workspace after ordinary logout is appropriate for a trusted personal device. On a shared or untrusted device, the user should choose the explicit remove-from-device path.

## Synchronization Boundary

Local state is authoritative for offline interaction until synchronization occurs. After successful synchronization, PostgreSQL is canonical.

The synchronization system preserves pending local changes until the server acknowledges them. Retries and reconnection must not silently duplicate accepted mutations. Stale or conflicting server/local state is surfaced according to the synchronization conflict model rather than silently overwriting newer state.

The implementation is not required to provide CRDTs, simultaneous multi-user collaborative editing, or a merge-conflict editor.

## Recoverable Deletion Boundary

Ordinary user-facing deletion is recoverable state, not immediate physical deletion:

- Projects, Tasks, standalone Notes, and Dates use their synchronized `trashedAt` tombstone.
- Inbox captures use their synchronized `status = "deleted"` state.
- Normal views and search exclude those deleted records while the Archive/Trash surface can restore tombstoned records.
- Tombstone and restore mutations use the same updated-at conflict rule as other synchronized writes. An older offline update must not silently resurrect a newer server tombstone.

The legacy sync `operation: "delete"` remains compatibility-only. Current client code must not emit it for ordinary deletion, and the server must not reinterpret it as physical deletion without a separately designed anti-resurrection protocol.

ContextOS does not currently promise irreversible per-record purge. Physical purge is intentionally withheld until retention, ownership, version/generation semantics, and old-offline-client resurrection behavior can be proven safe. Account deletion is a separate authenticated lifecycle operation and is not implemented through the legacy record-delete mutation.

Project-linked Inbox note conversion is a project-recovery import workflow rather than a persistent standalone Note resource; standalone Notes are the recoverable Note records governed by the tombstone contract above.

## Offline-Ready Definition

The application must not claim that the device is "offline ready" merely because a service worker has registered or an IndexedDB database exists.

A device is offline ready only when all resources required to launch and render the local application shell for the core offline surfaces are available locally and at least one previously authenticated local identity has an eligible local workspace snapshot. If several eligible identities exist, readiness does not authorize ContextOS to choose one automatically.

## Explicit Non-Goals

The local-first completion project does not require:

- collaborative real-time editing;
- CRDT-based merge semantics;
- peer-to-peer synchronization;
- offline registration or first-time authentication;
- offline permanent account deletion;
- arbitrary API/server functionality while offline;
- remote integrations while offline;
- irreversible per-record purge without an anti-resurrection design;
- pretending a network-required operation succeeded when it has only been queued locally unless that operation is explicitly part of the supported mutation model.

## Verification Rule

Implementation claims must follow automated evidence. Stage 9 adds lifecycle-specific static guards and browser tests for logout retention/removal, multi-user selection, account deletion, tombstone synchronization, stale-resurrection rejection, and offline tombstone recovery. The broader acceptance matrix defined for Stage 10 remains the final evidence required before strengthening the public local-first claim.
