import { expect, test, type Page } from "@playwright/test";

async function resetDemo(page: Page) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await page.request.post("/api/reset-demo", { timeout: 15_000 });
      if (response.ok()) return;
      lastError = new Error(`/api/reset-demo returned ${response.status()}`);
    } catch (error) {
      lastError = error;
    }
    await page.waitForTimeout(500);
  }
  if (lastError instanceof Error) throw lastError;
  throw new Error("/api/reset-demo failed");
}

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@contextos.local");
  await page.getByLabel("Password").fill("contextos-demo-v011");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await resetDemo(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
}

async function localProjectState(page: Page, name: string) {
  return page.evaluate(async (projectName) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("contextos-offline-v1");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const users = await new Promise<{ id: string; email: string }[]>((resolve, reject) => {
      const tx = db.transaction("users", "readonly");
      const request = tx.objectStore("users").getAll();
      request.onsuccess = () => resolve(request.result as { id: string; email: string }[]);
      request.onerror = () => reject(request.error);
    });
    const user = users.find((candidate) => candidate.email === "demo@contextos.local") ?? users[0];
    if (!user) throw new Error("No local demo user");
    const workspace = await new Promise<any>((resolve, reject) => {
      const tx = db.transaction("workspaces", "readonly");
      const request = tx.objectStore("workspaces").get(user.id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return workspace?.projects?.find((project: { name: string }) => project.name === projectName) ?? null;
  }, name);
}

test("canonical organization surfaces are discoverable without flattening primary navigation", async ({ page }) => {
  await login(page);

  const primary = page.getByTestId("workspace-primary-nav");
  await expect(primary.getByRole("button", { name: "Dashboard" })).toBeVisible();
  await expect(primary.getByRole("button", { name: "Areas" })).toHaveCount(0);

  const secondary = page.getByTestId("workspace-secondary-nav");
  for (const label of ["Dates", "Areas", "Resources", "Reviews"]) {
    await expect(secondary.getByRole("button", { name: label, exact: true })).toBeVisible();
  }
  await secondary.getByRole("button", { name: "Reviews", exact: true }).click();
  await expect(page).toHaveURL(/\/reviews$/);
  await expect(page.getByText("Reviews are historical snapshots")).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  await page.locator("button:has(svg.lucide-menu)").click();
  await expect(page.getByTestId("workspace-secondary-nav")).toBeVisible();
  await page.getByTestId("workspace-secondary-nav").getByRole("button", { name: "Resources", exact: true }).click();
  await expect(page).toHaveURL(/\/resources$/);
  await expect(page.getByRole("heading", { name: "Resources", exact: true })).toBeVisible();
});

test("resources leave the active library when archived or trashed and restore cleanly", async ({ page }) => {
  await login(page);
  await page.goto("/resources");
  const title = `Batch 2 resource ${Date.now()}`;

  await page.getByPlaceholder("Resource title...").fill(title);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  const titleInput = page.getByDisplayValue(title);
  await expect(titleInput).toBeVisible();
  const resourceTestId = await titleInput.locator("xpath=ancestor::section[1]").getAttribute("data-testid");
  expect(resourceTestId).toBeTruthy();
  const resource = page.getByTestId(resourceTestId!);
  await resource.getByRole("button", { name: "Done", exact: true }).click();
  await expect(resource.getByText(title, { exact: true })).toBeVisible();

  await resource.getByRole("button", { name: `Archive ${title}`, exact: true }).click();
  await expect(resource).toHaveCount(0);

  await page.goto("/archive");
  await expect(page.getByText(title, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: `Restore ${title}`, exact: true }).click();

  await page.goto("/resources");
  const restored = page.locator('[data-testid^="resource-"]').filter({ hasText: title });
  await expect(restored).toBeVisible();
  await restored.getByRole("button", { name: `Move ${title} to trash`, exact: true }).click();
  await expect(restored).toHaveCount(0);

  await page.goto("/archive");
  await page.getByRole("button", { name: /^Trash \(/ }).click();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: `Restore ${title}`, exact: true }).click();

  await page.goto("/resources");
  await expect(page.locator('[data-testid^="resource-"]').filter({ hasText: title })).toBeVisible();
});

test("archived and deleted Inbox captures are recoverable from Archive", async ({ page }) => {
  await login(page);
  const archived = `Batch 2 archived capture ${Date.now()}`;
  const deleted = `Batch 2 deleted capture ${Date.now()}`;
  await page.goto("/inbox");

  await page.getByPlaceholder(/Quick capture/i).fill(archived);
  await page.getByPlaceholder(/Quick capture/i).press("Enter");
  await page.getByPlaceholder(/Quick capture/i).fill(deleted);
  await page.getByPlaceholder(/Quick capture/i).press("Enter");

  await page.getByTestId("capture-card").filter({ hasText: archived }).getByRole("button", { name: "Review", exact: true }).click();
  await page.getByTestId("inbox-review-panel").getByRole("button", { name: "Archive", exact: true }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();

  await page.getByTestId("capture-card").filter({ hasText: deleted }).getByRole("button", { name: "Review", exact: true }).click();
  await page.getByTestId("inbox-review-panel").getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();

  await page.goto("/archive");
  await expect(page.getByText(archived, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: `Restore ${archived}`, exact: true }).click();

  await page.getByRole("button", { name: /^Trash \(/ }).click();
  await expect(page.getByText(deleted, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: `Restore ${deleted}`, exact: true }).click();

  await page.goto("/inbox");
  await expect(page.getByTestId("capture-card").filter({ hasText: archived })).toBeVisible();
  await expect(page.getByTestId("capture-card").filter({ hasText: deleted })).toBeVisible();
});

test("trashing a parent project does not cascade into its subcontext", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.locator("main").getByRole("button", { name: /^ContextOS Demo/ }).click();

  const child = `Batch 2 child ${Date.now()}`;
  await page.getByPlaceholder("Add subcontext, course, assignment, or duty...").fill(child);
  await page.getByPlaceholder("Add subcontext, course, assignment, or duty...").press("Enter");
  await expect(page.getByTestId("project-subcontexts").getByRole("button", { name: new RegExp(`^${child}`) })).toBeVisible();

  await page.getByTestId("project-detail-lifecycle").getByRole("button", { name: "Move project ContextOS Demo to trash", exact: true }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.locator("main").getByRole("button", { name: new RegExp(`^${child}`) })).toBeVisible();

  await expect.poll(async () => (await localProjectState(page, "ContextOS Demo"))?.trashedAt).not.toBeNull();
  await expect.poll(async () => (await localProjectState(page, child))?.trashedAt ?? null).toBeNull();

  await page.goto("/archive");
  await page.getByRole("button", { name: /^Trash \(/ }).click();
  await page.getByRole("button", { name: "Restore ContextOS Demo", exact: true }).click();
  await page.goto("/projects");
  await expect(page.locator("main").getByRole("button", { name: /^ContextOS Demo/ })).toBeVisible();
});
