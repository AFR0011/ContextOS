import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { expect, test } from "@playwright/test";

const liveViews = ["AreasView", "DatesView", "ProjectDetailView", "ProjectsView", "ReviewsView"] as const;
const retiredViews = ["DashboardView", "InboxView", "TodayView", "ThisWeekView", "ResourcesView", "SearchView", "ArchiveView", "SettingsView"] as const;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? sourceFiles(path) : /\.(?:ts|tsx)$/.test(entry) ? [path] : [];
  });
}

test("workspace Views facade exposes only reachable production views", () => {
  const facadePath = resolve(process.cwd(), "src/components/workspace/Views.tsx");
  const facade = readFileSync(facadePath, "utf8");

  for (const view of liveViews) expect(facade, view).toContain(view);
  for (const view of retiredViews) expect(facade, view).not.toContain(view);
  expect(facade).toContain('from "@/components/workspace/LegacyWorkspaceViews"');
});

test("production source reaches the legacy view implementation only through the facade", () => {
  const srcRoot = resolve(process.cwd(), "src");
  const facadePath = resolve(srcRoot, "components/workspace/Views.tsx");
  const directLegacyConsumers = sourceFiles(srcRoot)
    .filter((path) => path !== facadePath)
    .filter((path) => readFileSync(path, "utf8").includes("LegacyWorkspaceViews"))
    .map((path) => path.slice(srcRoot.length + 1).replace(/\\/g, "/"));

  expect(directLegacyConsumers).toEqual([]);
});
