import { spawnSync } from "node:child_process";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const env = {
  ...process.env,
  CAPTURE_C10_VISUAL: "1"
};

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env,
    shell: process.platform === "win32"
  });

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

run(npm, ["run", "build"]);

run(npx, [
  "playwright",
  "test",
  "-c",
  "playwright.production.config.ts",
  "tests/offline-production/c10-visual-offline.spec.ts",
  "--project=chromium",
  "--output=test-results/c10-production"
]);

run(npx, [
  "playwright",
  "test",
  "-c",
  "playwright.visual.config.ts",
  "tests/e2e/c10-visual-baseline.spec.ts",
  "tests/e2e/c10-visual-stress.spec.ts",
  "tests/e2e/c10-visual-empty.spec.ts",
  "--project=chromium",
  "--output=test-results/c10-standard"
]);
