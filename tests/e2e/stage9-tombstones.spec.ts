import { expect, test, type Page } from "@playwright/test";
import { localDateKey } from "../../src/lib/dates";

interface WorkspaceRecord {
  id: string;
  updatedAt: string;
  trashedAt?: string | null;
  [key: string]: unknown;
}

interface WorkspaceData {
  projects: WorkspaceRecord[];
  tasks: WorkspaceRecord[];
  notes: WorkspaceRecord[];
  deadlines: WorkspaceRecord[];
  dailyNotes: WorkspaceRecord[];
  [key: string]: unknown;
}

type TombstoneEntity = "projects" | "tasks" | "notes" | "deadlines";

async function registerDisposableUser(page: Page) {
  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const email = `stage9-tombstone-${nonce}@example.com`;
  const password = "stage9-tombstone-password";
  const response = await page.request.post("/api/auth/register", {
    data: { email, password },
    headers: { "x-forwarded-for": `stage9-tombstone-${nonce}` }
  });
  const body = await response.json().catch(() => null);
  expect(response.status(), JSON.stringify(body)).toBe(200);
  const fixtureResponse = await page.request.post("/api/reset-demo");
  expect(fixtureResponse.status()).toBe(200);
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
  return { email, password };
}

async function bootstrap(page: Page): Promise<WorkspaceData> {
  return page.evaluate(async () => {
    const response = await fetch("/api/bootstrap", { cache: "no-store" });
    if (!response.ok) throw new Error(`bootstrap failed: ${response.status}`);
    const result = await response.json();
    return result.data;
  });
}

async function syncMutation(page: Page, mutation: Record<string, unknown>) {
  return page.evaluate(async (mutation) => {
    const response = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mutations: [mutation] })
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`sync failed ${response.status}: ${JSON.stringify(result)}`);
    return result;
  }, mutation);
}

function mutationFor(entityType: TombstoneEntity, record: WorkspaceRecord, updatedAt: string, trashedAt: string | null, suffix: string) {
  return {
    mutationId: `stage9-${entityType}-${record.id}-${suffix}-${Math.random().toString(36).slice(2)}`,
    entityType,
    entityId: record.id,
    operation: "upsert",
    payload: { ...record, updatedAt, trashedAt },
    createdAt: updatedAt
  };
}

