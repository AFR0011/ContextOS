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

function parseHexColor(value: string) {
  const raw = value.trim().replace(/^#/, "");
  const hex = /^[0-9a-f]{3}$/i.test(raw)
    ? raw.split("").map((digit) => digit + digit).join("")
    : raw;
  expect(hex).toMatch(/^[0-9a-f]{6}$/i);
  return [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
}

function relativeLuminance(value: string) {
  const [red, green, blue] = parseHexColor(value).map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground: string, background: string) {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

test("skip link and local route changes move focus into the new main view", async ({ page }) => {
  await login(page);

  const skip = page.getByRole("link", { name: "Skip to main content", exact: true });
  await skip.focus();
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Home", exact: true })).toBeFocused();

  const projects = page.getByTestId("workspace-primary-nav").getByRole("button", { name: "Projects", exact: true });
  await projects.click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeFocused();

  const search = page.getByTestId("workspace-primary-nav").getByRole("button", { name: "Search", exact: true });
  await search.click();
  await expect(page).toHaveURL(/\/search$/);
  await expect(page.getByRole("heading", { name: "Search", exact: true })).toBeFocused();
});

test("mobile navigation behaves as a modal keyboard drawer and restores focus", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);

  const trigger = page.getByRole("button", { name: "Open navigation", exact: true });
  const drawerElement = page.locator("#workspace-navigation-drawer");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(drawerElement).toHaveAttribute("aria-hidden", "true");
  expect(await drawerElement.evaluate((element) => element.hasAttribute("inert"))).toBe(true);
  await trigger.click();

  const drawer = page.getByRole("dialog", { name: "Workspace navigation menu" });
  await expect(drawer).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(drawerElement).not.toHaveAttribute("aria-hidden", "true");
  expect(await drawerElement.evaluate((element) => element.hasAttribute("inert"))).toBe(false);

  const focusables = drawer.locator(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  await expect(focusables.first()).toBeFocused();

  await page.keyboard.press("Shift+Tab");
  await expect(focusables.last()).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(focusables.first()).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Workspace navigation menu" })).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(drawerElement).toHaveAttribute("aria-hidden", "true");
  expect(await drawerElement.evaluate((element) => element.hasAttribute("inert"))).toBe(true);
});

test("opening logout from the mobile drawer does not return focus to a hidden drawer control", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);

  const trigger = page.getByRole("button", { name: "Open navigation", exact: true });
  await trigger.click();
  const drawer = page.getByRole("dialog", { name: "Workspace navigation menu" });
  await drawer.getByRole("button", { name: "Log out", exact: true }).click();

  const logout = page.getByRole("dialog", { name: "Log out of ContextOS" });
  await expect(logout).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Workspace navigation menu" })).toHaveCount(0);

  await logout.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(logout).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("command palette exposes combobox ownership and active descendant state", async ({ page }) => {
  await login(page);

  await page.keyboard.press("Control+K");
  const palette = page.getByTestId("command-palette");
  const combobox = palette.getByRole("combobox", { name: "Search or run a command" });
  await expect(combobox).toBeFocused();
  await expect(combobox).toHaveAttribute("aria-expanded", "true");
  await expect(combobox).toHaveAttribute("aria-controls", "command-palette-results");

  const initialId = await combobox.getAttribute("aria-activedescendant");
  expect(initialId).toBeTruthy();
  await expect(page.locator("#" + initialId)).toHaveAttribute("aria-selected", "true");

  await page.keyboard.press("ArrowDown");
  const nextId = await combobox.getAttribute("aria-activedescendant");
  expect(nextId).toBeTruthy();
  expect(nextId).not.toBe(initialId);
  await expect(page.locator("#" + nextId)).toHaveAttribute("aria-selected", "true");
});

test("command palette stays inside a short mobile viewport and scrolls its results", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 400 });
  await login(page);

  await page.keyboard.press("Control+K");
  const palette = page.getByTestId("command-palette");
  await expect(palette).toBeVisible();

  const metrics = await palette.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const results = element.querySelector<HTMLElement>("#command-palette-results");
    return {
      top: rect.top,
      bottom: rect.bottom,
      viewportHeight: window.innerHeight,
      resultScrollHeight: results?.scrollHeight ?? 0,
      resultClientHeight: results?.clientHeight ?? 0
    };
  });

  expect(metrics.top).toBeGreaterThanOrEqual(0);
  expect(metrics.bottom).toBeLessThanOrEqual(metrics.viewportHeight);
  expect(metrics.resultScrollHeight).toBeGreaterThan(metrics.resultClientHeight);

  const results = palette.getByRole("listbox", { name: "Command palette results" });
  const options = results.getByRole("option");
  await expect(options.last()).toBeAttached();
  for (let index = 1; index < await options.count(); index += 1) {
    await page.keyboard.press("ArrowDown");
  }
  await expect.poll(async () => {
    const listBox = await results.boundingBox();
    const active = await palette.locator('[role="option"][aria-selected="true"]').boundingBox();
    return Boolean(listBox && active && active.y >= listBox.y && active.y + active.height <= listBox.y + listBox.height + 1);
  }).toBe(true);

  await page.keyboard.press("Escape");
  await expect(palette).toHaveCount(0);

  await page.setViewportSize({ width: 700, height: 400 });
  await page.keyboard.press("Control+K");
  const landscapePalette = page.getByTestId("command-palette");
  await expect(landscapePalette).toBeVisible();
  const landscapeMetrics = await landscapePalette.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, viewportHeight: window.innerHeight };
  });
  expect(landscapeMetrics.top).toBeGreaterThanOrEqual(0);
  expect(landscapeMetrics.bottom).toBeLessThanOrEqual(landscapeMetrics.viewportHeight);
});

