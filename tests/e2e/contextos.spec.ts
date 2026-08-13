import { expect, test, type Locator, type Page } from "@playwright/test";

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
  await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return;
    await navigator.serviceWorker.ready;
    if (navigator.serviceWorker.controller) return;

    await new Promise<void>((resolve) => {
      const timeout = window.setTimeout(resolve, 2000);
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        () => {
          window.clearTimeout(timeout);
          resolve();
        },
        { once: true }
      );
    });
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
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
  expect(serviceWorker).toContain('const SHELL_VERSION = "v3"');
  expect(serviceWorker).toContain('const SHELL_MANIFEST_KEY = "/__contextos_shell_manifest__"');
  expect(serviceWorker).toContain('"/dates"');
  expect(serviceWorker).toContain('"/deadlines"');
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
    version: "0.2.8"
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

test("seeded demo account can log in and render dashboard", async ({ page }) => {
  await login(page);
  await expect(page.getByText("Daily Command Page")).toBeVisible();
  await expect(page.getByTestId("dashboard-command-page")).toBeVisible();
  await expect(page.getByTestId("dashboard-live-tasks")).toBeVisible();
  await expect(page.getByTestId("dashboard-live-dates")).toBeVisible();
  await expect(page.getByTestId("dashboard-section-projects")).toHaveCount(0);
  await expect(page.getByTestId("dashboard-section-allTasks")).toHaveCount(0);
  const tasks = page.getByTestId("dashboard-live-tasks");
  await expect(tasks.getByLabel("Task title Process inbox captures")).toBeVisible();
  await expect(tasks.getByLabel("Process inbox captures scheduled time")).toHaveValue("09:30");
  await expect(tasks.getByLabel("Task title Write one clean latest-status note")).toBeVisible();
  await expect(tasks.getByLabel("Task title Validate benchmark regression")).toBeVisible();
});

test("simplified navigation shows core surfaces and hides utility routes from primary nav", async ({ page }) => {
  await login(page);
  const primaryNav = page.getByTestId("workspace-primary-nav");
  await expect(primaryNav.getByRole("button", { name: "Dashboard" })).toBeVisible();
  await expect(primaryNav.getByRole("button", { name: "Inbox" })).toBeVisible();
  await expect(primaryNav.getByRole("button", { name: "Search" })).toBeVisible();
  await expect(primaryNav.getByRole("button", { name: "ContextOS Demo" })).toBeVisible();
  await expect(primaryNav.getByRole("button", { name: "Today" })).toHaveCount(0);
  await expect(primaryNav.getByRole("button", { name: "This Week" })).toHaveCount(0);
  await expect(primaryNav.getByRole("button", { name: "Areas" })).toHaveCount(0);
  await expect(primaryNav.getByRole("button", { name: "Resources" })).toHaveCount(0);
  await expect(primaryNav.getByRole("button", { name: "Reviews" })).toHaveCount(0);
});

test("mobile bottom navigation uses the simplified four-tab set", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  const mobileNav = page.getByRole("navigation", { name: "Primary navigation" });
  await expect(mobileNav.getByRole("button", { name: "Dashboard" })).toBeVisible();
  await expect(mobileNav.getByRole("button", { name: "Inbox" })).toBeVisible();
  await expect(mobileNav.getByRole("button", { name: "Projects" })).toBeVisible();
  await expect(mobileNav.getByRole("button", { name: "Search" })).toBeVisible();
  await expect(mobileNav.getByRole("button", { name: "Today" })).toHaveCount(0);
});

test("quick capture appears in inbox and can convert to a task", async ({ page }) => {
  await login(page);
  const text = `offline-ready capture ${Date.now()}`;
  await page.goto("/inbox");
  await page.getByPlaceholder(/Quick capture/i).fill(`/task ${text}`);
  await page.getByPlaceholder(/Quick capture/i).press("Enter");
  await expect(page.getByText(`/task ${text}`)).toBeVisible();
  const captureCard = page.getByTestId("capture-card").filter({ hasText: `/task ${text}` });
  await captureCard.getByRole("button", { name: "Convert to task" }).click();
  await expect(captureCard).toHaveCount(0);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByPlaceholder("Search workspace...").fill(text);
  await expect(page.getByText(text).first()).toBeVisible();
});

test("dashboard inbox preview opens one-by-one review mode", async ({ page }) => {
  await login(page);
  const preview = page.getByTestId("dashboard-inbox-preview");
  await expect(preview).toBeVisible();
  await expect(preview).toContainText("Inbox");
  await expect(preview).toContainText("/task Clean up deployment checklist");
  await preview.getByRole("button", { name: "Review Inbox", exact: true }).click();
  await expect(page).toHaveURL(/\/inbox\?review=1/);
  await expect(page.getByTestId("inbox-review-panel")).toBeVisible();
  await expect(page.getByText(/1 of \d+/)).toBeVisible();
});

