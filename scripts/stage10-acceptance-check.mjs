import fs from "node:fs";

const registryPath = "audits/stage10-acceptance.json";
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const entries = Array.isArray(registry.evidence) ? registry.evidence : [];
const allowedStatuses = new Set(registry.statusValues ?? []);
const errors = [];
const ids = new Set();

if (registry.stage !== 10) errors.push("Registry stage must be 10.");
if (!entries.length) errors.push("Stage 10 acceptance registry is empty.");

const expectedBaseline = {
  stage9ClosureHead: "5a269097863910dcb03074212e661da62380689e",
  stage9ClosureCiRun: 31799167361,
  stage9VerifiedCodeCommit: "68b1543e5083e9064fe909101047fa5e57e7f563",
  stage9VerifiedCodeCiRun: 31798664757
};
for (const [key, expected] of Object.entries(expectedBaseline)) {
  if (registry.baseline?.[key] !== expected) {
    errors.push(`Stage 10 baseline ${key} must remain ${expected}.`);
  }
}

for (const entry of entries) {
  if (!entry?.id || typeof entry.id !== "string") {
    errors.push("Every acceptance item requires a string id.");
    continue;
  }
  if (ids.has(entry.id)) errors.push(`Duplicate acceptance id: ${entry.id}`);
  ids.add(entry.id);

  if (!allowedStatuses.has(entry.status)) {
    errors.push(`${entry.id}: unsupported status ${String(entry.status)}`);
  }

  if (!Array.isArray(entry.artifacts) || entry.artifacts.length === 0) {
    errors.push(`${entry.id}: at least one repository artifact is required.`);
    continue;
  }
  for (const artifact of entry.artifacts) {
    if (typeof artifact !== "string" || !artifact.trim()) {
      errors.push(`${entry.id}: invalid artifact path.`);
    } else if (!fs.existsSync(artifact)) {
      errors.push(`${entry.id}: missing artifact ${artifact}`);
    }
  }
}

const close = entries.find((entry) => entry.id === "CLOSE-001");
const claims = entries.find((entry) => entry.id === "CLAIMS-001");
if (!close) {
  errors.push("CLOSE-001 is required.");
} else if (close.status === "passed") {
  const pending = entries.filter((entry) => entry.status === "pending");
  if (pending.length) {
    errors.push(`Stage 10 cannot close with pending evidence: ${pending.map((entry) => entry.id).join(", ")}`);
  }
  if (!close.verifiedCommit || !close.ciRun) {
    errors.push("CLOSE-001 requires exact verifiedCommit and ciRun evidence when passed.");
  }
  if (claims?.status !== "passed") {
    errors.push("Stage 10 cannot close before CLAIMS-001 passes.");
  }
}

if (claims?.status === "passed" && close?.status !== "passed") {
  // Claims may be made accurate before the final run, but public docs must not call Stage 10 closed yet.
  const publicDocs = ["README.md", "docs/PROJECT_STATE.md", "docs/LOCAL_FIRST_CONTRACT.md", "SECURITY.md"];
  const premature = /stage 10 (?:is )?(?:closed|complete)|final local-first acceptance (?:is )?complete/i;
  for (const path of publicDocs) {
    const text = fs.readFileSync(path, "utf8");
    if (premature.test(text)) errors.push(`${path}: contains premature Stage 10 closure language.`);
  }
}

if (errors.length) {
  errors.forEach((error) => console.error(`FAIL ${error}`));
  process.exit(1);
}

const counts = Object.fromEntries(
  [...allowedStatuses].map((status) => [status, entries.filter((entry) => entry.status === status).length])
);
console.log(`Stage 10 acceptance registry passed: ${entries.length} unique items. ${JSON.stringify(counts)}`);
