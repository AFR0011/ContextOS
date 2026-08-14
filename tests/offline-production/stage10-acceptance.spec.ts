import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@contextos.local");
  await page.getByLabel("Password").fill("contextos-demo-v011");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
}

async function waitForOfflineReady(page: Page) {
  const readiness = page.getByTestId("offline-shell-readiness");
  await expect(readiness).toHaveAttribute("data-ready", "true", { timeout: 30_000 });
  await expect(readiness).toContainText("Offline ready");
}

test("offline browser history and functional local search work in the production runtime", async ({ page, context }) => {
  await login(page);
  await waitForOfflineReady(page);
  await context.setOffline(true);

  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/\/search$/);
  await expect(page.getByRole("heading", { name: "Search", exact: true })).toBeVisible();

  await page.goBack({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();

  await page.goBack({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();

  await page.goForward({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();

  await page.goForward({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/search$/);
  await expect(page.getByRole("heading", { name: "Search", exact: true })).toBeVisible();

  const search = page.getByPlaceholder("Search workspace...");
  await search.fill("Offline Sync Trust");
  await expect(page.getByText("Offline Sync Trust", { exact: true })).toBeVisible();
  await expect(page.getByText("Project", { exact: true }).first()).toBeVisible();
});
