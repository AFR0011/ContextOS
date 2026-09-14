import { existsSync, readFileSync } from "node:fs";
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
const requireLiteral = (path, literal, message) => {
  const text = read(path);
  if (!text.includes(literal)) fail(`${path}: ${message}`);
};

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
  "docs/releases/V1_RELEASE_ACCEPTANCE.md",
  "scripts/container-distribution-smoke.sh"
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

requireLiteral("CHANGELOG.md", `## [${packageJson.version}] - 2026-09-14`, "missing changelog heading for the current release version");
requireLiteral("BLUEPRINT.md", `**Package Version:** v${packageJson.version}`, "package version does not match package.json");
requireLiteral("docs/PROJECT_STATE.md", `Package version: \`${packageJson.version}\`.`, "package version does not match package.json");
requireLiteral("README.md", `v${packageJson.version}`, "README does not identify the current release version");
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
requireText("scripts/container-distribution-smoke.sh", /CONTEXTOS_CONTAINER_RESTART_PERSISTENCE=PASS/, "release rehearsal no longer proves restart persistence");
requireText("docs/CONTAINER_DEPLOYMENT.md", /restart persistence/i, "container documentation no longer describes the v1 restart-persistence rehearsal");
requireText(".github/workflows/ci.yml", /run: npm run audit:release/, "release audit is not wired into CI");

if (existsSync(pathOf("DEV_STATE.md"))) fail("retired DEV_STATE.md returned to the active root");
if (existsSync(pathOf("shared"))) fail("retired root shared/ coordination directory returned");

if (!process.exitCode) console.log(`release-closure audit passed for ${packageJson.version}`);
