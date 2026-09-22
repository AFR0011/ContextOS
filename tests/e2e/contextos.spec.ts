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

async function offlineCacheState(page: Page, text: string) {
  const { workspace, outbox } = await currentLocalState(page);
  return {
    hasCapture: Boolean(workspace?.captures?.some((capture: { text: string }) => capture.text === text)),
    hasScratchpad: Boolean(workspace?.dashboardScratchpads?.some((scratchpad: { content: string }) => scratchpad.content === text)),
    pendingCount: outbox.length
  };
}

async function workspaceProjectRecoveryIncludes(page: Page, projectName: string, text: string) {
  const { workspace } = await currentLocalState(page);
  return Boolean(
    workspace?.projects?.some(
      (project: { name: string; recoveryNotes: string }) => project.name === projectName && project.recoveryNotes.includes(text)
    )
  );
}

async function dashboardScratchpadContent(page: Page) {
  const { workspace } = await currentLocalState(page);
  return workspace?.dashboardScratchpads?.[0]?.content ?? "";
}

async function injectLegacyDashboardPreferences(page: Page) {
  await page.evaluate(async () => {
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

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("workspaces", "readwrite");
      const store = tx.objectStore("workspaces");
      const get = store.get(user.id);
      get.onerror = () => reject(get.error);
      get.onsuccess = () => {
        const current = get.result;
        if (!current) {
          tx.abort();
          reject(new Error("Current user's local workspace was not found."));
          return;
        }
        current.dashboardPreferences = [
          {
            ...current.dashboardPreferences[0],
            sectionOrder: ["allTasks", "projects", "notepad", "dates", "tasks"],
            collapsedSections: []
          }
        ];
        store.put(current, user.id);
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("Local workspace update transaction aborted."));
    });
    db.close();
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

test("dashboard preferences ignore legacy section order and hidden allTasks", async () => {
  const { normalizeDashboardPreference } = await import("../../src/lib/dashboard-preferences");
  const preference = normalizeDashboardPreference({
    sectionOrder: ["notepad", "allTasks", "projects"],
    collapsedSections: ["projects", "legacy", "allTasks", "projects"],
    dateWindowDays: 7,
    reviewPromptDismissals: ["daily-startup:2026-06-09"],
    showCompleted: true,
    taskSortMode: "oldest"
  });

  expect(preference.sectionOrder).toEqual(["tasks", "dates", "projects", "notepad"]);
  expect(preference.collapsedSections).toEqual(["projects"]);
  expect(preference.dateWindowDays).toBe(7);
  expect(preference.reviewPromptDismissals).toEqual(["daily-startup:2026-06-09"]);
  expect(preference.showCompleted).toBe(true);
  expect(preference.taskSortMode).toBe("oldest");
  expect(normalizeDashboardPreference({ taskSortMode: "manual" as any }).taskSortMode).toBe("recent");
});

test("command page parser handles explicit task and date commands", async () => {
  const { parseCommandPageLine } = await import("../../src/lib/command-page-commands");

  expect(parseCommandPageLine("/task Send update today at:09:30 due:2026-07-05", "2026-07-01")).toMatchObject({
    type: "task",
    title: "Send update",
    plannedDate: "2026-07-01",
    dueDate: "2026-07-05",
    scheduledTime: "09:30"
  });
  expect(parseCommandPageLine("/task Call advisor at:14:00", "2026-07-01")).toMatchObject({
    type: "task",
    plannedDate: "2026-07-01",
    scheduledTime: "14:00"
  });
  expect(parseCommandPageLine("/task Send update [2026-07-10] (930)", "2026-07-01")).toMatchObject({
    type: "task",
    title: "Send update",
    plannedDate: "2026-07-10",
    scheduledTime: "09:30"
  });
  expect(parseCommandPageLine("/date Exam tomorrow at:10:00", "2026-07-01")).toMatchObject({
    type: "date",
    title: "Exam",
    date: "2026-07-02",
    time: "10:00"
  });
  expect(parseCommandPageLine("/date Exam [20260710] (14)", "2026-07-01")).toMatchObject({
    type: "date",
    title: "Exam",
    date: "2026-07-10",
    time: "14:00"
  });
  expect(parseCommandPageLine("/deadline Review [7/10] (1430)", "2026-07-01")).toMatchObject({
    type: "date",
    title: "Review",
    date: "2026-07-10",
    time: "14:30"
  });
  expect(parseCommandPageLine("/date Missing date", "2026-07-01")).toMatchObject({
    type: "error",
    message: expect.stringContaining("Dates need")
  });
  expect(parseCommandPageLine("- [ ] local checkbox", "2026-07-01")).toEqual({ type: "none" });
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
  expect(serviceWorker).toContain('const SHELL_VERSION = "v8"');
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
    return workspace.data.domains.some((domain: { name: string }) => domain.name === staleDomain);
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

  const oversized = await page.request.post("/api/sync", {
    data: {
      mutations: [
        {
          mutationId: `oversized-${Date.now()}`,
          entityType: "captures",
          entityId: `oversized-capture-${Date.now()}`,
          operation: "upsert",
          payload: {
            id: `oversized-capture-${Date.now()}`,
            text: "x".repeat(21_000),
            status: "unprocessed",
            type: null,
            parsedData: null,
            convertedToId: null,
            createdAt: now,
            updatedAt: now
          },
          createdAt: now
        }
      ]
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

test("legacy task, project-note, and priority mutations drain compatibly", async ({ page }) => {
  await login(page);
  const bootstrap = await page.request.get("/api/bootstrap");
  expect(bootstrap.ok()).toBeTruthy();
  const workspace = await bootstrap.json();
  const project = workspace.data.projects[0];
  const now = new Date().toISOString();
  const suffix = Date.now();
  const taskId = `legacy-task-${suffix}`;
  const noteId = `legacy-note-${suffix}`;
  const priorityId = `legacy-priority-${suffix}`;
  const mutations = [
    {
      mutationId: `legacy-task-mutation-${suffix}`,
      entityType: "tasks",
      entityId: taskId,
      operation: "upsert",
      payload: {
        id: taskId,
        title: `Legacy scheduled task ${suffix}`,
        plannedDate: null,
        dueDate: null,
        startTime: "08:15",
        endTime: "09:45",
        projectId: project.id,
        domainId: project.domainId,
        status: "todo",
        createdAt: now,
        updatedAt: now,
        archivedAt: null,
        trashedAt: null
      },
      createdAt: now
    },
    {
      mutationId: `legacy-note-mutation-${suffix}`,
      entityType: "notes",
      entityId: noteId,
      operation: "upsert",
      payload: {
        id: noteId,
        title: "Offline project handoff",
        content: "Preserve this queued context exactly once.",
        projectId: project.id,
        domainId: project.domainId,
        createdAt: now,
        updatedAt: now,
        archivedAt: null,
        trashedAt: null
      },
      createdAt: now
    },
    {
      mutationId: `legacy-priority-mutation-${suffix}`,
      entityType: "priorities",
      entityId: priorityId,
      operation: "upsert",
      payload: { id: priorityId, scope: "daily", date: now, text: "Old priority", createdAt: now, updatedAt: now },
      createdAt: now
    }
  ];

  const first = await page.request.post("/api/sync", { data: { mutations } });
  expect(first.ok()).toBeTruthy();
  const firstResult = await first.json();
  expect(firstResult.appliedMutationIds).toEqual(expect.arrayContaining(mutations.map((mutation) => mutation.mutationId)));
  expect(firstResult.data.tasks.find((task: { id: string }) => task.id === taskId)?.scheduledTime).toBe("08:15");
  expect(firstResult.data.notes.some((note: { id: string }) => note.id === noteId)).toBe(false);
  const mergedProject = firstResult.data.projects.find((item: { id: string }) => item.id === project.id);
  expect(mergedProject.recoveryNotes).toContain("## Imported project notes");
  expect(mergedProject.recoveryNotes).toContain("Offline project handoff");

  const second = await page.request.post("/api/sync", { data: { mutations } });
  expect(second.ok()).toBeTruthy();
  const secondResult = await second.json();
  const secondProject = secondResult.data.projects.find((item: { id: string }) => item.id === project.id);
  expect(secondProject.recoveryNotes.match(new RegExp(`<!-- imported-project-note:${noteId} -->`, "g"))).toHaveLength(1);
});

test("project detail exposes Tasks and honest Linked Knowledge without legacy recovery UI", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Projects" }).click();
  await page.locator("main").getByRole("button", { name: /^ContextOS Demo/ }).click();
  await expect(page.getByTestId("project-command-page")).toBeVisible();
  await expect(page.getByTestId("project-live-tasks")).toBeVisible();
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
