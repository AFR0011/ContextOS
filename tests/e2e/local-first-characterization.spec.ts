import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@contextos.local");
  await page.getByLabel("Password").fill("contextos-demo-v011");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
}

async function warmServiceWorker(page: Page) {
  const readiness = page.getByTestId("offline-shell-readiness");
  await expect(readiness).toHaveAttribute("data-ready", "true", { timeout: 30_000 });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
  await expect(page.getByTestId("offline-shell-readiness")).toHaveAttribute("data-ready", "true");
}


async function resetDemo(page: Page) {
  const result = await page.evaluate(async () => {
    const response = await fetch("/api/reset-demo", { method: "POST" });
    return { status: response.status, body: await response.text() };
  });
  expect(result.status, result.body).toBe(200);
}

async function localWorkspaceState(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("contextos-offline-v1", 4);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const users = await new Promise<Array<{ id: string; email: string }>>((resolve, reject) => {
      const tx = db.transaction("users", "readonly");
      const request = tx.objectStore("users").getAll();
      request.onsuccess = () => resolve(request.result as Array<{ id: string; email: string }>);
      request.onerror = () => reject(request.error);
    });
    const user = users.find((item) => item.email === "demo@contextos.local") ?? users[0];
    if (!user) {
      db.close();
      throw new Error("No verified local user found.");
    }

    const state = await new Promise<{ workspace: any; outbox: any[] }>((resolve, reject) => {
      const tx = db.transaction(["workspaces", "outboxes"], "readonly");
      const workspaceRequest = tx.objectStore("workspaces").get(user.id);
      const outboxRequest = tx.objectStore("outboxes").get(user.id);
      let workspace: any;
      let outbox: any[] = [];
      workspaceRequest.onsuccess = () => { workspace = workspaceRequest.result; };
      workspaceRequest.onerror = () => reject(workspaceRequest.error);
      outboxRequest.onsuccess = () => { outbox = outboxRequest.result ?? []; };
      outboxRequest.onerror = () => reject(outboxRequest.error);
      tx.oncomplete = () => resolve({ workspace, outbox });
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("Local state read aborted."));
    });
    db.close();
    return state;
  });
}

async function serverWorkspace(page: Page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/bootstrap", { cache: "no-store" });
    if (!response.ok) throw new Error(`bootstrap failed with ${response.status}`);
    return (await response.json()).data;
  });
}

async function activeDemoProjectId(page: Page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/bootstrap");
    if (!response.ok) throw new Error(`bootstrap failed with ${response.status}`);
    const result = await response.json();
    const project = result.data.projects.find(
      (item: { state?: string }) => item.state === "active"
    );
    if (!project?.id) throw new Error("No active project found in demo workspace");
    return project.id as string;
  });
}

