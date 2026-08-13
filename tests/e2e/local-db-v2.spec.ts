import { expect, test, type Page } from "@playwright/test";

const DB_NAME = "contextos-offline-v1";

async function uiLogin(page: Page, email = "demo@contextos.local", password = "contextos-demo-v011") {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function deleteLocalDb(page: Page) {
  await page.evaluate(async (databaseName) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(databaseName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error("IndexedDB deletion was blocked"));
    });
  }, DB_NAME);
}

async function seedLegacyV1(page: Page) {
  await page.evaluate(async (databaseName) => {
    const workspace = {
      domains: [
        {
          id: "legacy-domain",
          name: "Legacy Offline Marker",
          archived: false,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z"
        }
      ],
      projects: [],
      tasks: [],
      captures: [],
      notes: [],
      deadlines: [],
      reviews: [],
      dashboardScratchpads: [],
      dashboardPreferences: [],
      serverSyncedAt: "legacy-v1"
    };

    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("kv", "readwrite");
        tx.objectStore("kv").put(workspace, "workspace");
        tx.objectStore("kv").put([], "outbox");
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      };
    });
  }, DB_NAME);
}

async function localDbSnapshot(page: Page) {
  return page.evaluate(async (databaseName) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName, 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    function get<T>(storeName: string, key: IDBValidKey) {
      return new Promise<T | undefined>((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const request = tx.objectStore(storeName).get(key);
        request.onsuccess = () => resolve(request.result as T | undefined);
        request.onerror = () => reject(request.error);
      });
    }

    function getAll<T>(storeName: string) {
      return new Promise<T[]>((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const request = tx.objectStore(storeName).getAll();
        request.onsuccess = () => resolve(request.result as T[]);
        request.onerror = () => reject(request.error);
      });
    }

    const users = await getAll<{ id: string; email: string; verifiedAt: string }>("users");
    const workspaceByUser: Record<string, any> = {};
    const outboxByUser: Record<string, any[]> = {};
    for (const user of users) {
      workspaceByUser[user.id] = await get("workspaces", user.id);
      outboxByUser[user.id] = (await get<any[]>("outboxes", user.id)) ?? [];
    }
    const legacyWorkspace = await get("kv", "workspace");
    const legacyOutbox = await get("kv", "outbox");
    const stores = Array.from(db.objectStoreNames);
    const version = db.version;
    db.close();

    return { version, stores, users, workspaceByUser, outboxByUser, legacyWorkspace, legacyOutbox };
  }, DB_NAME);
}

async function seedSecondLocalUser(page: Page, userId: string, email: string, marker: string) {
  await page.evaluate(async ({ databaseName, userId: secondUserId, email: secondEmail, marker: secondMarker }) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName, 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const timestamp = new Date().toISOString();
    const workspace = {
      domains: [],
      projects: [],
      tasks: [],
      captures: [
        {
          id: `capture-${secondUserId}`,
          text: secondMarker,
          status: "unprocessed",
          type: null,
          parsedData: null,
          convertedToId: null,
          createdAt: timestamp,
          updatedAt: timestamp
        }
      ],
      notes: [],
      deadlines: [],
      reviews: [],
      dashboardScratchpads: [],
      dashboardPreferences: [],
      serverSyncedAt: ""
    };

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["users", "workspaces", "outboxes"], "readwrite");
      tx.objectStore("users").put({ id: secondUserId, email: secondEmail, verifiedAt: timestamp });
      tx.objectStore("workspaces").put(workspace, secondUserId);
      tx.objectStore("outboxes").put([], secondUserId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("Synthetic user transaction aborted"));
    });
    db.close();
  }, { databaseName: DB_NAME, userId, email, marker });
}

test("v1 global cache migrates once into the authenticated user's v2 stores", async ({ page }) => {
  await page.goto("/login");
  await deleteLocalDb(page);
  await seedLegacyV1(page);

  // Preserve the migrated cache long enough to inspect it. The login request remains
  // online, but the workspace's subsequent server bootstrap is deliberately unavailable.
  await page.route("**/api/bootstrap", (route) => route.abort());
  await page.getByLabel("Email").fill("demo@contextos.local");
  await page.getByLabel("Password").fill("contextos-demo-v011");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  const snapshot = await localDbSnapshot(page);
  expect(snapshot.version).toBe(2);
  expect(snapshot.stores).toEqual(expect.arrayContaining(["kv", "users", "workspaces", "outboxes"]));
  expect(snapshot.users).toHaveLength(1);
  expect(snapshot.users[0].email).toBe("demo@contextos.local");

  const userId = snapshot.users[0].id;
  expect(snapshot.workspaceByUser[userId]?.domains?.[0]?.name).toBe("Legacy Offline Marker");
  expect(snapshot.outboxByUser[userId]).toEqual([]);
  expect(snapshot.legacyWorkspace).toBeUndefined();
  expect(snapshot.legacyOutbox).toBeUndefined();
});

test("local workspace and outbox state are keyed by verified user identity", async ({ page, context }) => {
  await uiLogin(page);
  await page.goto("/inbox");
  await expect(page.getByRole("heading", { name: "Inbox", exact: true })).toBeVisible();

  const firstUserSnapshot = await localDbSnapshot(page);
  const demoUser = firstUserSnapshot.users.find((user) => user.email === "demo@contextos.local");
  expect(demoUser).toBeTruthy();

  // Keep this Stage 2 assertion on an already-loaded surface. Offline navigation and
  // identity switching are later-stage concerns and are intentionally not exercised here.
  await context.setOffline(true);
  const demoOnly = `demo-only-${Date.now()}`;
  await page.getByPlaceholder(/Quick capture/i).fill(demoOnly);
  await page.getByPlaceholder(/Quick capture/i).press("Enter");
  await expect(page.getByText(demoOnly)).toBeVisible();

  await expect
    .poll(async () => {
      const snapshot = await localDbSnapshot(page);
      const captureStored = Boolean(
        snapshot.workspaceByUser[demoUser!.id]?.captures?.some((capture: { text: string }) => capture.text === demoOnly)
      );
      return { captureStored, pendingCount: snapshot.outboxByUser[demoUser!.id]?.length ?? 0 };
    })
    .toMatchObject({ captureStored: true, pendingCount: 1 });

  const secondUserId = `local-user-${Date.now()}`;
  const secondEmail = `${secondUserId}@example.com`;
  const secondOnly = `second-only-${Date.now()}`;
  await seedSecondLocalUser(page, secondUserId, secondEmail, secondOnly);

  const isolatedSnapshot = await localDbSnapshot(page);
  expect(isolatedSnapshot.workspaceByUser[demoUser!.id]?.captures?.some((capture: { text: string }) => capture.text === demoOnly)).toBe(true);
  expect(isolatedSnapshot.workspaceByUser[demoUser!.id]?.captures?.some((capture: { text: string }) => capture.text === secondOnly)).toBe(false);
  expect(isolatedSnapshot.workspaceByUser[secondUserId]?.captures?.some((capture: { text: string }) => capture.text === secondOnly)).toBe(true);
  expect(isolatedSnapshot.workspaceByUser[secondUserId]?.captures?.some((capture: { text: string }) => capture.text === demoOnly)).toBe(false);
  expect(isolatedSnapshot.outboxByUser[demoUser!.id]?.length).toBeGreaterThan(0);
  expect(isolatedSnapshot.outboxByUser[secondUserId]).toEqual([]);
});
