import { expect, test, type Page } from "@playwright/test";

async function resetDemo(page: Page) {
  const response = await page.request.post("/api/reset-demo");
  expect(response.status()).toBe(200);
}

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@contextos.local");
  await page.getByLabel("Password").fill("contextos-demo-v011");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await resetDemo(page);
  await page.reload();
  await expect(page.getByTestId("home-view")).toBeVisible();
}

test("Task editor can rename, reschedule, clear planning, and move context", async ({ page }) => {
  await login(page);

  const originalTitle = "Review today's open work";
  const revisedTitle = "Review revised open work";

  await page.getByText(originalTitle, { exact: true }).click();
  let dialog = page.getByRole("dialog", { name: "Edit Task", exact: true });
  await expect(dialog).toBeVisible();

  await dialog.getByLabel("Task title", { exact: true }).fill(revisedTitle);
  await dialog.getByLabel("Task context", { exact: true }).selectOption({ label: "Engineering" });
  await dialog.getByLabel("Task planned day", { exact: true }).fill("2099-12-31");
  await dialog.getByLabel("Task scheduled time", { exact: true }).fill("14:30");
  await dialog.getByRole("button", { name: "Save Task", exact: true }).click();
  await expect(dialog).toHaveCount(0);

  await page.goto("/areas");
  await page.getByText("Engineering", { exact: true }).first().click();
  const areaDetail = page.getByTestId("area-detail");
  await expect(areaDetail.getByText(revisedTitle, { exact: true })).toBeVisible();
  await expect(areaDetail).toContainText("Planned 2099-12-31 · 14:30");

  await areaDetail.getByText(revisedTitle, { exact: true }).click();
  dialog = page.getByRole("dialog", { name: "Edit Task", exact: true });
  await dialog.getByLabel("Task planned day", { exact: true }).fill("");
  await expect(dialog.getByLabel("Task scheduled time", { exact: true })).toBeDisabled();
  await dialog.getByLabel("Task context", { exact: true }).selectOption({ label: "ContextOS Demo" });
  await dialog.getByRole("button", { name: "Save Task", exact: true }).click();

  await page.goto("/projects");
  await page.getByText("ContextOS Demo", { exact: true }).first().click();
  const projectTasks = page.getByTestId("project-live-tasks");
  await expect(projectTasks.getByText(revisedTitle, { exact: true })).toBeVisible();
  await expect(projectTasks).toContainText("Unscheduled");
});

test("Task editor is available from completed Task rows without changing state", async ({ page }) => {
  await login(page);

  const taskTitle = "Review today's open work";
  await page.getByRole("button", { name: `Complete ${taskTitle}`, exact: true }).click();
  await page.getByTestId("home-contexts").getByText("ContextOS Demo", { exact: true }).click();

  await page.getByRole("button", { name: "Show completed (1)", exact: true }).click();
  await page.getByText(taskTitle, { exact: true }).click();

  const dialog = page.getByRole("dialog", { name: "Edit Task", exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Task title", { exact: true }).fill("Edited completed task");
  await dialog.getByRole("button", { name: "Save Task", exact: true }).click();

  await expect(page.getByText("Edited completed task", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reopen Edited completed task", exact: true })).toBeVisible();
});
