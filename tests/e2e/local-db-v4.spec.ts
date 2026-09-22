import { expect, test, type Page } from "@playwright/test";

const DB_NAME = "contextos-offline-v1";

async function apiLogin(page: Page, email = "demo@contextos.local", password = "contextos-demo-v011") {
  const response = await page.request.post("/api/auth/login", { data: { email, password } });
  expect(response.status()).toBe(200);
  const me = await page.request.get("/api/auth/me");
  expect(me.status()).toBe(200);
  const body = await me.json();
  const user = body.user ?? body;
  expect(user?.id).toBeTruthy();
  return user as { id: string; email: string };
}

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

async function seedV3State(page: Page, user: { id: string; email: string }) {
  await page.evaluate(async ({ databaseName, user }) => {
    const timestamp = new Date().toISOString();
    const workspace = {
      areas: [{
        id: "v3-area",
        name: "Revisionless v3 area",
        state: "active",
        createdAt: timestamp,
        updatedAt: timestamp
      }],
      projects: [],
      tasks: [],
      dates: [],
      dailyNotes: [],
      serverSyncedAt: timestamp
    };
    const outbox = [{
      mutationId: "v3-mutation",
      entityType: "areas",
      entityId: "v3-area",
      operation: "upsert",
      payload: { ...workspace.areas[0], name: "Unsafely queued without revision" },
      createdAt: timestamp,
      baseServerSyncedAt: timestamp
    }];

    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(databaseName, 3);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("users")) db.createObjectStore("users", { keyPath: "id" });
        if (!db.objectStoreNames.contains("workspaces")) db.createObjectStore("workspaces");
        if (!db.objectStoreNames.contains("outboxes")) db.createObjectStore("outboxes");
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(["users", "workspaces", "outboxes"], "readwrite");
        tx.objectStore("users").put({ id: user.id, email: user.email, verifiedAt: timestamp });
        tx.objectStore("workspaces").put(workspace, user.id);
        tx.objectStore("outboxes").put(outbox, user.id);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
        tx.onabort = () => {
          db.close();
          reject(tx.error ?? new Error("v3 seed transaction aborted"));
        };
      };
    });
  }, { databaseName: DB_NAME, user });
}

async function localDbSnapshot(page: Page) {
  return page.evaluate(async (databaseName) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName, 4);
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
    const stores = Array.from(db.objectStoreNames);
    const version = db.version;
    db.close();

    return { version, stores, users, workspaceByUser, outboxByUser };
  }, DB_NAME);
}

async function seedSecondLocalUser(page: Page, userId: string, email: string, marker: string) {
  await page.evaluate(async ({ databaseName, userId: secondUserId, email: secondEmail, marker: secondMarker }) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName, 4);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const timestamp = new Date().toISOString();
    const workspace = {
      areas: [],
      projects: [],
      tasks: [],
      dates: [],
      dailyNotes: [{
        id: `daily-note-${secondUserId}`,
        localDate: "2026-01-01",
        content: secondMarker,
        createdAt: timestamp,
        updatedAt: timestamp,
        revision: 1
      }],
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

test("v4 clean break preserves verified identity but discards revisionless v3 workspace and outbox", async ({ page }) => {
  await page.goto("/login");
  await deleteLocalDb(page);
  const user = await apiLogin(page);
  await seedV3State(page, user);

  await page.route("**/api/bootstrap", (route) => route.abort());
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard$/);

  const snapshot = await localDbSnapshot(page);
  expect(snapshot.version).toBe(4);
  expect(snapshot.stores.sort()).toEqual(["outboxes", "users", "workspaces"]);
  expect(snapshot.users.some((item) => item.id === user.id && item.email === user.email)).toBe(true);
  expect(snapshot.workspaceByUser[user.id]).toBeUndefined();
  expect(snapshot.outboxByUser[user.id]).toEqual([]);
});

test("revision-aware local workspace and outbox state remain isolated by verified user identity", async ({ page, context }) => {
  await uiLogin(page);
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();

  const firstUserSnapshot = await localDbSnapshot(page);
  const demoUser = firstUserSnapshot.users.find((user) => user.email === "demo@contextos.local");
  expect(demoUser).toBeTruthy();

  await context.setOffline(true);
  const demoOnly = `demo-only-${Date.now()}`;
  await page.getByLabel("Daily Notes").fill(demoOnly);

  await expect.poll(async () => {
    const snapshot = await localDbSnapshot(page);
    const note = snapshot.workspaceByUser[demoUser!.id]?.dailyNotes?.find((item: { content: string }) => item.content === demoOnly);
    const mutation = snapshot.outboxByUser[demoUser!.id]?.find((item) => item.payload?.content === demoOnly);
    return {
      noteStored: Boolean(note),
      noteRevision: note?.revision ?? null,
      baseRevisionPresent: mutation ? "baseRevision" in mutation : false,
      pendingCount: snapshot.outboxByUser[demoUser!.id]?.length ?? 0
    };
  }).toMatchObject({
    noteStored: true,
    baseRevisionPresent: true,
    pendingCount: 1
  });

  const secondUserId = `local-user-${Date.now()}`;
  const secondEmail = `${secondUserId}@example.com`;
  const secondOnly = `second-only-${Date.now()}`;
  await seedSecondLocalUser(page, secondUserId, secondEmail, secondOnly);

  const isolatedSnapshot = await localDbSnapshot(page);
  expect(isolatedSnapshot.workspaceByUser[demoUser!.id]?.dailyNotes?.some((note: { content: string }) => note.content === demoOnly)).toBe(true);
  expect(isolatedSnapshot.workspaceByUser[demoUser!.id]?.dailyNotes?.some((note: { content: string }) => note.content === secondOnly)).toBe(false);
  expect(isolatedSnapshot.workspaceByUser[secondUserId]?.dailyNotes?.some((note: { content: string }) => note.content === secondOnly)).toBe(true);
  expect(isolatedSnapshot.workspaceByUser[secondUserId]?.dailyNotes?.some((note: { content: string }) => note.content === demoOnly)).toBe(false);
  expect(isolatedSnapshot.outboxByUser[demoUser!.id]?.length).toBeGreaterThan(0);
  expect(isolatedSnapshot.outboxByUser[secondUserId]).toEqual([]);
});

test("server bootstrap populates revisioned canonical records after the v4 clean break", async ({ page }) => {
  await page.goto("/login");
  await deleteLocalDb(page);
  await uiLogin(page);

  await expect.poll(async () => {
    const snapshot = await localDbSnapshot(page);
    const user = snapshot.users.find((item) => item.email === "demo@contextos.local");
    if (!user) return false;
    const workspace = snapshot.workspaceByUser[user.id];
    const records = [
      ...(workspace?.areas ?? []),
      ...(workspace?.projects ?? []),
      ...(workspace?.tasks ?? []),
      ...(workspace?.dates ?? [])
    ];
    return records.length > 0 && records.every((record: { revision?: number }) => Number.isInteger(record.revision) && record.revision! > 0);
  }).toBe(true);
});
