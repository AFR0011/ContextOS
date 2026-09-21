import { expect, test, type Page } from "@playwright/test";
import { localDateKey } from "../../src/lib/dates";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@contextos.local");
  await page.getByLabel("Password").fill("contextos-demo-v011");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
}

async function waitForOfflineReady(page: Page) {
  const readiness = page.getByTestId("offline-shell-readiness");
  await expect(readiness).toHaveAttribute("data-ready", "true", { timeout: 30_000 });
}

async function serverWorkspace(page: Page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/bootstrap", { cache: "no-store" });
    if (!response.ok) throw new Error(`bootstrap failed: ${response.status}`);
    return (await response.json()).data;
  });
}

async function syncMutation(page: Page, mutation: Record<string, unknown>) {
  return page.evaluate(async (mutation) => {
    const response = await fetch("/api/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mutations: [mutation] })
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`sync failed ${response.status}: ${JSON.stringify(body)}`);
    return body;
  }, mutation);
}

async function createLegacyDeadline(page: Page, title: string) {
  const workspace = await serverWorkspace(page);
  const project = workspace.projects[0];
  expect(project?.id).toBeTruthy();
  const id = `stage9-production-deadline-${Date.now()}`;
  const timestamp = new Date().toISOString();
  const result = await syncMutation(page, {
    mutationId: `create-${id}`,
    entityType: "deadlines",
    entityId: id,
    operation: "upsert",
    payload: {
      id,
      title,
      date: localDateKey(),
      time: null,
      location: "",
      projectId: project.id,
      taskIds: [],
      notes: "Production legacy tombstone fixture.",
      createdAt: timestamp,
      updatedAt: timestamp,
      archivedAt: null,
      trashedAt: null
    },
    createdAt: timestamp
  });
  return result.data.deadlines.find((item: { id: string }) => item.id === id);
}

async function localDeadlineSnapshot(page: Page, title: string) {
  return page.evaluate(async ({ databaseName, title }) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName, 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const workspaces = await new Promise<any[]>((resolve, reject) => {
      const tx = db.transaction("workspaces", "readonly");
      const request = tx.objectStore("workspaces").getAll();
      request.onsuccess = () => resolve(request.result as any[]);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return workspaces.flatMap((workspace) => workspace.deadlines ?? []).find((deadline: { title?: string }) => deadline.title === title) ?? null;
  }, { databaseName: "contextos-offline-v1", title });
}

async function queueLegacyDeadlineTombstone(page: Page, title: string) {
  return page.evaluate(async ({ databaseName, title }) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName, 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const users = await new Promise<Array<{ id: string }>>((resolve, reject) => {
      const tx = db.transaction("users", "readonly");
      const request = tx.objectStore("users").getAll();
      request.onsuccess = () => resolve(request.result as Array<{ id: string }>);
      request.onerror = () => reject(request.error);
    });
    const user = users[0];
    if (!user) throw new Error("No local user");

    const state = await new Promise<{ workspace: any; outbox: any[] }>((resolve, reject) => {
      const tx = db.transaction(["workspaces", "outboxes"], "readonly");
      const wr = tx.objectStore("workspaces").get(user.id);
      const or = tx.objectStore("outboxes").get(user.id);
      let workspace: any;
      let outbox: any[] = [];
      wr.onsuccess = () => { workspace = wr.result; };
      wr.onerror = () => reject(wr.error);
      or.onsuccess = () => { outbox = or.result ?? []; };
      or.onerror = () => reject(or.error);
      tx.oncomplete = () => resolve({ workspace, outbox });
      tx.onerror = () => reject(tx.error);
    });

    const deadline = state.workspace?.deadlines?.find((item: { title?: string }) => item.title === title);
    if (!deadline) throw new Error("Legacy deadline missing locally");
    const updatedAt = new Date(Date.now() + 120_000).toISOString();
    const next = { ...deadline, updatedAt, trashedAt: updatedAt };
    state.workspace.deadlines = state.workspace.deadlines.map((item: { id: string }) => item.id === deadline.id ? next : item);
    state.outbox.push({
      mutationId: `offline-${deadline.id}-${Date.now()}`,
      entityType: "deadlines",
      entityId: deadline.id,
      operation: "upsert",
      payload: next,
      createdAt: updatedAt
    });

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["workspaces", "outboxes"], "readwrite");
      tx.objectStore("workspaces").put(state.workspace, user.id);
      tx.objectStore("outboxes").put(state.outbox, user.id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    return next;
  }, { databaseName: "contextos-offline-v1", title });
}

async function serverDeadlineByTitle(page: Page, title: string) {
  const data = await serverWorkspace(page);
  return data.deadlines.find((deadline: { title?: string }) => deadline.title === title) ?? null;
}

test("offline legacy Deadline tombstone survives production hard reload, reconnect sync, and restore", async ({ page, context }) => {
  await login(page);
  await waitForOfflineReady(page);

  const title = `Stage 9 production legacy tombstone ${Date.now()}`;
  const record = await createLegacyDeadline(page, title);
  expect(record).toBeTruthy();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();

  await context.setOffline(true);
  const tombstone = await queueLegacyDeadlineTombstone(page, title);
  expect(tombstone.trashedAt).toBeTruthy();
  await expect.poll(async () => Boolean((await localDeadlineSnapshot(page, title))?.trashedAt), { timeout: 5_000 }).toBe(true);

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
  await expect.poll(async () => Boolean((await localDeadlineSnapshot(page, title))?.trashedAt), { timeout: 5_000 }).toBe(true);

  await context.setOffline(false);
  await expect.poll(async () => Boolean((await serverDeadlineByTitle(page, title))?.trashedAt), { timeout: 20_000 }).toBe(true);

  const restoredAt = new Date(Date.now() + 300_000).toISOString();
  await syncMutation(page, {
    mutationId: `restore-${record.id}-${Date.now()}`,
    entityType: "deadlines",
    entityId: record.id,
    operation: "upsert",
    payload: { ...record, updatedAt: restoredAt, trashedAt: null },
    createdAt: restoredAt
  });
  await expect.poll(async () => (await serverDeadlineByTitle(page, title))?.trashedAt ?? null, { timeout: 20_000 }).toBeNull();
});
