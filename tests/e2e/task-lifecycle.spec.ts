import { expect, test, type Locator, type Page } from "@playwright/test";

async function resetDemo(page: Page) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await page.request.post("/api/reset-demo", { timeout: 15_000 });
      if (response.ok()) return;
      lastError = new Error(`/api/reset-demo returned ${response.status()}`);
    } catch (error) {
      lastError = error;
    }
    await page.waitForTimeout(500);
  }
  if (lastError instanceof Error) throw lastError;
  throw new Error("/api/reset-demo failed");
}

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@contextos.local");
  await page.getByLabel("Password").fill("contextos-demo-v011");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await resetDemo(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
}

function markdownLine(editor: Locator, index: number) {
  return editor.locator(`[data-testid$="-line-${index}"]`).first();
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
    if (!user) {
      db.close();
      throw new Error("No locally verified user is available for the test workspace.");
    }

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
  const domain = workspace.domains?.find((candidate: { id: string }) => candidate.id === task.domainId) ?? null;
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
  expect(box, "Expected visible element to have a bounding box").not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(min);
  expect(box!.height).toBeGreaterThanOrEqual(min);
}

test("task can be fully replanned, reassigned, completed, trashed, and restored", async ({ page }) => {
  await login(page);

  const suffix = Date.now();
  const originalTitle = `Lifecycle task ${suffix}`;
  const editedTitle = `Lifecycle task edited ${suffix}`;
  const editor = page.getByTestId("dashboard-scratchpad");
  await markdownLine(editor, 0).fill(`/task ${originalTitle}`);
  await markdownLine(editor, 0).press("Enter");

  const dashboardTasks = page.getByTestId("dashboard-live-tasks");
  await expect(dashboardTasks.getByLabel(`Task title ${originalTitle}`)).toBeVisible();
  await dashboardTasks.getByRole("button", { name: `Edit task ${originalTitle}` }).click();

  const dialog = page.getByTestId("task-edit-dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Title").fill(editedTitle);
  await dialog.getByLabel("Status").selectOption("blocked");
  await dialog.getByLabel("Planned date").fill("2030-03-18");
  await dialog.getByLabel("Due date").fill("2030-03-21");
  await dialog.getByLabel("Scheduled time").fill("13:45");
  await dialog.getByLabel("Project").selectOption({ label: "Benchmark Evaluation" });
  await expect(dialog.getByLabel("Area")).toBeDisabled();
  await expect(dialog.getByLabel("Area").locator("option:checked")).toHaveText("Research");
  await dialog.getByRole("button", { name: "Save task" }).click();
  await expect(dialog).toHaveCount(0);

  await expect.poll(() => taskSnapshot(page, editedTitle)).toMatchObject({
    title: editedTitle,
    status: "blocked",
    plannedDate: "2030-03-18",
    dueDate: "2030-03-21",
    scheduledTime: "13:45",
    projectName: "Benchmark Evaluation",
    areaName: "Research",
    trashed: false
  });

  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.locator("main").getByRole("button", { name: /^Benchmark Evaluation/ }).click();
  await expect(page.getByRole("button", { name: `Edit task ${editedTitle}` })).toBeVisible();
  await page.getByRole("button", { name: `Edit task ${editedTitle}` }).click();

  const projectDialog = page.getByTestId("task-edit-dialog");
  await projectDialog.getByLabel("Project").selectOption("");
  await expect(projectDialog.getByLabel("Area")).toBeEnabled();
  await projectDialog.getByLabel("Area").selectOption({ label: "Planning" });
  await projectDialog.getByRole("button", { name: "Save task" }).click();

  await expect.poll(() => taskSnapshot(page, editedTitle)).toMatchObject({
    projectName: null,
    areaName: "Planning",
    status: "blocked"
  });
  await expect(page.getByLabel(`Task title ${editedTitle}`)).toHaveCount(0);

  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  await page.getByTestId("dashboard-scope-select").selectOption({ label: "Planning" });
  await expect(page.getByTestId("dashboard-live-tasks").getByLabel(`Task title ${editedTitle}`)).toBeVisible();

  const scopedTasks = page.getByTestId("dashboard-live-tasks");
  await scopedTasks.getByRole("button", { name: `Mark ${editedTitle} done` }).click();
  await expect(scopedTasks.getByRole("button", { name: `Reopen ${editedTitle}` })).toBeVisible();
  await scopedTasks.getByRole("button", { name: `Reopen ${editedTitle}` }).click();
  await expect(scopedTasks.getByRole("button", { name: `Mark ${editedTitle} done` })).toBeVisible();

  await scopedTasks.getByRole("button", { name: `Edit task ${editedTitle}` }).click();
  await page.getByTestId("task-edit-dialog").getByRole("button", { name: "Move to trash" }).click();
  await expect(scopedTasks.getByLabel(`Task title ${editedTitle}`)).toHaveCount(0);
  await expect.poll(() => taskSnapshot(page, editedTitle)).toMatchObject({ trashed: true });

  await page.goto("/archive");
  await page.getByRole("button", { name: /^Trash \(/ }).click();
  const trashCard = page.locator(".cos-surface").filter({ hasText: editedTitle });
  await expect(trashCard).toBeVisible();
  await trashCard.getByRole("button", { name: "Restore" }).click();
  await expect(trashCard).toHaveCount(0);
  await expect.poll(() => taskSnapshot(page, editedTitle)).toMatchObject({
    projectName: null,
    areaName: "Planning",
    trashed: false
  });
});

test("full task editor is usable on mobile and preserves project-area inheritance", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);

  const taskSection = page.getByTestId("dashboard-live-tasks");
  const editButton = taskSection.getByRole("button", { name: "Edit task Process inbox captures" });
  await expectMinTouchTarget(editButton);
  await editButton.click();

  const dialog = page.getByTestId("task-edit-dialog");
  await expect(dialog).toBeVisible();
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