test("inbox review converts slash task captures with parsed date and time", async ({ page }) => {
  await login(page);
  const { localDateKey } = await import("../../src/lib/dates");
  const today = localDateKey();
  const title = `Review task ${Date.now()}`;
  await page.goto("/inbox");
  await page.getByPlaceholder(/Quick capture/i).fill(`/task ${title} [${today}] (10:45)`);
  await page.getByPlaceholder(/Quick capture/i).press("Enter");

  const captureCard = page.getByTestId("capture-card").filter({ hasText: title });
  await captureCard.getByRole("button", { name: "Review", exact: true }).click();
  await expect(page.getByTestId("inbox-review-panel")).toBeVisible();
  await expect(page.getByTestId("triage-title-input")).toHaveValue(title);
  await expect(page.locator('input[type="date"]').first()).toHaveValue(today);
  await expect(page.locator('input[type="time"]').first()).toHaveValue("10:45");
  await page.getByRole("button", { name: "Create task" }).click();

  await page.goto("/dashboard");
  await expect(page.getByTestId("dashboard-live-tasks").getByLabel(`Task title ${title}`)).toBeVisible();
  await expect(page.getByTestId("dashboard-live-tasks").getByLabel(`${title} scheduled time`)).toHaveValue("10:45");
});

test("inbox review creates a date with parsed date and time", async ({ page }) => {
  await login(page);
  const title = `Review date ${Date.now()}`;
  await page.goto("/inbox");
  await page.getByPlaceholder(/Quick capture/i).fill(`/date ${title} [2026-07-20] (16:30)`);
  await page.getByPlaceholder(/Quick capture/i).press("Enter");

  const captureCard = page.getByTestId("capture-card").filter({ hasText: title });
  await captureCard.getByRole("button", { name: "Review", exact: true }).click();
  await expect(page.getByTestId("triage-title-input")).toHaveValue(title);
  await expect(page.getByTestId("triage-date-input")).toHaveValue("2026-07-20");
  await expect(page.getByTestId("triage-time-input")).toHaveValue("16:30");
  await page.getByRole("button", { name: "Create Date" }).click();

  await page.goto("/dates");
  await expectInputValue(page, "input", title);
  await expectInputValue(page, 'input[type="date"]', "2026-07-20");
  await expect(page.getByText("16:30", { exact: true })).toBeVisible();
});

test("inbox review attaches capture context to a project", async ({ page }) => {
  await login(page);
  const text = `Attach inbox context ${Date.now()}`;
  await page.goto("/inbox");
  await page.getByPlaceholder(/Quick capture/i).fill(text);
  await page.getByPlaceholder(/Quick capture/i).press("Enter");

  const captureCard = page.getByTestId("capture-card").filter({ hasText: text });
  await captureCard.getByRole("button", { name: "Review", exact: true }).click();
  await page.getByRole("button", { name: "Attach to project" }).click();
  await page.getByTestId("triage-attach-project-select").selectOption({ label: "ContextOS Demo" });
  await page.getByRole("button", { name: "Attach", exact: true }).click();
  await expect.poll(() => workspaceProjectRecoveryIncludes(page, "ContextOS Demo", text)).toBe(true);

  await page.goto("/projects");
  await page.locator("main").getByRole("button", { name: /^ContextOS Demo/ }).click();
  await expect(page.getByTestId("project-recovery-notes")).toBeVisible();
  await expect.poll(() => workspaceProjectRecoveryIncludes(page, "ContextOS Demo", text)).toBe(true);
});

test("review archive and delete remove captures from the unprocessed queue", async ({ page }) => {
  await login(page);
  const archiveText = `Archive capture ${Date.now()}`;
  const deleteText = `Delete capture ${Date.now()}`;
  await page.goto("/inbox");
  await page.getByPlaceholder(/Quick capture/i).fill(archiveText);
  await page.getByPlaceholder(/Quick capture/i).press("Enter");
  await page.getByPlaceholder(/Quick capture/i).fill(deleteText);
  await page.getByPlaceholder(/Quick capture/i).press("Enter");

  await page.getByTestId("capture-card").filter({ hasText: archiveText }).getByRole("button", { name: "Review", exact: true }).click();
  await page.getByTestId("inbox-review-panel").getByRole("button", { name: "Archive" }).click();
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByTestId("capture-card").filter({ hasText: archiveText })).toHaveCount(0);

  await page.getByTestId("capture-card").filter({ hasText: deleteText }).getByRole("button", { name: "Review", exact: true }).click();
  await page.getByTestId("inbox-review-panel").getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByTestId("capture-card").filter({ hasText: deleteText })).toHaveCount(0);
});

