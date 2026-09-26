import { expect, test, type Page } from "@playwright/test";
import { addDaysToDateKey, localDateKey } from "../../src/lib/dates";

async function resetDemo(page: Page) {
  const response = await page.request.post("/api/reset-demo");
  expect(response.ok()).toBeTruthy();
}

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@contextos.local");
  await page.getByLabel("Password").fill("contextos-demo-v011");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await resetDemo(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
}

test("Search exposes only canonical ContextOS entities", async ({ page }) => {
  await login(page);
  await page.goto("/search");
  const input = page.getByPlaceholder("Search workspace...");

  await input.fill("Keep experiments and handoffs recoverable");
  await expect(page.getByTestId(/search-result-project-/).filter({ hasText: "Benchmark Evaluation" }).first()).toBeVisible();

  await input.fill("ContextOS verification pass");
  const date = page.getByTestId(/search-result-date-/).filter({ hasText: "ContextOS verification pass" }).first();
  await expect(date).toBeVisible();
  await expect(date).toContainText("Deadline");

  for (const retired of ["Practice Schedule", "Experiment recovery note", "capture -> triage", "daily-startup"]) {
    await input.fill(retired);
    await expect(page.getByText("No matching ContextOS records.", { exact: true })).toBeVisible();
  }
});

test("Search is the read-only history viewer for past Daily Notes", async ({ page }) => {
  await login(page);
  const pastDate = addDaysToDateKey(localDateKey(), -2)!;
  const content = `Past Daily Note ${Date.now()} with a unique history phrase.`;
  const timestamp = new Date().toISOString();
  const noteId = `c6-note-${Date.now()}`;

  const response = await page.request.post("/api/sync", {
    data: {
      mutations: [{
        mutationId: `c6-daily-note-${noteId}`,
        entityType: "dailyNotes",
        entityId: noteId,
        operation: "upsert",
        payload: {
          id: noteId,
          localDate: pastDate,
          content,
          createdAt: timestamp,
          updatedAt: timestamp
        },
        createdAt: timestamp
      }]
    }
  });
  expect(response.ok()).toBeTruthy();

  await page.goto("/search");
  await page.reload();
  await page.getByPlaceholder("Search workspace...").fill("unique history phrase");

  const result = page.getByTestId(/search-result-daily-note-/).first();
  await expect(result).toBeVisible();
  await result.click();

  const detail = page.getByTestId("search-selected-record");
  await expect(detail).toContainText(pastDate);
  await expect(detail).toContainText(content);
  await expect(detail.getByRole("button", { name: "Open Today" })).toHaveCount(0);
});

test("Cmd Ctrl K supports keyboard navigation and direct Task creation", async ({ page }) => {
  await login(page);

  await page.keyboard.press("Control+K");
  const palette = page.getByTestId("command-palette");
  await expect(palette).toBeVisible();
  await palette.getByLabel("Search or run a command").fill("Projects");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/projects$/);

  await page.keyboard.press("Control+K");
  await palette.getByLabel("Search or run a command").fill("New Task");
  await page.keyboard.press("Enter");

  const sheet = page.getByTestId("palette-task-create");
  await expect(sheet).toBeVisible();
  const title = `Palette task ${Date.now()}`;
  await sheet.getByPlaceholder("Task title").fill(title);
  await sheet.getByRole("combobox").selectOption({ label: "ContextOS Demo" });
  await page.getByRole("button", { name: "Create Task", exact: true }).click();

  await page.keyboard.press("Control+K");
  await palette.getByLabel("Search or run a command").fill(title);
  await expect(palette.getByText(title, { exact: true })).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/search\?.*selected=task%3A/);
  await expect(page.getByTestId("search-selected-record")).toContainText(title);
  await expect(page.getByTestId("search-selected-record").getByRole("button", { name: "Open project" })).toBeVisible();
});

