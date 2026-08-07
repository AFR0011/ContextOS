import { expect, test } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../..");

const forbiddenFixtureLabels = [
  "Dev / Freelance",
  "Career / PhD",
  "MSc Thesis",
  "Rerun RF baseline with corrected threshold logic",
  "Piano Schedule",
  "Piano / Content",
  "KPMG Application",
  "Semester 12-3 Assistantship"
];

test("public demo fixtures remain neutral and portfolio-safe", () => {
  const fixtureSource = readFileSync(resolve(root, "src/lib/starter.ts"), "utf8");
  const e2eSource = readFileSync(resolve(root, "tests/e2e/contextos.spec.ts"), "utf8");

  for (const label of forbiddenFixtureLabels) {
    expect(fixtureSource, `starter fixture should not contain ${label}`).not.toContain(label);
    expect(e2eSource, `Playwright fixture contract should not contain ${label}`).not.toContain(label);
  }

  expect(fixtureSource).toContain('"Engineering"');
  expect(fixtureSource).toContain('"Planning"');
  expect(fixtureSource).toContain('"Creative Work"');
  expect(fixtureSource).toContain('"Benchmark Evaluation"');
  expect(fixtureSource).toContain('"Release Planning"');
  expect(fixtureSource).toContain('"Validate benchmark regression"');
  expect(fixtureSource).toContain('"Practice Schedule"');
});

test("imported editor reference is absent from the publication tree", () => {
  expect(existsSync(resolve(root, "Notion-style editor demo"))).toBe(false);
});
