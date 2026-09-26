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

test("definitive ContextOS workflow moves from daily execution to context, history, and LifeOS boundary", async ({ page }) => {
  await login(page);

  // Open -> understand the day.
  await expect(page.getByRole("heading", { name: "Home", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
  await expect(page.getByTestId("home-dayline")).toContainText("Review today's open work");
  await expect(page.getByTestId("home-upcoming")).toContainText("ContextOS verification pass");
  await expect(page.getByTestId("home-contexts")).toContainText("ContextOS Demo");

  // Execute.
  const taskTitle = "Review today's open work";
  await page.getByRole("button", { name: `Complete ${taskTitle}`, exact: true }).click();
  await expect(page.getByRole("button", { name: `Reopen ${taskTitle}`, exact: true })).toBeVisible();

  // Note.
  const note = `C10 acceptance note ${Date.now()}`;
  await page.getByLabel("Daily Notes").fill(note);
  await expect(page.getByTestId("home-daily-note")).toContainText("Saved");

  // Open context -> resume Project.
  const homeContexts = page.getByTestId("home-contexts");
  await homeContexts.getByText("ContextOS Demo", { exact: true }).click();
  await expect(page.getByTestId("project-command-page")).toBeVisible();
  await expect(page.getByRole("heading", { name: "ContextOS Demo", exact: true })).toBeVisible();
  await expect(page.getByTestId("project-summary")).toContainText(
    "Keep daily execution, temporal context, and project recovery coherent."
  );

  const tasks = page.getByTestId("project-live-tasks");
  const showCompleted = page.getByRole("button", { name: "Show completed (1)", exact: true });
  await expect(showCompleted).toBeVisible();
  await showCompleted.click();
  await expect(tasks.getByText(taskTitle, { exact: true })).toBeVisible();

  // See upcoming temporal context.
  await page.getByRole("button", { name: "Home", exact: true }).click();
  const upcoming = page.getByTestId("home-upcoming");
  const upcomingDeadline = upcoming.getByText("ContextOS verification pass", { exact: true });
  await expect(upcomingDeadline).toBeVisible();
  await upcomingDeadline.click();
  await expect(page).toHaveURL(/\/dates$/);
  await expect(page.getByRole("heading", { name: "Upcoming", exact: true })).toBeVisible();
  await expect(page.getByText("ContextOS verification pass", { exact: true })).toBeVisible();

  // Find history: completed Tasks remain discoverable through canonical Search.
  await page.getByRole("button", { name: "Search", exact: true }).click();
  const search = page.getByPlaceholder("Search workspace...");
  await search.fill(taskTitle);
  const result = page.getByTestId(/search-result-task-/).filter({ hasText: taskTitle }).first();
  await expect(result).toBeVisible();
  await expect(result).toContainText("Done");
  await result.click();

  const detail = page.getByTestId("search-selected-record");
  await expect(detail).toContainText(taskTitle);
  await expect(detail).toContainText("Done");
  await expect(detail.getByRole("button", { name: "Open project", exact: true })).toBeVisible();

  // The Daily Note written during execution is also searchable canonical context.
  await search.fill(note);
  const noteResult = page.getByTestId(/search-result-daily-note-/).filter({ hasText: note }).first();
  await expect(noteResult).toBeVisible();
  await noteResult.click();
  await expect(page.getByTestId("search-selected-record")).toContainText(note);

  // Enter LifeOS only at the deeper-module boundary. No placeholder activity is invented.
  await page.getByRole("button", { name: "LifeOS", exact: true }).click();
  await expect(page.getByTestId("lifeos-hub")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Module hub", exact: true })).toBeVisible();

  for (const module of ["ravel", "socialos", "ledger", "canon"]) {
    const card = page.getByTestId(`lifeos-module-${module}`);
    await expect(card).toBeVisible();
    await expect(card).toContainText("No summary provider connected");

    const destination = card.getByRole("link");
    const status = card.getByTestId(`lifeos-module-status-${module}`);
    if (await destination.count()) {
      await expect(destination).toHaveAttribute("href", /.+/);
      await expect(status).toHaveCount(0);
    } else {
      await expect(status).toBeVisible();
      await expect(status).toHaveText("Not connected");
    }
  }
});