test("mobile inbox actions remain reachable with touch-sized targets", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.goto("/inbox");
  const card = page.getByTestId("capture-card").filter({ hasText: "/task Clean up deployment checklist" });
  await expectMinTouchTarget(card.getByRole("button", { name: "Review", exact: true }));
  await expectMinTouchTarget(card.getByRole("button", { name: "Convert to task" }));
  await expectMinTouchTarget(card.getByRole("button", { name: "Convert to date" }));
  await expectMinTouchTarget(card.getByRole("button", { name: "Archive" }));
  await expectMinTouchTarget(card.getByRole("button", { name: "Delete" }));
});

test("dashboard command page creates real task and date records", async ({ page }) => {
  const { localDateKey } = await import("../../src/lib/dates");
  await login(page);
  const today = localDateKey();
  const taskTitle = `Dashboard command task ${Date.now()}`;
  const dateTitle = `Dashboard command date ${Date.now()}`;
  const editor = page.getByTestId("dashboard-scratchpad");
  await expect(page.getByText("Hint: /task or /date with [2026-07-10] (09:30)")).toBeVisible();

  await markdownLine(editor, 0).fill(`/task ${taskTitle} [${today}] (09:15)`);
  await markdownLine(editor, 0).press("Enter");
  await expect(page.getByTestId("dashboard-live-tasks").getByLabel(`Task title ${taskTitle}`)).toBeVisible();
  await expect(page.getByTestId("dashboard-live-tasks").getByLabel(`${taskTitle} scheduled time`)).toHaveValue("09:15");
  await expect(markdownLine(editor, 0)).toHaveValue("");

  await markdownLine(editor, 0).fill(`/date ${dateTitle} [${today}] (14:30)`);
  await markdownLine(editor, 0).press("Enter");
  await expect(page.getByTestId("dashboard-live-dates").getByLabel(`Date title ${dateTitle}`)).toBeVisible();
  await expect(page.getByTestId("dashboard-live-dates").getByText("14:30")).toBeVisible();

  await page.goto("/inbox");
  await expect(page.getByText(taskTitle)).toHaveCount(0);
});

test("project recovery fields persist after reload", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Projects" }).click();
  await page.locator("main").getByRole("button", { name: /^ContextOS Demo/ }).click();
  const nextAction = `Verify recovery persistence ${Date.now()}`;
  const note = `Recovery note ${Date.now()}`;
  const editor = page.getByTestId("project-recovery-editor");
  await editor.getByPlaceholder("Concrete next action...").fill(nextAction);
  await editor.getByPlaceholder("Concrete next action...").blur();
  await markdownLine(page.getByTestId("project-recovery-notes"), 0).fill(note);
  await expect.poll(() => workspaceProjectRecoveryIncludes(page, "ContextOS Demo", note)).toBe(true);
  await page.reload();
  await expect(page.getByPlaceholder("Concrete next action...")).toHaveValue(nextAction);
  await expect.poll(() => workspaceProjectRecoveryIncludes(page, "ContextOS Demo", note)).toBe(true);
});

test("project subcontexts roll child tasks and dates into parent recovery", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Projects" }).click();
  await page.locator("main").getByRole("button", { name: /^ContextOS Demo/ }).click();

  const subcontext = `Trial Subcontext ${Date.now()}`;
  await page.getByPlaceholder("Add subcontext, course, assignment, or duty...").fill(subcontext);
  await page.getByPlaceholder("Add subcontext, course, assignment, or duty...").press("Enter");
  const subcontextButton = page.getByTestId("project-subcontexts").getByRole("button", { name: new RegExp(`^${subcontext}`) });
  await expect(subcontextButton).toBeVisible();

  await subcontextButton.click();
  await expect(page.getByText("Parent: ContextOS Demo")).toBeVisible();

  const childTask = `Rolled child task ${Date.now()}`;
  const childEditor = page.getByTestId("project-recovery-notes");
  await markdownLine(childEditor, 0).fill(`/task ${childTask} today`);
  await markdownLine(childEditor, 0).press("Enter");
  await expect(page.getByTestId("project-live-tasks").getByLabel(`Task title ${childTask}`)).toBeVisible();

  const childDate = `Rolled child date ${Date.now()}`;
  await markdownLine(childEditor, 0).fill(`/date ${childDate} today`);
  await markdownLine(childEditor, 0).press("Enter");
  await expect(page.getByTestId("project-live-dates").getByLabel(`Date title ${childDate}`)).toBeVisible();

  await page.getByRole("button", { name: "Back" }).click();
  await page.locator("main").getByRole("button", { name: /^ContextOS Demo/ }).click();
  await expect(page.getByTestId("project-live-tasks").getByLabel(`Task title ${childTask}`)).toBeVisible();
  await expect(page.getByTestId("project-live-dates").getByLabel(`Date title ${childDate}`)).toBeVisible();
});

