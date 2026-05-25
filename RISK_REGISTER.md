# RISK_REGISTER

## Active Risks

| ID | Risk | Severity | Status | Mitigation |
|---|---|---:|---|---|
| R-001 | No application scaffold exists, so implementation and verification cannot run yet. | High | Closed | Minimal Next.js + TypeScript + Tailwind scaffold now exists and passes lint/typecheck/build/smoke verification. |
| R-002 | Exact auth library is undecided. | Medium | Open | Defer final auth choice until the first auth-specific batch; document the decision when made. |
| R-003 | Rich editor and Markdown conversion can become complex early. | High | Open | Keep Sprint 0 focused on foundation; preserve editor decisions for Sprint 3. |
| R-004 | Private workspace and agent-access rules could be missed in foundational schema/API design. | Critical | Monitoring | Keep access flags visible in schema and API design from the first relevant batch. |
| R-005 | No automated test suite exists yet. | Medium | Open | Add targeted tests once application logic, auth, API routes, or data access code exists. |

## Closed Risks
- R-001 closed on 2026-05-25 after scaffold verification passed.
