import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" })
  .split("\0")
  .filter(Boolean);

const routes = tracked.filter((file) => file.startsWith("src/app/api/") && file.endsWith("/route.ts"));
const stateChanging = [];
const failures = [];

for (const file of routes) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  const methods = [...source.matchAll(/export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\s*\(/g)].map((match) => match[1]);
  if (methods.length === 0) continue;
  stateChanging.push({ file, methods });

  if (!source.includes("rejectCrossOriginMutation")) {
    failures.push(`${file}: state-changing route does not import/use rejectCrossOriginMutation`);
    continue;
  }
  if (!source.includes("rejectCrossOriginMutation(request)")) {
    failures.push(`${file}: state-changing route does not invoke rejectCrossOriginMutation(request)`);
  }
}

if (stateChanging.length === 0) {
  failures.push("No state-changing API route was discovered; route scan is unexpectedly empty.");
}

console.log(`Stage 7 API mutation-route guard: ${stateChanging.length} state-changing route files inspected.`);
for (const route of stateChanging) {
  console.log(`- ${route.file}: ${route.methods.join(", ")}`);
}

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exitCode = 1;
} else {
  console.log("PASS every tracked state-changing API route is covered by the browser origin guard.");
}
