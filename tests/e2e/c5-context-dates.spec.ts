import { expect, test, type Page } from "@playwright/test";
import { addDaysToDateKey, localDateKey } from "../../src/lib/dates";

async function resetDemo(page: Page) {
  const response = await page.request.post("/api/reset-demo", { timeout: 15_000 });
  expect(response.ok()).toBeTruthy();
}

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@contextos.local");
  await page.getByLabel("Password").fill("contextos-demo-v011");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await resetDemo(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
}

async function warmServiceWorker(page: Page) {
  const readiness = page.getByTestId("offline-shell-readiness");
  await expect(readiness).toHaveAttribute("data-ready", "true", { timeout: 30_000 });
  await page.reload();
  await expect(page.getByTestId("offline-shell-readiness")).toHaveAttribute("data-ready", "true");
}

async function createDate(
  page: Page,
  args: {
    title: string;
    kind: "event" | "deadline";
    date: string;
    contextLabel: string;
    startTime?: string;
    endTime?: string;
  }
) {
  await page.getByRole("button", { name: "Add Date", exact: true }).click();
  const composer = page.getByTestId("context-date-create");
  await composer.getByPlaceholder("Date title").fill(args.title);
  await composer.getByLabel("Kind").selectOption(args.kind);
  await composer.getByLabel("Context").selectOption({ label: args.contextLabel });
  await composer.locator('input[type="date"]').fill(args.date);
  if (args.startTime) await composer.getByLabel(args.kind === "event" ? "Start" : "Time").fill(args.startTime);
  if (args.endTime) await composer.getByLabel("End").fill(args.endTime);
  await composer.getByRole("button", { name: "Add Date", exact: true }).click();
}

test("Dates derives Today, Upcoming, and Past and filters by kind", async ({ page }) => {
  await login(page);
  await page.goto("/dates");

  const today = localDateKey();
  const tomorrow = addDaysToDateKey(today, 1)!;
  const yesterday = addDaysToDateKey(today, -1)!;

  const todayEvent = `Today event ${Date.now()}`;
  const futureDeadline = `Future deadline ${Date.now()}`;
  const pastEvent = `Past event ${Date.now()}`;

  await createDate(page, { title: todayEvent, kind: "event", date: today, contextLabel: "Research", startTime: "11:00", endTime: "12:00" });
  await createDate(page, { title: futureDeadline, kind: "deadline", date: tomorrow, contextLabel: "ContextOS Demo", startTime: "17:00" });
  await createDate(page, { title: pastEvent, kind: "event", date: yesterday, contextLabel: "Research", startTime: "09:00" });

  await expect(page.getByRole("heading", { name: "Today", exact: true }).locator("..")).toContainText(todayEvent);
  await expect(page.getByRole("heading", { name: "Upcoming", exact: true }).locator("..")).toContainText(futureDeadline);
  await expect(page.getByRole("heading", { name: "Past", exact: true }).locator("..")).toContainText(pastEvent);

  await page.getByRole("button", { name: "Deadlines", exact: true }).click();
  await expect(page.getByText(futureDeadline, { exact: true })).toBeVisible();
  await expect(page.getByText(todayEvent, { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Events", exact: true }).click();
  await expect(page.getByText(todayEvent, { exact: true })).toBeVisible();
  await expect(page.getByText(futureDeadline, { exact: true })).toHaveCount(0);
});

test("today Events project into Home Dayline and future Dates into Upcoming", async ({ page }) => {
  await login(page);
  await page.goto("/dates");

  const today = localDateKey();
  const tomorrow = addDaysToDateKey(today, 1)!;
  const eventTitle = `Home event ${Date.now()}`;
  const deadlineTitle = `Home deadline ${Date.now()}`;

  await createDate(page, { title: eventTitle, kind: "event", date: today, contextLabel: "Research", startTime: "13:30", endTime: "14:00" });
  await createDate(page, { title: deadlineTitle, kind: "deadline", date: tomorrow, contextLabel: "ContextOS Demo" });

  await page.goto("/dashboard");
  await expect(page.getByTestId("home-dayline")).toContainText(eventTitle);
  await expect(page.getByTestId("home-dayline")).toContainText("13:30");
  await expect(page.getByTestId("home-contexts")).toContainText("Research");
  await expect(page.getByTestId("home-upcoming")).toContainText(deadlineTitle);
});

test("server rejects global or multiply-parented ContextDates", async ({ page }) => {
  await login(page);

  const bootstrap = await page.request.get("/api/bootstrap");
  expect(bootstrap.ok()).toBeTruthy();
  const workspace = await bootstrap.json();
  const project = workspace.data.projects.find((item: { name: string }) => item.name === "ContextOS Demo");
  const area = workspace.data.domains.find((item: { name: string }) => item.name === "Research");
  expect(project?.id).toBeTruthy();
  expect(area?.id).toBeTruthy();

  const timestamp = new Date().toISOString();
  const base = {
    id: `date-invalid-${Date.now()}`,
    title: "Invalid Date",
    kind: "event",
    date: localDateKey(),
    startTime: null,
    endTime: null,
    details: "",
    createdAt: timestamp,
    updatedAt: timestamp
  };

  const global = await page.request.post("/api/sync", {
    data: {
      mutations: [{
        mutationId: `mut-global-${Date.now()}`,
        entityType: "contextDates",
        entityId: base.id,
        operation: "upsert",
        payload: { ...base, projectId: null, domainId: null },
        createdAt: timestamp
      }]
    }
  });
  expect(global.ok()).toBeFalsy();

  const both = await page.request.post("/api/sync", {
    data: {
      mutations: [{
        mutationId: `mut-both-${Date.now()}`,
        entityType: "contextDates",
        entityId: `${base.id}-both`,
        operation: "upsert",
        payload: { ...base, id: `${base.id}-both`, projectId: project.id, domainId: area.id },
        createdAt: timestamp
      }]
    }
  });
  expect(both.ok()).toBeFalsy();
});

test("offline ContextDate creation survives hard reload with queued local state", async ({ page, context }) => {
  await login(page);
  await warmServiceWorker(page);
  await page.goto("/dates");

  const title = `Offline event ${Date.now()}`;
  await context.setOffline(true);

  await createDate(page, {
    title,
    kind: "event",
    date: localDateKey(),
    contextLabel: "Research",
    startTime: "18:00",
    endTime: "18:30"
  });
  await expect(page.getByText(title, { exact: true })).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Dates", exact: true })).toBeVisible();
  await expect(page.getByText(title, { exact: true })).toBeVisible();

  const localState = await page.evaluate(async (expectedTitle) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("contextos-offline-v1");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const users = await new Promise<Array<{ id: string; email: string }>>((resolve, reject) => {
      const tx = db.transaction("users", "readonly");
      const request = tx.objectStore("users").getAll();
      request.onsuccess = () => resolve(request.result as Array<{ id: string; email: string }>);
      request.onerror = () => reject(request.error);
    });
    const user = users.find((item) => item.email === "demo@contextos.local") ?? users[0];
    if (!user) throw new Error("No local user");
    const result = await new Promise<{ workspace: any; outbox: any[] }>((resolve, reject) => {
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
    db.close();
    return {
      hasDate: Boolean(result.workspace?.contextDates?.some((item: { title: string }) => item.title === expectedTitle)),
      pending: result.outbox.filter((item) => item.entityType === "contextDates").length
    };
  }, title);

  expect(localState.hasDate).toBe(true);
  expect(localState.pending).toBeGreaterThanOrEqual(1);
});
