import { expect, test, type Page } from "@playwright/test";

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
  await login(page);
  await expect(page.getByText("Mobile Command Sheet")).toBeVisible();
  await expect(page.getByRole("button", { name: /Notepad/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Dates/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Tasks/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Projects/ })).toBeVisible();
  await expect(page.getByText("ContextOS Demo").first()).toBeVisible();
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
  const editor = page.getByTestId("project-recovery-editor");
  await editor.getByTestId("project-recovery-editor-line-4").fill(nextAction);
  await editor.getByRole("button", { name: "Save" }).click();
  await page.reload();
  await expect(page.getByTestId("project-recovery-editor-line-4")).toHaveValue(nextAction);
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
  const content = `Scratchpad check ${Date.now()}`;
  await page.getByTestId("dashboard-scratchpad").fill(content);
  await expect(page.getByText(/Saved locally|Updated/i)).toBeVisible({ timeout: 3000 });
  await page.reload();
  await expect(page.getByTestId("dashboard-scratchpad")).toHaveValue(content);
});

test("dashboard sections collapse and persist after refresh", async ({ page }) => {
  await login(page);
  const datesHeader = page.getByRole("button", { name: /Dates/ });
  await datesHeader.click();
  await expect(page.getByTestId("dashboard-section-dates").getByText(/Task due|Deadline|No dated items/)).not.toBeVisible();
  await page.reload();
  await expect(page.getByTestId("dashboard-section-dates").getByText(/Task due|Deadline|No dated items/)).not.toBeVisible();
  await page.getByRole("button", { name: /Dates/ }).click();
  await expect(page.getByTestId("dashboard-section-dates")).toContainText(/Task due|Deadline|No dated items/);
});

test("dashboard can add and complete a real task", async ({ page }) => {
  await login(page);
  const title = `Dashboard real task ${Date.now()}`;
  await page.getByTestId("dashboard-add-task-input").fill(title);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText(title)).toBeVisible();
  await page.getByRole("button", { name: `Mark ${title} done` }).click();
  await expect(page.getByText(title)).not.toBeVisible();
});

test("today tasks stay visible and interactable after completion", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Today", exact: true }).click();
  const taskTitle = "Process inbox captures";
  await expect(page.getByText(taskTitle)).toBeVisible();
  await page.getByRole("button", { name: `Mark ${taskTitle} done` }).click();
  await expect(page.getByText(taskTitle)).toBeVisible();
  await expect(page.getByRole("button", { name: `Mark ${taskTitle} todo` })).toBeVisible();

  await page.reload();
  await expect(page.getByText(taskTitle)).toBeVisible();
  await expect(page.getByRole("button", { name: `Mark ${taskTitle} todo` })).toBeVisible();
});

test("areas and resources expose PARA navigation", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Areas" }).click();
  await expect(page.getByRole("heading", { name: "Areas" })).toBeVisible();
  await expect(page.getByText("Dev / Freelance")).toBeVisible();
  await page.getByRole("button", { name: "Open Dev / Freelance" }).click();
  await expect(page.getByText("Dashboard 2.0 Foundation")).toBeVisible();

  await page.getByRole("button", { name: "Resources" }).click();
  await expect(page.getByRole("heading", { name: "Resources" })).toBeVisible();
  const title = `Vocabulary resource ${Date.now()}`;
  await page.getByPlaceholder("Resource title...").fill(title);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expectInputValue(page, "input", title);

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
  await context.setOffline(true);
  const text = `offline scratchpad ${Date.now()}`;
  await page.getByTestId("dashboard-scratchpad").fill(text);
  await expect(page.getByText(/pending/i).first()).toBeVisible({ timeout: 4000 });
  await expect.poll(() => offlineCacheState(page, text)).toMatchObject({ hasScratchpad: true, pendingCount: 1 });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("dashboard-scratchpad")).toHaveValue(text);
  await expect.poll(() => offlineCacheState(page, text)).toMatchObject({ hasScratchpad: true, pendingCount: 1 });
  await context.setOffline(false);
  await page.reload();
  await expect(page.getByTestId("dashboard-scratchpad")).toHaveValue(text);
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
  await noteEditor.locator('input[data-testid$="-line-0"]').fill(content);
  await expect(page.getByText("Unsaved changes").first()).toBeVisible();
  await noteEditor.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved").first()).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();

  await page.reload();
  await page.getByText("Demo handoff").click();
  await expect(page.locator('[data-testid^="note-editor-"]').first().locator('input[data-testid$="-line-0"]')).toHaveValue(content);
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
