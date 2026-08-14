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

async function seedPendingOutbox(page: Page, email: string) {
  return page.evaluate(async ({ databaseName, targetEmail }) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName, 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const users = await new Promise<Array<{ id: string; email: string }>>((resolve, reject) => {
      const tx = db.transaction("users", "readonly");
      const request = tx.objectStore("users").getAll();
      request.onsuccess = () => resolve(request.result as Array<{ id: string; email: string }>);
      request.onerror = () => reject(request.error);
    });
    const user = users.find((candidate) => candidate.email === targetEmail);
    if (!user) {
      db.close();
      throw new Error("Could not find the verified local user for pending-outbox seed.");
    }

    const createdAt = new Date().toISOString();
    const mutation = {
      mutationId: `stage9-pending-${Date.now()}`,
      entityType: "captures",
      entityId: `stage9-pending-capture-${Date.now()}`,
      operation: "upsert",
      payload: {
        id: `stage9-pending-capture-${Date.now()}`,
        text: "Stage 9 pending logout probe",
        status: "unprocessed",
        type: "note",
        parsedData: null,
        convertedToId: null,
        createdAt,
        updatedAt: createdAt
      },
      createdAt
    };

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("outboxes", "readwrite");
      tx.objectStore("outboxes").put([mutation], user.id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("Pending-outbox seed aborted."));
    });
    db.close();
    return mutation.mutationId;
  }, { databaseName: DB_NAME, targetEmail: email });
}

async function seedOtherLocalUser(page: Page) {
  return page.evaluate(async (databaseName) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName, 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const id = `stage9-other-${Date.now()}`;
    const email = `${id}@example.com`;
    const verifiedAt = new Date().toISOString();
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
      serverSyncedAt: verifiedAt
    };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["users", "workspaces", "outboxes"], "readwrite");
      tx.objectStore("users").put({ id, email, verifiedAt });
      tx.objectStore("workspaces").put(workspace, id);
      tx.objectStore("outboxes").put([], id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("Other-user lifecycle seed aborted."));
    });
    db.close();
    return { id, email };
  }, DB_NAME);
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

test("failed requested sync cancels logout and keeping pending changes preserves the outbox", async ({ page }) => {
  await login(page);
  await page.route("**/api/sync", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "forced Stage 9 sync failure" }) });
      return;
    }
    await route.continue();
  });

  const mutationId = await seedPendingOutbox(page, DEMO_EMAIL);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await expect(page.getByTestId("global-sync-indicator").first()).toContainText(/1 pending|Syncing/);

  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page.getByTestId("logout-sync")).toBeVisible();
  await page.getByTestId("logout-sync").click();
  await expect(page.getByTestId("logout-error")).toContainText("Pending changes are still unsynchronized. Logout was cancelled");
  await expect(page).toHaveURL(/\/dashboard$/);

  const afterFailedSync = await localStateForEmail(page, DEMO_EMAIL);
  expect(afterFailedSync.outbox).toEqual(expect.arrayContaining([expect.objectContaining({ mutationId })]));

  await page.getByTestId("logout-keep-local").click();
  await expect(page).toHaveURL(/\/login$/);
  const afterLogout = await localStateForEmail(page, DEMO_EMAIL);
  expect(afterLogout.outbox).toEqual(expect.arrayContaining([expect.objectContaining({ mutationId })]));
});

test("remove-from-device logout clears only the current user's local lifecycle state", async ({ page }) => {
  await login(page);

  const before = await localStateForEmail(page, DEMO_EMAIL);
  const other = await seedOtherLocalUser(page);
  const otherBefore = await localStateForEmail(page, other.email);
  expect(before.user).not.toBeNull();
  expect(before.workspace).not.toBeNull();
  expect(otherBefore.user?.id).toBe(other.id);
  expect(otherBefore.workspace).not.toBeNull();

  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page.getByTestId("logout-dialog")).toBeVisible();
  await page.getByTestId("logout-remove-device-data").click();

  await expect(page).toHaveURL(/\/login$/);
  const after = await localStateForEmail(page, DEMO_EMAIL);
  const otherAfter = await localStateForEmail(page, other.email);
  expect(after.user).toBeNull();
  expect(after.workspace).toBeNull();
  expect(after.outbox).toBeNull();
  expect(otherAfter.user?.id).toBe(other.id);
  expect(otherAfter.workspace).not.toBeNull();
  expect(otherAfter.outbox).toEqual([]);
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
