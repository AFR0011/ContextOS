# Stage 7 — Comprehensive audits and guardrails

Stage 7 is the assurance stage between the now-working local-first platform (Stages 0–6) and the later lifecycle/acceptance stages. Its job is not to add unrelated product features. Its job is to challenge the implementation, document the real boundaries, convert important assumptions into executable controls, fix high-confidence defects found by those controls, and leave repeatable evidence that future changes can rerun.

## Audit philosophy

A portfolio-grade local-first system should not earn stronger claims merely because its happy-path browser tests are green. Stage 7 therefore audits both **behavior** and **claims**. A control counts as closed only when its evidence is reproducible in the repository or CI. Manual-only observations may remain as documented boundaries, but a Critical or High finding cannot be waived without an explicit rationale and owner.

Severity is defined as:

- **Critical** — credible cross-user data exposure, credential exposure, authentication bypass, silent destructive corruption, or a claim that is materially false.
- **High** — practical integrity/security failure, offline data loss, cross-origin state change, broken ownership enforcement, or an acceptance condition that can silently regress.
- **Medium** — defense-in-depth weakness, operational ambiguity, stale documentation, partial accessibility/resilience gap, or a future-risk compatibility path.
- **Low** — maintainability, clarity, or hygiene issue with limited direct user impact.

Stage 7 closes only when there are **zero open Critical or High findings**, every automated control is green, Medium findings are either fixed or explicitly documented as later-stage boundaries, and the final audit report names the exact CI evidence used for closure.

## Audit lanes

### A. Repository and secret hygiene

Controls:

1. No `.env`, local credential file, generated test report, build output, or temporary one-shot workflow/script is tracked.
2. `.env.example` contains placeholders/demo-only values and documents every normal deployment switch that changes the security boundary.
3. Public fixtures remain neutral and the removed private/imported reference material remains absent from the publication tree.
4. Package/lockfile dependency audit remains enforced at `low` severity or above.

### B. Authentication and session security

Controls:

1. Passwords remain bcrypt-hashed with an intentional work factor.
2. Session tokens are random, stored server-side only as hashes, and cookies remain `HttpOnly`, `SameSite`, `Secure` in production, root-scoped, and time-bounded.
3. Login failures do not reveal whether an account exists.
4. Login and registration remain abuse-limited.
5. Public registration remains closed by default.
6. Browser-originated state-changing authentication requests cannot be driven cross-origin.
7. Authentication inputs are bounded so hostile inputs cannot create unbounded parsing/hash work.

### C. API authorization and request-boundary security

Controls:

1. Workspace/bootstrap/sync/reset endpoints enforce authenticated identity before returning or mutating user data.
2. Browser-originated state-changing API requests require the application origin; requests without browser origin metadata remain usable for controlled non-browser clients.
3. API responses are explicitly non-cacheable at the HTTP layer.
4. Database failures remain structured and do not expose raw Prisma/database errors.
5. Demo reset remains production-disabled unless deliberately enabled.

### D. Synchronization integrity

Controls:

1. Request, mutation-count, per-mutation payload, identifier, and field-key limits remain enforced.
2. Limits are measured in UTF-8 bytes where the control is expressed as bytes.
3. Upsert `entityId` must match the payload record `id`; the mutation ledger must not be able to describe a different record from the one actually changed.
4. Timestamps accepted by synchronization are parseable and bounded.
5. Cross-user target records and references remain rejected.
6. Mutation IDs remain unique per user and replay-safe.
7. Stale writes remain warnings/skips rather than silent overwrites.
8. Local atomic commit and outbox persistence tests remain green.
9. The compatibility `delete` operation is treated as a documented legacy boundary until lifecycle semantics are explicitly owned by Stage 9; Stage 7 must not silently redefine hard-delete behavior.

### E. Local storage and identity isolation

Controls:

1. IndexedDB workspace and outbox storage remains keyed by verified user identity.
2. Migration from legacy local storage cannot mix workspaces between users.
3. A browser with multiple local identities does not guess an offline identity.
4. A first-time/offline browser with no verified local workspace is blocked clearly.
5. No password, session token, auth secret, or reusable server credential is stored in the local workspace database.

