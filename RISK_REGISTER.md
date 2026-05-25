# RISK_REGISTER

## Active Risks

| ID | Risk | Severity | Status | Mitigation |
|---|---|---:|---|---|
| R-001 | No application scaffold exists, so implementation and verification cannot run yet. | High | Closed | Minimal Next.js + TypeScript + Tailwind scaffold now exists and passes lint/typecheck/build/smoke verification. |
| R-002 | Exact auth library is undecided. | Medium | Open | Defer final auth choice until the first auth-specific batch; document the decision when made. |
| R-003 | Rich editor and Markdown conversion can become complex early. | High | Open | Keep Sprint 0 focused on foundation; preserve editor decisions for Sprint 3. |
| R-004 | Private workspace and agent-access rules could be missed in foundational schema/API design. | Critical | Monitoring | Schema now includes workspace/context/page access flags; enforce them in API/auth batches. |
| R-005 | No automated test suite exists yet. | Medium | Open | Add targeted tests once application logic, auth, API routes, or data access code exists. |
| R-006 | Generated migration has not been applied to a live PostgreSQL database. | Medium | Open | Start Docker Desktop or provide a PostgreSQL URL, then run `npm run db:migrate` with `DATABASE_URL`. |
| R-007 | npm audit reports moderate transitive advisories in Next/PostCSS and Drizzle Kit dev tooling. | Medium | Open | Track upstream fixes; avoid `npm audit fix --force` unless prepared for breaking framework/tooling changes. |

## Closed Risks
- R-001 closed on 2026-05-25 after scaffold verification passed.
