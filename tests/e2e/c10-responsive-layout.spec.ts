import { expect, test, type Locator, type Page } from "@playwright/test";

async function resetDemo(page: Page) {
  const response = await page.request.post("/api/reset-demo");
  expect(response.status()).toBe(200);
}

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@contextos.local");
  await page.getByLabel("Password").fill("contextos-demo-v011");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await resetDemo(page);
  await page.reload();
  await expect(page.getByTestId("home-view")).toBeVisible();
}

async function expectUsableFieldWidth(locator: Locator, minimum = 200) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box, "Expected visible control to have a bounding box").not.toBeNull();
  expect(Math.floor(box!.width)).toBeGreaterThanOrEqual(minimum);
}

test("detail Date composers remain usable at the 1024px sidebar breakpoint", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await login(page);

  await page.goto("/projects");
  await page.getByText("ContextOS Demo", { exact: true }).first().click();
  const projectDates = page.getByTestId("project-dates");
  await page.getByRole("button", { name: "New date", exact: true }).click();
  await expectUsableFieldWidth(projectDates.getByRole("textbox", { name: "Date title", exact: true }));
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.goto("/areas");
  await page.getByText("Engineering", { exact: true }).first().click();
  const areaDates = page.getByTestId("area-dates");
  await page.getByRole("button", { name: "New date", exact: true }).click();
  await expectUsableFieldWidth(areaDates.getByRole("textbox", { name: "Date title", exact: true }));
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("Home dayline does not reserve vacant balancing height", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);

  const dayline = page.getByTestId("home-dayline");
  await expect(dayline).toBeVisible();

  const mobileMinHeight = await dayline.evaluate((element) =>
    Number.parseFloat(window.getComputedStyle(element).minHeight)
  );
  expect(mobileMinHeight).toBeLessThan(100);

  await page.setViewportSize({ width: 1024, height: 768 });
  const desktopMinHeight = await dayline.evaluate((element) =>
    Number.parseFloat(window.getComputedStyle(element).minHeight)
  );
  expect(desktopMinHeight).toBeLessThan(100);
});