test("project add buttons create direct project task and date records", async ({ page }) => {
  const { localDateKey } = await import("../../src/lib/dates");
  await login(page);
  await page.getByRole("button", { name: "Projects" }).click();
  await page.locator("main").getByRole("button", { name: /^ContextOS Demo/ }).click();

  const today = localDateKey();
  const taskTitle = `Button project task ${Date.now()}`;
  const dateTitle = `Button project date ${Date.now()}`;
  const tasks = page.getByTestId("project-live-tasks");
  const dates = page.getByTestId("project-live-dates");

  await tasks.getByRole("button", { name: "Add task", exact: true }).click();
  const taskComposer = page.getByTestId("project-task-composer");
  await taskComposer.getByPlaceholder("Task title...").fill(taskTitle);
  await taskComposer.getByLabel("Task planned date").fill(today);
  await taskComposer.getByLabel("Task scheduled time").fill("10:45");
  await taskComposer.getByRole("button", { name: "Add task", exact: true }).click();
  await expect(tasks.getByLabel(`Task title ${taskTitle}`)).toBeVisible();
  await expect(tasks.getByLabel(`${taskTitle} scheduled time`)).toHaveValue("10:45");

  await dates.getByRole("button", { name: "Add Date", exact: true }).click();
  const dateComposer = page.getByTestId("project-date-composer");
  await dateComposer.getByPlaceholder("Date title...").fill(dateTitle);
  await dateComposer.getByLabel("Date date").fill(today);
  await dateComposer.getByLabel("Date time").fill("13:20");
  await dateComposer.getByRole("button", { name: "Add Date", exact: true }).click();
  await expect(dates.getByLabel(`Date title ${dateTitle}`)).toBeVisible();
  await expect(dates.getByText("13:20")).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("project-live-tasks").getByLabel(`Task title ${taskTitle}`)).toBeVisible();
  await expect(page.getByTestId("project-live-dates").getByLabel(`Date title ${dateTitle}`)).toBeVisible();
});

test("dashboard command page autosaves local Markdown without creating records", async ({ page }) => {
  await login(page);
  const heading = `Scratchpad check ${Date.now()}`;
  const localTask = `Local checkbox ${Date.now()}`;
  const scratchpad = page.getByTestId("dashboard-scratchpad");
  await expect(page.getByTestId("dashboard-markdown-preview")).toHaveCount(0);
  await fillMarkdownEditor(scratchpad, [`## ${heading}`, `- [ ] ${localTask}`]);
  await expect(markdownLine(scratchpad, 0)).toHaveValue(heading);
  await expect(markdownLine(scratchpad, 1)).toHaveValue(localTask);
  await expect(scratchpad.locator('input[type="checkbox"]').first()).not.toBeChecked();
  await expect(page.getByText("Saved").first()).toBeVisible({ timeout: 3000 });
  await expect(page.getByTestId("dashboard-live-tasks").getByLabel(`Task title ${localTask}`)).toHaveCount(0);
  await page.reload();
  await expect(markdownLine(page.getByTestId("dashboard-scratchpad"), 0)).toHaveValue(heading);
  await expect.poll(() => offlineCacheState(page, `## ${heading}\n\n- [ ] ${localTask}`)).toMatchObject({ hasScratchpad: true });
});

test("dashboard command page supports toggle headings and persists markdown details", async ({ page }) => {
  await login(page);
  const suffix = Date.now();
  const scratchpad = page.getByTestId("dashboard-scratchpad");

  await markdownLine(scratchpad, 0).fill(`/toggle-h1 Toggle One ${suffix}`);
  await markdownLine(scratchpad, 0).press("Enter");
  await expect(markdownLine(scratchpad, 0)).toHaveValue(`Toggle One ${suffix}`);

  await markdownLine(scratchpad, 0).press("Enter");
  await markdownLine(scratchpad, 1).fill("Nested one");
  await markdownLine(scratchpad, 1).press("Enter");
  await markdownLine(scratchpad, 2).fill(`/toggle-h2 Toggle Two ${suffix}`);
  await markdownLine(scratchpad, 2).press("Enter");
  await expect(markdownLine(scratchpad, 2)).toHaveValue(`Toggle Two ${suffix}`);

  await markdownLine(scratchpad, 2).press("Enter");
  await markdownLine(scratchpad, 3).fill("- [ ] Nested todo");
  await expect(markdownLine(scratchpad, 3)).toHaveValue("Nested todo");
  await markdownLine(scratchpad, 3).press("Enter");
  await markdownLine(scratchpad, 4).fill(`/toggle-h3 Toggle Three ${suffix}`);
  await markdownLine(scratchpad, 4).press("Enter");
  await expect(markdownLine(scratchpad, 4)).toHaveValue(`Toggle Three ${suffix}`);

  await scratchpad.getByRole("button", { name: "Collapse toggle heading" }).first().click();
  await expect(markdownLine(scratchpad, 1)).not.toBeVisible();
  await scratchpad.getByRole("button", { name: "Expand toggle heading" }).first().click();
  await expect(markdownLine(scratchpad, 1)).toBeVisible();

  await expect.poll(() => dashboardScratchpadContent(page)).toContain(`<summary><h1>Toggle One ${suffix}</h1></summary>`);
  await expect.poll(() => dashboardScratchpadContent(page)).toContain(`<summary><h2>Toggle Two ${suffix}</h2></summary>`);
  await expect.poll(() => dashboardScratchpadContent(page)).toContain(`<summary><h3>Toggle Three ${suffix}</h3></summary>`);
  await expect.poll(() => dashboardScratchpadContent(page)).toContain("- [ ] Nested todo");
});

