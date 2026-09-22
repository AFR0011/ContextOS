import { readFileSync } from "node:fs";
import { expect, test, type Locator, type Page } from "@playwright/test";

const packageVersion = (JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as { version: string }).version;

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

async function expectInputValue(page: Page, selector: string, value: string) {
  await expect
    .poll(async () =>
      page.locator(selector).evaluateAll((inputs, expected) => inputs.some((input) => (input as HTMLInputElement).value === expected), value)
    )
    .toBe(true);
}

async function expectNoInputValue(page: Page, selector: string, value: string) {
  await expect
    .poll(async () =>
      page.locator(selector).evaluateAll((inputs, expected) => inputs.every((input) => (input as HTMLInputElement).value !== expected), value)
    )
    .toBe(true);
}

function markdownLine(editor: Locator, index: number) {
  return editor.locator(`[data-testid$="-line-${index}"]`).first();
}

async function fillMarkdownEditor(editor: Locator, lines: string[]) {
  await markdownLine(editor, 0).fill(lines[0] ?? "");
  for (let index = 1; index < lines.length; index += 1) {
    await markdownLine(editor, index - 1).press("Enter");
    await markdownLine(editor, index).fill(lines[index] ?? "");
  }
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
      throw new Error("No locally verified user is available for the test workspace.");
    }

    const state = await new Promise<{ workspace: any; outbox: any[] }>((resolve, reject) => {
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
      tx.onabort = () => reject(tx.error ?? new Error("Local state read transaction aborted."));
    });

    db.close();
    return { userId: user.id, ...state };
  });
}

async function taskTitleOrder(container: Locator) {
  return container.locator('[aria-label^="Task title "]').evaluateAll((fields) =>
    fields.map((field) => field.getAttribute("aria-label")?.replace(/^Task title /, "") ?? "")
  );
}

async function expectMinTouchTarget(locator: Locator, min = 40) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box, "Expected visible element to have a bounding box").not.toBeNull();
  expect(Math.floor(box!.width)).toBeGreaterThanOrEqual(min);
  expect(Math.floor(box!.height)).toBeGreaterThanOrEqual(min);
}

async function warmOfflineShell(page: Page) {
  const readiness = page.getByTestId("offline-shell-readiness");
  await expect(readiness).toHaveAttribute("data-ready", "true", { timeout: 30_000 });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
  await expect(page.getByTestId("offline-shell-readiness")).toHaveAttribute("data-ready", "true");
}


test("date utilities keep date-only values on the local calendar day", async () => {
  const originalTimeZone = process.env.TZ;
  process.env.TZ = "Europe/Bucharest";
  try {
    const { dateKeyToUtcDate, localDateKey, localWeekStartKey, utcDateToDateKey } = await import("../../src/lib/dates");
    const localBoundary = new Date(2026, 0, 1, 0, 30);

    expect(localBoundary.toISOString().slice(0, 10)).toBe("2025-12-31");
    expect(localDateKey(localBoundary)).toBe("2026-01-01");
    expect(localWeekStartKey(new Date(2026, 0, 7, 12))).toBe("2026-01-05");
    expect(utcDateToDateKey(dateKeyToUtcDate("2026-06-10"))).toBe("2026-06-10");
  } finally {
    if (originalTimeZone === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = originalTimeZone;
    }
  }
});

test("deployment headers, metadata, and service worker cache routes are configured", async ({ page }) => {
  const response = await page.request.get("/login");
  const headers = response.headers();

  expect(headers["content-security-policy"]).toContain("default-src 'self'");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("camera=()");
  expect(headers["x-powered-by"]).toBeUndefined();

  const html = await response.text();
  const origin = new URL(response.url()).origin;
  expect(html).toContain('property="og:image"');
  expect(html).toContain(`${origin}/icon-512.png`);

  const swResponse = await page.request.get("/sw.js");
  const serviceWorker = await swResponse.text();
  expect(serviceWorker).toContain('const SHELL_VERSION = "v9"');
  expect(serviceWorker).toContain('const SHELL_MANIFEST_KEY = "/__contextos_shell_manifest__"');
  expect(serviceWorker).toContain('"/dates"');
  expect(serviceWorker).toContain('"/deadlines"');
  expect(serviceWorker).toContain('"/lifeos"');
  expect(serviceWorker).toContain('url.pathname.startsWith("/api/")');
  expect(serviceWorker).toContain('CONTEXTOS_SHELL_STATUS');
  expect(serviceWorker).toContain('CONTEXTOS_SHELL_PRIME');
});

