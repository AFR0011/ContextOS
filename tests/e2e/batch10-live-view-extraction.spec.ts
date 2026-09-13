import { readFileSync } from "node:fs";
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
  expect(facade).toContain('export { ReviewsView } from "@/components/workspace/ReviewsView"');
  expect(facade).not.toContain("LegacyWorkspaceViews");
});

test("each live workspace module defines its production view directly", () => {
  expect(read("AreasView.tsx")).toContain("export function AreasView()");
  expect(read("DatesView.tsx")).toContain("export function DatesView()");
  expect(read("ProjectDetailView.tsx")).toContain("export function ProjectDetailView(");
  expect(read("ProjectsView.tsx")).toContain("export function ProjectsView()");
  expect(read("ReviewsView.tsx")).toContain("export function ReviewsView()");
});
