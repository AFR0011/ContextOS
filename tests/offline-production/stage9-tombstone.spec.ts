import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@contextos.local");
  await page.getByLabel("Password").fill("contextos-demo-v011");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
}

async function waitForOfflineReady(page: Page) {
  const readiness = page.getByTestId("offline-shell-readiness");
  await expect(readiness).toHaveAttribute("data-ready", "true", { timeout: 30_000 });
}

async function editableInputValueCount(page: Page, title: string) {
  return page.locator("input").evaluateAll((inputs, expected) => (
    inputs.filter((input) => (input as HTMLInputElement).value === expected).length
  ), title);
}

async function localDeadlineSnapshot(page: Page, title: string) {
  return page.evaluate(async ({ databaseName, title }) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName, 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const workspaces = await new Promise<Array<{ deadlines?: Array<{ title?: string; trashedAt?: string | null }> }>>((resolve, reject) => {
      const tx = db.transaction("workspaces", "readonly");
      const request = tx.objectStore("workspaces").getAll();
      request.onsuccess = () => resolve(request.result as Array<{ deadlines?: Array<{ title?: string; trashedAt?: string | null }> }>);
      request.onerror = () => reject(request.error);
    });
    db.close();
    for (const workspace of workspaces) {
      const deadline = workspace.deadlines?.find((candidate) => candidate.title === title);
      if (deadline) return deadline;
    }
    return null;
  }, { databaseName: "contextos-offline-v1", title });
}

async function serverDeadlineByTitle(page: Page, title: string) {
  return page.evaluate(async (title) => {
    const response = await fetch("/api/bootstrap", { cache: "no-store" });
    if (!response.ok) throw new Error(`bootstrap failed: ${response.status}`);
    const result = await response.json();
    return result.data?.deadlines?.find((deadline: { title?: string }) => deadline.title === title) ?? null;
  }, title);
}

test("offline date tombstone survives production hard reload, reconnect sync, and restore", async ({ page, context }) => {
  await login(page);
  await waitForOfflineReady(page);

  const title = `Stage 9 production tombstone ${Date.now()}`;
  await page.getByRole("button", { name: "Dates", exact: true }).click();
  await page.getByRole("button", { name: "Add Date", exact: true }).click();
  await page.getByPlaceholder("Date title...").fill(title);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect.poll(async () => editableInputValueCount(page, title)).toBe(1);
  await expect.poll(async () => Boolean(await serverDeadlineByTitle(page, title)), { timeout: 15_000 }).toBe(true);

  await context.setOffline(true);
  await page.getByRole("button", { name: `Delete ${title}` }).click();
  await expect.poll(async () => editableInputValueCount(page, title)).toBe(0);
  await expect.poll(async () => Boolean((await localDeadlineSnapshot(page, title))?.trashedAt), { timeout: 5_000 }).toBe(true);

  await page.getByRole("button", { name: "Archive", exact: true }).click();
  await page.getByRole("button", { name: /Trash \(/ }).click();
  await expect(page.getByText(title, { exact: true })).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/archive$/);
  await expect(page.getByRole("heading", { name: "Archive", exact: true })).toBeVisible();
  await expect.poll(async () => Boolean((await localDeadlineSnapshot(page, title))?.trashedAt), { timeout: 5_000 }).toBe(true);
  await page.getByRole("button", { name: /Trash \(/ }).click();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
  await expect(page.getByTestId("global-sync-indicator").first()).toContainText(/Offline|pending/i);

  await context.setOffline(false);
  await expect.poll(async () => Boolean((await serverDeadlineByTitle(page, title))?.trashedAt), { timeout: 20_000 }).toBe(true);

  await page.getByRole("button", { name: "Restore", exact: true }).click();
  await expect.poll(async () => (await serverDeadlineByTitle(page, title))?.trashedAt ?? null, { timeout: 20_000 }).toBeNull();
});