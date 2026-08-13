import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const failures = [];
const warnings = [];

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function value(name) {
  return process.env[name]?.trim() ?? "";
}

function isEnabled(name) {
  return /^(1|true|yes|on)$/i.test(value(name));
}

function byteLength(text) {
  return Buffer.byteLength(text, "utf8");
}

function parseUrl(name, raw, { requireHttps = false, postgres = false } = {}) {
  if (!raw) {
    fail(`${name} is required.`);
    return null;
  }

  try {
    const parsed = new URL(raw);
    if (postgres && !["postgres:", "postgresql:"].includes(parsed.protocol)) {
      fail(`${name} must use a postgres:// or postgresql:// URL.`);
    }
    if (requireHttps && parsed.protocol !== "https:") {
      fail(`${name} must use https:// for a production-like deployment.`);
    }
    return parsed;
  } catch {
    fail(`${name} must be a valid URL.`);
    return null;
  }
}

function canonicalOrigin() {
  const explicit = value("NEXT_PUBLIC_APP_URL") || value("APP_URL");
  if (explicit) return { source: value("NEXT_PUBLIC_APP_URL") ? "NEXT_PUBLIC_APP_URL" : "APP_URL", raw: explicit };

  const vercelUrl = value("VERCEL_URL");
  if (vercelUrl) {
    const raw = /^https?:\/\//i.test(vercelUrl) ? vercelUrl : `https://${vercelUrl}`;
    return { source: "VERCEL_URL", raw };
  }

  return { source: "NEXT_PUBLIC_APP_URL/APP_URL/VERCEL_URL", raw: "" };
}

const databaseUrl = value("DATABASE_URL");
parseUrl("DATABASE_URL", databaseUrl, { postgres: true });

const authSecret = value("AUTH_SECRET");
if (!authSecret) {
  fail("AUTH_SECRET is required.");
} else if (byteLength(authSecret) < 32) {
  fail("AUTH_SECRET must contain at least 32 UTF-8 bytes.");
}

const origin = canonicalOrigin();
const parsedOrigin = parseUrl(origin.source, origin.raw, { requireHttps: true });
if (parsedOrigin && (parsedOrigin.username || parsedOrigin.password)) {
  fail(`${origin.source} must not embed credentials.`);
}
if (parsedOrigin && parsedOrigin.pathname !== "/") {
  fail(`${origin.source} must identify an origin only, without a path.`);
}
if (parsedOrigin && (parsedOrigin.search || parsedOrigin.hash)) {
  fail(`${origin.source} must not contain query or fragment components.`);
}

if (isEnabled("ALLOW_PUBLIC_REGISTRATION")) {
  fail("ALLOW_PUBLIC_REGISTRATION must be false/unset for the Stage 8 production-like gate.");
}
if (isEnabled("ALLOW_DEMO_RESET")) {
  fail("ALLOW_DEMO_RESET must be false/unset for the Stage 8 production-like gate.");
}

const ssoSecret = value("CONTEXTOS_SSO_SECRET");
const socialUrl = value("SOCIALOS_APP_URL");
if (ssoSecret) {
  if (byteLength(ssoSecret) < 32) {
    fail("CONTEXTOS_SSO_SECRET must contain at least 32 UTF-8 bytes when SSO is enabled.");
  }
  if (ssoSecret === authSecret) {
    fail("CONTEXTOS_SSO_SECRET must be distinct from AUTH_SECRET.");
  }
  const parsedSocial = parseUrl("SOCIALOS_APP_URL", socialUrl, { requireHttps: true });
  if (parsedSocial && (parsedSocial.pathname !== "/" || parsedSocial.search || parsedSocial.hash)) {
    fail("SOCIALOS_APP_URL must identify an exact HTTPS origin without path/query/fragment components.");
  }
} else if (socialUrl) {
  warn("SOCIALOS_APP_URL is configured while CONTEXTOS_SSO_SECRET is empty; the optional bridge remains disabled/fail-closed.");
}

if (value("SEED_DEMO_EMAIL") || value("SEED_DEMO_PASSWORD")) {
  warn("Seed credentials are present. They are not required by normal deployment and must not cause automatic seeding.");
}

const vercelPath = path.join(root, "vercel.json");
if (!fs.existsSync(vercelPath)) {
  fail("vercel.json is missing; the documented Vercel deployment contract cannot be verified.");
} else {
  try {
    const vercel = JSON.parse(fs.readFileSync(vercelPath, "utf8"));
    const buildCommand = String(vercel.buildCommand ?? "").trim();
    if (buildCommand !== "npm run build") {
      fail(`vercel.json buildCommand must remain exactly "npm run build"; found ${JSON.stringify(buildCommand)}.`);
    }
    if (/db:(seed|deploy|migrate|reset)|prisma\s+(db\s+seed|migrate)/i.test(buildCommand)) {
      fail("Vercel buildCommand must not run database migration, reset, or seed commands.");
    }
  } catch (error) {
    fail(`vercel.json could not be parsed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const packagePath = path.join(root, "package.json");
try {
  const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  if (pkg.scripts?.build !== "next build") {
    fail("package.json build script must remain a build-only Next.js command.");
  }
  if (pkg.scripts?.["db:deploy"] !== "prisma migrate deploy") {
    fail("package.json must expose db:deploy as an explicit prisma migrate deploy operation.");
  }
  if (!pkg.scripts?.["db:seed"] || pkg.scripts.build?.includes("db:seed")) {
    fail("Database seeding must remain explicit and separate from the build script.");
  }
} catch (error) {
  fail(`package.json could not be parsed: ${error instanceof Error ? error.message : String(error)}`);
}

for (const message of warnings) console.warn(`WARN ${message}`);

if (failures.length) {
  for (const message of failures) console.error(`FAIL ${message}`);
  console.error(`Stage 8 deployment preflight failed with ${failures.length} blocking issue${failures.length === 1 ? "" : "s"}.`);
  process.exitCode = 1;
} else {
  console.log("PASS Stage 8 deployment preflight: production-like environment and release-command boundaries are safe.");
  console.log(`INFO canonical origin source: ${origin.source}`);
  console.log("INFO normal deployment remains build-only; migrations and seeding are explicit operations.");
}
