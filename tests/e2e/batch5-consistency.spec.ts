import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const demoEmail = "demo@contextos.local";
const demoPassword = "contextos-demo-v011";
const viewKey = "contextos-dashboard-command-page-view";
const ownerKey = `${viewKey}:owner`;

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
  const projectResult = page.getByRole("button").filter({ hasText: "Benchmark Evaluation" }).first();
  await expect(projectResult).toBeVisible();
  await projectResult.click();
  await expect(page).toHaveURL(/\/search\?.*selected=project%3A/);
  const selected = page.getByTestId("search-selected-record");
  await expect(selected).toContainText("Benchmark Evaluation");
  await expect(selected).toContainText("Last useful context: compare benchmark outputs after the regression run finishes.");
  await expect(selected).toContainText("Confirm regression behavior");

  await page.reload();
  await expect(page.getByTestId("search-selected-record")).toContainText("Experiment recovery note");

  await input.fill("capture -> triage -> today -> recovery loop");
  const dateResult = page.getByRole("button").filter({ hasText: "ContextOS v0.1 verification pass" }).first();
  await expect(dateResult).toBeVisible();
  await dateResult.click();
  await expect(page).toHaveURL(/\/search\?.*selected=date%3A/);
  await expect(page.getByTestId("search-selected-record")).toContainText("Run the full capture -> triage -> today -> recovery loop.");
});

test("Dashboard scope and grouping stay isolated per user on the same browser", async ({ page }) => {
  await loginDemo(page);
  const demoPreferenceId = await preferenceId(page.request);

  await page.getByTestId("dashboard-group-select").selectOption("area");
  await page.goto("/search");

  const demoStored = await page.evaluate(({ prefId, key, owner }) => ({
    owner: window.localStorage.getItem(owner),
    scoped: window.localStorage.getItem(`${key}:${prefId}`)
  }), { prefId: demoPreferenceId, key: viewKey, owner: ownerKey });
  expect(demoStored.owner).toBe(demoPreferenceId);
  expect(JSON.parse(demoStored.scoped ?? "{}").groupMode).toBe("area");

  await logout(page.request);
  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const email = `batch5-view-${nonce}@example.test`;
  const registered = await page.request.post("/api/auth/register", {
    data: { email, password: `Batch5-${nonce}!` },
    headers: { "x-forwarded-for": `batch5-view-${nonce}` }
  });
  expect(registered.status()).toBe(200);

  await page.goto("/dashboard");
  await expect(page.getByTestId("first-run-setup")).toBeVisible();
  await page.getByLabel("Area name").fill("Work");
  await page.getByRole("button", { name: "Add Area" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  const secondPreferenceId = await preferenceId(page.request);
  expect(secondPreferenceId).not.toBe(demoPreferenceId);

  await expect(page.getByTestId("dashboard-group-select")).toHaveValue("time");
  await page.getByTestId("dashboard-group-select").selectOption("project");
  await page.goto("/search");

  const isolated = await page.evaluate(({ firstId, secondId, key }) => ({
    first: window.localStorage.getItem(`${key}:${firstId}`),
    second: window.localStorage.getItem(`${key}:${secondId}`)
  }), { firstId: demoPreferenceId, secondId: secondPreferenceId, key: viewKey });
  expect(JSON.parse(isolated.first ?? "{}").groupMode).toBe("area");
  expect(JSON.parse(isolated.second ?? "{}").groupMode).toBe("project");

  await logout(page.request);
  const login = await page.request.post("/api/auth/login", { data: { email: demoEmail, password: demoPassword } });
  expect(login.status()).toBe(200);
  await page.goto("/dashboard");
  await expect(page.getByTestId("dashboard-group-select")).toHaveValue("area");
});