test("canonical quick-entry fields expose accessible names instead of placeholder-only controls", async ({ page }) => {
  await login(page);

  await page.goto("/areas");
  await page.getByRole("button", { name: "New Area", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Area name", exact: true })).toBeVisible();

  await page.getByText("Engineering", { exact: true }).first().click();
  await expect(page.getByTestId("area-detail")).toBeVisible();

  await page.getByRole("button", { name: "New project", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Project name", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Project objective", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "New task", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Task title", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "New date", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Date title", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Date details", exact: true })).toBeVisible();

  await page.goto("/projects");
  await page.getByText("ContextOS Demo", { exact: true }).click();
  await expect(page.getByTestId("project-command-page")).toBeVisible();

  await page.getByRole("button", { name: "New task", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Task title", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "New date", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Date title", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Date details", exact: true })).toBeVisible();
});

test("filter, disclosure, and Search selection state is exposed semantically", async ({ page }) => {
  await login(page);

  await page.goto("/dates");
  const filters = page.getByRole("group", { name: "Date filters" });
  const all = filters.getByRole("button", { name: "All", exact: true });
  const events = filters.getByRole("button", { name: "Events", exact: true });
  await expect(all).toHaveAttribute("aria-pressed", "true");
  await expect(events).toHaveAttribute("aria-pressed", "false");
  await events.click();
  await expect(all).toHaveAttribute("aria-pressed", "false");
  await expect(events).toHaveAttribute("aria-pressed", "true");

  await page.goto("/dashboard");
  const taskTitle = "Review today's open work";
  await page.getByRole("button", { name: `Complete ${taskTitle}`, exact: true }).click();
  await page.getByTestId("home-contexts").getByText("ContextOS Demo", { exact: true }).click();

  const completed = page.getByRole("button", { name: "Show completed (1)", exact: true });
  await expect(completed).toHaveAttribute("aria-expanded", "false");
  await completed.click();
  await expect(page.getByRole("button", { name: "Hide completed", exact: true })).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#project-completed-tasks")).toContainText(taskTitle);

  await page.goto("/search");
  const search = page.getByRole("textbox", { name: "Search workspace", exact: true });
  await search.fill("ContextOS Demo");

  const result = page.getByTestId(/search-result-project-/).filter({ hasText: "ContextOS Demo" }).first();
  await expect(result).toHaveAttribute("aria-pressed", "false");
  await result.click();
  await expect(result).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("status").filter({ hasText: /search result/ })).toBeVisible();
});

test("Daily Note autosave and password validation expose non-visual state", async ({ page }) => {
  await login(page);

  const note = page.getByLabel("Daily Notes");
  await note.fill(`Accessibility save ${Date.now()}`);
  const saveStatus = page.getByTestId("home-daily-note").getByRole("status");
  await expect(saveStatus).toContainText(/Saving|Saved/);
  await expect(saveStatus).toContainText("Saved");

  await page.goto("/settings");
  const newPassword = page.getByLabel("New password", { exact: true });
  const confirmation = page.getByLabel("Confirm new password", { exact: true });

  await newPassword.fill("short");
  await expect(newPassword).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#new-password-length-validation")).toBeVisible();

  await newPassword.fill("a-longer-password");
  await confirmation.fill("different-password");
  await expect(confirmation).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#password-confirmation-validation")).toBeVisible();

  await confirmation.fill("a-longer-password");
  await expect(confirmation).toHaveAttribute("aria-invalid", "false");
});

test("inline create disclosures expose state and return focus when cancelled", async ({ page }) => {
  await login(page);

  await page.goto("/areas");
  const areaTrigger = page.getByRole("button", { name: "New Area", exact: true });
  await expect(areaTrigger).toHaveAttribute("aria-expanded", "false");
  await expect(areaTrigger).toHaveAttribute("aria-controls", "area-create-form");
  await areaTrigger.click();
  await expect(areaTrigger).toHaveAttribute("aria-expanded", "true");
  await page.locator("#area-create-form").getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(areaTrigger).toBeFocused();
  await expect(areaTrigger).toHaveAttribute("aria-expanded", "false");

  await page.goto("/projects");
  const projectTrigger = page.getByRole("button", { name: "New Project", exact: true });
  await expect(projectTrigger).toHaveAttribute("aria-expanded", "false");
  await expect(projectTrigger).toHaveAttribute("aria-controls", "project-create-form");
  await projectTrigger.click();
  await expect(projectTrigger).toHaveAttribute("aria-expanded", "true");
  await page.locator("#project-create-form").getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(projectTrigger).toBeFocused();
  await expect(projectTrigger).toHaveAttribute("aria-expanded", "false");

  await page.goto("/dates");
  const dateTrigger = page.locator('button[aria-controls="context-date-create"]');
  await expect(dateTrigger).toHaveAttribute("aria-expanded", "false");
  await expect(dateTrigger).toHaveAttribute("aria-controls", "context-date-create");
  await dateTrigger.click();
  await expect(dateTrigger).toHaveAttribute("aria-expanded", "true");
  await page.locator("#context-date-create").getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dateTrigger).toBeFocused();
  await expect(dateTrigger).toHaveAttribute("aria-expanded", "false");
});

test("light-theme subtle text token keeps AA contrast on canonical surfaces", async ({ page }) => {
  await login(page);
  await page.evaluate(() => document.documentElement.classList.remove("dark"));

  const tokens = await page.evaluate(() => {
    const styles = getComputedStyle(document.documentElement);
    return {
      subtle: styles.getPropertyValue("--cos-text-subtle"),
      canvas: styles.getPropertyValue("--cos-bg"),
      soft: styles.getPropertyValue("--cos-bg-soft"),
      elevated: styles.getPropertyValue("--cos-bg-elevated"),
      inset: styles.getPropertyValue("--cos-bg-inset"),
      primarySoft: styles.getPropertyValue("--cos-primary-soft")
    };
  });

  for (const background of [tokens.canvas, tokens.soft, tokens.elevated, tokens.inset, tokens.primarySoft]) {
    expect(contrastRatio(tokens.subtle, background)).toBeGreaterThanOrEqual(4.5);
  }
});

test("dynamic import errors are exposed as alerts", async ({ page }) => {
  await login(page);
  await page.goto("/settings");

  await page.getByTestId("workspace-import-file").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from("{not valid json")
  });

  await expect(page.getByTestId("workspace-import-error")).toHaveAttribute("role", "alert");
  await expect(page.getByTestId("workspace-import-error")).toContainText(/JSON|valid/i);
});
