import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const DB_NAME = "contextos-offline-v1";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@contextos.local");
  await page.getByLabel("Password").fill("contextos-demo-v011");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
}

async function warmOfflineShell(page: Page) {
  await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) throw new Error("Service workers are unavailable in this browser.");
    await navigator.serviceWorker.ready;
    if (navigator.serviceWorker.controller) return;
    await new Promise<void>((resolve) => {
      const timeout = window.setTimeout(resolve, 2000);
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        () => {
          window.clearTimeout(timeout);
          resolve();
        },
        { once: true }
      );
    });
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
}

async function clearLocalIdentityAndWorkspace(page: Page) {
  await page.evaluate(async (databaseName) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName, 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["users", "workspaces", "outboxes", "kv"], "readwrite");
      tx.objectStore("users").clear();
      tx.objectStore("workspaces").clear();
      tx.objectStore("outboxes").clear();
      tx.objectStore("kv").clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("IndexedDB clear was aborted."));
    });
    db.close();
  }, DB_NAME);
}

async function seedSecondLocalWorkspace(page: Page) {
  await page.evaluate(async (databaseName) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName, 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const id = `second-local-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const workspace = {
      domains: [],
      projects: [],
      tasks: [],
      captures: [],
      notes: [],
      deadlines: [],
      reviews: [],
      dashboardScratchpads: [],
      dashboardPreferences: [],
      serverSyncedAt: ""
    };

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["users", "workspaces", "outboxes"], "readwrite");
      tx.objectStore("users").put({ id, email: `${id}@example.com`, verifiedAt: timestamp });
      tx.objectStore("workspaces").put(workspace, id);
      tx.objectStore("outboxes").put([], id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("Second local workspace seed aborted."));
    });
    db.close();
  }, DB_NAME);
}

async function clearRemoteSession(context: BrowserContext) {
  await context.clearCookies();
}

test("workspace route verifies the online session in the client gate", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
  await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
});

test("a single previously verified local workspace can reopen after remote verification becomes unavailable", async ({ page, context }) => {
  await login(page);
  await warmOfflineShell(page);

  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await expect(page.getByTestId("global-sync-indicator").first()).toContainText("Offline");
});

test("offline startup without a previously authenticated local workspace is blocked clearly", async ({ page, context }) => {
  await login(page);
  await warmOfflineShell(page);

  // This intentionally simulates a browser that has the neutral application shell cached
  // but has no verified local identity/workspace. It is not exercising logout semantics,
  // which remain deferred to Stage 9.
  await clearRemoteSession(context);
  await clearLocalIdentityAndWorkspace(page);
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });

  const blocked = page.getByTestId("workspace-gate-blocked");
  await expect(blocked).toBeVisible();
  await expect(blocked).toContainText("Connect to open this workspace");
  await expect(blocked).toContainText("sign in once");
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toHaveCount(0);
});

test("offline startup refuses to guess when multiple local identities have workspaces", async ({ page, context }) => {
  await login(page);
  await warmOfflineShell(page);
  await seedSecondLocalWorkspace(page);

  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });

  const blocked = page.getByTestId("workspace-gate-blocked");
  await expect(blocked).toBeVisible();
  await expect(blocked).toContainText("Connect to verify your workspace");
  await expect(blocked).toContainText("will not guess which identity to open");
});
