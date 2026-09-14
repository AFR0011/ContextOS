from pathlib import Path
import json
import re

VERSION = "1.0.0-rc.1"
ROOT = Path(".")


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text, encoding="utf-8")


def replace_required(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"required release-prep text not found: {label}")
    return text.replace(old, new)


package = json.loads(read("package.json"))
package["version"] = VERSION
scripts = {}
for key, value in package["scripts"].items():
    scripts[key] = value
    if key == "audit:stage10:claims":
        scripts["audit:release"] = "node scripts/release-closure-audit.mjs"
package["scripts"] = scripts
write("package.json", json.dumps(package, indent=2) + "\n")

lock = json.loads(read("package-lock.json"))
lock["version"] = VERSION
lock["packages"][""]["version"] = VERSION
write("package-lock.json", json.dumps(lock, indent=2) + "\n")

blueprint = read("BLUEPRINT.md")
blueprint = replace_required(
    blueprint,
    "**Package Version:** v0.2.8",
    f"**Package Version:** v{VERSION}",
    "Blueprint package version",
)
blueprint = replace_required(
    blueprint,
    "**Primary User:** Single-user / self-hostable MVP",
    "**Primary User:** Single-user / self-hosted deployments",
    "Blueprint primary user",
)
blueprint = replace_required(
    blueprint,
    "Package `0.2.8` is the implementation baseline; subsequent productization and refactor batches intentionally continue to use that package version unless a release-version change is made separately.",
    f"Package `{VERSION}` is the first stable-release candidate. Batch 18 freezes the accepted product boundary, adds release metadata/evidence, and does not broaden runtime semantics.",
    "Blueprint implementation baseline",
)
blueprint = blueprint.replace("The MVP should optimize for", "The current product should optimize for")
blueprint = blueprint.replace("## 4. MVP Scope", "## 4. Current Product Scope")
blueprint = blueprint.replace("### 4.1 Included in MVP", "### 4.1 Included in v1")
blueprint = blueprint.replace("Phase 1 visible MVP navigation:", "Current visible primary navigation:")
blueprint = blueprint.replace("There is no top-level `Workspaces` page in MVP.", "There is no top-level `Workspaces` page in v1.")
blueprint = blueprint.replace("There is no top-level `Agents` page in MVP.", "There is no top-level `Agents` page in v1.")
blueprint = blueprint.replace("MVP objects:", "Core v1 objects:")
blueprint = re.sub(r"\bMVP\b", "v1", blueprint)
write("BLUEPRINT.md", blueprint)

repo_map = read("docs/REPO_MAP.md")
repo_map = replace_required(
    repo_map,
    "`BLUEPRINT.md`: product specification and MVP rules.",
    "`BLUEPRINT.md`: product specification and current v1 rules.",
    "repo-map maturity wording",
)
write("docs/REPO_MAP.md", repo_map)

security = read("SECURITY.md")
old_dependency_status = (
    "ContextOS is pinned to stable Next.js 16.2.12 and Prisma 7.9.1. "
    "The lockfile uses explicit patched transitive overrides for `esbuild` 0.28.1, `nanoid` 6.0.0, "
    "`postcss` 8.5.23, and `sharp` 0.35.3 while remaining on the stable Next.js 16.2 line."
)
new_dependency_status = (
    "ContextOS is pinned to stable Next.js 16.3.4 and Prisma 7.9.1. "
    "The lockfile uses explicit patched transitive overrides for `esbuild` 0.28.1, `nanoid` 6.0.0, "
    "`postcss` 8.5.23, and `sharp` 0.35.4 while remaining on the stable Next.js 16.3 line."
)
security = replace_required(security, old_dependency_status, new_dependency_status, "SECURITY dependency status")
write("SECURITY.md", security)

deployment = read("docs/DEPLOYMENT.md")
deployment = replace_required(
    deployment,
    '"version": "0.2.8"',
    f'"version": "{VERSION}"',
    "deployment health version",
)
write("docs/DEPLOYMENT.md", deployment)

project_state = read("docs/PROJECT_STATE.md")
project_state = replace_required(
    project_state,
    "Package version: `0.2.8`.",
    f"Package version: `{VERSION}`.\n\nRelease status: **v1.0.0 release candidate under Batch 18 closure**. The product boundary is frozen; release evidence is recorded in `docs/releases/V1_RELEASE_ACCEPTANCE.md` and user-facing changes are summarized in `CHANGELOG.md`.",
    "project-state package version",
)
project_state = replace_required(
    project_state,
    "- `README.md` — project overview and engineering highlights.",
    "- `README.md` — project overview and engineering highlights.\n- `CHANGELOG.md` — current stable-release history and boundaries.\n- `docs/releases/V1_RELEASE_ACCEPTANCE.md` — Batch 18 RC/stable release evidence.",
    "project-state documentation index",
)
write("docs/PROJECT_STATE.md", project_state)