test.describe("local-first completion characterization", () => {
  test("core workspace navigation remains usable after connectivity is lost", async ({ page, context }) => {
    await login(page);
    await warmServiceWorker(page);

    await context.setOffline(true);

    await page.getByRole("button", { name: "Projects", exact: true }).click();
    await expect(page).toHaveURL(/\/projects$/);
    await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Projects", exact: true }).click();
    await expect(page).toHaveURL(/\/projects$/);
    await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page).toHaveURL(/\/search$/);
    await expect(page.getByPlaceholder("Search workspace...")).toBeVisible();
  });

  test("a dynamic project route can be opened and hard-refreshed while offline", async ({ page, context }) => {
    await login(page);
    await warmServiceWorker(page);
    const projectId = await activeDemoProjectId(page);

    // Warm the project while online once, then require the exact dynamic route to survive offline.
    await page.goto(`/projects/${projectId}`);
    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}$`));
    await expect(page.getByTestId("project-command-page")).toBeVisible();

    await context.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}$`));
    await expect(page.getByTestId("project-command-page")).toBeVisible();
  });

  test("canonical offline mutations survive hard reload and converge after reconnect", async ({ page, context }) => {
    const { localDateKey } = await import("../../src/lib/dates");
    await login(page);
    await resetDemo(page);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
    await warmServiceWorker(page);

    const today = localDateKey();
    const nonce = Date.now();
    const areaName = `Offline Area ${nonce}`;
    const projectName = `Offline Project ${nonce}`;
    const objective = `Offline objective edited ${nonce}`;
    const taskTitle = `Offline Task ${nonce}`;
    const dateTitle = `Offline Event ${nonce}`;
    const dailyNoteText = `Offline Daily Note ${nonce}`;

    await context.setOffline(true);
    await expect(page.getByTestId("global-sync-indicator").first()).toContainText("Offline");

    await page.getByRole("button", { name: "Areas", exact: true }).click();
    await page.getByRole("button", { name: "New Area", exact: true }).click();
    await page.getByPlaceholder("Area name").fill(areaName);
    await page.getByRole("button", { name: "Create Area", exact: true }).click();
    await expect(page.getByText(areaName, { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Projects", exact: true }).click();
    await page.getByRole("button", { name: "New Project", exact: true }).click();
    await page.getByPlaceholder("Project name").fill(projectName);
    await page.getByTestId("project-create-form").getByLabel("Area").selectOption({ label: areaName });
    await page.getByPlaceholder("What outcome is this project trying to reach?").fill("Initial offline objective");
    await page.getByRole("button", { name: "Create Project", exact: true }).click();
    await expect(page.getByTestId("project-command-page")).toBeVisible();

    const projectPath = new URL(page.url()).pathname;
    const projectId = decodeURIComponent(projectPath.split("/").pop() ?? "");
    expect(projectId).toBeTruthy();

    const objectiveField = page.getByPlaceholder("What outcome is this Project trying to reach?");
    await objectiveField.fill(objective);
    await objectiveField.blur();

    const tasks = page.getByTestId("project-live-tasks");
    await tasks.getByPlaceholder("Add a task...").fill(taskTitle);
    await tasks.getByLabel("Planned day").fill(today);
    await tasks.getByLabel("Scheduled time").fill("11:15");
    await tasks.getByRole("button", { name: "Add", exact: true }).click();
    await expect(tasks.getByText(taskTitle, { exact: true })).toBeVisible();

    const dates = page.getByTestId("project-dates");
    await dates.getByLabel("Date kind").selectOption("event");
    await dates.getByPlaceholder("Add a Date...").fill(dateTitle);
    await dates.getByLabel("Date", { exact: true }).fill(today);
    await dates.getByLabel("Date start time").fill("14:00");
    await dates.getByLabel("Date end time").fill("14:45");
    await dates.getByPlaceholder("Details (optional)").fill("Created offline and replayed in dependency order.");
    await dates.getByRole("button", { name: "Add", exact: true }).click();
    await expect(dates.getByText(dateTitle, { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Home", exact: true }).click();
    await page.getByLabel("Daily Notes").fill(dailyNoteText);
    await expect(page.getByText(taskTitle, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: `Complete ${taskTitle}`, exact: true }).click();
    await expect(page.getByRole("button", { name: `Reopen ${taskTitle}`, exact: true })).toBeVisible();

    await page.goto(projectPath);
    await expect(page.getByTestId("project-command-page")).toBeVisible();
    await page.getByRole("button", { name: "Archive", exact: true }).click();
    await expect(page.getByText("Archived Project", { exact: true })).toBeVisible();

    await expect.poll(async () => {
      const state = await localWorkspaceState(page);
      const project = state.workspace?.projects?.find((item: { id: string }) => item.id === projectId);
      const task = state.workspace?.tasks?.find((item: { title: string }) => item.title === taskTitle);
      const date = state.workspace?.dates?.find((item: { title: string }) => item.title === dateTitle);
      const note = state.workspace?.dailyNotes?.find((item: { localDate: string }) => item.localDate === today);
      const byEntity = state.outbox.reduce((counts: Record<string, number>, mutation: { entityType: string }) => {
        counts[mutation.entityType] = (counts[mutation.entityType] ?? 0) + 1;
        return counts;
      }, {});
      return {
        pending: state.outbox.length,
        byEntity,
        hasArea: Boolean(state.workspace?.areas?.some((item: { name: string }) => item.name === areaName)),
        projectState: project?.state ?? null,
        projectObjective: project?.objective ?? null,
        taskState: task?.state ?? null,
        hasDate: Boolean(date),
        noteContent: note?.content ?? null
      };
    }).toMatchObject({
      pending: 8,
      byEntity: {
        areas: 1,
        projects: 3,
        tasks: 2,
        dates: 1,
        dailyNotes: 1
      },
      hasArea: true,
      projectState: "archived",
      projectObjective: objective,
      taskState: "done",
      hasDate: true,
      noteContent: dailyNoteText
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("project-command-page")).toBeVisible();
    await expect(page.getByText("Archived Project", { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder("What outcome is this Project trying to reach?")).toHaveValue(objective);
    await page.getByRole("button", { name: "Show completed (1)", exact: true }).click();
    await expect(page.getByText(taskTitle, { exact: true })).toBeVisible();
    await expect(page.getByTestId("project-dates").getByText(dateTitle, { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Home", exact: true }).click();
    await expect(page.getByLabel("Daily Notes")).toHaveValue(dailyNoteText);
    await expect(page.getByRole("button", { name: `Reopen ${taskTitle}`, exact: true })).toBeVisible();

    await context.setOffline(false);
    await expect.poll(async () => (await localWorkspaceState(page)).outbox.length, { timeout: 20_000 }).toBe(0);
    await expect(page.getByTestId("global-sync-indicator").first()).toContainText("Online");

    const server = await serverWorkspace(page);
    const local = (await localWorkspaceState(page)).workspace;

    const serverArea = server.areas.find((item: { name: string }) => item.name === areaName);
    expect(serverArea?.id).toBeTruthy();

    const serverProject = server.projects.find((item: { id: string }) => item.id === projectId);
    expect(serverProject).toMatchObject({
      name: projectName,
      areaId: serverArea.id,
      objective,
      state: "archived"
    });

    const serverTask = server.tasks.find((item: { title: string }) => item.title === taskTitle);
    expect(serverTask).toMatchObject({
      title: taskTitle,
      parent: { type: "project", projectId },
      plannedDate: today,
      scheduledTime: "11:15",
      state: "done"
    });

    const serverDate = server.dates.find((item: { title: string }) => item.title === dateTitle);
    expect(serverDate).toMatchObject({
      title: dateTitle,
      kind: "event",
      parent: { type: "project", projectId },
      date: today,
      startTime: "14:00",
      endTime: "14:45"
    });

    expect(server.dailyNotes.find((item: { localDate: string }) => item.localDate === today)?.content).toBe(dailyNoteText);
    expect(local.areas.find((item: { id: string }) => item.id === serverArea.id)).toEqual(serverArea);
    expect(local.projects.find((item: { id: string }) => item.id === projectId)).toEqual(serverProject);
    expect(local.tasks.find((item: { id: string }) => item.id === serverTask.id)).toEqual(serverTask);
    expect(local.dates.find((item: { id: string }) => item.id === serverDate.id)).toEqual(serverDate);
  });

  test("the workspace can be reopened offline on a previously authenticated browser context", async ({ page, context }) => {
    await login(page);
    await warmServiceWorker(page);

    // Warm a representative set of core surfaces before simulating an app close.
    for (const route of ["/projects", "/dates", "/areas", "/lifeos", "/search", "/settings"]) {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(`${route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
    }

    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();

    await context.setOffline(true);
    await page.close();

    const reopened = await context.newPage();
    await reopened.goto("/dashboard", { waitUntil: "domcontentloaded" });

    await expect(reopened).toHaveURL(/\/dashboard$/);
    await expect(reopened.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
    await expect(reopened.getByTestId("global-sync-indicator").first()).toContainText(/Offline|Loaded cached data\. Failed to fetch/i);
  });
});