import { expect, test, type Page } from "@playwright/test";

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
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
}

test("Search indexes canonical operational context and deep-targets the selected record", async ({ page }) => {
  await loginDemo(page);
  await page.goto("/search");

  const input = page.getByPlaceholder("Search workspace...");
  await input.fill("Keep experiments and handoffs recoverable");
  const projectResult = page.getByTestId(/search-result-project-/).filter({ hasText: "Benchmark Evaluation" }).first();
  await expect(projectResult).toBeVisible();
  await projectResult.click();
  await expect(page).toHaveURL(/\/search\?.*selected=project%3A/);
  const selected = page.getByTestId("search-selected-record");
  await expect(selected).toContainText("Benchmark Evaluation");
  await expect(selected).toContainText("Keep experiments and handoffs recoverable after breaks.");
  await expect(selected.getByRole("button", { name: "Open project" })).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("search-selected-record")).toContainText("Benchmark Evaluation");

  await input.fill("blocking issues");
  const dateResult = page.getByTestId(/search-result-date-/).filter({ hasText: "ContextOS verification pass" }).first();
  await expect(dateResult).toBeVisible();
  await dateResult.click();
  await expect(page).toHaveURL(/\/search\?.*selected=date%3A/);
  await expect(page.getByTestId("search-selected-record")).toContainText("Complete the current verification pass and record any blocking issues.");

  await input.fill("Experiment recovery note");
  await expect(page.getByText("No matching ContextOS records.", { exact: true })).toBeVisible();
  await input.fill("Practice Schedule");
  await expect(page.getByText("No matching ContextOS records.", { exact: true })).toBeVisible();
});

