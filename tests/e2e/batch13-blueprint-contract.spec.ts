import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const blueprint = readFileSync(resolve(process.cwd(), "BLUEPRINT.md"), "utf8");

test("Blueprint describes the verified local-first product boundary", () => {
  expect(blueprint).toContain("**Platform:** Local-first PWA");
  expect(blueprint).toContain("`/` is the public product landing page. `/dashboard` remains the authenticated workspace entry.");
  expect(blueprint).toContain("Versioned service-worker application shell with production-build offline reopen and hard-refresh coverage");

  expect(blueprint).not.toContain("Online-first PWA");
  expect(blueprint).not.toContain("offline capture later");
  expect(blueprint).not.toContain("Production-grade offline app-shell/chunk hydration validation");
});

test("Blueprint deletion semantics match the verified lifecycle contract", () => {
  expect(blueprint).toContain("No irreversible per-record purge in the current product");
  expect(blueprint).toContain("anti-resurrection protocol for stale offline clients");

  expect(blueprint).not.toContain("Trash retained for 30 days");
  expect(blueprint).not.toContain("Permanent delete after 30 days");
});

test("Blueprint keeps agent behavior explicitly deferred", () => {
  expect(blueprint).toContain("current visible product does not expose a runtime Agents surface");
  expect(blueprint).toContain("Optional read-only/manual AI suggestion surface");
});
