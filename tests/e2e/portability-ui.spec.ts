import { expect, test } from "@playwright/test";

test("Settings previews and confirms a complete workspace restore", async ({ page }) => {
  const token = `portability-ui-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const email = `${token}@example.test`;
  const password = `Portability-${Date.now()}-Test!`;
  const registered = await page.request.post("/api/auth/register", {
    data: { email, password },
    headers: { "x-forwarded-for": token }
  });
  expect(registered.status()).toBe(200);

  const exported = await page.request.get("/api/portability/export?format=json");
  expect(exported.status()).toBe(200);
  const bundleText = await exported.text();

  await page.goto("/settings");
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
  await expect(preview).toContainText("format v1");
  await expect(page.getByLabel("Import mode")).toHaveValue("replace");

  const restoreButton = page.getByTestId("workspace-import-restore");
  await expect(restoreButton).toBeDisabled();
  await page.getByLabel("Import confirmation").fill("REPLACE");
  await expect(restoreButton).toBeEnabled();
  await restoreButton.click();

  await expect(page.getByTestId("workspace-import-success")).toContainText("Workspace restored from export.");
  await expect(page.getByTestId("workspace-import-preview")).toHaveCount(0);
  await expect(page.getByTestId("pending-count")).toHaveText("0");
});
