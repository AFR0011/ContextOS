import { expect, test, type Page } from "@playwright/test";

async function loginAndOpenInbox(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@contextos.local");
  await page.getByLabel("Password").fill("contextos-demo-v011");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/inbox");
  await expect(page.getByRole("heading", { name: "Inbox", exact: true })).toBeVisible();
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
      workspaceRequest.onsuccess = () => {
        workspace = workspaceRequest.result;
      };
      workspaceRequest.onerror = () => reject(workspaceRequest.error);
      outboxRequest.onsuccess = () => {
        outbox = (outboxRequest.result as any[] | undefined) ?? [];
      };
      outboxRequest.onerror = () => reject(outboxRequest.error);
      tx.oncomplete = () => resolve({ workspace, outbox });
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("Local state read aborted."));
    });

    db.close();
    return { userId: user.id, ...result };
  });
}

test("failed outbox write aborts the workspace write from the same local commit", async ({ page, context }) => {
  await loginAndOpenInbox(page);
  await context.setOffline(true);

  const marker = `atomic-abort-${Date.now()}`;
  const before = await currentLocalState(page);
  expect(before.workspace?.captures?.some((capture: { text: string }) => capture.text === marker)).toBe(false);
  expect(before.outbox.some((mutation) => mutation.payload?.text === marker)).toBe(false);

  await page.evaluate((expectedMarker) => {
    const originalPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value: unknown, key?: IDBValidKey) {
      if (
        this.name === "outboxes" &&
        Array.isArray(value) &&
        value.some((mutation) => mutation?.payload?.text === expectedMarker)
      ) {
        throw new DOMException("Injected Stage 3 outbox write failure", "AbortError");
      }
      return key === undefined ? originalPut.call(this, value) : originalPut.call(this, value, key);
    };
  }, marker);

  await page.getByPlaceholder(/Quick capture/i).fill(marker);
  await page.getByPlaceholder(/Quick capture/i).press("Enter");
  await expect(page.getByText(marker)).toBeVisible();

  // The UI is optimistic, but the failed transaction must leave neither half durable.
  await page.waitForTimeout(500);
  const after = await currentLocalState(page);
  expect(after.workspace?.captures?.some((capture: { text: string }) => capture.text === marker)).toBe(false);
  expect(after.outbox.some((mutation) => mutation.payload?.text === marker)).toBe(false);
});

test("offline inbox conversion persists the created record and capture status as one mutation batch", async ({ page, context }) => {
  await loginAndOpenInbox(page);
  await context.setOffline(true);

  const marker = `atomic-triage-${Date.now()}`;
  await page.getByPlaceholder(/Quick capture/i).fill(marker);
  await page.getByPlaceholder(/Quick capture/i).press("Enter");
  const captureCard = page.getByTestId("capture-card").filter({ hasText: marker });
  await expect(captureCard).toBeVisible();

  await expect
    .poll(async () => {
      const state = await currentLocalState(page);
      return state.outbox.filter((mutation) => mutation.payload?.text === marker).length;
    })
    .toBe(1);

  const beforeConversion = await currentLocalState(page);
  await captureCard.getByRole("button", { name: "Convert to task" }).click();
  await expect(captureCard).toHaveCount(0);

  await expect
    .poll(async () => {
      const state = await currentLocalState(page);
      const capture = state.workspace?.captures?.find((item: { text: string }) => item.text === marker);
      const task = capture?.convertedToId
        ? state.workspace?.tasks?.find((item: { id: string }) => item.id === capture.convertedToId)
        : null;
      return {
        status: capture?.status ?? null,
        hasTask: Boolean(task),
        outboxGrowth: state.outbox.length - beforeConversion.outbox.length
      };
    })
    .toEqual({ status: "converted", hasTask: true, outboxGrowth: 2 });

  const afterConversion = await currentLocalState(page);
  const capture = afterConversion.workspace.captures.find((item: { text: string }) => item.text === marker);
  const taskMutation = afterConversion.outbox.find(
    (mutation) => mutation.entityType === "tasks" && mutation.entityId === capture.convertedToId
  );
  const captureMutation = afterConversion.outbox.find(
    (mutation) =>
      mutation.entityType === "captures" &&
      mutation.entityId === capture.id &&
      mutation.payload?.status === "converted"
  );

  expect(taskMutation).toBeTruthy();
  expect(captureMutation).toBeTruthy();
  expect(taskMutation.createdAt).toBe(captureMutation.createdAt);
});
