# Audit

## 2026-06-17 - v0.2.7 Cleanup and Production-Readiness Foundation

- Executed approved cleanup and archived historical prototype/planning/audit/shared-message files under `docs/archive/`.
- Extracted still-relevant UI/UX backlog themes into `docs/MIGRATION_BACKLOG.md`.
- Added no-store `/api/health` with structured DB availability responses.
- Added GitHub Actions CI workflow scaffold for Node 22 plus PostgreSQL 16.
- Bumped package and shell version to `0.2.7`.
- Verification passed: Prisma validate, migration retry, seed, typecheck, build, targeted health Playwright, full e2e, and Browser smoke.

## 2026-06-16 - v0.2.6 Auth Abuse Controls

- Added server-only fixed-window auth throttling for failed login and registration attempts.
- Added `429` plus `Retry-After` responses for exceeded auth limits.
- Kept successful login from counting as abuse by resetting failed-attempt buckets for that identity.
- Added targeted Playwright API coverage.
- Verification passed: typecheck, targeted auth throttling Playwright, build, Prisma validate/migrate/seed, full e2e, and Browser smoke.

## 2026-06-16 - v0.2.5 Security Headers and PWA Cache

- Added baseline response security headers and disabled `X-Powered-By`.
- Added explicit environment-aware `metadataBase`.
- Bumped the service-worker shell cache to `contextos-shell-v2`, precached `/dates`, and removed `/deadlines` from precache.
- Added targeted Playwright coverage for headers, metadata, and service-worker cache/routes.
- Verification passed: typecheck, targeted deployment Playwright, build without the previous metadata warning, Prisma validate/migrate/seed, full e2e, and Browser smoke.

## 2026-06-16 - v0.2.4 Dashboard Task/Date Cleanup

- Added persisted Dashboard Tasks sort preference and newest-first default.
- Added confirm-gated soft-delete cleanup for finished tasks and archived dates.
- Kept Daily Timeline and Today schedule-first.
- Added Playwright alternate-port support for stale/occupied port recovery.
- Verification passed: Prisma validate/migrate/generate, seed, typecheck, build, targeted dashboard Playwright, full e2e, and Browser smoke.

## 2026-06-05 - v0.1.10 PWA Polish Batch

- Executed PWA polish implementation per Item 9 in modificaitons.txt
- Generated PNG icons: icon-192.png, icon-512.png, apple-touch-icon.png, apple-touch-icon-180.png
- Updated manifest.webmanifest with proper icon entries and metadata (orientation, categories)
- Enhanced layout.tsx with apple touch icon link and enhanced metadata (openGraph images, appleWebApp config)
- Typecheck and build passed successfully

## 2026-06-05 - Dev-loop Cycle (v0.1.9 Verification)

- Ran architect-planner for next implementation batch.
- Planner found v0.1.9 batch complete across all canonical docs.
- Verified typecheck/build passes without database operations.

## 2026-06-04 - Dev-loop Cycles

- Dev-loop helper tools were missing; initialized active control and shared files manually.
- Closed one supervised dev-loop cycle for the workspace markdown canvas batch (v0.1.7).
- Closed v0.1.9 verification cycle with typecheck/build/passes.
