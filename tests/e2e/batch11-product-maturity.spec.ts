import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

test("current product docs position ContextOS as self-hostable without SaaS overclaims", () => {
  const readme = read("README.md");
  const state = read("docs/PROJECT_STATE.md");
  const deployment = read("docs/DEPLOYMENT.md");
  const security = read("SECURITY.md");

  expect(readme).toContain("self-hostable local-first application");
  expect(state).toContain("self-hostable, local-first workspace application");
  expect(deployment).toContain("self-hostable local-first application");
  expect(security).toContain("self-hostable local-first workspace application");

  expect(readme).toContain("not an operated hosted production SaaS service");
  expect(deployment).toContain("not an operated hosted production SaaS offering");
  expect(security).toContain("not an independent security certification");

  const currentClaims = [readme, state, deployment, security].join("\n");
  expect(currentClaims).not.toMatch(/production[- ]ready/i);
  expect(currentClaims).not.toMatch(/zero data loss/i);
});

test("portfolio-stage language is retained as historical acceptance provenance", () => {
  const readme = read("README.md");
  const state = read("docs/PROJECT_STATE.md");
  const security = read("SECURITY.md");

  expect(readme).toMatch(/Historical note:[\s\S]{0,400}portfolio-stage/i);
  expect(state).toMatch(/Historical note:[\s\S]{0,400}portfolio-stage/i);
  expect(security).toMatch(/historical portfolio-stage local-first boundary/i);
});

test("machine claims guard enforces self-hostable maturity and keeps broad claims forbidden", () => {
  const audit = read("scripts/stage10-claims-audit.mjs");

  expect(audit).toContain("must state the current self-hostable application boundary");
  expect(audit).toContain("must distinguish self-hostable software from an operated SaaS service");
  expect(audit).toContain("/production[- ]ready/i");
  expect(audit).toContain("/fully offline/i");
  expect(audit).toContain("/zero data loss/i");
});

test("repo map reflects focused workspace view ownership", () => {
  const repoMap = read("docs/REPO_MAP.md");

  for (const file of ["AreasView.tsx", "DatesView.tsx", "ProjectsView.tsx", "ProjectDetailView.tsx", "ReviewsView.tsx"]) {
    expect(repoMap).toContain(file);
  }
  expect(repoMap).toContain("stable export facade");
  expect(repoMap).toContain("LegacyWorkspaceViews.tsx");
  expect(repoMap).toContain("removed in Batch 10");
});
