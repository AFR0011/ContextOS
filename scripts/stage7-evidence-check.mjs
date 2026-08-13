import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "audits/stage7-controls.json"), "utf8"));
const evidence = JSON.parse(fs.readFileSync(path.join(root, "audits/stage7-evidence.json"), "utf8"));

const manifestIds = manifest.controls.map((control) => control.id);
const evidenceIds = evidence.controls.map((control) => control.id);
const manifestSet = new Set(manifestIds);
const evidenceSet = new Set(evidenceIds);

const duplicateManifest = manifestIds.filter((id, index) => manifestIds.indexOf(id) !== index);
const duplicateEvidence = evidenceIds.filter((id, index) => evidenceIds.indexOf(id) !== index);
const missingEvidence = manifestIds.filter((id) => !evidenceSet.has(id));
const unknownEvidence = evidenceIds.filter((id) => !manifestSet.has(id));
const emptyEvidence = evidence.controls
  .filter((control) => !Array.isArray(control.evidence) || control.evidence.length === 0)
  .map((control) => control.id);

const automatedModes = new Set(["static", "runtime", "schema", "ci"]);
const invalidStatuses = [];
for (const control of manifest.controls) {
  const mapped = evidence.controls.find((item) => item.id === control.id);
  if (!mapped) continue;

  if (automatedModes.has(control.mode) && control.id !== "CI-003" && mapped.status !== "automated") {
    invalidStatuses.push(`${control.id}: ${control.mode} control mapped as ${mapped.status}`);
  }
  if (control.mode === "manual" && mapped.status !== "documented-boundary") {
    invalidStatuses.push(`${control.id}: manual control must be a documented-boundary, got ${mapped.status}`);
  }
  if (control.id === "CI-003" && !["pending-final-run", "automated"].includes(mapped.status)) {
    invalidStatuses.push(`${control.id}: closing-run status must be pending-final-run or automated, got ${mapped.status}`);
  }
}

const problems = [
  ...duplicateManifest.map((id) => `duplicate manifest id ${id}`),
  ...duplicateEvidence.map((id) => `duplicate evidence id ${id}`),
  ...missingEvidence.map((id) => `missing evidence mapping ${id}`),
  ...unknownEvidence.map((id) => `unknown evidence mapping ${id}`),
  ...emptyEvidence.map((id) => `empty evidence list ${id}`),
  ...invalidStatuses
];

console.log(`Stage 7 evidence coverage: ${evidenceIds.length}/${manifestIds.length} controls mapped.`);
if (problems.length) {
  for (const problem of problems) console.error(`FAIL ${problem}`);
  process.exitCode = 1;
} else {
  console.log("PASS every Stage 7 control has one non-empty evidence mapping with a compatible disposition.");
}
