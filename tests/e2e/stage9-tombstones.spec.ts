import { expect, test, type Page } from "@playwright/test";

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
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
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

async function localDeadlineSnapshot(page: Page, title: string) {
  return page.evaluate(async ({ databaseName, title }) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName, 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const workspaces = await new Promise<Array<{ deadlines?: Array<{ title?: string; trashedAt?: string | null }> }>>((resolve, reject) => {
      const tx = db.transaction("workspaces", "readonly");
      const request = tx.objectStore("workspaces").getAll();
      request.onsuccess = () => resolve(request.result as Array<{ deadlines?: Array<{ title?: string; trashedAt?: string | null }> }>);
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

async function localDeadlineExists(page: Page, title: string) {
  return Boolean(await localDeadlineSnapshot(page, title));
}

async function editableInputValueCount(page: Page, title: string) {
  return page.locator("input").evaluateAll((inputs, expected) => (
    inputs.filter((input) => (input as HTMLInputElement).value === expected).length
  ), title);
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

async function serverDeadlineByTitle(page: Page, title: string) {
  const data = await bootstrap(page);
  return data.deadlines.find((deadline) => deadline.title === title) ?? null;
}

test("newer tombstones reject stale resurrection and remain explicitly restorable across user-facing record types", async ({ page }) => {
  await registerDisposableUser(page);
  const initial = await bootstrap(page);
  const representatives: Array<[TombstoneEntity, WorkspaceRecord]> = [
    ["projects", initial.projects[0]],
    ["tasks", initial.tasks[0]],
    ["notes", initial.notes[0]],
    ["deadlines", initial.deadlines[0]]
  ];

  for (let index = 0; index < representatives.length; index += 1) {
    const [entityType, record] = representatives[index];
    expect(record, `${entityType} starter record`).toBeTruthy();

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
    if (route.request().method() === "POST") {
      await syncRelease;
    }
    await route.continue();
  });

  await page.reload({ waitUntil: "domcontentloaded" });
  await bootstrapCaptured;
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();

  const title = `Stage 9 startup race ${Date.now()}`;
  await page.getByRole("button", { name: "Dates", exact: true }).click();
  await page.getByRole("button", { name: "Add Date", exact: true }).click();
  await page.getByPlaceholder("Date title...").fill(title);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect.poll(async () => editableInputValueCount(page, title)).toBe(1);
  await expect.poll(async () => localDeadlineExists(page, title), { timeout: 5_000 }).toBe(true);

  const staleBootstrapDelivered = page.waitForResponse((response) => response.url().includes("/api/bootstrap") && response.request().method() === "GET");
  releaseBootstrap();
  await staleBootstrapDelivered;
  await expect.poll(async () => localDeadlineExists(page, title), { timeout: 2_000 }).toBe(true);
  await expect.poll(async () => editableInputValueCount(page, title)).toBe(1);

  releaseSync();
  await expect.poll(async () => Boolean(await serverDeadlineByTitle(page, title)), { timeout: 15_000 }).toBe(true);
});

test("an offline date tombstone survives reload, synchronizes after reconnect, and restores across the server boundary", async ({ page, context }) => {
  await registerDisposableUser(page);
  const shell = page.getByTestId("offline-shell-readiness");
  await expect(shell).toHaveAttribute("data-ready", "true", { timeout: 30_000 });

  const title = `Stage 9 offline tombstone ${Date.now()}`;
  await page.getByRole("button", { name: "Dates", exact: true }).click();
  await page.getByRole("button", { name: "Add Date", exact: true }).click();
  await page.getByPlaceholder("Date title...").fill(title);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect.poll(async () => editableInputValueCount(page, title)).toBe(1);

  await expect.poll(async () => Boolean(await serverDeadlineByTitle(page, title)), { timeout: 15_000 }).toBe(true);

  await context.setOffline(true);
  await page.getByRole("button", { name: `Delete ${title}` }).click();
  await expect.poll(async () => editableInputValueCount(page, title)).toBe(0);
  await expect.poll(async () => Boolean((await localDeadlineSnapshot(page, title))?.trashedAt), { timeout: 5_000 }).toBe(true);

  await page.getByRole("button", { name: "Archive", exact: true }).click();
  await page.getByRole("button", { name: /Trash \(/ }).click();
  await expect(page.getByText(title, { exact: true })).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/archive$/);
  await expect(page.getByRole("heading", { name: "Archive", exact: true })).toBeVisible();
  await expect.poll(async () => Boolean((await localDeadlineSnapshot(page, title))?.trashedAt), { timeout: 5_000 }).toBe(true);
  await expect(page.getByText(title, { exact: true })).toBeVisible();
  await expect(page.getByTestId("global-sync-indicator").first()).toContainText(/Offline|pending/);

  await context.setOffline(false);
  await expect.poll(async () => Boolean((await serverDeadlineByTitle(page, title))?.trashedAt), { timeout: 20_000 }).toBe(true);

  await page.getByRole("button", { name: "Restore", exact: true }).click();
  await expect.poll(async () => (await serverDeadlineByTitle(page, title))?.trashedAt ?? null, { timeout: 20_000 }).toBeNull();
});
