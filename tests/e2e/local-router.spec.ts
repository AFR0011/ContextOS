import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@contextos.local");
  await page.getByLabel("Password").fill("contextos-demo-v011");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
}

async function expectPath(page: Page, pathname: string) {
  await expect.poll(() => page.evaluate(() => window.location.pathname)).toBe(pathname);
}

test("core workspace navigation changes local history without network access", async ({ page, context }) => {
  await login(page);
  await context.setOffline(true);

  const nav = page.getByTestId("workspace-primary-nav");
  await nav.getByRole("button", { name: "Inbox", exact: true }).click();
  await expectPath(page, "/inbox");
  await expect(page.getByRole("heading", { name: "Inbox", exact: true })).toBeVisible();

  await nav.getByRole("button", { name: "Projects", exact: true }).click();
  await expectPath(page, "/projects");
  await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();

  // Exercise navigation initiated inside a core view, not only the shell. Use any
  // visible project instead of a named fixture because earlier E2E cases may leave
  // one seeded project temporarily archived while its queued sync is still draining.
  await page.locator("main").getByRole("button", { name: /Next:/ }).first().click();
  await expect.poll(() => page.evaluate(() => window.location.pathname.startsWith("/projects/"))).toBe(true);
  await expect(page.getByTestId("project-command-page")).toBeVisible();

  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expectPath(page, "/projects");
  await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();

  await nav.getByRole("button", { name: "Search", exact: true }).click();
  await expectPath(page, "/search");
  await expect(page.getByRole("heading", { name: "Search", exact: true })).toBeVisible();
});

test("browser back and forward traverse local workspace views while offline", async ({ page, context }) => {
  await login(page);
  await context.setOffline(true);

  const nav = page.getByTestId("workspace-primary-nav");
  await nav.getByRole("button", { name: "Inbox", exact: true }).click();
  await nav.getByRole("button", { name: "Projects", exact: true }).click();
  await nav.getByRole("button", { name: "Search", exact: true }).click();
  await expectPath(page, "/search");

  await page.evaluate(() => window.history.back());
  await expectPath(page, "/projects");
  await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();

  await page.evaluate(() => window.history.back());
  await expectPath(page, "/inbox");
  await expect(page.getByRole("heading", { name: "Inbox", exact: true })).toBeVisible();

  await page.evaluate(() => window.history.forward());
  await expectPath(page, "/projects");
  await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();
});

test("query-string navigation stays inside the local workspace router", async ({ page, context }) => {
  await login(page);
  await context.setOffline(true);

  const preview = page.getByTestId("dashboard-inbox-preview");
  await expect(preview).toBeVisible();
  await preview.getByRole("button", { name: "Review Inbox", exact: true }).click();

  await expectPath(page, "/inbox");
  await expect.poll(() => page.evaluate(() => window.location.search)).toBe("?review=1");
  await expect(page.getByTestId("inbox-review-panel")).toBeVisible();
});

test("search result navigation resolves records locally while offline", async ({ page, context }) => {
  await login(page);
  await page.getByTestId("workspace-primary-nav").getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Search", exact: true })).toBeVisible();

  await context.setOffline(true);
  const title = "Validate benchmark regression";
  await page.getByPlaceholder("Search workspace...").fill(title);
  await page.getByRole("button", { name: new RegExp(`Task ${title}`) }).click();

  await expect.poll(() => page.evaluate(() => window.location.pathname.startsWith("/projects/"))).toBe(true);
  await expect(page.getByLabel(`Task title ${title}`)).toBeVisible();
});