test("dashboard view menu can scope and group active records", async ({ page }) => {
  await login(page);
  await page.getByTestId("dashboard-group-select").selectOption("area");
  await page.getByTestId("dashboard-scope-select").selectOption({ label: "Research" });
  const tasks = page.getByTestId("dashboard-live-tasks");
  await expect(tasks.getByLabel("Task title Validate benchmark regression")).toBeVisible();
  await expect(tasks.getByLabel("Task title Process inbox captures")).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId("dashboard-scope-select")).toHaveValue(/.+/);
  await expect(tasks.getByLabel("Task title Validate benchmark regression")).toBeVisible();
});

test("dashboard command tasks support one time, inline editing, crossing, and deletion", async ({ page }) => {
  await login(page);
  const title = `Dashboard real task ${Date.now()}`;
  const taskSection = page.getByTestId("dashboard-live-tasks");
  const editor = page.getByTestId("dashboard-scratchpad");
  await markdownLine(editor, 0).fill(`/task ${title} today at:09:15`);
  await markdownLine(editor, 0).press("Enter");
  await expect(taskSection.getByLabel(`Task title ${title}`)).toBeVisible();
  await expect(taskSection.getByLabel(`${title} scheduled time`)).toHaveValue("09:15");

  const renamed = `${title} edited`;
  const titleInput = taskSection.getByLabel(`Task title ${title}`);
  await titleInput.fill(renamed);
  await titleInput.blur();
  await expect(taskSection.getByLabel(`Task title ${renamed}`)).toBeVisible();
  await expect.poll(() => taskTitleOrder(taskSection)).toContain(renamed);
  await taskSection.getByRole("button", { name: `Mark ${renamed} done` }).click();
  const doneTodayGroup = page.getByTestId("command-task-group-done-today");
  await expect(doneTodayGroup.getByLabel(`Task title ${renamed}`)).toBeVisible();
  await expect(doneTodayGroup.getByRole("button", { name: `Reopen ${renamed}` })).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("dashboard-live-tasks").getByLabel(`Task title ${renamed}`)).toBeVisible();
  await page.getByTestId("dashboard-live-tasks").getByRole("button", { name: `Reopen ${renamed}` }).click();
  await page.getByTestId("dashboard-live-tasks").getByRole("button", { name: `Delete ${renamed}` }).click();
  await expect(page.getByTestId("dashboard-live-tasks").getByLabel(`Task title ${renamed}`)).toHaveCount(0);
});

test("long task titles wrap on mobile instead of truncating", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  const taskSection = page.getByTestId("dashboard-live-tasks");
  const title = `This is a deliberately long task title that should stay fully visible on narrow mobile screens ${Date.now()}`;
  await markdownLine(page.getByTestId("dashboard-scratchpad"), 0).fill(`/task ${title} today`);
  await markdownLine(page.getByTestId("dashboard-scratchpad"), 0).press("Enter");
  const titleField = taskSection.getByLabel(`Task title ${title}`);
  await expect(titleField).toBeVisible();
  await expect
    .poll(async () => titleField.evaluate((field) => field.getBoundingClientRect().height))
    .toBeGreaterThan(24);
});

