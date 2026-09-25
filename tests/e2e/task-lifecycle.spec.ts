import { expect, test, type Locator, type Page } from "@playwright/test";

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

async function currentLocalWorkspace(page: Page) {
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
    if (!user) throw new Error("No local demo user");

    const workspace = await new Promise<any>((resolve, reject) => {
      const tx = db.transaction("workspaces", "readonly");
      const request = tx.objectStore("workspaces").get(user.id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return workspace;
  });
}

async function taskSnapshot(page: Page, title: string) {
  const workspace = await currentLocalWorkspace(page);
  const task = workspace?.tasks?.find((candidate: { title: string }) => candidate.title === title);
  if (!task) return null;

  const project = task.parent?.type === "project"
    ? workspace.projects?.find((candidate: { id: string }) => candidate.id === task.parent.projectId) ?? null
    : null;
  const area = project
    ? workspace.areas?.find((candidate: { id: string }) => candidate.id === project.areaId) ?? null
    : task.parent?.type === "area"
      ? workspace.areas?.find((candidate: { id: string }) => candidate.id === task.parent.areaId) ?? null
      : null;

  return {
    title: task.title,
    state: task.state,
    parentType: task.parent?.type ?? null,
    plannedDate: task.plannedDate,
    scheduledTime: task.scheduledTime,
    projectName: project?.name ?? null,
    areaName: area?.name ?? null
  };
}

async function expectMinTouchTarget(locator: Locator, min = 40) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(min);
  expect(box!.height).toBeGreaterThanOrEqual(min);
}

test("project-scoped task creation persists canonical parent and can be completed from Home", async ({ page }) => {
  const { localDateKey } = await import("../../src/lib/dates");
  await login(page);

  const plannedDate = localDateKey();
  const title = `C8 canonical task ${Date.now()}`;

  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.locator("main").getByRole("button", { name: /^ContextOS Demo/ }).click();

  const tasks = page.getByTestId("project-live-tasks");
  await page.getByRole("button", { name: "New task", exact: true }).click();
  await tasks.getByPlaceholder("Add a task...").fill(title);
  await tasks.getByLabel("Planned day").fill(plannedDate);
  await tasks.getByLabel("Scheduled time").fill("13:45");
  await tasks.getByRole("button", { name: "Add", exact: true }).click();

  await expect(tasks).toContainText(title);
  await expect.poll(() => taskSnapshot(page, title)).toMatchObject({
    state: "open",
    parentType: "project",
    plannedDate,
    scheduledTime: "13:45",
    projectName: "ContextOS Demo",
    areaName: "Engineering"
  });

  await page.getByRole("button", { name: "Home", exact: true }).click();
  await expect(page.getByTestId("home-dayline")).toContainText(title);
  await page.getByRole("button", { name: `Complete ${title}`, exact: true }).click();

  await expect(page.getByRole("button", { name: `Reopen ${title}`, exact: true })).toBeVisible();
  await expect.poll(() => taskSnapshot(page, title)).toMatchObject({ state: "done" });
});

test("canonical project task creation stays usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);

  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.locator("main").getByRole("button", { name: /^ContextOS Demo/ }).click();

  const tasks = page.getByTestId("project-live-tasks");
  const title = `Mobile canonical task ${Date.now()}`;
  await page.getByRole("button", { name: "New task", exact: true }).click();
  await tasks.getByPlaceholder("Add a task...").fill(title);
  await tasks.getByLabel("Planned day").fill("2030-04-02");
  await tasks.getByLabel("Scheduled time").fill("16:20");
  const add = tasks.getByRole("button", { name: "Add", exact: true });
  await expectMinTouchTarget(add);
  await add.click();

  await expect.poll(() => taskSnapshot(page, title)).toMatchObject({
    state: "open",
    parentType: "project",
    plannedDate: "2030-04-02",
    scheduledTime: "16:20",
    projectName: "ContextOS Demo",
    areaName: "Engineering"
  });

  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});