readme = read("README.md")
status_marker = (
    "> **Project status:** self-hostable local-first application with an evidence-backed core workflow. "
    "The repository is not an operated hosted production SaaS service, a compliance-certified system, "
    "or a collaborative distributed-data platform. High-sensitivity/public production deployments still "
    "require target-specific operational and security review. The local-first completion program is complete "
    "through Stage 10 final acceptance within the documented boundary."
)
readme = replace_required(
    readme,
    status_marker,
    status_marker
    + f"\n\n**Current release candidate:** `v{VERSION}`. Batch 18 is release closure only: the accepted product boundary is frozen while versioning, release evidence, and distribution documentation are finalized. See `CHANGELOG.md` and `docs/releases/V1_RELEASE_ACCEPTANCE.md`.",
    "README release marker",
)
readme = replace_required(
    readme,
    "- `BLUEPRINT.md` — product specification and design intent",
    "- `CHANGELOG.md` — stable release history and known boundaries\n- `BLUEPRINT.md` — product specification and design intent\n- `docs/releases/V1_RELEASE_ACCEPTANCE.md` — Batch 18 release evidence",
    "README documentation index",
)
write("README.md", readme)

run_protocol = read("docs/RUN_PROTOCOL.md")
run_protocol = replace_required(
    run_protocol,
    "6. Prisma schema/client verification and migration application:",
    "6. Release-closure metadata and distribution contract:\n   ```bash\n   npm run audit:release\n   ```\n7. Prisma schema/client verification and migration application:",
    "run-protocol release audit insertion",
)
for old, new in [
    ("7. Operator account", "8. Operator account"),
    ("8. Typecheck", "9. Typecheck"),
    ("9. Production container", "10. Production container"),
    ("10. Production/offline", "11. Production/offline"),
    ("11. Development-server", "12. Development-server"),
    ("12. Deliberate", "13. Deliberate"),
]:
    run_protocol = run_protocol.replace(old, new, 1)
write("docs/RUN_PROTOCOL.md", run_protocol)

ci = read(".github/workflows/ci.yml")
ci = replace_required(
    ci,
    "      - name: Audit Stage 10 public claims\n        run: npm run audit:stage10:claims\n\n      - name: Validate Prisma schema",
    "      - name: Audit Stage 10 public claims\n        run: npm run audit:stage10:claims\n\n      - name: Audit release closure contract\n        run: npm run audit:release\n\n      - name: Validate Prisma schema",
    "CI release-audit insertion",
)
write(".github/workflows/ci.yml", ci)

e2e = read("tests/e2e/contextos.spec.ts")
e2e = replace_required(
    e2e,
    'import { expect, test, type Locator, type Page } from "@playwright/test";',
    'import { readFileSync } from "node:fs";\nimport { expect, test, type Locator, type Page } from "@playwright/test";\n\nconst packageVersion = (JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as { version: string }).version;',
    "E2E package version import",
)
e2e = replace_required(
    e2e,
    '    version: "0.2.8"',
    "    version: packageVersion",
    "E2E health version",
)
write("tests/e2e/contextos.spec.ts", e2e)