test("command palette and create sheet contain keyboard focus and restore it on close", async ({ page }) => {
  await login(page);

  const homeButton = page.getByTestId("workspace-primary-nav").getByRole("button", { name: "Home", exact: true });
  await homeButton.focus();

  await page.keyboard.press("Control+K");
  const palette = page.getByTestId("command-palette");
  const searchInput = palette.getByLabel("Search or run a command");
  await expect(searchInput).toBeFocused();

  const options = palette.getByRole("option");
  await expect(options.first()).toBeVisible();

  await page.keyboard.press("Shift+Tab");
  await expect(options.last()).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(searchInput).toBeFocused();

  const optionCount = await options.count();
  for (let index = 1; index < Math.min(optionCount, 13); index += 1) {
    await page.keyboard.press("ArrowDown");
  }
  const listbox = palette.getByRole("listbox", { name: "Command palette results" });
  const activeOption = palette.locator('[role="option"][aria-selected="true"]');
  await expect.poll(async () => {
    const listBox = await listbox.boundingBox();
    const activeBox = await activeOption.boundingBox();
    if (!listBox || !activeBox) return false;
    return activeBox.y >= listBox.y && activeBox.y + activeBox.height <= listBox.y + listBox.height + 1;
  }).toBe(true);

  await searchInput.fill("New Task");
  await page.keyboard.press("Enter");

  const dialog = page.getByRole("dialog", { name: "New Task" });
  await expect(dialog).toBeVisible();
  const cancel = dialog.getByRole("button", { name: "Cancel", exact: true });
  const close = dialog.getByRole("button", { name: "Close", exact: true });

  await cancel.focus();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(cancel).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(homeButton).toBeFocused();

  await page.keyboard.press("Control+K");
  await expect(searchInput).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(palette).toHaveCount(0);
  await expect(homeButton).toBeFocused();
});

test("Cmd Ctrl K creates canonical Dates with mandatory context", async ({ page }) => {
  await login(page);

  await page.keyboard.press("Control+K");
  const palette = page.getByTestId("command-palette");
  await palette.getByLabel("Search or run a command").fill("New Date");
  await page.keyboard.press("Enter");

  const sheet = page.getByTestId("palette-date-create");
  await expect(sheet).toBeVisible();
  const title = `Palette deadline ${Date.now()}`;
  await sheet.getByPlaceholder("Date title").fill(title);
  const selects = sheet.getByRole("combobox");
  await selects.nth(0).selectOption("deadline");
  await selects.nth(1).selectOption({ label: "ContextOS Demo" });

  const create = page.getByRole("button", { name: "Create Date", exact: true });
  await expect(create).toBeEnabled();
  await create.click();

  await page.goto("/search");
  await page.getByPlaceholder("Search workspace...").fill(title);
  const result = page.getByTestId(/search-result-date-/).filter({ hasText: title }).first();
  await expect(result).toBeVisible();
  await expect(result).toContainText("Deadline");
});


test("Settings renders one URL-backed active section and shares theme state with the shell", async ({ page }) => {
  await login(page);
  await page.goto("/settings");

  await expect(page.getByRole("heading", { name: "Account", exact: true })).toBeVisible();
  for (const heading of ["Appearance", "Offline & Sync", "Data", "Security", "Advanced"]) {
    await expect(page.getByRole("heading", { name: heading, exact: true })).toHaveCount(0);
  }

  const nav = page.getByRole("navigation", { name: "Settings sections" });
  await nav.getByRole("button", { name: "Appearance", exact: true }).click();
  await expect(page).toHaveURL(/\/settings\?section=appearance$/);
  await expect(page.getByRole("heading", { name: "Appearance", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Account", exact: true })).toHaveCount(0);

  const appearance = page.getByTestId("appearance-settings");
  await appearance.getByRole("button", { name: "Dark", exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(true);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("contextos-theme"))).toBe("dark");

  await appearance.getByRole("button", { name: "Light", exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(false);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("contextos-theme"))).toBe("light");

  await page.goBack();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole("heading", { name: "Account", exact: true })).toBeVisible();
});
