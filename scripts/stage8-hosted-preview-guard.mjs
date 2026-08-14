const baseUrl = process.env.HOSTED_PREVIEW_BASE_URL;
const databaseRole = process.env.HOSTED_PREVIEW_DATABASE_ROLE;
const expectedRef = process.env.HOSTED_PREVIEW_EXPECTED_REF;
const acknowledgement = process.env.HOSTED_PREVIEW_ACK;

if (!baseUrl || !databaseRole || !expectedRef || !acknowledgement) {
  console.error("Stage 8 hosted-preview guard: required target metadata is missing.");
  process.exit(1);
}

let target;
try {
  target = new URL(baseUrl);
} catch {
  console.error("Stage 8 hosted-preview guard: preview URL is invalid.");
  process.exit(1);
}

const blockedHosts = new Set([
  "context-os-red.vercel.app",
  "context-os-ali-farrokhnejads-projects.vercel.app",
  "context-os-git-main-ali-farrokhnejads-projects.vercel.app"
]);

const failures = [];
if (target.protocol !== "https:") failures.push("preview target must use HTTPS");
if (blockedHosts.has(target.hostname)) failures.push("known production alias is not an allowed Stage 8 target");
if (!target.hostname.endsWith(".vercel.app")) failures.push("target must be the approved Vercel preview project");
if (databaseRole !== "dedicated-preview") failures.push("database role must be dedicated-preview");
if (expectedRef !== "feat/local-first-completion-stage8") failures.push("unexpected Git ref");
if (acknowledgement !== "stage8-preview-only") failures.push("preview-only acknowledgement is missing");

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}

console.log(`PASS Stage 8 hosted-preview guard accepted ${target.hostname}.`);
