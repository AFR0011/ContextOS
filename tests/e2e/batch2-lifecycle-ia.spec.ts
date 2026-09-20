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
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
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

test("canonical shell exposes the definitive ContextOS navigation", async ({ page }) => {
  await login(page);

  const primary = page.getByTestId("workspace-primary-nav");
  for (const label of ["Home", "Projects", "Areas", "Dates", "LifeOS", "Search"]) {
    await expect(primary.getByRole("button", { name: label, exact: true })).toBeVisible();
  }
  for (const retired of ["Inbox", "Resources", "Reviews", "Archive"]) {
    await expect(primary.getByRole("button", { name: retired, exact: true })).toHaveCount(0);
  }

  const work = page.getByTestId("workspace-secondary-nav");
  for (const label of ["Projects", "Areas", "Dates"]) {
    await expect(work.getByRole("button", { name: label, exact: true })).toBeVisible();
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Open navigation", exact: true }).click();
  await expect(page.getByTestId("workspace-utility-nav").getByRole("button", { name: "Settings", exact: true })).toBeVisible();
});

test("resources leave the active library when archived or trashed and restore cleanly", async ({ page }) => {
  await login(page);
  await page.goto("/resources");
  const title = `Batch 2 resource ${Date.now()}`;

  await page.getByPlaceholder("Resource title...").fill(title);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  const titleInput = page.getByPlaceholder("Note title");
  await expect(titleInput).toHaveValue(title);
  const resourceTestId = await titleInput.locator("xpath=ancestor::section[1]").getAttribute("data-testid");
  expect(resourceTestId).toBeTruthy();
  const resource = page.getByTestId(resourceTestId ?? "missing-resource-testid");
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

test("archiving an Area does not cascade into its Projects", async ({ page }) => {
  await login(page);

  const bootstrap = await page.request.get("/api/bootstrap");
  expect(bootstrap.ok()).toBeTruthy();
  const workspace = await bootstrap.json();
  const project = workspace.data.projects.find(
    (item: { status?: string; trashedAt?: string | null; archivedAt?: string | null }) =>
      item.status === "active" && !item.trashedAt && !item.archivedAt
  );
  expect(project?.id).toBeTruthy();
  const area = workspace.data.domains.find((item: { id: string }) => item.id === project.domainId);
  expect(area?.id).toBeTruthy();
  const initialProjectStatus = project.status;

  await page.goto("/areas");
  await page.getByRole("button", { name: `Archive ${area.name}`, exact: true }).click();

  await expect.poll(async () => {
    const response = await page.request.get("/api/bootstrap");
    const result = await response.json();
    return result.data.domains.find((item: { id: string }) => item.id === area.id)?.archived ?? false;
  }).toBe(true);

  await expect.poll(async () => {
    const response = await page.request.get("/api/bootstrap");
    const result = await response.json();
    return result.data.projects.find((item: { id: string }) => item.id === project.id)?.status;
  }).toBe(initialProjectStatus);

  await page.goto("/projects");
  await expect(page.getByText(project.name, { exact: true }).first()).toBeVisible();
});

