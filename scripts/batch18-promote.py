from pathlib import Path
import json

ROOT = Path('.')
RC_VERSION = '1.0.0-rc.1'
STABLE_VERSION = '1.0.0'
RC_SHA = '175c2899e66c20784123d5ecaa56403fa256b29e'
RC_RUN = '34864658835'
RC_RUN_URL = 'https://github.com/AFR0011/ContextOS/actions/runs/34864658835'


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding='utf-8')


def replace_required(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'required stable-promotion text not found: {label}')
    return text.replace(old, new)


package = json.loads(read('package.json'))
if package.get('version') != RC_VERSION:
    raise SystemExit(f'expected package version {RC_VERSION}, found {package.get("version")}')
package['version'] = STABLE_VERSION
write('package.json', json.dumps(package, indent=2) + '\n')

lock = json.loads(read('package-lock.json'))
if lock.get('version') != RC_VERSION or lock.get('packages', {}).get('', {}).get('version') != RC_VERSION:
    raise SystemExit('package-lock does not match the accepted RC version')
lock['version'] = STABLE_VERSION
lock['packages']['']['version'] = STABLE_VERSION
write('package-lock.json', json.dumps(lock, indent=2) + '\n')

changelog = read('CHANGELOG.md')
changelog = replace_required(
    changelog,
    '## [1.0.0-rc.1] - 2026-09-14',
    '## [1.0.0] - 2026-09-14',
    'CHANGELOG stable heading',
)
write('CHANGELOG.md', changelog)

blueprint = read('BLUEPRINT.md')
blueprint = replace_required(blueprint, '**Package Version:** v1.0.0-rc.1', '**Package Version:** v1.0.0', 'Blueprint stable version')
blueprint = replace_required(
    blueprint,
    'Package `1.0.0-rc.1` is the first stable-release candidate. Batch 18 freezes the accepted product boundary, adds release metadata/evidence, and does not broaden runtime semantics.',
    'Package `1.0.0` is the first stable public release. Batch 18 froze the accepted product boundary, added release metadata/evidence, and did not broaden runtime semantics.',
    'Blueprint release status',
)
write('BLUEPRINT.md', blueprint)

readme = read('README.md')
readme = replace_required(
    readme,
    '**Current release candidate:** `v1.0.0-rc.1`. Batch 18 is release closure only: the accepted product boundary is frozen while versioning, release evidence, and distribution documentation are finalized. See `CHANGELOG.md` and `docs/releases/V1_RELEASE_ACCEPTANCE.md`.',
    '**Current stable release:** `v1.0.0`. Batch 18 closed the first public release without broadening the accepted product boundary. See `CHANGELOG.md` and `docs/releases/V1_RELEASE_ACCEPTANCE.md`.',
    'README stable status',
)
write('README.md', readme)

project_state = read('docs/PROJECT_STATE.md')
project_state = replace_required(project_state, 'Package version: `1.0.0-rc.1`.', 'Package version: `1.0.0`.', 'Project state stable version')
project_state = replace_required(
    project_state,
    'Release status: **v1.0.0 release candidate under Batch 18 closure**. The product boundary is frozen; release evidence is recorded in `docs/releases/V1_RELEASE_ACCEPTANCE.md` and user-facing changes are summarized in `CHANGELOG.md`.',
    'Release status: **v1.0.0 stable public release**. Batch 18 froze the product boundary, closed release metadata/evidence, and added restart-persistence rehearsal without changing the documented runtime semantics. Release evidence is recorded in `docs/releases/V1_RELEASE_ACCEPTANCE.md` and user-facing changes are summarized in `CHANGELOG.md`.',
    'Project state release status',
)
write('docs/PROJECT_STATE.md', project_state)

deployment = read('docs/DEPLOYMENT.md')
deployment = replace_required(deployment, '"version": "1.0.0-rc.1"', '"version": "1.0.0"', 'Deployment health version')
write('docs/DEPLOYMENT.md', deployment)

