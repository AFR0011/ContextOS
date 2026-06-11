import { expect, test, type Locator, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@contextos.local");
  await page.getByLabel("Password").fill("contextos-demo-v011");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page.request.post("/api/reset-demo");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
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

async function offlineCacheState(page: Page, text: string) {
  return page.evaluate(async (expectedText) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("contextos-offline-v1", 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains("kv")) database.createObjectStore("kv");
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    function get<T>(key: string) {
      return new Promise<T | null>((resolve, reject) => {
        const tx = db.transaction("kv", "readonly");
        const request = tx.objectStore("kv").get(key);
        request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
        request.onerror = () => reject(request.error);
      });
    }

    const workspace = await get<{ captures?: { text: string }[]; dashboardScratchpads?: { content: string }[] }>("workspace");
    const outbox = await get<{ payload?: { text?: string; content?: string } }[]>("outbox");
    db.close();
    return {
      hasCapture: Boolean(workspace?.captures?.some((capture) => capture.text === expectedText)),
      hasScratchpad: Boolean(workspace?.dashboardScratchpads?.some((scratchpad) => scratchpad.content === expectedText)),
      pendingCount: outbox?.length ?? 0
    };
  }, text);
}

async function dashboardScratchpadContent(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("contextos-offline-v1", 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains("kv")) database.createObjectStore("kv");
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const workspace = await new Promise<{ dashboardScratchpads?: { content: string }[] } | null>((resolve, reject) => {
      const tx = db.transaction("kv", "readonly");
      const request = tx.objectStore("kv").get("workspace");
      request.onsuccess = () => resolve((request.result as { dashboardScratchpads?: { content: string }[] } | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });

    db.close();
    return workspace?.dashboardScratchpads?.[0]?.content ?? "";
  });
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

test("dashboard preferences restore default sections when legacy order is missing dates and tasks", async () => {
  const { normalizeDashboardPreference } = await import("../../src/lib/dashboard-preferences");
  const preference = normalizeDashboardPreference({
    sectionOrder: ["notepad", "projects"],
    collapsedSections: ["projects", "legacy", "projects"],
    dateWindowDays: 7,
    reviewPromptDismissals: ["daily-startup:2026-06-09"],
    showCompleted: true
  });

  expect(preference.sectionOrder).toEqual(["notepad", "dates", "tasks", "allTasks", "projects"]);
  expect(preference.collapsedSections).toEqual(["projects"]);
  expect(preference.dateWindowDays).toBe(7);
  expect(preference.reviewPromptDismissals).toEqual(["daily-startup:2026-06-09"]);
  expect(preference.showCompleted).toBe(true);
});

test("seeded demo account can log in and render dashboard", async ({ page }) => {
  await login(page);
  await expect(page.getByText("Mobile Command Sheet")).toBeVisible();
  await expect(page.getByTestId("dashboard-section-notepad")).toBeVisible();
  await expect(page.getByTestId("dashboard-section-dates")).toBeVisible();
  await expect(page.getByTestId("dashboard-section-tasks")).toBeVisible();
  await expect(page.getByTestId("dashboard-section-allTasks")).toBeVisible();
  await expect(page.getByTestId("dashboard-section-projects")).toBeVisible();
  await expect(page.getByTestId("dashboard-section-projects").getByRole("button", { name: /ContextOS Demo/ })).toBeVisible();
  const timeline = page.getByTestId("dashboard-section-tasks");
  await expect(timeline.getByLabel("Task title Process inbox captures")).toBeVisible();
  await expect(timeline.getByLabel("Process inbox captures scheduled time")).toHaveValue("09:30");
  await expect(timeline.getByLabel("Task title Write one clean latest-status note")).toBeVisible();
  await expect(page.getByTestId("dashboard-section-allTasks").getByLabel("Task title Rerun RF baseline with corrected threshold logic")).toBeVisible();
});

test("quick capture appears in inbox and can convert to a task", async ({ page }) => {
  await login(page);
  const text = `offline-ready capture ${Date.now()}`;
  await page.goto("/inbox");
  await page.getByPlaceholder(/Quick capture/i).fill(`/task ${text}`);
  await page.getByPlaceholder(/Quick capture/i).press("Enter");
  await expect(page.getByText(`/task ${text}`)).toBeVisible();
  await page.getByRole("button", { name: "Capture actions" }).first().click();
  await page.getByRole("button", { name: "Convert to task" }).click();
  await expect(page.getByText("converted")).toBeVisible();
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByPlaceholder("Search workspace...").fill(text);
  await expect(page.getByText(text).first()).toBeVisible();
});

test("dashboard quick capture sends slash commands to inbox", async ({ page }) => {
  await login(page);
  const title = `Dashboard captured task ${Date.now()}`;
  const capture = page.getByTestId("dashboard-quick-capture");
  await capture.getByPlaceholder(/Quick capture/i).fill(`/task ${title}`);
  await capture.getByRole("button", { name: "Capture" }).click();
  await page.goto("/inbox");
  await expect(page.getByText(`/task ${title}`)).toBeVisible();
});

test("project recovery fields persist after reload", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Projects" }).click();
  await page.getByRole("button", { name: /^ContextOS Demo/ }).click();
  const nextAction = `Verify recovery persistence ${Date.now()}`;
  const note = `Recovery note ${Date.now()}`;
  const editor = page.getByTestId("project-recovery-editor");
  await editor.getByPlaceholder("Concrete next action...").fill(nextAction);
  await editor.getByPlaceholder("Concrete next action...").blur();
  await markdownLine(page.getByTestId("project-recovery-notes"), 0).fill(note);
  await expect(page.getByText("Unsaved changes").first()).toBeVisible();
  await page.getByTestId("project-recovery-notes").getByRole("button", { name: "Save" }).click();
  await page.reload();
  await expect(page.getByPlaceholder("Concrete next action...")).toHaveValue(nextAction);
  await expect(markdownLine(page.getByTestId("project-recovery-notes"), 0)).toHaveValue(note);
});