test("mobile editor and task controls expose accessible hit targets and menus", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);

  const taskSection = page.getByTestId("dashboard-live-tasks");
  await expectMinTouchTarget(taskSection.getByRole("button", { name: "Mark Process inbox captures done" }));
  await expectMinTouchTarget(taskSection.getByRole("button", { name: "Delete Process inbox captures" }));

  const scratchpad = page.getByTestId("dashboard-scratchpad");
  const firstLine = markdownLine(scratchpad, 0);
  await firstLine.click();

  const addBlock = scratchpad.getByTestId("block-action-add").first();
  const blockActions = scratchpad.getByTestId("block-action-menu-trigger").first();
  await expectMinTouchTarget(addBlock);
  await expectMinTouchTarget(blockActions);

  await blockActions.click();
  await expect(blockActions).toHaveAttribute("aria-expanded", "true");
  const menu = scratchpad.getByRole("menu", { name: "Block actions" });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Duplicate" })).toBeVisible();
  await blockActions.click();
  await expect(blockActions).toHaveAttribute("aria-expanded", "false");

  await firstLine.fill("/toggle");
  const listbox = scratchpad.getByRole("listbox", { name: "Block commands" });
  await expect(listbox).toBeVisible();
  await expect(firstLine).toHaveAttribute("aria-expanded", "true");
  await expect(listbox.locator('[role="option"][aria-selected="true"]')).toContainText("Toggle Heading 1");
  await firstLine.press("ArrowDown");
  await expect(listbox.locator('[role="option"][aria-selected="true"]')).toContainText("Toggle Heading 2");
  await firstLine.press("Escape");
  await expect(listbox).not.toBeVisible();

  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});

test("dashboard command tasks support untimed and same-time tasks without an empty-day grid", async ({ page }) => {
  await login(page);
  const taskSection = page.getByTestId("dashboard-live-tasks");
  const editor = page.getByTestId("dashboard-scratchpad");
  const suffix = Date.now();
  const untimed = `Untimed schedule item ${suffix}`;
  await markdownLine(editor, 0).fill(`/task ${untimed}`);
  await markdownLine(editor, 0).press("Enter");
  await expect(taskSection.getByLabel(`Task title ${untimed}`)).toBeVisible();

  const first = `Same time one ${suffix}`;
  await markdownLine(editor, 0).fill(`/task ${first} at:11:00`);
  await markdownLine(editor, 0).press("Enter");
  await expect(taskSection.getByLabel(`Task title ${first}`)).toBeVisible();
  const second = `Same time two ${suffix}`;
  await markdownLine(editor, 0).fill(`/task ${second} at:11:00`);
  await markdownLine(editor, 0).press("Enter");
  await expect(taskSection.getByLabel(`Task title ${first}`)).toBeVisible();
  await expect(taskSection.getByLabel(`Task title ${second}`)).toBeVisible();
  await expect(taskSection.locator('[data-testid="daily-schedule-grid"]')).toHaveCount(0);
});

test("dashboard shows all active workspace tasks without restoring allTasks chrome", async ({ page }) => {
  await login(page);
  const title = "Validate benchmark regression";
  await expect(page.getByTestId("dashboard-section-allTasks")).toHaveCount(0);
  await expect(page.getByTestId("dashboard-live-tasks").getByLabel(`Task title ${title}`)).toBeVisible();
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByPlaceholder("Search workspace...").fill(title);
  await page.getByRole("button", { name: new RegExp(`Task ${title}`) }).click();
  await expect(page).toHaveURL(/\/projects\//);
  await expect(page.getByLabel(`Task title ${title}`)).toBeVisible();
});

test("dashboard command page can create an important date with time", async ({ page }) => {
  await login(page);
  const title = `Dashboard date ${Date.now()}`;
  const datesSection = page.getByTestId("dashboard-live-dates");
  const editor = page.getByTestId("dashboard-scratchpad");
  await markdownLine(editor, 0).fill(`/date ${title} today at:14:30`);
  await markdownLine(editor, 0).press("Enter");
  await expect(datesSection.getByLabel(`Date title ${title}`)).toBeVisible();
  await expect(datesSection.getByText("14:30")).toBeVisible();
  await expect(datesSection.getByRole("button", { name: `Archive ${title}` })).toBeVisible();
  await expect(datesSection.getByRole("button", { name: `Mark ${title} done` })).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId("dashboard-live-dates").getByLabel(`Date title ${title}`)).toBeVisible();
  await page.getByTestId("dashboard-live-dates").getByRole("button", { name: `Archive ${title}` }).click();
  await expect(page.getByTestId("dashboard-live-dates").getByLabel(`Date title ${title}`)).toHaveCount(0);
});

test("today redirects to dashboard and completed today tasks stay interactable", async ({ page }) => {
  await login(page);
  await page.goto("/today");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  const taskTitle = "Process inbox captures";
  const main = page.getByTestId("dashboard-live-tasks");
  await expect(main.getByLabel(`Task title ${taskTitle}`)).toBeVisible();
  await expect(main.getByLabel("Task title Write one clean latest-status note")).toBeVisible();
  await main.getByRole("button", { name: `Mark ${taskTitle} done` }).first().click();
  await expect(main.getByLabel(`Task title ${taskTitle}`)).toBeVisible();
  await expect(main.getByRole("button", { name: `Reopen ${taskTitle}` }).first()).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  const reloaded = page.getByTestId("dashboard-live-tasks");
  await expect(reloaded.getByLabel(`Task title ${taskTitle}`)).toBeVisible();
  await expect(reloaded.getByRole("button", { name: `Reopen ${taskTitle}` }).first()).toBeVisible();
});

