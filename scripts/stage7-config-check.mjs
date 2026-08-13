import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const envExample = fs.readFileSync(path.join(root, ".env.example"), "utf8");
const deployment = fs.readFileSync(path.join(root, "docs/DEPLOYMENT.md"), "utf8");

const envKeys = new Set(
  envExample
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => line.slice(0, line.indexOf("=")))
);

const requiredKeys = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "NEXT_PUBLIC_APP_URL",
  "ALLOW_PUBLIC_REGISTRATION",
  "ALLOW_DEMO_RESET",
  "AUTH_RATE_LIMIT_WINDOW_MS",
  "AUTH_LOGIN_MAX_FAILURES",
  "AUTH_REGISTER_MAX_ATTEMPTS",
  "SEED_DEMO_EMAIL",
  "SEED_DEMO_PASSWORD",
  "CONTEXTOS_SSO_SECRET",
  "SOCIALOS_APP_URL"
];

const failures = [];
for (const key of requiredKeys) {
  if (!envKeys.has(key)) failures.push(`.env.example is missing ${key}`);
  if (!deployment.includes(`\`${key}\``)) failures.push(`docs/DEPLOYMENT.md does not document ${key}`);
}

if (!/ALLOW_PUBLIC_REGISTRATION="false"/.test(envExample)) failures.push(".env.example must default public registration to false");
if (!/ALLOW_DEMO_RESET="false"/.test(envExample)) failures.push(".env.example must default demo reset to false");
if (!/CONTEXTOS_SSO_SECRET=""/.test(envExample)) failures.push(".env.example must leave the optional SSO secret empty by default");
if (!deployment.includes("Do not reuse `AUTH_SECRET` as the SSO secret.")) failures.push("Deployment docs must require separate auth and SSO secrets");
if (!deployment.includes("token issuance fails closed")) failures.push("Deployment docs must state the SSO fail-closed boundary");

console.log(`Stage 7 deployment-config guard: ${requiredKeys.length} security-relevant environment keys inspected.`);
if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exitCode = 1;
} else {
  console.log("PASS environment examples and deployment documentation cover the security-relevant switches and safe defaults.");
}
