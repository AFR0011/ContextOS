import fs from "node:fs";

const registryPath = "audits/stage9-evidence.json";
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const retirements = JSON.parse(fs.readFileSync("audits/historical-artifact-retirements.json", "utf8")).retirements ?? {};
const allowedStatuses = new Set(registry.statusValues ?? []);
const entries = Array.isArray(registry.evidence) ? registry.evidence : [];
const errors = [];
const seen = new Set();

if (registry.stage !== 9) errors.push("Registry stage must be 9.");
if (!entries.length) errors.push("Stage 9 evidence registry is empty.");

for (const entry of entries) {
  if (!entry?.id || typeof entry.id !== "string") {
    errors.push("Every evidence item requires a string id.");
    continue;
  }
  if (seen.has(entry.id)) errors.push(`Duplicate evidence id: ${entry.id}`);
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
      continue;
    }
    if (!fs.existsSync(artifact)) {
      const retirement = retirements[artifact];
      if (!retirement) {
        errors.push(`${entry.id}: missing historical artifact ${artifact} without an explicit retirement record.`);
        continue;
      }
      if (!Array.isArray(retirement.replacements) || retirement.replacements.length === 0) {
        errors.push(`${entry.id}: retired artifact ${artifact} has no current replacement evidence.`);
        continue;
      }
      for (const replacement of retirement.replacements) {
        if (!fs.existsSync(replacement)) {
          errors.push(`${entry.id}: retired artifact ${artifact} points to missing replacement ${replacement}.`);
        }
      }
    }
  }
}

const closeEntry = entries.find((entry) => entry.id === "CLOSE-001");
if (!closeEntry) {
  errors.push("CLOSE-001 is required.");
} else if (closeEntry.status === "passed") {
  const unresolved = entries.filter((entry) => entry.status === "pending");
  if (unresolved.length > 0) {
    errors.push(`Stage 9 cannot be closed while pending items remain: ${unresolved.map((entry) => entry.id).join(", ")}`);
  }
  if (!closeEntry.ciRun || !closeEntry.verifiedCommit) {
    errors.push("CLOSE-001 requires exact ciRun and verifiedCommit evidence when passed.");
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(`FAIL ${error}`);
  process.exit(1);
}

console.log(`Stage 9 historical evidence registry passed: ${entries.length} unique items; active paths resolve and intentional removals are retirement-mapped.`);