test("dashboard ignores legacy allTasks preferences and hides backlog controls", async ({ page }) => {
  await login(page);
  await expect(page.getByTestId("dashboard-section-allTasks")).toHaveCount(0);
  await expect(page.getByLabel("Task sort")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Show completed" })).toHaveCount(0);
  await expect(page.getByTestId("dashboard-add-task-input")).toHaveCount(0);
  await expect(page.getByTestId("dashboard-add-deadline-input")).toHaveCount(0);
  await injectLegacyDashboardPreferences(page);
  await page.reload();
  await expect(page.getByTestId("dashboard-section-allTasks")).toHaveCount(0);
  await expect(page.getByTestId("dashboard-live-tasks")).toBeVisible();
  await expect(page.getByTestId("dashboard-live-dates")).toBeVisible();
  await expect(page.getByTestId("dashboard-section-projects")).toHaveCount(0);
});

test("search results open surfaces where task and standalone note records are visible", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Search", exact: true }).click();

  const taskTitle = "Validate benchmark regression";
  await page.getByPlaceholder("Search workspace...").fill(taskTitle);
  await page.getByRole("button", { name: new RegExp(`Task ${taskTitle}`) }).click();
  await expect(page).toHaveURL(/\/projects\//);
  await expect(page.getByLabel(`Task title ${taskTitle}`)).toBeVisible();

  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByPlaceholder("Search workspace...").fill("Practice Schedule");
  await page.getByRole("button", { name: /Note Practice Schedule/ }).click();
  await expect(page).toHaveURL(/\/resources$/);
  await expect(page.getByText("Practice Schedule")).toBeVisible();
});

test("areas and resources expose PARA navigation", async ({ page }) => {
  await login(page);
  await page.goto("/areas");
  await expect(page.getByRole("heading", { name: "Areas" })).toBeVisible();
  await expect(page.getByText("Engineering")).toBeVisible();
  await page.getByRole("button", { name: "Open Engineering" }).click();
  await expect(page.getByText("Next: Use the dashboard canvas during the next real work session.")).toBeVisible();
  const areaProject = `Area project ${Date.now()}`;
  await page.getByPlaceholder("New project in Engineering...").fill(areaProject);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  const areaProjectButton = page.getByRole("main").getByRole("button", { name: areaProject, exact: true });
  await expect(areaProjectButton).toBeVisible();
  await page.getByRole("button", { name: `Delete ${areaProject}` }).click();
  await expect(areaProjectButton).toHaveCount(0);

  await page.goto("/resources");
  await expect(page.getByRole("heading", { name: "Resources" })).toBeVisible();
  await expect(page.getByText("Practice Schedule")).toBeVisible();
  await expect(page.getByTestId("practice-schedule-table")).toContainText("Status");
  await expect(page.getByTestId("practice-schedule-table")).toContainText("Refine");
  const title = `Vocabulary resource ${Date.now()}`;
  await page.getByPlaceholder("Resource title...").fill(title);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expectInputValue(page, "input", title);
  const resourceEditor = page.locator('[data-testid^="note-editor-"]').first();
  await fillMarkdownEditor(resourceEditor, [`## ${title}`, "- [ ] Practice retrieval"]);
  await expect(markdownLine(resourceEditor, 0)).toHaveValue(title);
  await expect(markdownLine(resourceEditor, 1)).toHaveValue("Practice retrieval");
  await expect(resourceEditor.locator('input[type="checkbox"]').first()).not.toBeChecked();
  await resourceEditor.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved").first()).toBeVisible();

  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByPlaceholder("Search workspace...").fill(title);
  await expect(page.getByText(title).first()).toBeVisible();
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

test("offline notepad edit is stored locally and sync state shows pending work", async ({ page, context }) => {
  await login(page);
  await warmOfflineShell(page);
  await context.setOffline(true);
  const text = `offline scratchpad ${Date.now()}`;
  await fillMarkdownEditor(page.getByTestId("dashboard-scratchpad"), [text]);
  await expect(page.getByText(/pending/i).first()).toBeVisible({ timeout: 4000 });
  await expect.poll(() => offlineCacheState(page, text)).toMatchObject({ hasScratchpad: true, pendingCount: 1 });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(markdownLine(page.getByTestId("dashboard-scratchpad"), 0)).toHaveValue(text);
  await expect.poll(() => offlineCacheState(page, text)).toMatchObject({ hasScratchpad: true, pendingCount: 1 });
  await context.setOffline(false);
  await page.reload();
  await expect(markdownLine(page.getByTestId("dashboard-scratchpad"), 0)).toHaveValue(text);
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("button", { name: /sync now/i }).click();
  await expect(page.getByTestId("pending-count")).toHaveText("0");
});

test("draft-saved domain edit queues one offline mutation", async ({ page, context }) => {
  await login(page);
  await page.goto("/settings");
  await expect(page.getByTestId("pending-count")).toHaveText("0");
  await context.setOffline(true);

  const domainInput = page.getByPlaceholder("Domain name").first();
  const longName = `Research draft save ${Date.now()}`;
  await domainInput.fill(longName);
  await expect(page.getByTestId("offline-edit-warning").first()).toBeVisible();
  await domainInput.blur();

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
  await page.goto("/settings");
  const staleDomain = `Stale cache domain ${Date.now()}`;
  await page.getByPlaceholder("Add domain...").fill(staleDomain);
  await page.getByPlaceholder("Add domain...").press("Enter");
  await expectInputValue(page, "input", staleDomain);
  await expect.poll(async () => {
    const response = await page.request.get("/api/bootstrap");
    const workspace = await response.json();
    return workspace.data.domains.some((domain: { name: string }) => domain.name === staleDomain);
  }).toBe(true);
  await expect(page.getByTestId("pending-count")).toHaveText("0");

  await resetDemo(page);
  await expectInputValue(page, "input", staleDomain);

  await expect(page.getByTestId("global-refresh-from-server")).toBeEnabled();
  await page.getByTestId("global-refresh-from-server").click();
  await expectNoInputValue(page, "input", staleDomain);
  await expectInputValue(page, "input", "Research");
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

test("project pages use recovery notes instead of project note cards", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Projects" }).click();
  await page.locator("main").getByRole("button", { name: /^ContextOS Demo/ }).click();
  await expect(page.getByText("Notes / Decisions")).toHaveCount(0);
  await expect(page.getByTestId("project-command-page")).toBeVisible();
  await expect(page.getByTestId("project-live-tasks")).toBeVisible();
  await expect(page.getByTestId("project-live-dates")).toBeVisible();
  const editor = page.getByTestId("project-recovery-notes");

  const content = `Recovery save check ${Date.now()}`;
  await markdownLine(editor, 0).fill(content);
  await expect(page.getByText("Saved").first()).toBeVisible({ timeout: 3000 });

  await page.reload();
  await expect(markdownLine(page.getByTestId("project-recovery-notes"), 0)).toHaveValue(content);
});

test("date remains stable after save and legacy route redirects", async ({ page }) => {
  const { localDateKey } = await import("../../src/lib/dates");
  await login(page);
  await page.goto("/deadlines");
  await expect(page).toHaveURL(/\/dates$/);
  const today = localDateKey();
  const title = `date-stable ${Date.now()}`;
  await page.getByRole("button", { name: "Add Date" }).click();
  await page.getByPlaceholder("Date title...").fill(title);
  await page.locator('input[type="date"]').first().fill(today);
  await page.getByRole("button", { name: "Add", exact: true }).click();

  await expectInputValue(page, "input", title);
  await expectInputValue(page, 'input[type="date"]', today);
  await page.reload();
  await expectInputValue(page, "input", title);
  await expectInputValue(page, 'input[type="date"]', today);
});

test("project sections follow the simplified order", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Projects" }).click();
  await page.locator("main").getByRole("button", { name: /^ContextOS Demo/ }).click();
  await expect(page).toHaveURL(/\/projects\//);
  const sections = page.locator("main section");
  const headings = await sections.locator("h2").allTextContents();
  expect(headings.slice(0, 4).map((heading) => heading.replace(/\s*\d+$/, ""))).toEqual([
    "Tasks",
    "Dates",
    "Recovery",
    "Subcontexts"
  ]);
  await expect(page.getByTestId("project-live-tasks")).toBeVisible();
});

test("Today and This Week redirect to dashboard without priority terminology", async ({ page }) => {
  await login(page);
  await page.goto("/today");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText(/priorit/i)).toHaveCount(0);
  await page.goto("/this-week");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText(/priorit/i)).toHaveCount(0);
});

test("archive and trash restore flows work", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Projects" }).click();
  await page.locator("main").getByRole("button", { name: /^ContextOS Demo/ }).click();
  await page.getByRole("button", { name: "Archive project" }).click();
  await page.goto("/archive");
  await expect(page.getByText("ContextOS Demo")).toBeVisible();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Restore ContextOS Demo" }).click({ force: true });
  await expect(page.getByText("No archived projects")).toBeVisible();
});
