import { expect, test, type Page } from "@playwright/test";

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
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
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

async function dailyNoteContent(page: Page, localDate: string) {
  const workspace = await currentLocalWorkspace(page);
  return workspace?.dailyNotes?.find((note: { localDate: string }) => note.localDate === localDate)?.content ?? "";
}

test("Daily Notes flush a pending edit when navigating before autosave fires", async ({ page }) => {
  const { localDateKey } = await import("../../src/lib/dates");
  await login(page);
  const today = localDateKey();
  const note = `Fast navigation daily note ${Date.now()}`;
  const editor = page.getByLabel("Daily Notes");

  await editor.fill(note);
  await expect(page.getByText("Saving…", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();

  await expect.poll(() => dailyNoteContent(page, today)).toContain(note);
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await expect(page.getByLabel("Daily Notes")).toHaveValue(note);
});
