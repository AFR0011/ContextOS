import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const root = process.cwd();
const archivedSharedFiles = [
  "audit.md",
  "bottlenecks.md",
  "context.md",
  "doc_validation.md",
  "errors.md",
  "locks.json",
  "performance.csv",
  "performance_report.md",
  "risk_assessment.md",
  "status.md",
  "trends.md"
];

test("retired dev-loop coordination artifacts stay out of the active repo root", () => {
  expect(existsSync(resolve(root, "shared"))).toBe(false);

  for (const name of archivedSharedFiles) {
    expect(existsSync(resolve(root, "docs/archive/shared", name)), `${name} should remain archived`).toBe(true);
  }
});

test("Project detail keeps canonical date entry evergreen", () => {
  const source = readFileSync(resolve(root, "src/components/workspace/ProjectDetailView.tsx"), "utf8");

  expect(source).toContain('type="date"');
  expect(source).toContain('aria-label="Date"');
  expect(source).not.toContain("2026-07-10");
});
