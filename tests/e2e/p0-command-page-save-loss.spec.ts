import { expect, test, type Locator, type Page } from "@playwright/test";

async function resetDemo(page: Page) {
  const response = await page.request.post("/api/reset-demo", { timeout: 15_000 });
  expect(response.ok(), `/api/reset-demo returned ${response.status()}`).toBeTruthy();
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

function markdownLine(editor: Locator, index: number) {
  return editor.locator(`[data-testid$="-line-${index}"]`).first();
}

async function currentLocalWorkspace(page: Page) {
  return page.evaluate(async () => {
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
    if (!user) {
      db.close();
      throw new Error("No locally verified user is available for the test workspace.");
    }

    const workspace = await new Promise<any>((resolve, reject) => {
      const tx = db.transaction("workspaces", "readonly");
      const request = tx.objectStore("workspaces").get(user.id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    db.close();
    return workspace;
  });
}

async function dashboardScratchpadContent(page: Page) {
  const workspace = await currentLocalWorkspace(page);
  return workspace?.dashboardScratchpads?.[0]?.content ?? "";
}

async function projectRecoveryNotes(page: Page, projectName: string) {
  const workspace = await currentLocalWorkspace(page);
  return workspace?.projects?.find((project: { name: string }) => project.name === projectName)?.recoveryNotes ?? "";
}

test("dashboard scratchpad flushes a pending edit when navigating before autosave fires", async ({ page }) => {
  await login(page);
  const note = `Fast navigation scratchpad ${Date.now()}`;
  const editor = page.getByTestId("dashboard-scratchpad");

  await markdownLine(editor, 0).fill(note);
  await expect(page.getByText("Autosaving...", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Inbox", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Inbox", exact: true })).toBeVisible();

  await expect.poll(() => dashboardScratchpadContent(page)).toContain(note);
  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  await expect(markdownLine(page.getByTestId("dashboard-scratchpad"), 0)).toHaveValue(note);
});

test("project recovery notes flush a pending edit when navigating before autosave fires", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.locator("main").getByRole("button", { name: /^ContextOS Demo/ }).click();

  const note = `Fast navigation recovery ${Date.now()}`;
  const editor = page.getByTestId("project-recovery-notes");
  await markdownLine(editor, 0).fill(note);
  await expect(page.getByText("Autosaving...", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();

  await expect.poll(() => projectRecoveryNotes(page, "ContextOS Demo")).toContain(note);
  await page.locator("main").getByRole("button", { name: /^ContextOS Demo/ }).click();
  await expect(markdownLine(page.getByTestId("project-recovery-notes"), 0)).toHaveValue(note);
});
