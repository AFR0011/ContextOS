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
      hasScratchpad: Boolean(workspace?.dashboardScratchpads?.some((scratchpad) => scratchpad.content === expectedText || scratchpad.content.includes(expectedText))),
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

async function workspaceCache(page: Page) {
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

    function get<T>(key: string) {
      return new Promise<T | null>((resolve, reject) => {
        const tx = db.transaction("kv", "readonly");
        const request = tx.objectStore("kv").get(key);
        request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
        request.onerror = () => reject(request.error);
      });
    }

    const workspace = await get<any>("workspace");
    const outbox = await get<any[]>("outbox");
    db.close();
    return { workspace, outbox: outbox ?? [] };
  });
}

async function scheduledLine(value: { title: string; dateKey: string; time?: string | null; location?: string }) {
  const { formatScheduledTodoSyntax } = await import("../../src/lib/scheduled-todo");
  return formatScheduledTodoSyntax({ title: value.title, dateKey: value.dateKey, time: value.time ?? null, location: value.location ?? "" });
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

test("seeded demo account can log in and render dashboard", async ({ page }) => {
  const { addDaysToDateKey, localDateKey } = await import("../../src/lib/dates");
  await login(page);
  const today = localDateKey();
  const future = addDaysToDateKey(today, 4) ?? today;
  await expect(page.getByText("Mobile Command Sheet")).toBeVisible();
  await expect(page.getByRole("button", { name: /Notepad/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Dates/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Daily timeline/ })).toHaveCount(0);
  await expect(page.getByDisplayValue(await scheduledLine({ title: "Process inbox captures", dateKey: today, time: "09:30" }))).toBeVisible();
  await expect(page.getByDisplayValue(await scheduledLine({ title: "ContextOS v0.1 verification pass", dateKey: future }))).toBeVisible();
  await expect(page.getByRole("button", { name: /Projects/ })).toBeVisible();
  await expect(page.getByTestId("dashboard-section-projects").getByRole("button", { name: /ContextOS Demo/ })).toBeVisible();
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
  await page.getByTestId("project-recovery-notes").getByRole("button", { name: "Save" }).click();
  await page.reload();
  await expect(page.getByPlaceholder("Concrete next action...")).toHaveValue(nextAction);
  await expect(markdownLine(page.getByTestId("project-recovery-notes"), 0)).toHaveValue(note);
});

test("project subcontexts roll child tasks and deadlines into parent recovery", async ({ page }) => {
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
  await page.getByText(/Active Tasks/).click();
  await page.getByPlaceholder("Add task...").fill(childTask);
  await page.getByPlaceholder("Add task...").press("Enter");

  const childDeadline = `Rolled child deadline ${Date.now()}`;
  const deadlineSection = page.locator("section").filter({ hasText: "Deadlines" });
  await deadlineSection.getByPlaceholder("Deadline title...").fill(childDeadline);
  await deadlineSection.locator("button").last().click();

  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: /^ContextOS Demo/ }).click();
  await page.getByText(/Active Tasks/).click();
  await expect(page.getByText(childTask)).toBeVisible();
  await expect(page.getByText(subcontext).first()).toBeVisible();
  await expect(page.getByText(childDeadline)).toBeVisible();
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

test("dashboard notepad plain todos stay scratch-only", async ({ page }) => {
  await login(page);
  const text = `Text Amir ${Date.now()}`;
  const scratchpad = page.getByTestId("dashboard-scratchpad");
  await markdownLine(scratchpad, 0).fill(text);
  await scratchpad.locator('input[type="checkbox"]').first().check();

  await expect.poll(async () => {
    const { workspace } = await workspaceCache(page);
    return {
      taskMatches: workspace.tasks.filter((task: any) => task.title === text && !task.trashedAt).length,
      deadlineMatches: workspace.deadlines.filter((deadline: any) => deadline.title === text && !deadline.trashedAt).length,
      scratch: workspace.dashboardScratchpads[0]?.content ?? ""
    };
  }).toEqual({ taskMatches: 0, deadlineMatches: 0, scratch: `- [x] ${text}` });
});

test("dashboard notepad invalid scheduled syntax shows validation without creating entities", async ({ page }) => {
  await login(page);
  const text = `Invalid syntax ${Date.now()}`;
  const invalidLine = `${text} (310226) [2500]`;
  const scratchpad = page.getByTestId("dashboard-scratchpad");
  await markdownLine(scratchpad, 0).fill(invalidLine);
  await expect(page.getByText(/Invalid date/)).toBeVisible();

  await expect.poll(async () => {
    const { workspace } = await workspaceCache(page);
    return {
      taskMatches: workspace.tasks.filter((task: any) => task.title === text && !task.trashedAt).length,
      deadlineMatches: workspace.deadlines.filter((deadline: any) => deadline.title === text && !deadline.trashedAt).length
    };
  }).toEqual({ taskMatches: 0, deadlineMatches: 0 });
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
  const notepadHeader = page.getByRole("button", { name: /Notepad/ });
  await notepadHeader.click();
  await expect(page.getByTestId("dashboard-scratchpad")).not.toBeVisible();
  await page.reload();
  await expect(page.getByTestId("dashboard-scratchpad")).not.toBeVisible();
  await page.getByRole("button", { name: /Notepad/ }).click();
  await expect(page.getByTestId("dashboard-scratchpad")).toBeVisible();
});

test("dashboard notepad creates, edits, checks, and demotes a scheduled task without duplicating it", async ({ page }) => {
  const { localDateKey } = await import("../../src/lib/dates");
  await login(page);
  const today = localDateKey();
  const title = `Dashboard real task ${Date.now()}`;
  const createdLine = await scheduledLine({ title, dateKey: today, time: "09:15" });
  const scratchpad = page.getByTestId("dashboard-scratchpad");

  await markdownLine(scratchpad, 0).fill(createdLine);
  await expect(page.getByDisplayValue(createdLine)).toBeVisible();

  await expect.poll(async () => {
    const { workspace } = await workspaceCache(page);
    return workspace.tasks.filter((task: any) => task.title === title && !task.trashedAt);
  }).toHaveLength(1);

  const before = await workspaceCache(page);
  const taskId = before.workspace.tasks.find((task: any) => task.title === title && !task.trashedAt).id;
  const updatedTitle = `${title} and rope`;
  const updatedLine = await scheduledLine({ title: updatedTitle, dateKey: today, time: "10:45" });
  await page.getByDisplayValue(createdLine).fill(updatedLine);

  await expect.poll(async () => {
    const { workspace } = await workspaceCache(page);
    const task = workspace.tasks.find((item: any) => item.id === taskId);
    return task ? { title: task.title, startTime: task.startTime, activeCopies: workspace.tasks.filter((item: any) => !item.trashedAt && item.title.includes(title)).length } : null;
  }).toEqual({ title: updatedTitle, startTime: "10:45", activeCopies: 1 });

  const editedBlock = page.locator('[data-testid="dashboard-notepad-today"] .group').filter({ has: page.getByDisplayValue(updatedLine) }).first();
  await editedBlock.locator('input[type="checkbox"]').check();
  await expect.poll(async () => {
    const { workspace } = await workspaceCache(page);
    return workspace.tasks.find((item: any) => item.id === taskId)?.status;
  }).toBe("done");

  await page.getByDisplayValue(updatedLine).fill(updatedTitle);
  await expect.poll(async () => {
    const { workspace } = await workspaceCache(page);
    return workspace.tasks.find((item: any) => item.id === taskId)?.trashedAt;
  }).not.toBeNull();
  await expect(page.getByDisplayValue(updatedTitle)).toBeVisible();

  await page.reload();
  await expect(page.getByDisplayValue(updatedTitle)).toBeVisible();
});

test("dashboard notepad creates and persists a location-bearing deadline", async ({ page }) => {
  const { addDaysToDateKey, localDateKey } = await import("../../src/lib/dates");
  await login(page);
  const title = `Dashboard deadline ${Date.now()}`;
  const dateKey = addDaysToDateKey(localDateKey(), 3) ?? localDateKey();
  const line = await scheduledLine({ title, dateKey, time: "15:00", location: "China Bazaar" });
  await markdownLine(page.getByTestId("dashboard-scratchpad"), 0).fill(line);
  await expect(page.getByDisplayValue(line)).toBeVisible();

  await expect.poll(async () => {
    const { workspace } = await workspaceCache(page);
    const deadline = workspace.deadlines.find((item: any) => item.title === title && !item.trashedAt);
    return deadline ? { date: deadline.date, time: deadline.time, location: deadline.location } : null;
  }).toEqual({ date: dateKey, time: "15:00", location: "China Bazaar" });

  await page.reload();
  await expect(page.getByDisplayValue(line)).toBeVisible();
});

test("today tasks stay visible and interactable after completion", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
  const taskTitle = "Process inbox captures";
  const main = page.locator("main");
  await expect(main.getByText(taskTitle).first()).toBeVisible();
  await main.getByRole("button", { name: `Mark ${taskTitle} done` }).first().click();
  await expect(main.getByText(taskTitle).first()).toBeVisible();
  await expect(main.getByRole("button", { name: `Mark ${taskTitle} todo` }).first()).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
  await expect(main.getByText(taskTitle).first()).toBeVisible();
  await expect(main.getByRole("button", { name: `Mark ${taskTitle} todo` }).first()).toBeVisible();
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

test("offline scheduled notepad task is stored locally and queued", async ({ page, context }) => {
  const { localDateKey } = await import("../../src/lib/dates");
  await login(page);
  await warmOfflineShell(page);
  await context.setOffline(true);

  const title = `offline scheduled ${Date.now()}`;
  const line = await scheduledLine({ title, dateKey: localDateKey(), time: "13:00" });
  await markdownLine(page.getByTestId("dashboard-scratchpad"), 0).fill(line);
  await expect(page.getByDisplayValue(line)).toBeVisible();

  await expect.poll(async () => {
    const { workspace, outbox } = await workspaceCache(page);
    return {
      hasTask: Boolean(workspace.tasks.some((task: any) => task.title === title && task.startTime === "13:00" && !task.trashedAt)),
      queuedTask: Boolean(outbox.some((mutation: any) => mutation.entityType === "tasks"))
    };
  }).toEqual({ hasTask: true, queuedTask: true });

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByDisplayValue(line)).toBeVisible();
  await context.setOffline(false);
  await page.goto("/settings");
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

test("long note edits save intentionally and persist", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Projects" }).click();
  await page.getByRole("button", { name: /^ContextOS Demo/ }).click();
  await page.getByText("Demo handoff").click();

  const content = `Draft save check ${Date.now()}`;
  const noteEditor = page.locator('[data-testid^="note-editor-"]').first();
  await markdownLine(noteEditor, 0).fill(content);
  await expect(page.getByText("Unsaved changes").first()).toBeVisible();
  await noteEditor.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved").first()).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();

  await page.reload();
  await page.getByText("Demo handoff").click();
  await expect(markdownLine(page.locator('[data-testid^="note-editor-"]').first(), 0)).toHaveValue(content);
});

test("deadline date remains stable after save and refresh", async ({ page }) => {
  const { localDateKey } = await import("../../src/lib/dates");
  await login(page);
  await page.goto("/deadlines");
  const today = localDateKey();
  const title = `date-stable deadline ${Date.now()}`;
  await page.getByRole("button", { name: "Add Deadline" }).click();
  await page.getByPlaceholder("Deadline title...").fill(title);
  await page.locator('input[type="date"]').first().fill(today);
  await page.getByRole("button", { name: "Add", exact: true }).click();

  await expectInputValue(page, "input", title);
  await expectInputValue(page, 'input[type="date"]', today);
  await page.reload();
  await expectInputValue(page, "input", title);
  await expectInputValue(page, 'input[type="date"]', today);
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
