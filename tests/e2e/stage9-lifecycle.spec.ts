import { expect, test, type Page } from "@playwright/test";

const DB_NAME = "contextos-offline-v1";
const DEMO_EMAIL = "demo@contextos.local";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(DEMO_EMAIL);
  await page.getByLabel("Password").fill("contextos-demo-v011");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
}

async function localDemoState(page: Page) {
  return page.evaluate(async ({ databaseName, email }) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName, 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    function requestValue<T>(request: IDBRequest<T>): Promise<T> {
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    const usersTx = db.transaction("users", "readonly");
    const users = await requestValue(usersTx.objectStore("users").getAll()) as Array<{ id: string; email: string }>;
    const user = users.find((candidate) => candidate.email === email) ?? null;
    if (!user) {
      db.close();
      return { user: null, workspace: null, outbox: null };
    }

    const dataTx = db.transaction(["workspaces", "outboxes"], "readonly");
    const workspace = await requestValue(dataTx.objectStore("workspaces").get(user.id));
    const outbox = await requestValue(dataTx.objectStore("outboxes").get(user.id));
    db.close();
    return { user, workspace: workspace ?? null, outbox: outbox ?? null };
  }, { databaseName: DB_NAME, email: DEMO_EMAIL });
}

test("default logout preserves the verified local workspace", async ({ page }) => {
  await login(page);

  const before = await localDemoState(page);
  expect(before.user).not.toBeNull();
  expect(before.workspace).not.toBeNull();

  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page.getByTestId("logout-dialog")).toBeVisible();
  await expect(page.getByTestId("logout-keep-local")).toContainText("Log out and keep local data");
  await page.getByTestId("logout-keep-local").click();

  await expect(page).toHaveURL(/\/login$/);
  const after = await localDemoState(page);
  expect(after.user?.id).toBe(before.user?.id);
  expect(after.workspace).not.toBeNull();
});

test("remove-from-device logout clears only the current user's local lifecycle state", async ({ page }) => {
  await login(page);

  const before = await localDemoState(page);
  expect(before.user).not.toBeNull();
  expect(before.workspace).not.toBeNull();

  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page.getByTestId("logout-dialog")).toBeVisible();
  await page.getByTestId("logout-remove-device-data").click();

  await expect(page).toHaveURL(/\/login$/);
  const after = await localDemoState(page);
  expect(after.user).toBeNull();
  expect(after.workspace).toBeNull();
  expect(after.outbox).toBeNull();
});

test("logout refuses to pretend an offline browser invalidated its HttpOnly server session", async ({ page, context }) => {
  await login(page);
  const before = await localDemoState(page);

  await context.setOffline(true);
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page.getByTestId("logout-dialog")).toContainText("HttpOnly server session cannot be invalidated");
  await expect(page.getByTestId("logout-keep-local")).toBeDisabled();
  await expect(page.getByTestId("logout-remove-device-data")).toBeDisabled();

  const after = await localDemoState(page);
  expect(after.user?.id).toBe(before.user?.id);
  expect(after.workspace).not.toBeNull();
});
