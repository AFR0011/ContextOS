import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const demoEmail = "demo@contextos.local";
const demoPassword = "contextos-demo-v011";

const interceptedPageFiles = [
  "src/app/(workspace)/dashboard/page.tsx",
  "src/app/(workspace)/projects/page.tsx",
  "src/app/(workspace)/projects/[id]/page.tsx",
  "src/app/(workspace)/dates/page.tsx",
  "src/app/(workspace)/areas/page.tsx",
  "src/app/(workspace)/lifeos/page.tsx",
  "src/app/(workspace)/search/page.tsx",
  "src/app/(workspace)/settings/page.tsx"
] as const;

const compatibilityRedirects = [
  ["src/app/(workspace)/inbox/page.tsx", "/dashboard"],
  ["src/app/(workspace)/resources/page.tsx", "/lifeos"],
  ["src/app/(workspace)/reviews/page.tsx", "/lifeos"],
  ["src/app/(workspace)/archive/page.tsx", "/search"],
  ["src/app/(workspace)/today/page.tsx", "/dashboard"],
  ["src/app/(workspace)/this-week/page.tsx", "/dashboard"],
  ["src/app/(workspace)/deadlines/page.tsx", "/dates"]
] as const;

async function resetDemo(page: Page) {
  const response = await page.request.post("/api/reset-demo");
  expect(response.status()).toBe(200);
}

async function loginDemo(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(demoEmail);
  await page.getByLabel("Password").fill(demoPassword);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await resetDemo(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
}

test("canonical Next workspace pages remain inert local-router entrypoints", () => {
  for (const file of interceptedPageFiles) {
    const source = readFileSync(resolve(process.cwd(), file), "utf8");
    expect(source, file).toContain("WorkspaceRouteHandoff");
    expect(source, file).not.toContain("LifecycleView");
    expect(source, file).not.toContain("ProductInboxView");
  }
});

test("retired and historical aliases have explicit canonical redirects", () => {
  for (const [file, target] of compatibilityRedirects) {
    const source = readFileSync(resolve(process.cwd(), file), "utf8");
    expect(source, file).toContain('import { redirect } from "next/navigation"');
    expect(source, file).toContain(`redirect("${target}")`);
    expect(source, file).not.toContain("WorkspaceRouteHandoff");
  }
});

test("direct workspace URLs resolve through the canonical local router", async ({ page }) => {
  await loginDemo(page);

  const routes = [
    ["/dashboard", "Today"],
    ["/projects", "Projects"],
    ["/dates", "Dates"],
    ["/areas", "Areas"],
    ["/lifeos", "Module hub"],
    ["/search", "Search"],
    ["/settings", "Settings"]
  ] as const;

  for (const [path, heading] of routes) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading, exact: true }).first(), path).toBeVisible();
  }

  for (const [path, target] of [
    ["/inbox", "/dashboard"],
    ["/resources", "/lifeos"],
    ["/reviews", "/lifeos"],
    ["/archive", "/search"]
  ] as const) {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`${target.replace("/", "\\/")}$`));
  }

  const bootstrap = await page.request.get("/api/bootstrap");
  expect(bootstrap.ok()).toBeTruthy();
  const workspace = await bootstrap.json();
  const project = workspace.data.projects.find((item: { state?: string }) => item.state === "active") ?? workspace.data.projects[0];
  expect(project?.id).toBeTruthy();

  await page.goto(`/projects/${encodeURIComponent(project.id)}`);
  await expect(page.getByTestId("project-command-page")).toBeVisible();
});
