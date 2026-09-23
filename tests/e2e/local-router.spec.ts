import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@contextos.local");
  await page.getByLabel("Password").fill("contextos-demo-v011");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
}

async function expectPath(page: Page, pathname: string) {
  await expect.poll(() => page.evaluate(() => window.location.pathname)).toBe(pathname);
}

test("core workspace navigation changes local history without network access", async ({ page, context }) => {
  await login(page);
  await context.setOffline(true);

  const nav = page.getByTestId("workspace-primary-nav");
  await nav.getByRole("button", { name: "Areas", exact: true }).click();
  await expectPath(page, "/areas");
  await expect(page.getByRole("heading", { name: "Areas", exact: true })).toBeVisible();
  await page.getByText("Research", { exact: true }).first().click();
  await expect.poll(() => page.evaluate(() => window.location.pathname.startsWith("/areas/"))).toBe(true);
  await expect(page.getByTestId("area-detail")).toBeVisible();
  await page.getByTestId("area-detail").getByRole("button", { name: "Areas", exact: true }).click();
  await expectPath(page, "/areas");

  await nav.getByRole("button", { name: "Projects", exact: true }).click();
  await expectPath(page, "/projects");
  await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();

  await page.locator("main").getByRole("button", { name: /^ContextOS Demo/ }).first().click();
  await expect.poll(() => page.evaluate(() => window.location.pathname.startsWith("/projects/"))).toBe(true);
  await expect(page.getByTestId("project-command-page")).toBeVisible();

  await page.getByTestId("project-command-page").getByRole("button", { name: "Projects", exact: true }).click();
  await expectPath(page, "/projects");

  await nav.getByRole("button", { name: "Search", exact: true }).click();
  await expectPath(page, "/search");
  await expect(page.getByRole("heading", { name: "Search", exact: true })).toBeVisible();

  await nav.getByRole("button", { name: "LifeOS", exact: true }).click();
  await expectPath(page, "/lifeos");
  await expect(page.getByRole("heading", { name: "Module hub", exact: true })).toBeVisible();
});

test("browser back and forward traverse local workspace views while offline", async ({ page, context }) => {
  await login(page);
  await context.setOffline(true);

  const nav = page.getByTestId("workspace-primary-nav");
  await nav.getByRole("button", { name: "Areas", exact: true }).click();
  await nav.getByRole("button", { name: "Projects", exact: true }).click();
  await nav.getByRole("button", { name: "Search", exact: true }).click();
  await expectPath(page, "/search");

  await page.evaluate(() => window.history.back());
  await expectPath(page, "/projects");
  await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();

  await page.evaluate(() => window.history.back());
  await expectPath(page, "/areas");
  await expect(page.getByRole("heading", { name: "Areas", exact: true })).toBeVisible();

  await page.evaluate(() => window.history.forward());
  await expectPath(page, "/projects");
  await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();
});

test("query-string navigation stays inside the local workspace router", async ({ page, context }) => {
  await login(page);
  await page.getByTestId("workspace-primary-nav").getByRole("button", { name: "Search", exact: true }).click();
  await expectPath(page, "/search");

  await context.setOffline(true);
  const input = page.getByPlaceholder("Search workspace...");
  await input.fill("Keep experiments and handoffs recoverable");
  const result = page.getByTestId(/search-result-project-/).filter({ hasText: "Benchmark Evaluation" }).first();
  await expect(result).toBeVisible();
  await result.click();

  await expectPath(page, "/search");
  await expect.poll(() => page.evaluate(() => window.location.search)).toMatch(/selected=project%3A/);
  await expect(page.getByTestId("search-selected-record")).toContainText("Benchmark Evaluation");
});

test("search result navigation resolves records locally while offline", async ({ page, context }) => {
  await login(page);
  await page.getByTestId("workspace-primary-nav").getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Search", exact: true })).toBeVisible();

  await context.setOffline(true);
  const title = "Validate benchmark regression";
  await page.getByPlaceholder("Search workspace...").fill(title);
  const result = page.getByTestId(/search-result-task-/).filter({ hasText: title }).first();
  await result.click();
  await page.getByTestId("search-selected-record").getByRole("button", { name: "Open project" }).click();

  await expect.poll(() => page.evaluate(() => window.location.pathname.startsWith("/projects/"))).toBe(true);
  const taskTitle = page.getByTestId("project-live-tasks").getByText(title, { exact: true });
  await expect(taskTitle).toBeVisible();
  await taskTitle.click();
  const editor = page.getByRole("dialog", { name: "Edit Task", exact: true });
  await expect(editor).toBeVisible();
  await expect(editor.getByRole("textbox", { name: "Task title", exact: true })).toHaveValue(title);
});