acceptance = f'''# ContextOS v1 Release Acceptance

**Release date:** 2026-09-14  
**Release program:** Batch 18 — release closure  
**RC version:** `1.0.0-rc.1`  
**RC candidate commit:** `{RC_SHA}`  
**RC GitHub Actions run:** `{RC_RUN}` — {RC_RUN_URL}  
**RC container rehearsal:** `PASS` — fresh-volume startup, closed registration, operator first-account provisioning, empty production bootstrap, and representative synchronized workspace data surviving app/database restart with the named PostgreSQL volume preserved.  
**RC disposition:** `PASS_RC`

**Stable version:** `1.0.0`  
**Stable candidate commit:** pending exact stable verification  
**Stable GitHub Actions run:** pending exact stable verification  
**Stable disposition:** `PENDING_V1`

## Scope

Batch 18 freezes the already accepted product boundary. It adds release versioning, changelog/release evidence, a conservative release-closure audit, and restart-persistence coverage in the existing container-distribution acceptance path. It does not intentionally change authentication, synchronization, persistence, routing, local-first behavior, lifecycle/deletion semantics, schema, data model, or container architecture.

Stable promotion from the accepted RC is release metadata only: `1.0.0-rc.1` becomes `1.0.0`, the changelog/current-version documentation is updated, and no product/runtime feature is added.

## RC acceptance result

The exact RC candidate `{RC_SHA}` passed the complete committed CI ladder in run `{RC_RUN}`:

1. `npm audit --audit-level=low` — PASS, zero vulnerabilities reported.
2. `npm run audit:stage7` — PASS.
3. `npm run audit:stage7:evidence` — PASS, 60/60 controls mapped.
4. production-like `npm run audit:stage8:preflight` — PASS.
5. `npm run audit:stage8:preflight:test` — PASS, 9/9 rejection cases.
6. `npm run audit:stage8:ops` — PASS.
7. `npm run audit:stage9:lifecycle` — PASS, 18/18 controls.
8. `npm run audit:stage9:evidence` — PASS.
9. `npm run audit:stage10:acceptance` — PASS, no pending acceptance items.
10. `npm run audit:stage10:claims` — PASS.
11. `npm run audit:release` — PASS.
12. `npx prisma validate` and `npx prisma generate` — PASS.
13. `npm run db:deploy` and disposable development-test seed — PASS.
14. `npm run test:account-operator` — PASS.
15. `npm run typecheck` — PASS.
16. `npm run build` — PASS.
17. `npm run test:container-distribution` — PASS, including `CONTEXTOS_CONTAINER_RESTART_PERSISTENCE=PASS`.
18. optimized production/offline Playwright matrix — PASS.
19. Stage 9 lifecycle/tombstone browser matrix — PASS.
20. full development E2E suite — PASS.
21. deliberate database-outage smoke — PASS.

## Production-container rehearsal

The repository-owned container acceptance builds the exact production app/operator/migration images against an isolated fresh PostgreSQL volume. It verifies committed migrations before app startup, health, non-root/runtime separation, closed public registration, operator first-account creation, authentication, and the empty production scaffold. Batch 18 then creates representative synchronized workspace data, restarts the application and database containers without deleting the named PostgreSQL volume, and verifies the account, representative data, and health survive the restart. The disposable project and volume are explicitly removed afterward.

This proves the repository-owned deployment/restart contract only. It is not provider-native backup/PITR, RTO/RPO, SLA, external-monitoring, or disaster-recovery evidence.

## Known non-claims

This release does not claim provider-native backup/PITR rehearsal, production RTO/RPO or SLA/on-call guarantees, external monitoring, distributed WAF/rate limiting, penetration testing/compliance certification, collaborative real-time/CRDT editing, self-service email password recovery, remote erasure of another offline device, or irreversible per-record purge without an anti-resurrection protocol.

## Stable promotion gate

Stable `1.0.0` is promoted only from the `PASS_RC` candidate above. The stable candidate must pass the committed verification ladder again; its exact candidate SHA, CI run, and final `PASS_V1` disposition are recorded in this file after that run completes.
'''
write('docs/releases/V1_RELEASE_ACCEPTANCE.md', acceptance)