### F. Offline application-shell and routing integrity

Controls:

1. `Offline ready` is derived from a verified shell manifest rather than connectivity or service-worker registration alone.
2. The versioned shell contains the entry document and all discovered required static assets.
3. API responses are never stored in the shell cache and are never replaced by HTML shell fallback.
4. Core workspace routes and dynamic project routes cold-open and hard-refresh offline after preparation.
5. Browser back/forward and local in-app routing remain network-independent.
6. Pending local changes survive offline hard reload before synchronization.

### G. HTTP/PWA/deployment hardening

Controls:

1. Production CSP does not require `unsafe-eval`; development may retain it only when tooling requires it.
2. Frame, content-type, referrer, permissions, opener/resource policy, and HSTS production defenses are explicit.
3. Service-worker cache names are versioned and old shell caches are removed only after the replacement shell verifies complete.
4. Security-critical API routes are `no-store`.
5. Production registration/reset defaults and required canonical-origin configuration are documented.
6. Health checks remain public, minimal, non-cacheable, and free of credentials or raw DB diagnostics.

### H. Database and ownership model

Controls:

1. Every user-owned primary model includes `userId`, a user relation with cascade cleanup, and a user index.
2. Synchronization mutations are uniquely keyed by `(userId, mutationId)`.
3. User ownership is validated on sync targets and relationship references because several domain references are intentionally represented as scalar IDs rather than database foreign keys.
4. Prisma schema validation, generation, migrations, and seed execute from a fresh CI database.
5. Stage 7 does not claim backup/restore or migration rollback rehearsal that has not actually been performed.

### I. UI accessibility and failure-state audit

Controls:

1. Existing mobile hit-target, menu semantics, long-title wrapping, and keyboard/block-editor coverage remain green.
2. Offline/sync/readiness states remain visible and distinguishable.
3. Network-required actions fail explicitly instead of silently doing nothing.
4. Audit work must not regress the simplified navigation or introduce a new hidden utility surface merely to display internal controls.

### J. Documentation and claim accuracy

Controls:

1. `LOCAL_FIRST_CONTRACT.md`, `PROJECT_STATE.md`, `SECURITY.md`, `DEPLOYMENT.md`, and the actual implementation agree on the local-first, authentication, synchronization, and deployment boundaries.
2. Documentation must distinguish automated evidence from manual/deployment work still outstanding.
3. The repository must not claim enterprise audit/compliance, penetration testing, provider WAF protection, backup/restore rehearsal, or production readiness unless evidence exists.
4. Stage verification documents name exact test counts and CI runs rather than vague statements such as “tested.”

## Stage 7 implementation work

Stage 7 will add:

- a machine-readable control manifest under `audits/stage7-controls.json`;
- an executable repository audit under `scripts/stage7-audit.mjs` exposed as `npm run audit:stage7`;
- production-runtime security/boundary Playwright coverage;
- CI execution of the static audit plus the production and development browser suites;
- focused hardening fixes discovered by the audit where the intended behavior is already clear;
- a final audit report under `docs/audits/` with findings, dispositions, remaining boundaries, and exact verification evidence.

## Explicit non-goals

Stage 7 will not invent lifecycle semantics reserved for later stages. In particular, it will not decide multi-user local-data deletion, logout/pending-change behavior, account deletion, or hard-delete recovery semantics that the local-first contract explicitly defers to Stage 9. It also will not claim final local-first acceptance; Stage 10 remains the final acceptance matrix.

## Acceptance checklist

Stage 7 is complete when:

- `npm audit --audit-level=low` passes;
- `npm run audit:stage7` passes with zero Critical/High failures;
- Prisma validate/generate/deploy/seed passes on disposable PostgreSQL;
- TypeScript and production build pass;
- production-mode Stage 0/4/6/7 browser audits pass;
- the development-server regression suite passes;
- no temporary Stage 7 patch workflow/script remains in the tree;
- the final report records all Medium/Low findings and their disposition;
- documentation is updated only to claims supported by that evidence.