test("project subcontexts roll child tasks and dates into parent recovery", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Projects" }).click();
  await page.getByRole("button", { name: /^ContextOS Demo/ }).click();

  const subcontext = `Trial Subcontext ${Date.now()}`;
  await page.getByPlaceholder("Add subcontext, course, assignment, or duty...").fill(subcontext);
  await page.getByPlaceholder("Add subcontext, course, assignment, or duty...").press("Enter");
  await expect(page.getByRole("button", { name: new RegExp(subcontext) })).toBeVisible();

  await page.getByRole("button", { name: new RegExp(subcontext) }).click();
  await expect(page.getByText("Parent: ContextOS Demo")).toBeVisible();

  const childTask = `Rolled child task ${Date.now()}`;
  await page.getByPlaceholder("Add task...").fill(childTask);
  await page.getByPlaceholder("Add task...").press("Enter");

  const childDate = `Rolled child date ${Date.now()}`;
  const datesSection = page.locator("section").filter({ hasText: /^Dates/ });
  await datesSection.getByPlaceholder("Important date...").fill(childDate);
  await datesSection.getByRole("button", { name: "Add date" }).click();

  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: /^ContextOS Demo/ }).click();
  await expect(page.getByLabel(`Task title ${childTask}`)).toBeVisible();
  await expect(page.getByText(subcontext).first()).toBeVisible();
  await expectInputValue(page, "input", childDate);
});

test("dashboard notepad autosaves and persists after reload", async ({ page }) => {
  await login(page);
  const heading = `Scratchpad check ${Date.now()}`;
  const content = `## ${heading}\n\n- [ ] Render markdown`;
  const scratchpad = page.getByTestId("dashboard-scratchpad");
  await expect(page.getByTestId("dashboard-markdown-preview")).toHaveCount(0);
  await fillMarkdownEditor(scratchpad, [`## ${heading}`, "- [ ] Render markdown"]);
  await expect(markdownLine(scratchpad, 0)).toHaveValue(heading);
  await expect(markdownLine(scratchpad, 1)).toHaveValue("Render markdown");
  await expect(scratchpad.locator('input[type="checkbox"]').first()).not.toBeChecked();
  await expect(page.getByText(/Saved locally|Updated/i)).toBeVisible({ timeout: 3000 });
  await page.reload();
  await expect(markdownLine(page.getByTestId("dashboard-scratchpad"), 0)).toHaveValue(heading);
  await expect.poll(() => offlineCacheState(page, content)).toMatchObject({ hasScratchpad: true });
});

