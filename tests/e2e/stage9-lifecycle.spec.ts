import { expect, test, type Page } from "@playwright/test";

const DB_NAME = "contextos-offline-v1";
const DEMO_EMAIL = "demo@contextos.local";
const DEMO_PASSWORD = "contextos-demo-v011";

async function login(page: Page, email = DEMO_EMAIL, password = DEMO_PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
}

async function localStateForEmail(page: Page, email: string) {
  return page.evaluate(async ({ databaseName, targetEmail }) => {
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
    const user = users.find((candidate) => candidate.email === targetEmail) ?? null;
    if (!user) {
      db.close();
      return { user: null, workspace: null, outbox: null };
    }

    const dataTx = db.transaction(["workspaces", "outboxes"], "readonly");
    const workspace = await requestValue(dataTx.objectStore("workspaces").get(user.id));
    const outbox = await requestValue(dataTx.objectStore("outboxes").get(user.id));
    db.close();
    return { user, workspace: workspace ?? null, outbox: outbox ?? null };
  }, { databaseName: DB_NAME, targetEmail: email });
}

async function registerDisposableUser(page: Page) {
  const email = `stage9-delete-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const password = "stage9-delete-password";
  await page.goto("/login");
  const result = await page.evaluate(async ({ email, password }) => {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    return { status: response.status, body: await response.json().catch(() => null) };
  }, { email, password });
  expect(result.status, JSON.stringify(result.body)).toBe(200);
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  return { email, password };
}

test("default logout preserves the verified local workspace", async ({ page }) => {
  await login(page);

  const before = await localStateForEmail(page, DEMO_EMAIL);
  expect(before.user).not.toBeNull();
  expect(before.workspace).not.toBeNull();

  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page.getByTestId("logout-dialog")).toBeVisible();
  await expect(page.getByTestId("logout-keep-local")).toContainText("Log out and keep local data");
  await page.getByTestId("logout-keep-local").click();

  await expect(page).toHaveURL(/\/login$/);
  const after = await localStateForEmail(page, DEMO_EMAIL);
  expect(after.user?.id).toBe(before.user?.id);
  expect(after.workspace).not.toBeNull();
});

test("remove-from-device logout clears only the current user's local lifecycle state", async ({ page }) => {
  await login(page);

  const before = await localStateForEmail(page, DEMO_EMAIL);
  expect(before.user).not.toBeNull();
  expect(before.workspace).not.toBeNull();

  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page.getByTestId("logout-dialog")).toBeVisible();
  await page.getByTestId("logout-remove-device-data").click();

  await expect(page).toHaveURL(/\/login$/);
  const after = await localStateForEmail(page, DEMO_EMAIL);
  expect(after.user).toBeNull();
  expect(after.workspace).toBeNull();
  expect(after.outbox).toBeNull();
});

test("logout refuses to pretend an offline browser invalidated its HttpOnly server session", async ({ page, context }) => {
  await login(page);
  const before = await localStateForEmail(page, DEMO_EMAIL);

  await context.setOffline(true);
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page.getByTestId("logout-dialog")).toContainText("HttpOnly server session cannot be invalidated");
  await expect(page.getByTestId("logout-keep-local")).toBeDisabled();
  await expect(page.getByTestId("logout-remove-device-data")).toBeDisabled();

  const after = await localStateForEmail(page, DEMO_EMAIL);
  expect(after.user?.id).toBe(before.user?.id);
  expect(after.workspace).not.toBeNull();
});

test("account deletion verifies credentials before local cleanup and removes both server and current-device state", async ({ page }) => {
  const account = await registerDisposableUser(page);
  const localBefore = await localStateForEmail(page, account.email);
  expect(localBefore.user).not.toBeNull();
  expect(localBefore.workspace).not.toBeNull();

  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await page.getByTestId("open-account-deletion").click();
  await expect(page).toHaveURL(/\/account\/delete$/);
  await expect(page.getByRole("heading", { name: "Delete account permanently" })).toBeVisible();

  await page.getByLabel("Current password").fill("wrong-password");
  await page.getByLabel("Type DELETE to confirm").fill("DELETE");
  await page.getByTestId("account-delete-submit").click();
  await expect(page.getByTestId("account-delete-error")).toContainText("Current password is incorrect");

  const afterRejectedAttempt = await localStateForEmail(page, account.email);
  expect(afterRejectedAttempt.user?.id).toBe(localBefore.user?.id);
  expect(afterRejectedAttempt.workspace).not.toBeNull();

  await page.getByLabel("Current password").fill(account.password);
  await page.getByTestId("account-delete-submit").click();
  await expect(page).toHaveURL(/\/login$/);

  const localAfter = await localStateForEmail(page, account.email);
  expect(localAfter.user).toBeNull();
  expect(localAfter.workspace).toBeNull();
  expect(localAfter.outbox).toBeNull();

  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(account.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByText("Invalid email or password.")).toBeVisible();
});
