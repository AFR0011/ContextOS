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
  const project = workspace.projects?.find((candidate: { id: string }) => candidate.id === task.projectId) ?? null;
  const domainId = task.domainId ?? project?.domainId ?? null;
  const domain = workspace.domains?.find((candidate: { id: string }) => candidate.id === domainId) ?? null;
  return {
    title: task.title,
    status: task.status,
    plannedDate: task.plannedDate,
    dueDate: task.dueDate,
    scheduledTime: task.scheduledTime,
    projectName: project?.name ?? null,
    areaName: domain?.name ?? null,
    trashed: Boolean(task.trashedAt)
  };
}

async function expectMinTouchTarget(locator: Locator, min = 40) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(min);
  expect(box!.height).toBeGreaterThanOrEqual(min);
}

test("existing task editor remains functional while Home projects the edited task", async ({ page }) => {
  const { localDateKey } = await import("../../src/lib/dates");
  await login(page);

  const plannedDate = localDateKey();
  const editedTitle = `C3 edited task ${Date.now()}`;

  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.locator("main").getByRole("button", { name: /^ContextOS Demo/ }).click();
  await page.getByRole("button", { name: "Edit task Process inbox captures" }).click();

  const dialog = page.getByTestId("task-edit-dialog");
  await dialog.getByLabel("Title").fill(editedTitle);
  await dialog.getByLabel("Status").selectOption("blocked");
  await dialog.getByLabel("Planned date").fill(plannedDate);
  await dialog.getByLabel("Due date").fill("2030-03-21");
  await dialog.getByLabel("Scheduled time").fill("13:45");
  await dialog.getByLabel("Project").selectOption({ label: "Benchmark Evaluation" });
  await expect(dialog.getByLabel("Area")).toBeDisabled();
  await expect(dialog.getByLabel("Area").locator("option:checked")).toHaveText("Research");
  await dialog.getByRole("button", { name: "Save task" }).click();

  await expect.poll(() => taskSnapshot(page, editedTitle)).toMatchObject({
    status: "blocked",
    plannedDate,
    scheduledTime: "13:45",
    projectName: "Benchmark Evaluation",
    areaName: "Research",
    trashed: false
  });

  await page.getByRole("button", { name: "Home", exact: true }).click();
  await expect(page.getByTestId("home-dayline")).toContainText(editedTitle);
  await page.getByRole("button", { name: `Complete ${editedTitle}`, exact: true }).click();

  await expect(page.getByText(editedTitle, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: `Reopen ${editedTitle}`, exact: true })).toBeVisible();
  await expect.poll(() => taskSnapshot(page, editedTitle)).toMatchObject({ status: "done" });
});

test("task editor stays usable on mobile and preserves project-area inheritance", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);

  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.locator("main").getByRole("button", { name: /^ContextOS Demo/ }).click();

  const editButton = page.getByRole("button", { name: "Edit task Process inbox captures" });
  await expectMinTouchTarget(editButton);
  await editButton.click();

  const dialog = page.getByTestId("task-edit-dialog");
  for (const label of ["Title", "Status", "Planned date", "Due date", "Scheduled time", "Project", "Area"]) {
    await expect(dialog.getByLabel(label, { exact: true })).toBeVisible();
  }

  await dialog.getByLabel("Status").selectOption("waiting");
  await dialog.getByLabel("Planned date").fill("2030-04-02");
  await dialog.getByLabel("Due date").fill("2030-04-05");
  await dialog.getByLabel("Scheduled time").fill("16:20");
  await dialog.getByLabel("Project").selectOption({ label: "Benchmark Evaluation" });
  await expect(dialog.getByLabel("Area")).toBeDisabled();
  await expect(dialog.getByLabel("Area").locator("option:checked")).toHaveText("Research");
  await expectMinTouchTarget(dialog.getByRole("button", { name: "Save task" }));
  await dialog.getByRole("button", { name: "Save task" }).click();

  await expect.poll(() => taskSnapshot(page, "Process inbox captures")).toMatchObject({
    status: "waiting",
    plannedDate: "2030-04-02",
    dueDate: "2030-04-05",
    scheduledTime: "16:20",
    projectName: "Benchmark Evaluation",
    areaName: "Research",
    trashed: false
  });

  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});