test("dashboard notepad supports toggle headings and persists markdown details", async ({ page }) => {
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

test("dashboard sections collapse and persist after refresh", async ({ page }) => {
  await login(page);
  const datesHeader = page.getByTestId("dashboard-section-dates").getByRole("button", { name: /Dates/ });
  await datesHeader.click();
  await expect(page.getByTestId("dashboard-section-dates").getByTestId("dashboard-add-deadline-input")).not.toBeVisible();
  await page.reload();
  await expect(page.getByTestId("dashboard-section-dates").getByTestId("dashboard-add-deadline-input")).not.toBeVisible();
  await page.getByTestId("dashboard-section-dates").getByRole("button", { name: /Dates/ }).click();
  await expect(page.getByTestId("dashboard-section-dates").getByTestId("dashboard-add-deadline-input")).toBeVisible();
});

test("dashboard daily timeline supports one time, inline editing, crossing, and deletion", async ({ page }) => {
  await login(page);
  const title = `Dashboard real task ${Date.now()}`;
  const taskSection = page.getByTestId("dashboard-section-tasks");
  await page.getByTestId("dashboard-add-task-input").fill(title);
  await taskSection.getByLabel("Task scheduled time").fill("09:15");
  await taskSection.getByLabel("Task project").selectOption({ label: "ContextOS Demo" });
  await taskSection.getByRole("button", { name: "Add", exact: true }).click();
  await expect(taskSection.getByLabel(`Task title ${title}`)).toBeVisible();
  await expect(taskSection.getByLabel(`${title} scheduled time`)).toHaveValue("09:15");

  const renamed = `${title} edited`;
  const titleInput = taskSection.getByLabel(`Task title ${title}`);
  await titleInput.fill(renamed);
  await titleInput.blur();
  await taskSection.getByRole("button", { name: `Mark ${renamed} done` }).click();
  await expect(taskSection.getByLabel(`Task title ${renamed}`)).toBeVisible();
  await expect(taskSection.getByRole("button", { name: `Reopen ${renamed}` })).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("dashboard-section-tasks").getByLabel(`Task title ${renamed}`)).toBeVisible();
  await page.getByTestId("dashboard-section-tasks").getByRole("button", { name: `Reopen ${renamed}` }).click();
  await page.getByTestId("dashboard-section-tasks").getByRole("button", { name: `Delete ${renamed}` }).click();
  await expect(page.getByTestId("dashboard-section-tasks").getByLabel(`Task title ${renamed}`)).toHaveCount(0);
});

test("dashboard daily timeline supports untimed and same-time tasks without an empty-day grid", async ({ page }) => {
  await login(page);
  const taskSection = page.getByTestId("dashboard-section-tasks");
  const suffix = Date.now();
  const untimed = `Untimed schedule item ${suffix}`;
  await page.getByTestId("dashboard-add-task-input").fill(untimed);
  await taskSection.getByRole("button", { name: "Add", exact: true }).click();
  await expect(taskSection.getByLabel(`Task title ${untimed}`)).toBeVisible();

  const first = `Same time one ${suffix}`;
  await page.getByTestId("dashboard-add-task-input").fill(first);
  await taskSection.getByLabel("Task scheduled time").fill("11:00");
  await taskSection.getByRole("button", { name: "Add", exact: true }).click();
  await expect(taskSection.getByLabel(`Task title ${first}`)).toBeVisible();
  const second = `Same time two ${suffix}`;
  await page.getByTestId("dashboard-add-task-input").fill(second);
  await taskSection.getByLabel("Task scheduled time").fill("11:00");
  await taskSection.getByRole("button", { name: "Add", exact: true }).click();
  await expect(taskSection.getByLabel(`Task title ${first}`)).toBeVisible();
  await expect(taskSection.getByLabel(`Task title ${second}`)).toBeVisible();
  await expect(taskSection.locator('[data-testid="daily-schedule-grid"]')).toHaveCount(0);
});

test("dashboard can add a project-linked important date with time and location", async ({ page }) => {
  await login(page);
  const title = `Dashboard date ${Date.now()}`;
  const datesSection = page.getByTestId("dashboard-section-dates");
  await datesSection.getByTestId("dashboard-add-deadline-input").fill(title);
  await datesSection.getByLabel("Date time").fill("14:30");
  await datesSection.getByLabel("Date location").fill("Library");
  await datesSection.getByLabel("Date project").selectOption({ label: "ContextOS Demo" });
  await datesSection.getByRole("button", { name: "Add", exact: true }).click();
  await expect(datesSection.getByText(title)).toBeVisible();
  await expect(datesSection.getByText("14:30")).toBeVisible();
  await expect(datesSection.getByText("Library")).toBeVisible();
  await expect(datesSection.getByText("Write one clean latest-status note")).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId("dashboard-section-dates").getByText(title)).toBeVisible();
});

