import { expect, test, type BrowserContext, type Page, type TestInfo } from "@playwright/test";

const DEMO_EMAIL = "demo@contextos.local";
const DEMO_PASSWORD = "contextos-demo-v011";
type Theme = "light" | "dark";

async function loginDemo(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(DEMO_EMAIL);
  await page.getByLabel("Password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  const reset = await page.request.post("/api/reset-demo");
  expect(reset.status()).toBe(200);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
  await expect(page.getByTestId("offline-shell-readiness")).toHaveAttribute("data-ready", "true", { timeout: 30_000 });
}

async function applyTheme(page: Page, theme: Theme) {
  await page.evaluate((nextTheme) => {
    localStorage.setItem("contextos-theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }, theme);
  await page.reload();
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(theme === "dark");
}

async function capture(page: Page, testInfo: TestInfo, name: string) {
  await expect.poll(() =>
    page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
  ).toBe(true);

  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: false, animations: "disabled" });
  await testInfo.attach(name, { path, contentType: "image/png" });
}

async function pendingOutboxCount(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("contextos-offline-v1", 4);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const users = await new Promise<Array<{ id: string; email: string }>>((resolve, reject) => {
      const tx = db.transaction("users", "readonly");
      const request = tx.objectStore("users").getAll();
      request.onsuccess = () => resolve(request.result as Array<{ id: string; email: string }>);
      request.onerror = () => reject(request.error);
    });
    const user = users.find((item) => item.email === DEMO_EMAIL) ?? users[0];
    if (!user) {
      db.close();
      return -1;
    }

    const count = await new Promise<number>((resolve, reject) => {
      const tx = db.transaction("outboxes", "readonly");
      const request = tx.objectStore("outboxes").get(user.id);
      request.onsuccess = () => resolve((request.result ?? []).length);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return count;
  });
}

async function setOffline(context: BrowserContext, offline: boolean) {
  await context.setOffline(offline);
}

test.describe("C10 production offline visual states", () => {
  test.skip(
    process.env.CAPTURE_C10_VISUAL !== "1",
    "Run through the dedicated C10 visual capture command against the production build."
  );
  test.describe.configure({ mode: "serial" });

  for (const theme of ["light", "dark"] as const) {
    test(`offline / pending / reconnect - ${theme}`, async ({ page, context }, testInfo) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await loginDemo(page);
      await applyTheme(page, theme);

      await capture(page, testInfo, `production-${theme}-01-online-ready`);

      await setOffline(context, true);
      await expect(page.getByTestId("global-sync-indicator").first()).toContainText(/Offline/i);
      await capture(page, testInfo, `production-${theme}-02-offline`);

      const noteText = `C10 visual pending note ${theme} ${Date.now()}`;
      await page.getByLabel("Daily Notes").fill(noteText);
      await expect.poll(() => pendingOutboxCount(page)).toBeGreaterThan(0);
      await capture(page, testInfo, `production-${theme}-03-offline-pending`);

      let releaseSync!: () => void;
      const syncGate = new Promise<void>((resolve) => {
        releaseSync = resolve;
      });
      await page.route("**/api/sync", async (route) => {
        if (route.request().method() !== "POST") {
          await route.continue();
          return;
        }
        await syncGate;
        await route.continue();
      });

      await setOffline(context, false);
      await expect(page.getByTestId("global-sync-indicator").first()).toContainText(/Syncing/i);
      await capture(page, testInfo, `production-${theme}-04-reconnecting`);

      releaseSync();
      await page.unroute("**/api/sync");
      await expect.poll(() => pendingOutboxCount(page), { timeout: 20_000 }).toBe(0);
      await expect(page.getByTestId("global-sync-indicator").first()).not.toContainText(/Offline|Syncing/i);
      await capture(page, testInfo, `production-${theme}-05-reconnected`);
    });
  }
});
