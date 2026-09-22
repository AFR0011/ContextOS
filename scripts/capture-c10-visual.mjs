import { spawnSync } from "node:child_process";

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const args = [
  "playwright",
  "test",
  "tests/e2e/c10-visual-baseline.spec.ts",
  "tests/e2e/c10-visual-stress.spec.ts",
  "tests/e2e/c10-visual-empty.spec.ts",
  "--project=chromium"
];

const result = spawnSync(command, args, {
  stdio: "inherit",
  env: {
    ...process.env,
    CAPTURE_C10_VISUAL: "1"
  }
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