test("health endpoint reports database availability", async ({ page }) => {
  const response = await page.request.get("/api/health");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  await expect(response.json()).resolves.toMatchObject({
    status: "ok",
    service: "contextos",
    database: "ok",
    version: packageVersion
  });
});

test("auth endpoints throttle repeated failed attempts", async ({ page }) => {
  const password = "contextos-demo-v011";
  const loginIp = `rate-login-${Date.now()}`;
  const email = `rate-login-${Date.now()}@example.com`;

  const registered = await page.request.post("/api/auth/register", {
    data: { email, password },
    headers: { "x-forwarded-for": loginIp }
  });
  expect(registered.ok()).toBeTruthy();
  await page.request.post("/api/auth/logout", { headers: { "x-forwarded-for": loginIp } });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const failed = await page.request.post("/api/auth/login", {
      data: { email, password: "wrong-password" },
      headers: { "x-forwarded-for": loginIp }
    });
    expect(failed.status()).toBe(401);
  }

  const success = await page.request.post("/api/auth/login", {
    data: { email, password },
    headers: { "x-forwarded-for": loginIp }
  });
  expect(success.ok()).toBeTruthy();
  await page.request.post("/api/auth/logout", { headers: { "x-forwarded-for": loginIp } });

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const failed = await page.request.post("/api/auth/login", {
      data: { email, password: "wrong-password" },
      headers: { "x-forwarded-for": loginIp }
    });
    expect(failed.status()).toBe(401);
  }

  const blockedLogin = await page.request.post("/api/auth/login", {
    data: { email, password: "wrong-password" },
    headers: { "x-forwarded-for": loginIp }
  });
  expect(blockedLogin.status()).toBe(429);
  expect(blockedLogin.headers()["retry-after"]).toMatch(/^\d+$/);
  await expect(blockedLogin.json()).resolves.toMatchObject({ error: "Too many attempts. Try again later." });

  const registerIp = `rate-register-${Date.now()}`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const failedRegister = await page.request.post("/api/auth/register", {
      data: { email: "not-an-email", password: "short" },
      headers: { "x-forwarded-for": registerIp }
    });
    expect(failedRegister.status()).toBe(400);
  }

  const blockedRegister = await page.request.post("/api/auth/register", {
    data: { email: "not-an-email", password: "short" },
    headers: { "x-forwarded-for": registerIp }
  });
  expect(blockedRegister.status()).toBe(429);
  expect(blockedRegister.headers()["retry-after"]).toMatch(/^\d+$/);
});

test("seeded demo account can log in and render Home", async ({ page }) => {
  await login(page);
  await expect(page.getByTestId("home-view")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Daily Notes", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "In Context Today", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Insights", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Upcoming", exact: true })).toBeVisible();
  await expect(page.getByTestId("home-upcoming")).toContainText("ContextOS verification pass");
  await expect(page.getByTestId("home-dayline")).toContainText("Review today's open work");
  await expect(page.getByTestId("home-dayline")).toContainText("Refine Home and navigation copy");
  await expect(page.getByTestId("home-dayline")).not.toContainText("Validate benchmark regression");
});

test("simplified navigation shows core surfaces and hides utility routes from primary nav", async ({ page }) => {
  await login(page);
  const primaryNav = page.getByTestId("workspace-primary-nav");
  for (const label of ["Home", "Projects", "Areas", "Dates", "LifeOS", "Search"]) {
    await expect(primaryNav.getByRole("button", { name: label, exact: true })).toBeVisible();
  }
  for (const retired of ["Dashboard", "Inbox", "Resources", "Reviews", "Archive"]) {
    await expect(primaryNav.getByRole("button", { name: retired, exact: true })).toHaveCount(0);
  }
  await expect(page.getByTestId("workspace-project-nav")).toHaveCount(0);
});

test("mobile bottom navigation uses the simplified four-tab set", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  const mobileNav = page.getByRole("navigation", { name: "Primary navigation" });
  for (const label of ["Home", "Projects", "Search", "LifeOS"]) {
    await expect(mobileNav.getByRole("button", { name: label, exact: true })).toBeVisible();
  }
  await expect(mobileNav.getByRole("button", { name: "Inbox", exact: true })).toHaveCount(0);
  await expect(mobileNav.getByRole("button", { name: "Dates", exact: true })).toHaveCount(0);
});

