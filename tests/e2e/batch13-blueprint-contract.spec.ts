import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const blueprint = readFileSync(resolve(process.cwd(), "BLUEPRINT.md"), "utf8");

test("Blueprint defines the current canonical work and navigation model", () => {
  expect(blueprint).toContain("Area -> Project -> Task");
  expect(blueprint).toContain("Projects do not contain Projects.");
  expect(blueprint).toContain("Tasks belong to exactly one Project or directly to one Area.");
  for (const surface of ["Home", "Projects", "Areas", "Dates", "LifeOS", "Search", "Settings"]) {
    expect(blueprint).toContain(surface);
  }

  expect(blueprint).not.toContain("Dashboard 2.0");
  expect(blueprint).not.toContain("nested Projects are supported");
});

test("Blueprint defines the canonical local-first persistence and sync boundary", () => {
  expect(blueprint).toContain("atomic workspace + outbox commits");
  expect(blueprint).toContain("The persisted workspace has five canonical collections:");
  expect(blueprint).toContain("Areas;");
  expect(blueprint).toContain("Projects;");
  expect(blueprint).toContain("Tasks;");
  expect(blueprint).toContain("Dates (ContextDate records);");
  expect(blueprint).toContain("Daily Notes.");
  expect(blueprint).toContain("Sync accepts only canonical entity types and upsert operations.");
  expect(blueprint).toContain("IndexedDB v4 preserves remembered verified-user identity but clears revisionless v3 workspace/outbox snapshots.");
});

test("Blueprint keeps retired surfaces and deletion semantics retired", () => {
  expect(blueprint).toMatch(/### Inbox\s+Retired in C7\./);
  expect(blueprint).toMatch(/### Resources\s+Retired in C7\./);
  expect(blueprint).toMatch(/### Reviews\s+Retired in C7\./);
  expect(blueprint).toContain("There is no standalone Archive page in the definitive product.");
  expect(blueprint).toContain("C8 removes the old per-record tombstone fields");

  expect(blueprint).not.toContain("Trash retained for 30 days");
  expect(blueprint).not.toContain("Permanent delete after 30 days");
});

test("Blueprint keeps LifeOS and intelligence boundaries honest", () => {
  expect(blueprint).toContain("The hub renders only information exposed through an explicit module provider.");
  expect(blueprint).toContain("It must not:");
  expect(blueprint).toContain("invent placeholder metrics;");
  expect(blueprint).toContain("Insights are temporary, evidence-backed suggestions.");
  expect(blueprint).toContain("no fake fixtures when no real provider exists.");
});
