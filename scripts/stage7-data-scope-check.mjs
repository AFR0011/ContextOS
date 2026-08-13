import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const source = fs.readFileSync(path.join(root, "src/lib/data.ts"), "utf8");

const models = [
  "domain",
  "project",
  "task",
  "capture",
  "note",
  "deadline",
  "review",
  "dashboardScratchpad",
  "dashboardPreference"
];

const failures = [];
for (const model of models) {
  const scopedRead = new RegExp(`prisma\\.${model}\\.findMany\\(\\{\\s*where:\\s*\\{\\s*userId\\s*\\}`, "m");
  if (!scopedRead.test(source)) failures.push(`${model}: getWorkspaceData read is not visibly scoped by userId`);
}

if (!/export async function getWorkspaceData\(userId: string\)/.test(source)) {
  failures.push("getWorkspaceData no longer requires an explicit userId argument");
}

console.log(`Stage 7 workspace-read scope guard: ${models.length} user-owned collections inspected.`);
if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exitCode = 1;
} else {
  console.log("PASS every workspace collection read is explicitly scoped by the authenticated userId.");
}