async function createLegacyDeadline(page: Page, title: string) {
  const initial = await bootstrap(page);
  const project = initial.projects[0];
  expect(project).toBeTruthy();
  const timestamp = new Date().toISOString();
  const id = `stage9-legacy-deadline-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const result = await syncMutation(page, {
    mutationId: `stage9-create-${id}`,
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
      notes: "Legacy tombstone assurance fixture.",
      createdAt: timestamp,
      updatedAt: timestamp,
      archivedAt: null,
      trashedAt: null
    },
    createdAt: timestamp
  });
  return result.data.deadlines.find((item: WorkspaceRecord) => item.id === id) as WorkspaceRecord;
}

async function localDeadlineSnapshot(page: Page, title: string) {
  return page.evaluate(async ({ databaseName, title }) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName, 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const workspaces = await new Promise<Array<{ deadlines?: Array<{ title?: string; trashedAt?: string | null; updatedAt?: string }> }>>((resolve, reject) => {
      const tx = db.transaction("workspaces", "readonly");
      const request = tx.objectStore("workspaces").getAll();
      request.onsuccess = () => resolve(request.result as Array<{ deadlines?: Array<{ title?: string; trashedAt?: string | null; updatedAt?: string }> }>);
      request.onerror = () => reject(request.error);
    });
    db.close();
    for (const workspace of workspaces) {
      const deadline = workspace.deadlines?.find((candidate) => candidate.title === title);
      if (deadline) return deadline;
    }
    return null;
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

    const deadline = state.workspace?.deadlines?.find((item: { title?: string }) => item.title === title);
    if (!deadline) throw new Error("Legacy deadline fixture missing locally");
    const updatedAt = new Date(Date.now() + 120_000).toISOString();
    const next = { ...deadline, updatedAt, trashedAt: updatedAt };
    state.workspace.deadlines = state.workspace.deadlines.map((item: { id: string }) => item.id === deadline.id ? next : item);
    state.outbox.push({
      mutationId: `stage9-offline-${deadline.id}-${Date.now()}`,
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

async function localDailyNote(page: Page, localDate: string) {
  return page.evaluate(async ({ databaseName, localDate }) => {
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
    return workspaces.flatMap((workspace) => workspace.dailyNotes ?? []).find((note: { localDate?: string }) => note.localDate === localDate) ?? null;
  }, { databaseName: "contextos-offline-v1", localDate });
}

async function serverDeadlineByTitle(page: Page, title: string) {
  const data = await bootstrap(page);
  return data.deadlines.find((deadline) => deadline.title === title) ?? null;
}

test("newer tombstones reject stale resurrection and remain explicitly restorable across legacy tombstone record types", async ({ page }) => {
  await registerDisposableUser(page);
  const legacyDeadline = await createLegacyDeadline(page, `Stage 9 legacy representative ${Date.now()}`);
  const initial = await bootstrap(page);
  const representatives: Array<[TombstoneEntity, WorkspaceRecord]> = [
    ["projects", initial.projects[0]],
    ["tasks", initial.tasks[0]],
    ["notes", initial.notes[0]],
    ["deadlines", legacyDeadline]
  ];

  for (let index = 0; index < representatives.length; index += 1) {
    const [entityType, record] = representatives[index];
    expect(record, `${entityType} fixture record`).toBeTruthy();

    const deletedAt = new Date(Date.now() + 60_000 + index * 10_000).toISOString();
    const deleteResult = await syncMutation(page, mutationFor(entityType, record, deletedAt, deletedAt, "trash"));
    const deletedRecord = (deleteResult.data[entityType] as WorkspaceRecord[]).find((item) => item.id === record.id);
    expect(deletedRecord?.trashedAt).toBe(deletedAt);

    const staleAt = new Date(Date.now() - 60_000 - index * 10_000).toISOString();
    const staleResult = await syncMutation(page, mutationFor(entityType, { ...record, title: "stale resurrection attempt" }, staleAt, null, "stale"));
    expect(staleResult.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ entityType, entityId: record.id, reason: "stale" })
    ]));
    const afterStale = (staleResult.data[entityType] as WorkspaceRecord[]).find((item) => item.id === record.id);
    expect(afterStale?.trashedAt).toBe(deletedAt);

    const restoredAt = new Date(Date.now() + 180_000 + index * 10_000).toISOString();
    const restoreResult = await syncMutation(page, mutationFor(entityType, record, restoredAt, null, "restore"));
    const restoredRecord = (restoreResult.data[entityType] as WorkspaceRecord[]).find((item) => item.id === record.id);
    expect(restoredRecord?.trashedAt).toBeNull();
  }
});

test("a stale startup bootstrap cannot overwrite a newer cached local mutation", async ({ page }) => {
  await registerDisposableUser(page);

  let releaseBootstrap!: () => void;
  let markBootstrapCaptured!: () => void;
  let releaseSync!: () => void;
  const bootstrapRelease = new Promise<void>((resolve) => { releaseBootstrap = resolve; });
  const bootstrapCaptured = new Promise<void>((resolve) => { markBootstrapCaptured = resolve; });
  const syncRelease = new Promise<void>((resolve) => { releaseSync = resolve; });
  let bootstrapIntercepted = false;

  await page.route("**/api/bootstrap", async (route) => {
    if (bootstrapIntercepted || route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    bootstrapIntercepted = true;
    const staleResponse = await route.fetch();
    const staleBody = await staleResponse.body();
    markBootstrapCaptured();
    await bootstrapRelease;
    await route.fulfill({ response: staleResponse, body: staleBody });
  });

  await page.route("**/api/sync", async (route) => {
    if (route.request().method() === "POST") await syncRelease;
    await route.continue();
  });

  await page.reload({ waitUntil: "domcontentloaded" });
  await bootstrapCaptured;
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();

  const today = localDateKey();
  const text = `Stage 9 startup race ${Date.now()}`;
  await page.getByLabel("Daily Notes").fill(text);
  await expect.poll(async () => (await localDailyNote(page, today))?.content ?? "", { timeout: 5_000 }).toBe(text);

  const staleBootstrapDelivered = page.waitForResponse((response) => response.url().includes("/api/bootstrap") && response.request().method() === "GET");
  releaseBootstrap();
  await staleBootstrapDelivered;
  await expect.poll(async () => (await localDailyNote(page, today))?.content ?? "", { timeout: 2_000 }).toBe(text);
  await expect(page.getByLabel("Daily Notes")).toHaveValue(text);

  releaseSync();
  await expect.poll(async () => {
    const data = await bootstrap(page);
    return data.dailyNotes.find((note) => note.localDate === today)?.content ?? "";
  }, { timeout: 15_000 }).toBe(text);
});

test("an offline legacy Deadline tombstone persists locally, synchronizes after reconnect, and restores across the server boundary", async ({ page, context }) => {
  await registerDisposableUser(page);
  const title = `Stage 9 offline legacy tombstone ${Date.now()}`;
  const record = await createLegacyDeadline(page, title);
  expect(record).toBeTruthy();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();

  await context.setOffline(true);
  const tombstone = await queueLegacyDeadlineTombstone(page, title);
  expect(tombstone.trashedAt).toBeTruthy();
  await expect.poll(async () => Boolean((await localDeadlineSnapshot(page, title))?.trashedAt), { timeout: 5_000 }).toBe(true);

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect.poll(async () => Boolean((await localDeadlineSnapshot(page, title))?.trashedAt), { timeout: 5_000 }).toBe(true);

  await context.setOffline(false);
  await expect.poll(async () => Boolean((await serverDeadlineByTitle(page, title))?.trashedAt), { timeout: 20_000 }).toBe(true);

  const restoredAt = new Date(Date.now() + 300_000).toISOString();
  await syncMutation(page, mutationFor("deadlines", { ...record, updatedAt: restoredAt }, restoredAt, null, "restore"));
  await expect.poll(async () => (await serverDeadlineByTitle(page, title))?.trashedAt ?? null, { timeout: 20_000 }).toBeNull();
});
