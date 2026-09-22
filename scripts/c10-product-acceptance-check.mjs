import fs from "node:fs";

const registryPath = "audits/c10-product-acceptance.json";
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const entries = Array.isArray(registry.evidence) ? registry.evidence : [];
const allowedStatuses = new Set(registry.statusValues ?? []);
const errors = [];
const seen = new Set();

if (registry.program !== "C10") errors.push("Registry program must be C10.");
if (registry.baseline?.c9MergeCommit !== "16dffb7ad52dbcb9f2a8fd3ffbf0128c1a896d1f") {
  errors.push("C10 must remain anchored to the accepted C9 merge commit.");
}
if (!entries.length) errors.push("C10 acceptance registry is empty.");

for (const entry of entries) {
  if (!entry?.id || typeof entry.id !== "string") {
    errors.push("Every C10 acceptance item requires a string id.");
    continue;
  }
  if (seen.has(entry.id)) errors.push(`Duplicate C10 acceptance id: ${entry.id}`);
  seen.add(entry.id);

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
      errors.push(`${entry.id}: missing current artifact ${artifact}`);
    }
  }
}

for (const required of ["HISTORY-001", "WORKFLOW-001", "OFFLINE-001", "ACCESS-001", "CLAIMS-001", "CI-001", "CLOSE-001"]) {
  if (!seen.has(required)) errors.push(`Missing required C10 control ${required}.`);
}

const close = entries.find((entry) => entry.id === "CLOSE-001");
if (close?.status === "passed") {
  const pending = entries.filter((entry) => entry.status === "pending");
  if (pending.length) {
    errors.push(`C10 cannot close with pending evidence: ${pending.map((entry) => entry.id).join(", ")}`);
  }
  if (!close.verifiedCommit || !close.ciRun) {
    errors.push("CLOSE-001 requires exact verifiedCommit and ciRun when passed.");
  }
}

const ci = fs.readFileSync(".github/workflows/ci.yml", "utf8");
for (const retired of [
  "tests/e2e/stage9-tombstones.spec.ts",
  "tests/offline-production/stage9-tombstone.spec.ts",
  "tests/e2e/local-db-v2.spec.ts"
]) {
  if (ci.includes(retired)) errors.push(`Active CI still references retired artifact ${retired}.`);
}

const historicalStage10 = fs.readFileSync("docs/stage10/STAGE10_ACCEPTANCE.md", "utf8");
if (!historicalStage10.includes("f4ba02699c24210ddd6f4cfaf2b626f7a33b0c40") ||
    !historicalStage10.includes("31800346837")) {
  errors.push("Historical Stage 10 exact acceptance provenance changed unexpectedly.");
}

const current = fs.readFileSync("docs/c10/C10_ACCEPTANCE.md", "utf8");
if (!/historical \*\*Stage 10\*\*/i.test(current) || !/C10 remains open/i.test(current)) {
  errors.push("C10 documentation must distinguish current C10 from historical Stage 10 and remain open while pending.");
}

const workflowTest = fs.readFileSync("tests/e2e/c10-product-workflow.spec.ts", "utf8");
for (const [label, literal] of [
  ["understand the day", "Review today's open work"],
  ["execute", "Complete ${taskTitle}"],
  ["note", 'getByLabel("Daily Notes")'],
  ["open context", 'getByTestId("home-contexts")'],
  ["resume project", "Keep daily execution, temporal context, and project recovery coherent."],
  ["see upcoming", "ContextOS verification pass"],
  ["find history", 'toContainText("Done")'],
  ["LifeOS boundary", 'getByTestId("lifeos-hub")']
]) {
  if (!workflowTest.includes(literal)) {
    errors.push(`Definitive workflow acceptance is missing the ${label} stage marker: ${literal}`);
  }
}


if (errors.length) {
  for (const error of errors) console.error(`FAIL ${error}`);
  process.exit(1);
}

const counts = Object.fromEntries(
  [...allowedStatuses].map((status) => [status, entries.filter((entry) => entry.status === status).length])
);
console.log(`C10 product acceptance registry passed structural validation: ${entries.length} controls. ${JSON.stringify(counts)}`);
