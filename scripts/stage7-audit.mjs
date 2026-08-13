import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
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

function isAuditableTextFile(relative) {
  const extension = path.extname(relative).toLowerCase();
  const textExtensions = new Set([
    ".cjs", ".css", ".env", ".html", ".js", ".json", ".jsx", ".md", ".mjs",
    ".prisma", ".ps1", ".sh", ".sql", ".toml", ".ts", ".tsx", ".txt", ".yaml", ".yml"
  ]);
  return textExtensions.has(extension) || ["Dockerfile", ".env.example", ".gitignore"].includes(path.basename(relative));
}

const tracked = trackedFiles();
const gitignore = read(".gitignore");
const auth = read("src/lib/auth.ts");
const registration = read("src/lib/registration.ts");
const rateLimit = read("src/lib/rate-limit.ts");
const ssoBridge = read("src/lib/sso-bridge.ts");
const loginRoute = read("src/app/api/auth/login/route.ts");
const registerRoute = read("src/app/api/auth/register/route.ts");
const logoutRoute = read("src/app/api/auth/logout/route.ts");
const resetRoute = read("src/app/api/reset-demo/route.ts");
const syncRoute = read("src/app/api/sync/route.ts");
const requestSecurity = read("src/lib/request-security.ts");
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

const secretSignatures = [
  ["private-key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ["github-token", /(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/g],
  ["aws-access-key", /AKIA[0-9A-Z]{16}/g],
  ["google-api-key", /AIza[0-9A-Za-z_-]{35}/g],
  ["stripe-live-secret", /sk_live_[0-9A-Za-z]{16,}/g],
  ["openai-secret", /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/g]
];
const secretHits = [];
for (const file of tracked.filter(isAuditableTextFile)) {
  const absolute = path.join(root, file);
  if (fs.statSync(absolute).size > 1_000_000) continue;
  const source = fs.readFileSync(absolute, "utf8");
  for (const [name, pattern] of secretSignatures) {
    pattern.lastIndex = 0;
    if (pattern.test(source)) secretHits.push(`${file}:${name}`);
  }
}
record(
  "REP-006",
  secretHits.length === 0,
  secretHits.length ? `High-confidence secret signatures found: ${secretHits.join(", ")}` : "No high-confidence private-key or provider-token signatures found in tracked text files under 1 MB.",
  "Remove the credential from Git, rotate it immediately, and scrub history where exposure warrants it."
);

record(
  "AUTH-001",
  includesAll(auth, ["randomBytes(32)", "createHmac(\"sha256\"", "sessionHashSecret()", "tokenHash: hashToken(token)", "AUTH_SECRET"]),
  "Session implementation uses a 32-byte random token and persists an AUTH_SECRET-keyed SHA-256 HMAC rather than the raw token.",
  "Use cryptographically random session tokens and persist only a keyed one-way token hash."
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
  "AUTH-008",
  includesAll(rateLimit, ["PRUNE_INTERVAL_MS", "function pruneExpiredBuckets", "bucket.resetAt <= now", "buckets.delete(key)", "pruneExpiredBuckets(now)"]),
  "Authentication limiter periodically removes expired in-memory buckets.",
  "Prune expired rate-limit buckets so stale high-cardinality keys are not retained indefinitely."
);

const ssoTtl = /const SSO_TTL_MS = (\d+) \* (\d+) \* (\d+)/.exec(ssoBridge);
const ssoTtlMs = ssoTtl ? Number(ssoTtl[1]) * Number(ssoTtl[2]) * Number(ssoTtl[3]) : Number.NaN;
record(
  "AUTH-009",
  includesAll(ssoBridge, ["MIN_SSO_SECRET_LENGTH = 32", "secret.length >= MIN_SSO_SECRET_LENGTH", "target.origin === allowedOrigin.origin", "createHmac('sha256'"]) && ssoTtlMs <= 5 * 60 * 1000,
  Number.isFinite(ssoTtlMs)
    ? `Optional SSO bridge uses exact-origin return validation, a minimum 32-character secret, HMAC-SHA256, and ${ssoTtlMs / 1000}s token expiry.`
    : "Optional SSO bridge controls could not be statically verified.",
  "Keep optional SSO fail-closed with exact-origin return validation, a strong signing secret, and a short expiry."
);

const originGuardedRoutes = [loginRoute, registerRoute, logoutRoute, resetRoute, syncRoute];
record(
  "API-002",
  originGuardedRoutes.every((source) => source.includes("rejectCrossOriginMutation(request)")) &&
    includesAll(requestSecurity, ["origin === \"null\"", "sec-fetch-site", "same-origin", "Cross-origin request rejected."]),
  "All state-changing API routes use the exact-origin browser mutation guard; cross-site fetch metadata is rejected.",
  "Apply rejectCrossOriginMutation(request) to every state-changing API route."
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

record(
  "SYNC-002",
  includesAll(syncRoute, ["const utf8Bytes", "new TextEncoder()", "utf8Bytes(rawBody)", "utf8Bytes(JSON.stringify"]),
  "Sync request and per-mutation payload size checks use UTF-8 byte counts.",
  "Measure byte-denominated limits in encoded bytes, not JavaScript string length."
);

record(
  "SYNC-003",
  includesAll(syncRoute, ["payloadId !== mutation.entityId", "Sync mutation entityId must match payload.id"]),
  "Sync schema rejects ledger entityId/payload.id disagreement before applying mutations.",
  "Require entityId to describe the exact record changed by an upsert."
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
  "HTTP-001",
  nextConfig.includes("isProduction ? \"script-src 'self' 'unsafe-inline'\"") && nextConfig.includes("'unsafe-eval'") && nextConfig.includes("process.env.NODE_ENV === \"production\""),
  "Production CSP branch omits unsafe-eval while the development branch retains it for tooling.",
  "Keep unsafe-eval out of the production CSP."
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
console.log(`Controls evaluated: ${results.length}/${manifest.controls.length} | passed: ${passed.length} | failed: ${failed.length} | blocking: ${blocking.length}`);
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

if (failed.length > 0) process.exitCode = 1;
