import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const workspaceRoot = resolve(process.cwd(), "src/components/workspace");

function read(name: string) {
  return readFileSync(resolve(workspaceRoot, name), "utf8");
}

test("facade owns all live workspace views through focused modules", () => {
  const facade = read("Views.tsx");

  expect(facade).toContain('export { AreasView } from "@/components/workspace/AreasView"');
  expect(facade).toContain('export { DatesView } from "@/components/workspace/DatesView"');
  expect(facade).toContain('export { ProjectDetailView } from "@/components/workspace/ProjectDetailView"');
  expect(facade).toContain('export { ProjectsView } from "@/components/workspace/ProjectsView"');
  expect(facade).not.toContain("LegacyWorkspaceViews");
});

test("each live workspace module defines its production view directly", () => {
  expect(read("AreasView.tsx")).toContain("export function AreasView()");
  expect(read("DatesView.tsx")).toContain("export function DatesView()");
  expect(read("ProjectDetailView.tsx")).toContain("export function ProjectDetailView(");
  expect(read("ProjectsView.tsx")).toContain("export function ProjectsView()");
});

test("retired workspace view implementations are physically removed", () => {
  for (const file of [
    "LegacyWorkspaceViews.tsx",
    "ProductInboxView.tsx",
    "ResourcesLifecycleView.tsx",
    "ReviewsView.tsx",
    "ArchiveLifecycleView.tsx",
    "Batch2LifecycleViews.tsx",
    "Dashboard2.tsx"
  ]) {
    expect(existsSync(resolve(workspaceRoot, file)), file).toBe(false);
  }
});
