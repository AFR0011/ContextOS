import { expect, test } from "@playwright/test";

async function registerFresh(page: any, prefix: string) {
  const token = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const email = `${token}@example.test`;
  const password = `Portability-${Date.now()}-${Math.random().toString(36).slice(2)}!`;
  const registered = await page.request.post("/api/auth/register", {
    data: { email, password },
    headers: { "x-forwarded-for": token }
  });
  expect(registered.status()).toBe(200);
}

test("fresh first run exposes restore and completes a workspace replacement", async ({ page }) => {
  await registerFresh(page, "portability-ui-source");

  const now = new Date().toISOString();
  const area = {
    id: `area-portability-ui-${Date.now()}`,
    name: "Restored Personal",
    state: "active",
    createdAt: now,
    updatedAt: now
  };
  const initialArea = await page.request.post("/api/sync", {
    data: {
      mutations: [{
        mutationId: `mut-portability-ui-${Date.now()}`,
        entityType: "areas",
        entityId: area.id,
        operation: "upsert",
        payload: area,
        createdAt: now
      }]
    }
  });
  expect(initialArea.status()).toBe(200);

  const exported = await page.request.get("/api/portability/export?format=json");
  expect(exported.status()).toBe(200);
  const bundleText = await exported.text();

  const loggedOut = await page.request.post("/api/auth/logout");
  expect(loggedOut.status()).toBe(200);
  await registerFresh(page, "portability-ui-destination");

  await page.goto("/dashboard");
  await expect(page.getByTestId("first-run-setup")).toBeVisible();
  await page.getByRole("button", { name: "Restore a workspace" }).click();
  await expect(page).toHaveURL(/\/settings$/);

  const portability = page.getByTestId("data-portability-settings");
  await expect(portability).toBeVisible();
  await expect(portability.getByRole("link", { name: "Export JSON" })).toHaveAttribute("href", "/api/portability/export?format=json");
  await expect(portability.getByRole("link", { name: "Export Markdown" })).toHaveAttribute("href", "/api/portability/export?format=markdown");

  await page.getByTestId("workspace-import-file").setInputFiles({
    name: "contextos-workspace.json",
    mimeType: "application/json",
    buffer: Buffer.from(bundleText)
  });

  const preview = page.getByTestId("workspace-import-preview");
  await expect(preview).toBeVisible();
  await expect(preview).toContainText("format v2");
  await expect(preview).toContainText("1 areas");
  await expect(page.getByLabel("Import mode")).toHaveValue("replace");

  const restoreButton = page.getByTestId("workspace-import-restore");
  await expect(restoreButton).toBeDisabled();
  await page.getByLabel("Import confirmation").fill("REPLACE");
  await expect(restoreButton).toBeEnabled();
  await restoreButton.click();

  await expect(page.getByTestId("workspace-import-success")).toContainText("Workspace restored from export.");
  await expect(page.getByTestId("workspace-import-preview")).toHaveCount(0);
  await expect(page.getByTestId("pending-count")).toHaveText("0");
  await page.goto("/areas");
  await expect(page.getByText("Restored Personal", { exact: true })).toBeVisible();
});

test("replace import does not report success when the restored server workspace cannot refresh locally", async ({ page }) => {
  await registerFresh(page, "portability-refresh-source");

  const now = new Date().toISOString();
  const area = {
    id: `area-portability-refresh-${Date.now()}`,
    name: "Restored after refresh retry",
    state: "active",
    createdAt: now,
    updatedAt: now
  };
  const seeded = await page.request.post("/api/sync", {
    data: {
      mutations: [{
        mutationId: `mut-portability-refresh-${Date.now()}`,
        entityType: "areas",
        entityId: area.id,
        operation: "upsert",
        payload: area,
        createdAt: now
      }]
    }
  });
  expect(seeded.status()).toBe(200);

  const exported = await page.request.get("/api/portability/export?format=json");
  expect(exported.status()).toBe(200);
  const bundleText = await exported.text();

  await page.request.post("/api/auth/logout");
  await registerFresh(page, "portability-refresh-destination");

  await page.goto("/settings");
  await page.getByTestId("workspace-import-file").setInputFiles({
    name: "contextos-workspace.json",
    mimeType: "application/json",
    buffer: Buffer.from(bundleText)
  });
  await expect(page.getByTestId("workspace-import-preview")).toBeVisible();
  await page.getByLabel("Import confirmation").fill("REPLACE");

  await page.route("**/api/bootstrap", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Injected bootstrap failure" })
    });
  });

  await page.getByTestId("workspace-import-restore").click();

  await expect(page.getByTestId("workspace-import-success")).toHaveCount(0);
  await expect(page.getByTestId("workspace-import-error")).toContainText(
    "workspace was restored on the server, but this tab could not refresh"
  );
  await expect(page.getByTestId("workspace-import-preview")).toHaveCount(0);

  await page.unroute("**/api/bootstrap");
  await page.getByTestId("settings-refresh-from-server").click();
  await expect(page.getByTestId("sync-error")).toHaveCount(0);

  await page.goto("/areas");
  await expect(page.getByText("Restored after refresh retry", { exact: true })).toBeVisible();
});

