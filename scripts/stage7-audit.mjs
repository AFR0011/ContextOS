import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const exists = (relative) => fs.existsSync(path.join(root, relative));
const manifest = JSON.parse(read("audits/stage7-controls.json"));
const controlById = new Map(manifest.controls.map((control) => [control.id, control]));
const results = [];

function record(id, pass, evidence, remediation = null) {
  const control = controlById.get(id);
  if (!control) throw new Error(`Unknown Stage 7 control: ${id}`);
  results.push({
    id,
    lane: control.lane,
    severity: control.severity,
    mode: control.mode,
    requirement: control.requirement,
    status: pass ? "pass" : "fail",
    evidence,
    remediation
  });
}

function includesAll(source, needles) {
  return needles.every((needle) => source.includes(needle));
}

function trackedFiles() {
  return execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" })
    .split("\0")
    .filter(Boolean);
}

const tracked = trackedFiles();
const gitignore = read(".gitignore");
const envExample = read(".env.example");
const packageJson = JSON.parse(read("package.json"));
const auth = read("src/lib/auth.ts");
const registration = read("src/lib/registration.ts");
const loginRoute = read("src/app/api/auth/login/route.ts");
const registerRoute = read("src/app/api/auth/register/route.ts");
const resetRoute = read("src/app/api/reset-demo/route.ts");
const syncRoute = read("src/app/api/sync/route.ts");
const syncServer = read("src/lib/sync-server.ts");
const serviceWorker = read("public/sw.js");
const nextConfig = read("next.config.ts");
const schema = read("prisma/schema.prisma");
const ci = read(".github/workflows/ci.yml");
const localContract = read("docs/LOCAL_FIRST_CONTRACT.md");
const projectState = read("docs/PROJECT_STATE.md");
const security = read("SECURITY.md");
const deployment = read("docs/DEPLOYMENT.md");

const forbiddenEnv = tracked.filter((file) => /(^|\/)\.env(?:\..+)?$/.test(file) && file !== ".env.example");
record(
  "REP-001",
  forbiddenEnv.length === 0,
  forbiddenEnv.length ? `Tracked environment files: ${forbiddenEnv.join(", ")}` : "git ls-files contains no tracked .env variant except .env.example.",
  "Remove credential-bearing environment files from Git history/tracking and rotate exposed secrets."
);

const generatedPatterns = [
  /^\.next\//,
  /^node_modules\//,
  /^playwright-report\//,
  /^test-results\//,
  /\.tsbuildinfo$/
];
const generatedTracked = tracked.filter((file) => generatedPatterns.some((pattern) => pattern.test(file)));
record(
  "REP-002",
  generatedTracked.length === 0 && includesAll(gitignore, ["node_modules/", ".next/", "test-results/", "playwright-report/", "*.tsbuildinfo"]),
  generatedTracked.length ? `Generated files tracked: ${generatedTracked.join(", ")}` : "Generated build/test outputs are ignored and absent from tracked files.",
  "Remove generated output from version control and keep the ignore rules explicit."
);

const temporaryStageFiles = tracked.filter((file) =>
  /(^|\/)(stage[5-7].*(?:patch|bootstrap)|patch-stage[5-7].*)/i.test(file) &&
  (file.startsWith(".github/workflows/") || file.startsWith("scripts/"))
);
record(
  "REP-003",
  temporaryStageFiles.length === 0,
  temporaryStageFiles.length ? `Temporary stage automation still tracked: ${temporaryStageFiles.join(", ")}` : "No one-shot Stage 5/6/7 patch/bootstrap automation remains tracked.",
  "Delete one-shot patch/bootstrap workflows and temporary patch scripts after their commit lands."
);

record(
  "REP-005",
  ci.includes("npm audit --audit-level=low"),
  ci.includes("npm audit --audit-level=low") ? "CI contains npm audit --audit-level=low." : "CI no longer enforces low-severity dependency advisories.",
  "Restore npm audit --audit-level=low to the required CI path."
);

