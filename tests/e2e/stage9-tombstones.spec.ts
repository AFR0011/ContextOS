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
  const email = `stage9-tombstone-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const password = "stage9-tombstone-password";
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

test("an offline date tombstone survives reload, synchronizes after reconnect, and restores across the server boundary", async ({ page, context }) => {
  await registerDisposableUser(page);
  const shell = page.getByTestId("offline-shell-readiness");
  await expect(shell).toHaveAttribute("data-ready", "true", { timeout: 30_000 });

  const title = `Stage 9 offline tombstone ${Date.now()}`;
  await page.getByRole("button", { name: "Dates", exact: true }).click();
  await page.getByRole("button", { name: "Add Date", exact: true }).click();
  await page.getByPlaceholder("Date title...").fill(title);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText(title, { exact: true })).toBeVisible();

  await expect.poll(async () => Boolean(await serverDeadlineByTitle(page, title)), { timeout: 15_000 }).toBe(true);

  await context.setOffline(true);
  await page.getByRole("button", { name: `Delete ${title}` }).click();
  await expect(page.getByText(title, { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Archive", exact: true }).click();
  await page.getByRole("button", { name: /Trash \(/ }).click();
  await expect(page.getByText(title, { exact: true })).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByText(title, { exact: true })).toBeVisible();
  await expect(page.getByTestId("global-sync-indicator").first()).toContainText(/Offline|pending/);

  await context.setOffline(false);
  await expect.poll(async () => Boolean((await serverDeadlineByTitle(page, title))?.trashedAt), { timeout: 20_000 }).toBe(true);

  const trashedCard = page.getByText(title, { exact: true }).locator("..", { hasText: title });
  const restoreButton = page.getByRole("button", { name: "Restore", exact: true }).filter({ visible: true }).last();
  await expect(trashedCard).toBeVisible();
  await restoreButton.click();

  await expect.poll(async () => (await serverDeadlineByTitle(page, title))?.trashedAt ?? null, { timeout: 20_000 }).toBeNull();
});
