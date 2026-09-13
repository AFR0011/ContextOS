import { expect, test, type Page } from "@playwright/test";

async function registerFreshAccount(page: Page, email: string, credential: string) {
  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(credential);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByTestId("first-run-setup")).toBeVisible();
}

async function login(page: Page, email: string, credential: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(credential);
  await page.getByRole("button", { name: /sign in/i }).click();
}

test("password rotation verifies the current password, keeps this session, and revokes other sessions", async ({ browser, page }) => {
  const seed = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const email = `batch14-${seed}@example.test`;
  const originalCredential = `B14-old-${seed}-Aa1!`;
  const rotatedCredential = `B14-new-${seed}-Bb2!`;

  await registerFreshAccount(page, email, originalCredential);

  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();
  try {
    await login(secondPage, email, originalCredential);
    await expect(secondPage).toHaveURL(/\/dashboard$/);
    await expect(secondPage.getByTestId("first-run-setup")).toBeVisible();

    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
    await expect(page.getByTestId("password-change-settings")).toBeVisible();

    await page.getByLabel("Current password").fill(`wrong-${seed}`);
    await page.getByLabel("New password").fill(rotatedCredential);
    await page.getByLabel("Confirm new password").fill(rotatedCredential);
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByTestId("password-change-error")).toHaveText("Current password is incorrect.");

    await page.getByLabel("Current password").fill(originalCredential);
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByTestId("password-change-success")).toContainText("1 other signed-in session was signed out.");

    await expect(page).toHaveURL(/\/settings$/);
    const bootstrap = await page.request.get("/api/bootstrap");
    expect(bootstrap.status()).toBe(200);

    await secondPage.goto("/dashboard");
    await expect(secondPage).toHaveURL(/\/login$/);

    await secondPage.getByLabel("Email").fill(email);
    await secondPage.getByLabel("Password").fill(originalCredential);
    await secondPage.getByRole("button", { name: /sign in/i }).click();
    await expect(secondPage.getByText("Invalid email or password.", { exact: true })).toBeVisible();

    await secondPage.getByLabel("Password").fill(rotatedCredential);
    await secondPage.getByRole("button", { name: /sign in/i }).click();
    await expect(secondPage).toHaveURL(/\/dashboard$/);
    await expect(secondPage.getByTestId("first-run-setup")).toBeVisible();
  } finally {
    await secondContext.close();
  }
});
