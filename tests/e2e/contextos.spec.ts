import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@contextos.local");
  await page.getByLabel("Password").fill("contextos-demo");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page.request.post("/api/reset-demo");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test("seeded demo account can log in and render dashboard", async ({ page }) => {
  await login(page);
  await expect(page.getByText("Use ContextOS for today's real captures")).toBeVisible();
  await expect(page.getByText("ContextOS Demo").first()).toBeVisible();
});

test("quick capture appears in inbox and can convert to a task", async ({ page }) => {
  await login(page);
  const text = `offline-ready capture ${Date.now()}`;
  await page.getByPlaceholder(/Quick capture/).fill(`/task ${text}`);
  await page.getByPlaceholder(/Quick capture/).press("Enter");
  await expect(page.getByText(`/task ${text}`)).toBeVisible();
  await page.goto("/inbox");
  await expect(page.getByText(`/task ${text}`)).toBeVisible();
  await page.getByRole("button", { name: "Capture actions" }).first().click();
  await page.getByRole("button", { name: "Convert to task" }).click();
  await expect(page.getByText("converted")).toBeVisible();
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByPlaceholder("Search workspace...").fill(text);
  await expect(page.getByText(text).first()).toBeVisible();
});

test("project recovery fields persist after reload", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Projects" }).click();
  await page.getByRole("button", { name: /^ContextOS Demo/ }).click();
  const nextAction = `Verify recovery persistence ${Date.now()}`;
  await page.getByPlaceholder("What is the next concrete action?").fill(nextAction);
  await page.getByPlaceholder("What is the next concrete action?").blur();
  await page.reload();
  await expect(page.getByPlaceholder("What is the next concrete action?")).toHaveValue(nextAction);
});

test("offline capture is stored locally and sync state shows pending work", async ({ page, context }) => {
  await login(page);
  await page.goto("/inbox");
  await page.goto("/dashboard");
  await context.setOffline(true);
  const text = `offline capture ${Date.now()}`;
  await page.getByPlaceholder(/Quick capture/).fill(text);
  await page.getByPlaceholder(/Quick capture/).press("Enter");
  await expect(page.getByText(text)).toBeVisible();
  await expect(page.getByText(/pending/i).first()).toBeVisible();
  await context.setOffline(false);
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("button", { name: /sync now/i }).click();
  await expect(page.getByTestId("pending-count")).toHaveText("0");
});

test("archive and trash restore flows work", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Projects" }).click();
  await page.getByRole("button", { name: /^ContextOS Demo/ }).click();
  await page.getByRole("button", { name: "Archive project" }).click();
  await page.goto("/archive");
  await expect(page.getByText("ContextOS Demo")).toBeVisible();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Restore ContextOS Demo" }).click({ force: true });
  await expect(page.getByText("No archived projects")).toBeVisible();
});
