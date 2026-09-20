import { expect, test, type Page } from "@playwright/test";

async function resetDemo(page: Page) {
  const response = await page.request.post("/api/reset-demo", { timeout: 15_000 });
  expect(response.ok()).toBeTruthy();
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

async function localDailyNote(page: Page, localDate: string) {
  return page.evaluate(async (date) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("contextos-offline-v1");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const users = await new Promise<Array<{ id: string; email: string }>>((resolve, reject) => {
      const tx = db.transaction("users", "readonly");
      const request = tx.objectStore("users").getAll();
      request.onsuccess = () => resolve(request.result as Array<{ id: string; email: string }>);
      request.onerror = () => reject(request.error);
    });
    const user = users.find((item) => item.email === "demo@contextos.local") ?? users[0];
    if (!user) throw new Error("No local user");
    const result = await new Promise<{ workspace: any; outbox: any[] }>((resolve, reject) => {
      const tx = db.transaction(["workspaces", "outboxes"], "readonly");
      const workspaceRequest = tx.objectStore("workspaces").get(user.id);
      const outboxRequest = tx.objectStore("outboxes").get(user.id);
      let workspace: any;
      let outbox: any[] = [];
      workspaceRequest.onsuccess = () => { workspace = workspaceRequest.result; };
      workspaceRequest.onerror = () => reject(workspaceRequest.error);
      outboxRequest.onsuccess = () => { outbox = outboxRequest.result ?? []; };
      outboxRequest.onerror = () => reject(outboxRequest.error);
      tx.oncomplete = () => resolve({ workspace, outbox });
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    return {
      note: result.workspace?.dailyNotes?.find((item: { localDate: string }) => item.localDate === date) ?? null,
      pendingDailyNotes: result.outbox.filter((item) => item.entityType === "dailyNotes").length
    };
  }, localDate);
}

test("Home projects only planned-today tasks and derives today context", async ({ page }) => {
  await login(page);

  await expect(page.getByTestId("home-dayline")).toContainText("Process inbox captures");
  await expect(page.getByTestId("home-dayline")).toContainText("Write one clean latest-status note");
  await expect(page.getByTestId("home-dayline")).not.toContainText("Review release milestones and identify risk points");

  await expect(page.getByTestId("home-contexts")).toContainText("ContextOS Demo");
  await expect(page.getByTestId("home-contexts")).toContainText("Dashboard 2.0 Foundation");
  await expect(page.getByTestId("home-contexts")).toContainText("Engineering");

  await expect(page.getByRole("heading", { name: "Insights", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Upcoming", exact: true })).toHaveCount(0);
  await expect(page.getByTestId("dashboard-scratchpad")).toHaveCount(0);
});

test("Home task completion stays in place", async ({ page }) => {
  await login(page);
  const title = "Process inbox captures";

  await page.getByRole("button", { name: `Complete ${title}`, exact: true }).click();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: `Reopen ${title}`, exact: true })).toBeVisible();

  await expect.poll(async () => {
    const response = await page.request.get("/api/bootstrap");
    const payload = await response.json();
    return payload.data.tasks.find((task: { title: string }) => task.title === title)?.status;
  }).toBe("done");
});

test("Daily Notes autosave locally, survive offline reload, and sync when reconnected", async ({ page, context }) => {
  const { localDateKey } = await import("../../src/lib/dates");
  await login(page);

  const readiness = page.getByTestId("offline-shell-readiness");
  await expect(readiness).toHaveAttribute("data-ready", "true", { timeout: 30_000 });

  await context.setOffline(true);
  const today = localDateKey();
  const content = `C3 daily note ${Date.now()}\nSecond line`;
  const editor = page.getByLabel("Daily Notes");
  await editor.fill(content);

  await expect.poll(() => localDailyNote(page, today)).toMatchObject({
    note: expect.objectContaining({ localDate: today, content }),
    pendingDailyNotes: 1
  });

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
  await expect(page.getByLabel("Daily Notes")).toHaveValue(content);

  await context.setOffline(false);
  await expect.poll(async () => {
    const response = await page.request.get("/api/bootstrap");
    if (!response.ok()) return null;
    const payload = await response.json();
    return payload.data.dailyNotes.find((note: { localDate: string }) => note.localDate === today)?.content ?? null;
  }, { timeout: 20_000 }).toBe(content);
});
