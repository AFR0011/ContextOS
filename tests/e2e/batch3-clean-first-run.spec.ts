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
    areas: { id: string; name: string; state: "active" | "archived" }[];
    projects: { id: string; name: string; areaId: string; state: "active" | "archived" }[];
    tasks: unknown[];
    dates: unknown[];
    dailyNotes: unknown[];
    serverSyncedAt: string;
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

test("new accounts start with an empty canonical workspace and reach useful work through first Area setup", async ({ page }) => {
  await registerFreshAccount(page, "batch3-clean");

  let data = await bootstrapData(page);
  expect(data.areas).toHaveLength(0);
  expect(data.projects).toHaveLength(0);
  expect(data.tasks).toHaveLength(0);
  expect(data.dates).toHaveLength(0);
  expect(data.dailyNotes).toHaveLength(0);

  await expect(page.getByText("ContextOS Demo", { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId("first-run-setup")).toBeVisible();
  data = await bootstrapData(page);
  expect(data.areas).toHaveLength(0);
  expect(data.projects).toHaveLength(0);

  const areaName = `Work ${Date.now()}`;
  await page.getByLabel("Area name").fill(areaName);
  await page.getByRole("button", { name: "Add Area" }).click();
  await expect(page.getByTestId("first-run-setup")).toHaveCount(0);
  const homeHeading = page.getByRole("heading", { name: "Home", exact: true });
  await expect(homeHeading).toBeVisible();
  await expect(homeHeading).toBeFocused();
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();

  await expect.poll(async () => (await bootstrapData(page)).areas.some((area) => area.name === areaName)).toBeTruthy();

  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await page.getByRole("button", { name: /New Project/i }).click();
  const projectName = `First real project ${Date.now()}`;
  await page.getByPlaceholder("Project name").fill(projectName);
  await page.getByRole("button", { name: "Create Project", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\//);
  await expect(page.getByRole("heading", { name: projectName, exact: true })).toBeVisible();
  await expect(page.getByTestId("project-summary")).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("first-run-setup")).toHaveCount(0);
  await expect(page.getByText("ContextOS Demo", { exact: true })).toHaveCount(0);
});

test("demo reset is restricted to the configured demo identity", async ({ page }) => {
  await registerFreshAccount(page, "batch3-reset-boundary");

  const before = await bootstrapData(page);
  expect(before.areas).toHaveLength(0);

  const reset = await page.request.post("/api/reset-demo");
  expect(reset.status()).toBe(403);
  expect((await reset.json()).error).toContain("configured demo account");

  const after = await bootstrapData(page);
  expect(after.areas).toHaveLength(0);
  expect(after.projects).toHaveLength(0);
  expect(after.tasks).toHaveLength(0);
  expect(after.dates).toHaveLength(0);
  expect(after.dailyNotes).toHaveLength(0);
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

test("demo reset returns only canonical workspace collections", async ({ page }) => {
  await loginDemo(page);
  const data = await bootstrapData(page);

  expect(data.areas.length).toBeGreaterThan(0);
  expect(data.projects.length).toBeGreaterThan(0);
  expect(data.tasks.length).toBeGreaterThan(0);
  expect(data.dates.length).toBeGreaterThan(0);
  expect(data.areas.some((area) => area.name === "Notes")).toBe(false);

  expect(Object.keys(data).sort()).toEqual([
    "areas",
    "dailyNotes",
    "dates",
    "projects",
    "serverSyncedAt",
    "tasks"
  ]);
});