record(
  "AUTH-001",
  includesAll(auth, ["randomBytes(32)", "createHash(\"sha256\")", "tokenHash: hashToken(token)"]),
  "Session implementation uses a 32-byte random token and persists SHA-256 token hashes rather than raw tokens.",
  "Use cryptographically random session tokens and persist only a one-way token hash."
);

record(
  "AUTH-002",
  includesAll(auth, ["httpOnly: true", "sameSite: \"lax\"", "secure: process.env.NODE_ENV === \"production\"", "expires: expiresAt", "path: \"/\""]),
  "Session cookie flags are HttpOnly, SameSite=Lax, Secure in production, expiry-bound, and root-scoped.",
  "Restore the complete session-cookie security flags."
);

const bcryptRounds = /bcrypt\.hash\(password,\s*(\d+)\)/.exec(auth)?.[1];
record(
  "AUTH-003",
  Boolean(bcryptRounds && Number(bcryptRounds) >= 12),
  bcryptRounds ? `bcrypt work factor is ${bcryptRounds}.` : "bcrypt work factor could not be verified.",
  "Use bcrypt with an explicit work factor of at least 12."
);

record(
  "AUTH-005",
  includesAll(registration, ["ALLOW_PUBLIC_REGISTRATION", "return process.env.NODE_ENV !== \"production\""]),
  "Registration helper defaults to disabled when NODE_ENV=production unless ALLOW_PUBLIC_REGISTRATION=true.",
  "Keep public registration closed by default in production."
);