write(
    "CHANGELOG.md",
    """# Changelog

## [1.0.0-rc.1] - 2026-09-14

### Added

- Local-first workspace operation backed by a user-scoped IndexedDB snapshot and durable mutation outbox after a successful authenticated bootstrap on the device.
- Projects and nested subcontexts, Tasks, important Dates, Areas, Markdown-backed Resources, Inbox capture/triage, local Search, Archive/Trash, Reviews, and explicit handoff previews.
- Versioned application-shell caching for verified production-build offline reopen and hard-refresh behavior on the documented core routes.
- Whole-workspace versioned export/import with replace/merge recovery paths and cross-account ID remapping.
- Trusted-operator account provisioning and password recovery for closed-registration self-hosted deployments.
- Authenticated password rotation and active-session visibility/revocation.
- Repository-owned production-style Docker Compose distribution with PostgreSQL 16, one-shot migrations, a non-root standalone application image, and an unexposed operator image.

### Changed

- New real accounts begin with an empty production workspace scaffold; fictional starter records are limited to deliberate local/disposable demo seed and reset paths.
- Ordinary record deletion is recoverable synchronized state: Projects, Tasks, standalone Notes, and Dates use tombstones, while Inbox captures use synchronized deleted status.
- Lifecycle behavior is explicit: ordinary logout retains isolated local state by default, device removal is separate, pending mutations receive explicit handling, and permanent account deletion is online and password-confirmed.
- PostgreSQL remains canonical after successful synchronization while supported workspace mutations commit locally first and replay idempotently when connectivity returns.

### Security

- User-owned server records and relationships are ownership-validated; browser state-changing routes are same-origin guarded and API responses are excluded from application-shell caching.
- Passwords are bcrypt-hashed, sessions are HTTP-only, repeated authentication attempts are application-throttled, and production public registration/demo reset default closed.
- Operator password reset revokes all server sessions while preserving workspace rows; passwords are never accepted as operator CLI arguments.
- Production container services drop Linux capabilities and use non-root application/operator runtimes with administrative scripts excluded from the public runtime image.

### Reliability / Verification

- Stage 7-10 security, deployment, recovery, lifecycle, offline, public-claims, and final-acceptance controls remain part of the permanent verification ladder.
- CI verifies committed Prisma migrations, operator-account behavior, TypeScript, optimized production build, production/offline Playwright coverage, lifecycle/destructive-data coverage, the full development E2E suite, and deliberate database-outage behavior.
- Production-container acceptance builds the actual app/operator/migration images against a fresh PostgreSQL volume and verifies migration ordering, closed registration, non-root/runtime separation, first-account provisioning, authentication, and empty production bootstrap.

### Known boundaries

ContextOS v1 is self-hostable application software, not an operated hosted SaaS service or a compliance-certified/high-sensitivity platform. It does not claim collaborative real-time/CRDT editing, provider-native backup/PITR rehearsal, production SLA/on-call guarantees, email verification or self-service password reset, distributed WAF/rate limiting, remote erasure of another offline device, or irreversible per-record purge without an anti-resurrection protocol. See `docs/PROJECT_STATE.md`, `SECURITY.md`, and `docs/LOCAL_FIRST_CONTRACT.md` for the canonical boundaries.
""",
)

write(
    "scripts/release-closure-audit.mjs",
    r'''import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const pathOf = (path) => resolve(root, path);
const read = (path) => readFileSync(pathOf(path), "utf8");
const fail = (message) => {
  console.error(`release-closure audit failed: ${message}`);
  process.exitCode = 1;
};
const requireFile = (path) => {
  if (!existsSync(pathOf(path))) fail(`missing required release file: ${path}`);
};
const requireText = (path, pattern, message) => {
  const text = read(path);
  if (!pattern.test(text)) fail(`${path}: ${message}`);
};
const forbidText = (path, pattern, message) => {
  const text = read(path);
  if (pattern.test(text)) fail(`${path}: ${message}`);
};
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const requiredFiles = [
  "README.md",
  "BLUEPRINT.md",
  "CHANGELOG.md",
  "SECURITY.md",
  "CONTRIBUTING.md",
  "LICENSE",
  "compose.production.yml",
  ".env.production.example",
  "docs/PROJECT_STATE.md",
  "docs/REPO_MAP.md",
  "docs/RUN_PROTOCOL.md",
  "docs/LOCAL_FIRST_CONTRACT.md",
  "docs/DEPLOYMENT.md",
  "docs/CONTAINER_DEPLOYMENT.md",
  "docs/OPERATOR_ACCOUNTS.md",
  "docs/releases/V1_RELEASE_ACCEPTANCE.md"
];
for (const path of requiredFiles) requireFile(path);
if (process.exitCode) process.exit(process.exitCode);

const packageJson = JSON.parse(read("package.json"));
const lock = JSON.parse(read("package-lock.json"));
const allowedVersions = new Set(["1.0.0-rc.1", "1.0.0"]);
if (!allowedVersions.has(packageJson.version)) fail(`unexpected release version ${packageJson.version}`);
if (lock.version !== packageJson.version || lock.packages?.[""]?.version !== packageJson.version) {
  fail("package.json and package-lock.json release versions disagree");
}

const escapedVersion = escapeRegex(packageJson.version);
requireText("CHANGELOG.md", new RegExp(`^## \\[${escapedVersion}\\] - 2026-09-14$`, "m"), "missing changelog heading for the current release version");
requireText("BLUEPRINT.md", new RegExp(`\\*\\*Package Version:\\*\\* v${escapedVersion}`), "package version does not match package.json");
requireText("docs/PROJECT_STATE.md", new RegExp(`Package version: \\`${escapedVersion}\\``), "package version does not match package.json");
requireText("README.md", new RegExp(`v${escapedVersion}`), "README does not identify the current release version");
requireText("README.md", /self-hostable local-first application/i, "current product maturity boundary is missing");
requireText("README.md", /not an operated hosted production SaaS/i, "hosted-SaaS non-claim is missing");
requireText("docs/PROJECT_STATE.md", /Known Boundaries/, "known-boundaries section is missing");
requireText("docs/LOCAL_FIRST_CONTRACT.md", /does not currently promise irreversible per-record purge/i, "irreversible-purge boundary is missing");
requireText("SECURITY.md", /self-service password reset/i, "password-recovery boundary is missing");

const security = read("SECURITY.md");
if (!security.includes(`Next.js ${packageJson.dependencies.next}`)) fail("SECURITY.md: documented Next.js dependency version is stale");
if (!security.includes("sharp` " + packageJson.overrides.sharp)) fail("SECURITY.md: documented sharp override version is stale");

forbidText("BLUEPRINT.md", /\bMVP\b/, "active product specification still uses retired MVP maturity wording");
forbidText("docs/REPO_MAP.md", /MVP rules/i, "repo map still labels the active specification as MVP rules");
forbidText("BLUEPRINT.md", /Online-first PWA/i, "online-first product wording was reintroduced");

const compose = read("compose.production.yml");
if (/db:seed/.test(compose)) fail("production Compose must not seed demo data");
if (!/ALLOW_PUBLIC_REGISTRATION: \$\{ALLOW_PUBLIC_REGISTRATION:-false\}/.test(compose)) fail("production registration no longer defaults closed");
if (!/ALLOW_DEMO_RESET: \$\{ALLOW_DEMO_RESET:-false\}/.test(compose)) fail("production demo reset no longer defaults closed");
if (!/profiles: \["operator"\]/.test(compose)) fail("operator service is no longer isolated behind its Compose profile");
requireText("docs/CONTAINER_DEPLOYMENT.md", /Production startup never runs `npm run db:seed`/, "container deployment no-seed contract is missing");
requireText("docs/CONTAINER_DEPLOYMENT.md", /unexposed operator service/i, "operator trust boundary is missing");
requireText(".github/workflows/ci.yml", /run: npm run audit:release/, "release audit is not wired into CI");

if (existsSync(pathOf("DEV_STATE.md"))) fail("retired DEV_STATE.md returned to the active root");
if (existsSync(pathOf("shared"))) fail("retired root shared/ coordination directory returned");

if (!process.exitCode) console.log(`release-closure audit passed for ${packageJson.version}`);
''',
)

