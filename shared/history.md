# Shared History

## 2026-06-17

- Completed v0.2.7 Cleanup and Production-Readiness Foundation: approved generated artifact cleanup, historical archive moves, UI/UX backlog extraction, no-store `/api/health`, GitHub Actions CI workflow scaffold, archive TypeScript exclusion, and package/shell version `0.2.7`.
- Verification passed: Prisma validate, migration retry after starting Docker/Postgres, seed, typecheck after excluding `docs/archive`, build, targeted health Playwright, full e2e with 35 tests, and Browser smoke.
- Remaining production gates: remote CI evidence, production-like preview, backup/restore, rollback, monitoring, provider/WAF decision, and installed-PWA upgrade smoke.

## 2026-06-16

- Completed v0.2.6 Auth Abuse Controls: app-level fixed-window failed-login and registration throttling, `429` plus `Retry-After`, successful-login bucket reset, targeted coverage, and package/shell version `0.2.6`.
- Verification passed: typecheck, targeted auth throttling Playwright, build, Prisma validate/migrate/seed, full e2e with 34 tests, and Browser smoke.
- Completed v0.2.5 Security Headers and PWA Cache: baseline response security headers, disabled `X-Powered-By`, explicit metadata base handling, service-worker cache `contextos-shell-v2`, `/dates` precache, and package/shell version `0.2.5`.
- Verification passed: typecheck, targeted deployment Playwright, build without the previous metadata warning, Prisma validate/migrate/seed, full e2e with 33 tests, and Browser smoke.
- Completed v0.2.4 Dashboard Task/Date Cleanup: persisted task sort mode, newest-first Dashboard Tasks, confirm-gated finished-task cleanup, confirm-gated archived-date cleanup, Playwright alternate-port support, and package/shell version `0.2.4`.
- Verification passed: Prisma validate/migrate/generate, seed, typecheck, build, targeted dashboard Playwright, full e2e with 32 tests, and desktop/mobile Browser smoke.
- Helper scripts under `tools/` remain absent; shared context and doc-validation files were maintained directly.

## 2026-06-10

- User reported one week of successful real ContextOS use; v0.1.x execution-first workflow is treated as product-validated.
- One supervised dev-loop cycle for v0.1.12 graceful database-unavailable handling.
- Architect-planner subagent was unavailable due unsupported fixed model, so a local written batch plan was used.
- Executor implemented DB outage handling for auth pages, auth APIs, bootstrap, sync, reset, and client bootstrap/reset error surfacing.
- Tester ran typecheck, build, Prisma validate, diff check, targeted classifier test, DB-down auth/API smokes, and in-app Browser login smoke.
- DB-up migration, seed, and full e2e later passed after Docker/Postgres became available; v0.1.12 DB-up risk closed.
- Started v0.2.0 Daily Schedule Grid batch.
- Completed v0.2.0 Daily Schedule Grid: package version bumped to `0.2.0`; shared schedule grid wired into Dashboard and Today; targeted tests, full e2e, and desktop/mobile browser smoke passed.
- Planned v0.2.1 Stale Local Cache Recovery from the high-priority migration backlog.
- Completed v0.2.1 Stale Local Cache Recovery: guarded shell refresh, Settings guard alignment, idempotent starter singleton creation, targeted tests, full e2e, and browser smoke passed.

## 2026-06-05

- One supervised dev-loop cycle for v0.1.11 dashboard timeline and schedule tables.
- Architect-planner selected current `modificaitons.txt` items 1-3.
- Executor implemented task time ranges, Daily timeline, rendered notepad preview, and Piano Schedule resource/table preview.
- Tester ran typecheck, build, Prisma validate, migration, seed, targeted Playwright, full e2e, and browser smoke.
- Docs-QA recorded the then-current audit in `docs/CURRENT_AUDIT_2026-06-05.md`, later archived to `docs/archive/audits/CURRENT_AUDIT_2026-06-05.md` in v0.2.7.
- One supervised dev-loop cycle for v0.1.10 PWA polish batch.
- Architect-planner selected Item 9 (PWA polish) from modificaitons.txt.
- Executor implemented: manifest update, icon generation script, PNG icons, layout.tsx enhancements.
- Tester feedback pending: manual PWA installability verification on mobile browsers.

## 2026-06-04

- Started one supervised dev-loop batch for changes requested in `modificaitons.txt`.
- Completed implementation and verification for v0.1.7 workspace markdown canvas.
