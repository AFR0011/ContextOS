# ContextOS Dev State

## Active Loop

- Status: CLOSE - Batch v0.2.5 Security headers and PWA cache
- Date: 2026-06-16
- Active batch: none
- Completed batch: v0.2.5 security headers and PWA cache
- Canonical product source: `BLUEPRINT.md`
- Tooling fallback: dev-loop specialist tools are policy-gated unless the user explicitly requests delegation, so this cycle is using the documented local phase-artifact fallback.

## Active Batch Plan

Scope this cycle to one independently testable deployment-hardening batch:

1. Add baseline application security headers through Next config and disable the `X-Powered-By` header.
2. Set `metadataBase` from deployment/local environment so production builds stop resolving social metadata against localhost implicitly.
3. Bump the service-worker cache version and replace the stale `/deadlines` precache route with canonical `/dates`.
4. Add targeted regression coverage for headers, metadata, and service-worker cache/routes.
5. Bump package and shell version to `0.2.5`.

Out of scope for this batch: login/register rate limiting, CI, health checks, monitoring, backup/restore rehearsal, dependency upgrades, service-worker installed-upgrade browser automation beyond static/HTTP evidence, and UI/accessibility refinements.

Acceptance criteria:

- Responses include CSP, frame protection, content-type sniffing protection, referrer policy, and permissions policy.
- `X-Powered-By` is disabled.
- `metadataBase` is explicit and accepts `NEXT_PUBLIC_APP_URL`, `APP_URL`, or `VERCEL_URL` with a local fallback.
- Service-worker cache name changes from `contextos-shell-v1` and precaches `/dates`, not `/deadlines`.
- Targeted coverage, `npm run typecheck`, and `npm run build` pass.

## Outcome

Batch complete.

Implemented baseline deployment hardening in one scoped batch:

- Added application-wide security headers in `next.config.ts`: CSP, frame protection, content-type sniffing protection, referrer policy, and permissions policy.
- Disabled Next's `X-Powered-By` response header.
- Added explicit environment-aware `metadataBase` in `src/app/layout.tsx`, using `NEXT_PUBLIC_APP_URL`, `APP_URL`, `VERCEL_URL`, or a local development fallback.
- Bumped the service-worker shell cache to `contextos-shell-v2`, precached `/dates`, and removed the stale `/deadlines` precache route.
- Added targeted Playwright coverage for deployment headers, metadata output, and service-worker cache/routes.
- Bumped package metadata and shell label to `0.2.5`.

## Acceptance Evidence

| Criteria | Status |
| --- | --- |
| Security headers are configured and verified | DONE |
| `X-Powered-By` is disabled | DONE |
| `metadataBase` is explicit and environment-aware | DONE |
| Service-worker cache version and routes are corrected | DONE |
| Targeted coverage, typecheck, and build pass | DONE |

## Verification

- `npm run typecheck` - passed.
- `PLAYWRIGHT_PORT=3001 npx playwright test tests/e2e/contextos.spec.ts -g "deployment headers" --workers=1` - passed, 1 test.
- `npm run build` - passed without the previous `metadataBase` warning.
- `npx prisma validate` - passed.
- `npm run db:migrate` - passed; schema already in sync.
- `npm run db:seed` - passed.
- `PLAYWRIGHT_PORT=3001 npm run test:e2e -- --workers=1` - passed, 33 tests.
- In-app Browser smoke at `http://localhost:3001/dashboard` - passed; authenticated Dashboard rendered `MVP v0.2.5`, Dates and Tasks were visible, horizontal overflow was false at the default desktop viewport, and browser console errors were empty.

## Remaining Risks

- P1: auth abuse controls, CI, production-like preview evidence, monitoring/health checks, and backup/restore/rollback rehearsal are still missing.
- Deeper installed-PWA upgrade testing remains deferred; this batch verifies the script/cache text and local app-shell behavior, not an already-installed legacy worker upgrade path.
- Drag-and-drop or arbitrary manual task ordering remains deferred; v0.2.4 only adds explicit sort modes.
- Internal `Deadline` naming remains intentionally for compatibility and should only change in a dedicated migration.
- Real-use validation should confirm newest-first Dashboard Tasks and cleanup actions reduce clutter without making the daily command sheet noisy.

## Next Action

Plan the next deployment-hardening batch around auth abuse controls, CI/preview gates, operational recovery evidence, or mobile editor accessibility.
