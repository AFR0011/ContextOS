import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const demoEmail = "demo@contextos.local";
const demoPassword = "contextos-demo-v011";
const viewKey = "contextos-dashboard-command-page-view";

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

async function logout(request: APIRequestContext) {
  const response = await request.post("/api/auth/logout");
  expect(response.status()).toBe(200);
}

async function preferenceId(request: APIRequestContext) {
  const response = await request.get("/api/bootstrap");
  expect(response.status()).toBe(200);
  const body = await response.json() as { data: { dashboardPreferences: Array<{ id: string }> } };
  const id = body.data.dashboardPreferences[0]?.id;
  expect(id).toBeTruthy();
  return id!;
}

test("Search indexes recovery context and deep-targets the exact matched record", async ({ page }) => {
  await loginDemo(page);
  await page.goto("/search");

  const input = page.getByPlaceholder("Search workspace...");
  await input.fill("Experiment recovery note");
  const projectResult = page.getByTestId(/search-result-project-/).filter({ hasText: "Benchmark Evaluation" }).first();
  await expect(projectResult).toBeVisible();
  await projectResult.getByRole("button", { name: "Inspect exact record Benchmark Evaluation" }).click();
  await expect(page).toHaveURL(/\/search\?.*selected=project%3A/);
  const selected = page.getByTestId("search-selected-record");
  await expect(selected).toContainText("Benchmark Evaluation");
  await expect(selected).toContainText("Last useful context: compare benchmark outputs after the regression run finishes.");
  await expect(selected).toContainText("Confirm regression behavior");

  await page.reload();
  await expect(page.getByTestId("search-selected-record")).toContainText("Experiment recovery note");

  await input.fill("capture -> triage -> today -> recovery loop");
  const dateResult = page.getByTestId(/search-result-date-/).filter({ hasText: "ContextOS v0.1 verification pass" }).first();
  await expect(dateResult).toBeVisible();
  await dateResult.getByRole("button", { name: "Inspect exact record ContextOS v0.1 verification pass" }).click();
  await expect(page).toHaveURL(/\/search\?.*selected=date%3A/);
  await expect(page.getByTestId("search-selected-record")).toContainText("Run the full capture -> triage -> today -> recovery loop.");
});

