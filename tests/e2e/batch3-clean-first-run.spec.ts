import { expect, test, type Page } from "@playwright/test";

const demoEmail = "demo@contextos.local";
const demoPassword = "contextos-demo-v011";

async function registerFreshAccount(page: Page, prefix: string) {
  const email = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`;
  await page.goto("/register");
  await expect(page.getByText("Start with a clean workspace and set up your first Area.")).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("batch3-clean-workspace-password");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByTestId("first-run-setup")).toBeVisible();
  return email;
}

async function bootstrapData(page: Page) {
  const response = await page.request.get("/api/bootstrap");
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  return payload.data as {
    domains: { id: string; name: string; archived: boolean }[];
    projects: { id: string; name: string; domainId: string }[];
    tasks: unknown[];
    captures: unknown[];
    notes: unknown[];
    deadlines: unknown[];
    contextDates: unknown[];
    reviews: unknown[];
    dailyNotes: unknown[];
    dashboardScratchpads: unknown[];
    dashboardPreferences: unknown[];
  };
}

async function loginDemo(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(demoEmail);
  await page.getByLabel("Password").fill(demoPassword);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  const reset = await page.request.post("/api/reset-demo");
  expect(reset.ok()).toBeTruthy();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
}

test("new accounts start clean, survive bootstrap, and reach useful work through first Area setup", async ({ page }) => {
  await registerFreshAccount(page, "batch3-clean");

  let data = await bootstrapData(page);
  expect(data.domains).toHaveLength(0);
  expect(data.projects).toHaveLength(0);
  expect(data.tasks).toHaveLength(0);
  expect(data.captures).toHaveLength(0);
  expect(data.notes).toHaveLength(0);
  expect(data.deadlines).toHaveLength(0);
  expect(data.reviews).toHaveLength(0);
  expect(data.dailyNotes).toHaveLength(0);
  expect(data.dashboardScratchpads).toHaveLength(1);
  expect(data.dashboardPreferences).toHaveLength(1);

  await expect(page.getByText("ContextOS Demo", { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId("first-run-setup")).toBeVisible();
  data = await bootstrapData(page);
  expect(data.domains).toHaveLength(0);
  expect(data.projects).toHaveLength(0);

  const areaName = `Work ${Date.now()}`;
  await page.getByLabel("Area name").fill(areaName);
  await page.getByRole("button", { name: "Add Area" }).click();
  await expect(page.getByTestId("first-run-setup")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();

  await expect.poll(async () => (await bootstrapData(page)).domains.some((domain) => domain.name === areaName)).toBeTruthy();

  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await page.getByRole("button", { name: /New Project/i }).click();
  const projectName = `First real project ${Date.now()}`;
  await page.getByPlaceholder("Project name...").fill(projectName);
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\//);
  await expect(page.getByPlaceholder("Project name")).toHaveValue(projectName);

  await page.goto("/resources");
  const resourceTitle = `First resource ${Date.now()}`;
  await page.getByPlaceholder("Resource title...").fill(resourceTitle);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByPlaceholder("Note title")).toHaveValue(resourceTitle);

  await page.reload();
  await expect(page.getByTestId("first-run-setup")).toHaveCount(0);
  await expect(page.getByText("ContextOS Demo", { exact: true })).toHaveCount(0);
});

test("first Area setup is usable on a narrow mobile viewport without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await registerFreshAccount(page, "batch3-mobile");

  const layout = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth);

  await page.getByLabel("Area name").fill("Personal");
  await page.getByRole("button", { name: "Add Area" }).click();
  await expect(page.getByTestId("first-run-setup")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
});

test("quick Project conversion never silently files a Project into the Notes Area", async ({ page }) => {
  await loginDemo(page);
  await page.goto("/inbox");

  const projectName = `Batch 3 project ${Date.now()}`;
  await page.getByPlaceholder(/Quick capture/i).fill(`/project ${projectName}`);
  await page.getByPlaceholder(/Quick capture/i).press("Enter");

  const capture = page.getByTestId("capture-card").filter({ hasText: projectName });
  await expect(capture).toBeVisible();
  await capture.getByRole("button", { name: "Convert to project" }).click();

  await expect.poll(async () => {
    const current = await bootstrapData(page);
    const project = current.projects.find((item) => item.name === projectName);
    if (!project) return null;
    return current.domains.find((domain) => domain.id === project.domainId)?.name ?? null;
  }).not.toBe("Notes");
});
