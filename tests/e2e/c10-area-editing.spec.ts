import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@contextos.local");
  await page.getByLabel("Password").fill("contextos-demo-v011");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  const reset = await page.request.post("/api/reset-demo");
  expect(reset.status()).toBe(200);
  await page.reload();
}

test("Area detail can rename the canonical Area without changing lifecycle", async ({ page }) => {
  await login(page);
  await page.goto("/areas");
  await page.getByText("Engineering", { exact: true }).first().click();

  await page.getByRole("button", { name: "Edit details", exact: true }).click();
  const name = page.getByRole("textbox", { name: "Area name", exact: true });
  await expect(name).toHaveValue("Engineering");
  await name.fill("Product Engineering");
  await name.press("Enter");

  await expect(page.getByRole("heading", { name: "Product Engineering", exact: true })).toBeVisible();
  await expect(page.getByText("Active responsibility domain", { exact: true })).toBeVisible();

  await page.goto("/areas");
  await expect(page.getByText("Product Engineering", { exact: true }).first()).toBeVisible();
});

test("Area rename rejects an empty name and Escape restores the canonical value", async ({ page }) => {
  await login(page);
  await page.goto("/areas");
  await page.getByText("Engineering", { exact: true }).first().click();

  await page.getByRole("button", { name: "Edit details", exact: true }).click();
  const name = page.getByRole("textbox", { name: "Area name", exact: true });
  await name.fill("");
  await name.blur();
  await expect(name).toHaveValue("Engineering");

  await name.fill("Temporary rename");
  await name.press("Escape");
  await expect(name).toHaveValue("Engineering");
});
