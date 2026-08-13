import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");

const userOwnedModels = [
  "Session",
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

const failures = [];
for (const model of userOwnedModels) {
  const block = schema.match(new RegExp(`model ${model} \\{([\\s\\S]*?)\\n\\}`, "m"))?.[1] ?? "";
  if (!block) {
    failures.push(`${model}: model block missing`);
    continue;
  }
  if (!/\buserId\s+String\b/.test(block)) failures.push(`${model}: userId String missing`);
  if (!block.includes("user User @relation(fields: [userId], references: [id], onDelete: Cascade)")) {
    failures.push(`${model}: user relation is missing explicit onDelete: Cascade ownership cleanup`);
  }
  if (!block.includes("@@index([userId])")) failures.push(`${model}: @@index([userId]) missing`);
}

console.log(`Stage 7 ownership schema guard: ${userOwnedModels.length} user-owned models inspected.`);
if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exitCode = 1;
} else {
  console.log("PASS every user-owned model has explicit userId, cascade relation, and user index.");
}