test("today tasks stay visible and interactable after completion", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
  const taskTitle = "Process inbox captures";
  const main = page.locator("main");
  await expect(main.getByLabel(`Task title ${taskTitle}`)).toBeVisible();
  await expect(main.getByLabel("Task title Write one clean latest-status note")).toBeVisible();
  await main.getByRole("button", { name: `Mark ${taskTitle} done` }).first().click();
  await expect(main.getByLabel(`Task title ${taskTitle}`)).toBeVisible();
  await expect(main.getByRole("button", { name: `Reopen ${taskTitle}` }).first()).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
  await expect(main.getByLabel(`Task title ${taskTitle}`)).toBeVisible();
  await expect(main.getByRole("button", { name: `Reopen ${taskTitle}` }).first()).toBeVisible();
});

test("dashboard Tasks includes future tasks and follows Show completed", async ({ page }) => {
  await login(page);
  const section = page.getByTestId("dashboard-section-allTasks");
  const title = "Rerun RF baseline with corrected threshold logic";
  await expect(section.getByLabel(`Task title ${title}`)).toBeVisible();
  await section.getByRole("button", { name: `Mark ${title} done` }).click();
  await expect(section.getByLabel(`Task title ${title}`)).not.toBeVisible();
  await page.getByRole("button", { name: "Show completed" }).click();
  await expect(section.getByLabel(`Task title ${title}`)).toBeVisible();
  await expect(section.getByRole("button", { name: `Reopen ${title}` })).toBeVisible();
});

test("areas and resources expose PARA navigation", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Areas" }).click();
  await expect(page.getByRole("heading", { name: "Areas" })).toBeVisible();
  await expect(page.getByText("Dev / Freelance")).toBeVisible();
  await page.getByRole("button", { name: "Open Dev / Freelance" }).click();
  await expect(page.getByText("Next: Use the dashboard canvas during the next real work session.")).toBeVisible();
  const areaProject = `Area project ${Date.now()}`;
  await page.getByPlaceholder("New project in Dev / Freelance...").fill(areaProject);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText(areaProject)).toBeVisible();
  await page.getByRole("button", { name: `Delete ${areaProject}` }).click();
  await expect(page.getByText(areaProject)).not.toBeVisible();

  await page.getByRole("button", { name: "Resources" }).click();
  await expect(page.getByRole("heading", { name: "Resources" })).toBeVisible();
  await expect(page.getByText("Piano Schedule")).toBeVisible();
  await expect(page.getByTestId("piano-schedule-table")).toContainText("Status");
  await expect(page.getByTestId("piano-schedule-table")).toContainText("Refine");
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

  const reset = await page.request.post("/api/reset-demo");
  expect(reset.ok()).toBeTruthy();
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
  await page.getByRole("button", { name: /^ContextOS Demo/ }).click();
  await expect(page.getByText("Notes / Decisions")).toHaveCount(0);
  const editor = page.getByTestId("project-recovery-notes");
  await expect(editor).toContainText("Demo handoff");

  const content = `Recovery save check ${Date.now()}`;
  await markdownLine(editor, 0).fill(content);
  await expect(page.getByText("Unsaved changes").first()).toBeVisible();
  await editor.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved").first()).toBeVisible();

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
  await page.getByRole("button", { name: /^ContextOS Demo/ }).click();
  await expect(page).toHaveURL(/\/projects\//);
  const sections = page.locator("main section");
  const headings = await sections.locator("h3").allTextContents();
  expect(headings.slice(0, 4).map((heading) => heading.replace(/\s*\(\d+\)$/, ""))).toEqual([
    "Active Tasks",
    "Dates",
    "Recovery Canvas",
    "Subcontexts"
  ]);
  await expect(page.getByTestId("daily-timeline-list")).toBeVisible();
});

test("Today and This Week contain no priority editor terminology", async ({ page }) => {
  await login(page);
  await page.goto("/today");
  await expect(page.getByText(/priorit/i)).toHaveCount(0);
  await page.goto("/week");
  await expect(page.getByText(/priorit/i)).toHaveCount(0);
});

test("archive and trash restore flows work", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Projects" }).click();
  await page.getByRole("button", { name: /^ContextOS Demo/ }).click();
  await page.getByRole("button", { name: "Archive project" }).click();
  await page.goto("/archive");
  await expect(page.getByText("ContextOS Demo")).toBeVisible();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Restore ContextOS Demo" }).click({ force: true });
  await expect(page.getByText("No archived projects")).toBeVisible();
});