test("mobile rows survive hostile long labels and task controls keep touch-sized hit areas", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await login(page);

  const daylineToggle = page.getByRole("button", { name: "Complete Review today's open work", exact: true });
  await expectMinTouchTarget(daylineToggle);

  const openNavigation = page.getByRole("button", { name: "Open navigation", exact: true });
  await expectMinTouchTarget(openNavigation);
  await openNavigation.click();
  await expectMinTouchTarget(page.getByRole("button", { name: "Close navigation", exact: true }));
  await expectMinTouchTarget(page.getByRole("button", { name: /Switch to (dark|light) mode/ }));
  await expectMinTouchTarget(page.getByRole("button", { name: "Log out", exact: true }));
  await expectMinTouchTarget(page.getByTestId("global-refresh-from-server"));
  await page.getByRole("button", { name: "Close navigation", exact: true }).click();

  const reducedMotionCss = readFileSync(new URL("../../src/app/globals.css", import.meta.url), "utf8");
  expect(reducedMotionCss).toContain("@media (prefers-reduced-motion: reduce)");

  await page.goto("/areas");
  const longArea = `Area-${"X".repeat(140)}`;
  await page.getByRole("button", { name: "New Area", exact: true }).click();
  await page.getByPlaceholder("Area name").fill(longArea);
  await page.getByRole("button", { name: "Create Area", exact: true }).click();

  await expect(page.getByText(longArea, { exact: true })).toBeVisible();
  await expectMinTouchTarget(page.getByRole("button", { name: `Archive ${longArea}`, exact: true }));
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.goto("/projects");
  await page.getByRole("button", { name: "New Project", exact: true }).click();
  const longProject = `Project-${"Y".repeat(150)}`;
  await page.getByPlaceholder("Project name").fill(longProject);
  await page.getByLabel("Area").selectOption({ label: longArea });
  await page.getByPlaceholder("What outcome is this project trying to reach?").fill(`Objective ${"Z".repeat(220)}`);
  await page.getByRole("button", { name: "Create Project", exact: true }).click();

  await expect(page.getByRole("heading", { name: longProject, exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  const longDate = `Date-${"D".repeat(150)}`;
  const projectDates = page.getByTestId("project-dates");
  await projectDates.getByLabel("Date kind").selectOption("event");
  await projectDates.getByPlaceholder("Add a Date...").fill(longDate);
  await projectDates.getByRole("button", { name: "Add", exact: true }).click();
  await expect(projectDates.getByText(longDate, { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.goto("/dates");
  await expect(page.getByText(longDate, { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.goto("/search");
  await page.getByPlaceholder("Search workspace...").fill(longProject.slice(0, 20));
  const longProjectResult = page.getByTestId(/search-result-project-/).filter({ hasText: longProject }).first();
  await expect(longProjectResult).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await longProjectResult.click();
  await expect(page.getByTestId("search-selected-record")).toContainText(longProject);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.goto("/projects");
  await expect(page.getByText(longProject, { exact: true }).first()).toBeVisible();
  await expectMinTouchTarget(page.getByRole("button", { name: `Archive ${longProject}`, exact: true }));
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.goto("/areas");
  await page.getByText(longArea, { exact: true }).first().click();
  const areaDetail = page.getByTestId("area-detail");
  await expect(areaDetail).toBeVisible();
  const projectRow = areaDetail.locator(".cos-entity-row").filter({ hasText: longProject }).first();
  await expect(projectRow.getByText(longProject, { exact: true })).toBeVisible();
  await expectMinTouchTarget(projectRow.getByRole("button", { name: "Archive", exact: true }));
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.goto("/settings");
  const longFileName = `contextos-${"backup".repeat(45)}.json`;
  await page.getByTestId("workspace-import-file").setInputFiles({
    name: longFileName,
    mimeType: "application/json",
    buffer: Buffer.from("{}")
  });
  await expect(page.getByText(`Selected: ${longFileName}`, { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("project objective persists after reload", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Projects" }).click();
  await page.locator("main").getByRole("button", { name: /^ContextOS Demo/ }).click();
  const objective = `Canonical objective ${Date.now()}`;
  const field = page.getByPlaceholder("What outcome is this Project trying to reach?");
  await field.fill(objective);
  await field.blur();
  await page.reload();
  await expect(page.getByPlaceholder("What outcome is this Project trying to reach?")).toHaveValue(objective);
});

test("project detail removes nested-project and recovery-field UX", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Projects" }).click();
  await page.locator("main").getByRole("button", { name: /^ContextOS Demo/ }).click();
  await expect(page.getByPlaceholder("Add subcontext, course, assignment, or duty...")).toHaveCount(0);
  await expect(page.getByPlaceholder("Concrete next action...")).toHaveCount(0);
  await expect(page.getByText("Open loops", { exact: true })).toHaveCount(0);
  await expect(page.getByTestId("project-recovery-notes")).toHaveCount(0);
});

test("project detail creates canonical Tasks and Dates", async ({ page }) => {
  const { localDateKey } = await import("../../src/lib/dates");
  await login(page);
  await page.getByRole("button", { name: "Projects" }).click();
  await page.locator("main").getByRole("button", { name: /^ContextOS Demo/ }).click();
  const today = localDateKey();
  const taskTitle = `C4 project task ${Date.now()}`;
  const tasks = page.getByTestId("project-live-tasks");
  await tasks.getByPlaceholder("Add a task...").fill(taskTitle);
  await tasks.getByLabel("Planned day").fill(today);
  await tasks.getByLabel("Scheduled time").fill("10:45");
  await tasks.getByRole("button", { name: "Add", exact: true }).click();
  await expect(tasks.getByText(taskTitle, { exact: true })).toBeVisible();

  const dateTitle = `C5 project deadline ${Date.now()}`;
  const dates = page.getByTestId("project-dates");
  await dates.getByLabel("Date kind").selectOption("deadline");
  await dates.getByPlaceholder("Add a Date...").fill(dateTitle);
  await dates.getByLabel("Date").fill(today);
  await dates.getByLabel("Date start time").fill("16:00");
  await dates.getByRole("button", { name: "Add", exact: true }).click();
  await expect(dates.getByText(dateTitle, { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("project-live-tasks").getByText(taskTitle, { exact: true })).toBeVisible();
  await expect(page.getByTestId("project-dates").getByText(dateTitle, { exact: true })).toBeVisible();
});

test("today redirects to Home and completed today tasks stay in place", async ({ page }) => {
  await login(page);
  await page.goto("/today");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();

  const taskTitle = "Review today's open work";
  await expect(page.getByText(taskTitle, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: `Complete ${taskTitle}`, exact: true }).click();
  await expect(page.getByText(taskTitle, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: `Reopen ${taskTitle}`, exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
  await expect(page.getByText(taskTitle, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: `Reopen ${taskTitle}`, exact: true })).toBeVisible();
});

test("search results expose exact canonical Task and Date detail", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Search", exact: true }).click();

  const taskTitle = "Validate benchmark regression";
  await page.getByPlaceholder("Search workspace...").fill(taskTitle);
  const taskResult = page.getByTestId(/search-result-task-/).filter({ hasText: taskTitle }).first();
  await expect(taskResult).toBeVisible();
  await taskResult.click();
  await expect(page).toHaveURL(/\/search\?.*selected=task%3A/);
  await expect(page.getByTestId("search-selected-record")).toContainText(taskTitle);
  await expect(page.getByTestId("search-selected-record").getByRole("button", { name: "Open project" })).toBeVisible();

  await page.getByPlaceholder("Search workspace...").fill("Research review session");
  const dateResult = page.getByTestId(/search-result-date-/).filter({ hasText: "Research review session" }).first();
  await expect(dateResult).toBeVisible();
  await dateResult.click();
  await expect(page).toHaveURL(/\/search\?.*selected=date%3A/);
  await expect(page.getByTestId("search-selected-record")).toContainText("Research review session");
  await expect(page.getByTestId("search-selected-record")).toContainText("Event");
});

test("Area detail exposes canonical Projects, direct Tasks, and direct Dates", async ({ page }) => {
  const { localDateKey } = await import("../../src/lib/dates");
  await login(page);
  await page.goto("/areas");
  await expect(page.getByRole("heading", { name: "Areas", exact: true })).toBeVisible();

  await page.getByText("Engineering", { exact: true }).first().click();
  await expect(page.getByTestId("area-detail")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Active Projects", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Direct Tasks", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Direct Dates", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Archived Projects", exact: true })).toBeVisible();

  const areaProject = `Area project ${Date.now()}`;
  await page.getByPlaceholder("New Project name").fill(areaProject);
  await page.getByPlaceholder("Objective (optional)").fill("Verify flat Area ownership");
  await page.getByRole("button", { name: "Add Project", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\//);
  await expect(page.getByRole("heading", { name: areaProject, exact: true })).toBeVisible();

  await page.getByTestId("project-command-page").getByRole("button", { name: "Areas", exact: true }).click();
  await page.getByText("Engineering", { exact: true }).first().click();
  const areaDate = `Area event ${Date.now()}`;
  const dates = page.getByTestId("area-dates");
  await dates.getByLabel("Date kind").selectOption("event");
  await dates.getByPlaceholder("Add a direct Date...").fill(areaDate);
  await dates.getByLabel("Date").fill(localDateKey());
  await dates.getByLabel("Date start time").fill("15:30");
  await dates.getByLabel("Date end time").fill("16:00");
  await dates.getByRole("button", { name: "Add", exact: true }).click();
  await expect(dates.getByText(areaDate, { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("area-dates").getByText(areaDate, { exact: true })).toBeVisible();
});

test("workspace dark mode toggles and persists", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Switch to dark mode" }).first().click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("button", { name: "Switch to light mode" }).first().click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});

test("draft-saved Area edit queues one offline mutation", async ({ page, context }) => {
  await login(page);
  await page.goto("/settings");
  await expect(page.getByTestId("pending-count")).toHaveText("0");
  await context.setOffline(true);

  const areaInput = page.getByPlaceholder("Area name").first();
  const longName = `Research draft save ${Date.now()}`;
  await areaInput.fill(longName);
  await expect(page.getByTestId("offline-edit-warning").first()).toBeVisible();
  await areaInput.blur();

  await expect(page.getByText("1 pending").first()).toBeVisible();
  await expect(page.getByTestId("settings-refresh-from-server")).toBeDisabled();
  await expect(page.getByTestId("global-refresh-from-server")).toBeDisabled();
  await context.setOffline(false);
  await page.getByRole("button", { name: /sync now/i }).click();
  await expect(page.getByTestId("pending-count")).toHaveText("0");
});

test("settings exposes sync visibility and server refresh controls", async ({ page }) => {
  await login(page);
  await page.goto("/settings");
  await expect(page.getByTestId("sync-status")).toHaveText("Online");
  await expect(page.getByTestId("pending-count")).toHaveText("0");
  await expect(page.getByRole("button", { name: /sync now/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /refresh from server/i })).toBeVisible();
});

test("global server refresh replaces stale local workspace after external reset", async ({ page }) => {
  await login(page);
  await page.goto("/areas");
  const staleDomain = `Stale cache domain ${Date.now()}`;
  await page.getByRole("button", { name: "New Area", exact: true }).click();
  await page.getByPlaceholder("Area name").fill(staleDomain);
  await page.getByRole("button", { name: "Create Area", exact: true }).click();
  await expect(page.getByText(staleDomain, { exact: true })).toBeVisible();
  await expect.poll(async () => {
    const response = await page.request.get("/api/bootstrap");
    const workspace = await response.json();
    return workspace.data.areas.some((area: { name: string }) => area.name === staleDomain);
  }).toBe(true);
  await expect(page.getByTestId("pending-count")).toHaveText("0");

  await resetDemo(page);
  await expect(page.getByText(staleDomain, { exact: true })).toBeVisible();

  await expect(page.getByTestId("global-refresh-from-server")).toBeEnabled();
  await page.getByTestId("global-refresh-from-server").click();
  await expect(page.getByText(staleDomain, { exact: true })).toHaveCount(0);
  await expect(page.getByText("Research", { exact: true }).first()).toBeVisible();
  await expect(page.getByTestId("pending-count")).toHaveText("0");
});

test("stale sync mutations return conflict warnings", async ({ page }) => {
  await login(page);
  const bootstrap = await page.request.get("/api/bootstrap");
  expect(bootstrap.ok()).toBeTruthy();
  const workspace = await bootstrap.json();
  const project = workspace.data.projects[0];
  const mutationId = `stale-${Date.now()}`;

  const response = await page.request.post("/api/sync", {
    data: {
      mutations: [
        {
          mutationId,
          entityType: "projects",
          entityId: project.id,
          operation: "upsert",
          payload: {
            ...project,
            latestStatus: "This stale update should not overwrite server state.",
            updatedAt: "2000-01-01T00:00:00.000Z"
          },
          createdAt: new Date().toISOString()
        }
      ]
    }
  });
  expect(response.ok()).toBeTruthy();
  const result = await response.json();
  expect(result.appliedMutationIds).toContain(mutationId);
  expect(result.warnings).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        mutationId,
        entityType: "projects",
        entityId: project.id,
        reason: "stale"
      })
    ])
  );
});

test("sync rejects oversized payloads and cross-user record ids", async ({ page }) => {
  await login(page);
  const bootstrap = await page.request.get("/api/bootstrap");
  expect(bootstrap.ok()).toBeTruthy();
  const workspace = await bootstrap.json();
  const project = workspace.data.projects[0];
  const now = new Date().toISOString();

  const oversizedAreaId = `oversized-area-${Date.now()}`;
  const oversized = await page.request.post("/api/sync", {
    data: {
      mutations: [{
        mutationId: `oversized-${Date.now()}`,
        entityType: "areas",
        entityId: oversizedAreaId,
        operation: "upsert",
        payload: {
          id: oversizedAreaId,
          name: "x".repeat(21_000),
          state: "active",
          createdAt: now,
          updatedAt: now
        },
        createdAt: now
      }]
    }
  });
  expect(oversized.status()).toBe(400);

  await page.request.post("/api/auth/logout");
  const secondEmail = `sync-owner-${Date.now()}@example.com`;
  const registered = await page.request.post("/api/auth/register", {
    data: { email: secondEmail, password: "contextos-demo-v011" }
  });
  expect(registered.ok()).toBeTruthy();

  const foreignUpdate = await page.request.post("/api/sync", {
    data: {
      mutations: [
        {
          mutationId: `foreign-project-${Date.now()}`,
          entityType: "projects",
          entityId: project.id,
          operation: "upsert",
          payload: {
            ...project,
            name: "Foreign overwrite should be rejected",
            updatedAt: now
          },
          createdAt: now
        }
      ]
    }
  });
  expect(foreignUpdate.status()).toBe(403);

  await page.request.post("/api/auth/logout");
  const loginResponse = await page.request.post("/api/auth/login", {
    data: { email: "demo@contextos.local", password: "contextos-demo-v011" }
  });
  expect(loginResponse.ok()).toBeTruthy();
  const after = await page.request.get("/api/bootstrap");
  const afterWorkspace = await after.json();
  expect(afterWorkspace.data.projects.find((item: { id: string }) => item.id === project.id)?.name).toBe(project.name);
});

test("sync rejects retired entity types and physical delete operations", async ({ page }) => {
  await login(page);
  const now = new Date().toISOString();

  const retiredEntity = await page.request.post("/api/sync", {
    data: {
      mutations: [{
        mutationId: `retired-capture-${Date.now()}`,
        entityType: "captures",
        entityId: `retired-capture-${Date.now()}`,
        operation: "upsert",
        payload: {
          id: `retired-capture-${Date.now()}`,
          text: "This retired entity must not enter canonical storage.",
          createdAt: now,
          updatedAt: now
        },
        createdAt: now
      }]
    }
  });
  expect(retiredEntity.status()).toBe(400);

  const bootstrap = await page.request.get("/api/bootstrap");
  expect(bootstrap.ok()).toBeTruthy();
  const area = (await bootstrap.json()).data.areas[0];
  expect(area?.id).toBeTruthy();

  const physicalDelete = await page.request.post("/api/sync", {
    data: {
      mutations: [{
        mutationId: `retired-delete-${Date.now()}`,
        entityType: "areas",
        entityId: area.id,
        operation: "delete",
        payload: area,
        createdAt: now
      }]
    }
  });
  expect(physicalDelete.status()).toBe(400);
});

test("project detail exposes Tasks and honest Linked Knowledge without legacy recovery UI", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Projects" }).click();
  await page.locator("main").getByRole("button", { name: /^ContextOS Demo/ }).click();
  await expect(page.getByTestId("project-command-page")).toBeVisible();
  const taskList = page.getByTestId("project-live-tasks");
  await expect(taskList).toBeVisible();
  const inertTaskTitle = taskList.getByText("Review today's open work", { exact: true });
  await expect(inertTaskTitle).toBeVisible();
  await expect.poll(() => inertTaskTitle.evaluate((element) => element.closest("button") === null)).toBe(true);
  await expect(page.getByTestId("project-recovery-notes")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Linked Knowledge", exact: true })).toBeVisible();
  await expect(page.getByText("No linked knowledge", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dates", exact: true })).toBeVisible();
  await expect(page.getByTestId("project-dates")).toBeVisible();
});

test("canonical Date remains stable after save and legacy route redirects", async ({ page }) => {
  const { localDateKey } = await import("../../src/lib/dates");
  await login(page);
  await page.goto("/deadlines");
  await expect(page).toHaveURL(/\/dates$/);
  const today = localDateKey();
  const title = `date-stable ${Date.now()}`;

  await page.getByRole("button", { name: "Add Date" }).click();
  const composer = page.getByTestId("context-date-create");
  await composer.getByPlaceholder("Date title").fill(title);
  await composer.getByLabel("Context").selectOption({ label: "ContextOS Demo" });
  await composer.locator('input[type="date"]').fill(today);
  await composer.getByRole("button", { name: "Add Date", exact: true }).click();

  await expect(page.getByText(title, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
});

test("project sections follow the definitive C5 order", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Projects" }).click();
  await page.locator("main").getByRole("button", { name: /^ContextOS Demo/ }).click();
  const headings = await page.locator("main section h2").allTextContents();
  expect(headings.slice(0, 4)).toEqual(["Project", "Tasks", "Dates", "Linked Knowledge"]);
  await expect(page.getByTestId("project-live-tasks")).toBeVisible();
});

test("Today and This Week redirect to dashboard without priority terminology", async ({ page }) => {
  await login(page);
  await page.goto("/today");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
  await expect(page.getByText(/priorit/i)).toHaveCount(0);
  await page.goto("/this-week");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
  await expect(page.getByText(/priorit/i)).toHaveCount(0);
});

test("project archive and restore work in place", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Projects" }).click();
  await page.locator("main").getByRole("button", { name: /^ContextOS Demo/ }).click();

  await page.getByRole("button", { name: "Archive", exact: true }).click();
  await page.goto("/projects");
  await expect(page.getByRole("heading", { name: "Archived", exact: true })).toBeVisible();
  await expect(page.getByText("ContextOS Demo", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Restore ContextOS Demo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Active", exact: true })).toBeVisible();
  await expect(page.getByText("ContextOS Demo", { exact: true }).first()).toBeVisible();
});