const authInputsBounded =
  /email:\s*z\.string\(\)\.max\(/.test(loginRoute) &&
  /password:\s*z\.string\(\).*\.max\(/.test(loginRoute) &&
  /email:\s*z\.string\(\)\.max\(/.test(registerRoute) &&
  /password:\s*z\.string\(\).*\.max\(/.test(registerRoute);
record(
  "AUTH-007",
  authInputsBounded,
  authInputsBounded ? "Login and registration email/password schemas have explicit maximum lengths." : "One or more authentication fields lack an explicit maximum length.",
  "Bound authentication input sizes before database lookup or password hashing."
);

record(
  "API-003",
  /source:\s*["']\/api\/:path\*["']/.test(nextConfig) && /Cache-Control/.test(nextConfig) && /no-store/.test(nextConfig),
  "next.config.ts applies an explicit no-store policy to API responses.",
  "Add a /api/:path* response header rule with Cache-Control: no-store, max-age=0."
);

record(
  "API-005",
  includesAll(resetRoute, ["process.env.NODE_ENV !== \"production\"", "process.env.ALLOW_DEMO_RESET === \"true\""]),
  "Demo reset is available in non-production or only when ALLOW_DEMO_RESET=true.",
  "Keep demo reset disabled by default in production."
);

record(
  "SYNC-001",
  includesAll(syncRoute, ["MAX_SYNC_BYTES", "MAX_MUTATIONS", "MAX_PAYLOAD_BYTES", "mutationId", "entityId", "z.string().max(80)"]),
  "Sync route contains request, mutation-count, payload, identifier, and field-key bounds.",
  "Restore explicit synchronization request and field bounds."
);

const localClientFiles = tracked.filter((file) =>
  file.startsWith("src/lib/") && /(local|client-store|offline)/i.test(path.basename(file)) && /\.(?:ts|tsx|js|mjs)$/.test(file)
);
const forbiddenCredentialPatterns = [
  /passwordHash\s*:/,
  /AUTH_SECRET\s*:/,
  /contextos_session\s*:/,
  /tokenHash\s*:/
];
const localCredentialHits = [];
for (const file of localClientFiles) {
  const source = read(file);
  for (const pattern of forbiddenCredentialPatterns) {
    if (pattern.test(source)) localCredentialHits.push(`${file}:${pattern}`);
  }
}
record(
  "LOCAL-005",
  localCredentialHits.length === 0,
  localCredentialHits.length ? `Credential-like persistence patterns found: ${localCredentialHits.join(", ")}` : "Client/local-storage implementation contains no password hash, AUTH_SECRET, session-cookie, or token-hash persistence fields.",
  "Remove reusable server credentials from IndexedDB/local persistence."
);

record(
  "HTTP-004",
  includesAll(serviceWorker, ["SHELL_VERSION", "CACHE_PREFIX", "shellStatus()", "if (status.ready) await removeOldShellCaches()", "url.pathname.startsWith(\"/api/\")"]),
  "Service worker uses a versioned shell, verifies readiness before old-cache cleanup, and excludes API fetch handling.",
  "Preserve versioned verified shell replacement and network-only API handling."
);

const requiredOwnedModels = [
  "Domain",
  "Project",
  "Task",
  "Capture",
  "Note",
  "Deadline",
  "Review",
  "DashboardScratchpad",
  "DashboardPreference",
  "SyncMutation"
];
const missingUserScope = [];
for (const model of requiredOwnedModels) {
  const block = schema.match(new RegExp(`model ${model} \\{([\\s\\S]*?)\\n\\}`, "m"))?.[1] ?? "";
  if (!block.includes("userId") || !block.includes("user User @relation") || !block.includes("@@index([userId])")) {
    missingUserScope.push(model);
  }
}
record(
  "DB-001",
  missingUserScope.length === 0,
  missingUserScope.length ? `Models missing explicit user scope/index/relation: ${missingUserScope.join(", ")}` : "All primary user-owned models declare userId, user relation, and user index.",
  "Restore explicit user ownership fields/relations/indexes on every user-owned primary model."
);

record(
  "SYNC-006",
  schema.includes("@@unique([userId, mutationId])"),
  "SyncMutation has @@unique([userId, mutationId]).",
  "Restore per-user mutation-id uniqueness for replay safety."
);

record(
  "DOC-001",
  includesAll(localContract, ["single-user local-first workspace", "Explicit Non-Goals", "Stage 10"]) &&
    includesAll(projectState, ["portfolio-stage", "Known Boundaries"]) &&
    includesAll(security, ["portfolio-stage", "Known boundaries"]),
  "Canonical contract/state/security documents retain explicit portfolio, local-first, and non-goal boundaries.",
  "Reconcile public claims with the implemented local-first and security boundaries."
);

record(
  "DOC-002",
  includesAll(deployment, ["ALLOW_PUBLIC_REGISTRATION", "ALLOW_DEMO_RESET", "AUTH_SECRET", "NEXT_PUBLIC_APP_URL"]),
  "Deployment documentation names registration, reset, auth-secret, and canonical-origin controls.",
  "Document every deployment switch that materially changes the security boundary."
);

record(
  "CI-001",
  includesAll(ci, ["npm audit --audit-level=low", "npm run audit:stage7", "npx prisma validate", "npx prisma generate", "npm run db:deploy", "npm run db:seed", "npm run typecheck", "npm run build", "playwright.production.config.ts", "npm run test:e2e"]),
  "CI includes dependency, Stage 7 static, Prisma, typecheck, build, production-browser, and development-browser gates.",
  "Restore the full Stage 7 verification ladder to CI."
);

const blocking = results.filter((result) => result.status === "fail" && ["critical", "high"].includes(result.severity));
const failed = results.filter((result) => result.status === "fail");
const passed = results.filter((result) => result.status === "pass");

console.log("Stage 7 static audit");
console.log(`Controls evaluated: ${results.length} | passed: ${passed.length} | failed: ${failed.length} | blocking: ${blocking.length}`);
for (const result of results) {
  const marker = result.status === "pass" ? "PASS" : "FAIL";
  console.log(`${marker} ${result.id} [${result.severity}] ${result.evidence}`);
  if (result.status === "fail" && result.remediation) console.log(`  remediation: ${result.remediation}`);
}

const jsonPathArg = process.argv.find((arg) => arg.startsWith("--json="));
if (jsonPathArg) {
  const outputPath = path.resolve(root, jsonPathArg.slice("--json=".length));
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify({ stage: 7, generatedAt: new Date().toISOString(), results }, null, 2)}\n`);
  console.log(`JSON report: ${path.relative(root, outputPath)}`);
}

if (blocking.length > 0 || failed.length > 0) process.exitCode = 1;
