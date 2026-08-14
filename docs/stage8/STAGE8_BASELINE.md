# Stage 8 Baseline and Target Inventory

## Immutable parent baseline

Stage 8 branches from the completed Stage 7 head:

- Stage 7 branch: `feat/local-first-completion-stage7`
- Stage 7 closing documentation commit: `ef2cd38c325a80597b49a0c55b35ad5451530454`
- Stage 7 code-and-test baseline recorded by the audit report: `b18fe4fb5ea0665d1b254f7ee57b707b28c1c6d1`
- Closing documentation-validation CI run: `31684900302` — success
- Stage 7 → `main` review: PR #5, `Local-first completion through Stage 7`

Stage 8 must not weaken Stage 7 controls in order to satisfy provider/deployment behavior.

## Stage 7 verification inherited by Stage 8

The Stage 7 closure established:

- dependency audit green;
- Stage 7 static/evidence audits green;
- Prisma validation/generation/migration/seed green on disposable PostgreSQL;
- TypeScript and production build green;
- optimized-production/offline Playwright matrix green;
- development E2E green;
- deliberate database-outage smoke green;
- zero open Critical/High Stage 7 findings.

Stage 8 closure must rerun that ladder, not merely cite the old result.

## Deployment-relevant repository inventory

| Concern | Repository artifact | Current boundary |
| --- | --- | --- |
| Hosted deployment | `vercel.json` | Build-only: `npm run build`; no migration or seed side effect. |
| Environment contract | `.env.example`, `docs/DEPLOYMENT.md` | Production security switches documented; real provider values remain external. |
| Canonical persistence | `prisma/schema.prisma`, `prisma/migrations/**` | PostgreSQL; migrations are deployed deliberately with `npm run db:deploy`. |
| Health | `GET /api/health` | Public, minimal, `no-store`; DB-up/DB-down semantics already Stage-7 verified. |
| Application shell | `public/sw.js`, manifest/static assets | Versioned, verified offline shell with readiness-gated cache replacement. |
| Production browser tests | `playwright.production.config.ts`, `tests/offline-production/**` | Runs against optimized `next start`; currently local/CI origin. |
| Development regression tests | `playwright.config.ts`, `tests/e2e/**` | Covers interactive product and local-first behavior. |
| CI | `.github/workflows/ci.yml` | Runs Stage 7 assurance ladder against disposable PostgreSQL. |
| Deployment documentation | `docs/DEPLOYMENT.md` | Hosted preview + backup/restore/monitoring/rollback remain open release gates. |
| Operational security boundary | `SECURITY.md`, Stage 7 audit artifacts | No public-production, WAF, external-pen-test, or compliance claim. |

## External dependencies that must not be guessed

The following require provider/target confirmation before they are exercised:

1. **Hosted preview project/provider.** `vercel.json` points toward Vercel, but the exact project/preview target must be resolved before Stage 8.2.
2. **Preview/staging PostgreSQL provider.** The repository is provider-neutral at runtime. Historical documentation mentions Neon/Postgres, which is not sufficient evidence of the current target.
3. **Dedicated non-production database.** Destructive backup/restore and rollback rehearsal must not run against production.
4. **Provider-native backup/snapshot mechanism.** Stage 8 will always test a provider-neutral PostgreSQL backup/restore path; native snapshot testing depends on the actual database provider and user approval.
5. **Monitoring provider.** Stage 8 can document and validate the health target without silently subscribing/configuring a paid/external monitoring service.

## Safe work that may proceed before provider confirmation

The following are repository-only or disposable-CI/local work and require no external target:

- deterministic deployment preflight;
- CI enforcement of deployment preflight;
- external-base-URL hosted smoke harness;
- disposable PostgreSQL `pg_dump`/`pg_restore` rehearsal tooling;
- release-pair migration/rollback rehearsal against disposable databases;
- service-worker/PWA upgrade automation where browser tooling supports it;
- evidence registry/schema;
- runbooks and failure-evidence templates.

## Stop conditions

Stage 8 implementation must stop for clarification before:

- creating or deleting a hosted database;
- running destructive operations on an existing external database;
- changing production/provider environment variables;
- promoting a preview to production;
- enabling public registration/demo reset;
- configuring provider billing/paid monitoring;
- treating a provider-native snapshot or rollback as tested without actually exercising it.
