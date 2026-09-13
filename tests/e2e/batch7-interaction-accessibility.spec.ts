import { devices, expect, test, type Page } from "@playwright/test";

const demoEmail = "demo@contextos.local";
const demoPassword = "contextos-demo-v011";

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
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
}

function legacyTaskStatusSelect(page: Page) {
  return page.locator("select").filter({ has: page.locator('option[value="in-progress"]') }).first();
}

test.describe("Batch 7 touch interaction guarantees", () => {
  test.use({ ...devices["iPhone 13"] });

  test("compact workspace task controls remain visible and at least 40px on touch devices", async ({ page }) => {
    await loginDemo(page);
    await page.goto("/this-week");
    await expect(page.getByRole("heading", { name: "This Week", exact: true })).toBeVisible();

    const completionButton = page.getByRole("button", { name: /Mark .+ (?:done|todo)$/ }).first();
    await expect(completionButton).toBeVisible();
    const completionBox = await completionButton.boundingBox();
    expect(completionBox).not.toBeNull();
    expect(completionBox!.width).toBeGreaterThanOrEqual(40);
    expect(completionBox!.height).toBeGreaterThanOrEqual(40);

    const statusSelect = legacyTaskStatusSelect(page);
    await expect(statusSelect).toBeVisible();
    await expect(statusSelect).toHaveCSS("opacity", "1");
    const statusBox = await statusSelect.boundingBox();
    expect(statusBox).not.toBeNull();
    expect(statusBox!.height).toBeGreaterThanOrEqual(40);
  });
});

test("keyboard focus reveals legacy hover-only task status controls", async ({ page }) => {
  await loginDemo(page);
  await page.goto("/this-week");
  await expect(page.getByRole("heading", { name: "This Week", exact: true })).toBeVisible();

  const statusSelect = legacyTaskStatusSelect(page);
  await statusSelect.focus();
  await expect(statusSelect).toHaveCSS("opacity", "1");
});

test("Dashboard command guidance uses durable date-format examples instead of expired literal dates", async ({ page }) => {
  await loginDemo(page);
  const commandInput = page.getByPlaceholder(/YYYY-MM-DD/).first();
  await expect(commandInput).toBeVisible();
  const placeholder = await commandInput.getAttribute("placeholder");
  expect(placeholder).toContain("YYYY-MM-DD");
  expect(placeholder).not.toContain("2026-07-10");
});