write(
    "docs/releases/V1_RELEASE_ACCEPTANCE.md",
    """# ContextOS v1 Release Acceptance

**Release date:** 2026-09-14  
**Release program:** Batch 18 — release closure  
**RC version:** `1.0.0-rc.1`  
**RC candidate commit:** pending exact candidate verification  
**RC GitHub Actions run:** pending exact candidate verification  
**Container rehearsal:** pending exact candidate verification  
**RC disposition:** `PENDING_RC`

## Scope

Batch 18 freezes the already accepted product boundary. It adds release versioning, changelog/release evidence, and a conservative release-closure audit. It does not intentionally change authentication, synchronization, persistence, routing, local-first behavior, lifecycle/deletion semantics, schema, data model, or container architecture.

## Required acceptance ladder

The exact RC candidate must pass, without weakening existing gates:

1. `npm audit --audit-level=low`
2. `npm run audit:stage7`
3. `npm run audit:stage7:evidence`
4. production-like `npm run audit:stage8:preflight`
5. `npm run audit:stage8:preflight:test`
6. `npm run audit:stage8:ops`
7. `npm run audit:stage9:lifecycle`
8. `npm run audit:stage9:evidence`
9. `npm run audit:stage10:acceptance`
10. `npm run audit:stage10:claims`
11. `npm run audit:release`
12. `npx prisma validate` and `npx prisma generate`
13. `npm run db:deploy` and disposable demo seed for the development test boundary
14. `npm run test:account-operator`
15. `npm run typecheck`
16. `npm run build`
17. `npm run test:container-distribution`
18. optimized production/offline Playwright matrix
19. Stage 9 lifecycle/tombstone browser matrix
20. full development E2E suite
21. deliberate database-outage smoke

## Production-container rehearsal

The repository-owned fresh-volume acceptance must build the exact production app/operator/migration images, start PostgreSQL, apply committed migrations before app startup, verify health and closed registration, provision the first account through the unexposed operator image, authenticate it, verify an empty production scaffold, and tear down the isolated project/volume. Batch 18 additionally requires persistence across app/database container restart before stable promotion; that evidence will be recorded here after execution.

## Known non-claims

This release does not claim provider-native backup/PITR rehearsal, production RTO/RPO or SLA/on-call guarantees, external monitoring, distributed WAF/rate limiting, penetration testing/compliance certification, collaborative real-time/CRDT editing, self-service email password recovery, remote erasure of another offline device, or irreversible per-record purge without an anti-resurrection protocol.

## Stable promotion

Stable `1.0.0` may be promoted only from a `PASS_RC` candidate. Promotion is release metadata only and must not intentionally change runtime/product semantics. The final stable candidate must rerun at least the release audit, typecheck, and production build; the complete CI ladder remains the preferred and repository-default verification path.
""",
)
