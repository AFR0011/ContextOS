import { expect, test, type Page } from "@playwright/test";
import { localDateKey } from "../../src/lib/dates";

async function loginAndOpenHome(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@contextos.local");
  await page.getByLabel("Password").fill("contextos-demo-v011");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
  await expect.poll(async () => Boolean((await currentLocalState(page)).workspace)).toBe(true);
}

async function currentLocalState(page: Page) {
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
      throw new Error("No locally verified user was found.");
    }

    const result = await new Promise<{ workspace: any; outbox: any[] }>((resolve, reject) => {
      const tx = db.transaction(["workspaces", "outboxes"], "readonly");
      const workspaceRequest = tx.objectStore("workspaces").get(user.id);
      const outboxRequest = tx.objectStore("outboxes").get(user.id);
      let workspace: any;
      let outbox: any[] = [];
      workspaceRequest.onsuccess = () => { workspace = workspaceRequest.result; };
      workspaceRequest.onerror = () => reject(workspaceRequest.error);
      outboxRequest.onsuccess = () => { outbox = (outboxRequest.result as any[] | undefined) ?? []; };
      outboxRequest.onerror = () => reject(outboxRequest.error);
      tx.oncomplete = () => resolve({ workspace, outbox });
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("Local state read aborted."));
    });

    db.close();
    return { userId: user.id, ...result };
  });
}

test("failed outbox write aborts the Daily Note workspace write from the same local commit", async ({ page, context }) => {
  await loginAndOpenHome(page);
  await context.setOffline(true);

  const today = localDateKey();
  const marker = `atomic-abort-${Date.now()}`;
  const before = await currentLocalState(page);
  expect(before.workspace?.dailyNotes?.some((note: { content: string }) => note.content === marker)).toBe(false);
  expect(before.outbox.some((mutation) => mutation.payload?.content === marker)).toBe(false);

  await page.evaluate((expectedMarker) => {
    const originalPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value: unknown, key?: IDBValidKey) {
      if (
        this.name === "outboxes" &&
        Array.isArray(value) &&
        value.some((mutation) => mutation?.payload?.content === expectedMarker)
      ) {
        throw new DOMException("Injected local outbox write failure", "AbortError");
      }
      return key === undefined ? originalPut.call(this, value) : originalPut.call(this, value, key);
    };
  }, marker);

  await page.getByLabel("Daily Notes").fill(marker);
  await expect(page.getByLabel("Daily Notes")).toHaveValue(marker);

  // UI state may be optimistic, but the failed IndexedDB transaction must persist neither half.
  await page.waitForTimeout(500);
  const after = await currentLocalState(page);
  expect(after.workspace?.dailyNotes?.some((note: { localDate: string; content: string }) => note.localDate === today && note.content === marker)).toBe(false);
  expect(after.outbox.some((mutation) => mutation.payload?.content === marker)).toBe(false);
});

test("offline Daily Note commit persists workspace state and its outbox mutation atomically", async ({ page, context }) => {
  await loginAndOpenHome(page);
  await context.setOffline(true);

  const today = localDateKey();
  const marker = `atomic-daily-note-${Date.now()}`;
  const before = await currentLocalState(page);

  await page.getByLabel("Daily Notes").fill(marker);

  await expect.poll(async () => {
    const state = await currentLocalState(page);
    const note = state.workspace?.dailyNotes?.find((item: { localDate: string }) => item.localDate === today);
    const mutation = state.outbox.find(
      (item) => item.entityType === "dailyNotes" && item.payload?.localDate === today && item.payload?.content === marker
    );
    return {
      content: note?.content ?? null,
      hasMutation: Boolean(mutation),
      outboxGrowth: state.outbox.length - before.outbox.length
    };
  }).toEqual({ content: marker, hasMutation: true, outboxGrowth: 1 });
});

test("a failed optimistic mutation cannot hitchhike into a later successful local commit", async ({ page, context }) => {
  await loginAndOpenHome(page);
  await context.setOffline(true);

  const today = localDateKey();
  const failedMarker = `atomic-failed-${Date.now()}`;
  const areaName = `Atomic survivor ${Date.now()}`;

  await page.evaluate((expectedMarker) => {
    const originalPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value: unknown, key?: IDBValidKey) {
      if (
        this.name === "outboxes" &&
        Array.isArray(value) &&
        value.some((mutation) => mutation?.payload?.content === expectedMarker)
      ) {
        throw new DOMException("Injected local outbox write failure", "AbortError");
      }
      return key === undefined ? originalPut.call(this, value) : originalPut.call(this, value, key);
    };
  }, failedMarker);

  await page.getByLabel("Daily Notes").fill(failedMarker);

  await expect.poll(async () => {
    const state = await currentLocalState(page);
    return {
      durableNote: state.workspace?.dailyNotes?.find((item: { localDate: string }) => item.localDate === today)?.content ?? null,
      failedMutationQueued: state.outbox.some((mutation) => mutation.payload?.content === failedMarker)
    };
  }).toEqual({ durableNote: null, failedMutationQueued: false });

  await page.getByRole("button", { name: "Areas", exact: true }).click();
  await page.getByRole("button", { name: "New Area", exact: true }).click();
  await page.getByPlaceholder("Area name").fill(areaName);
  await page.getByRole("button", { name: "Create Area", exact: true }).click();

  await expect.poll(async () => {
    const state = await currentLocalState(page);
    return {
      areaPersisted: state.workspace?.areas?.some((area: { name: string }) => area.name === areaName) ?? false,
      failedNotePersisted: state.workspace?.dailyNotes?.some((note: { content: string }) => note.content === failedMarker) ?? false,
      areaMutationQueued: state.outbox.some((mutation) => mutation.entityType === "areas" && mutation.payload?.name === areaName),
      failedMutationQueued: state.outbox.some((mutation) => mutation.payload?.content === failedMarker)
    };
  }).toEqual({
    areaPersisted: true,
    failedNotePersisted: false,
    areaMutationQueued: true,
    failedMutationQueued: false
  });
});

