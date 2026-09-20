import { expect, test, type BrowserContext, type Locator, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@contextos.local");
  await page.getByLabel("Password").fill("contextos-demo-v011");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
}

async function waitForOfflineReady(page: Page) {
  const readiness = page.getByTestId("offline-shell-readiness");
  await expect(readiness).toHaveAttribute("data-ready", "true", { timeout: 30_000 });
  await expect(readiness).toContainText("Offline ready");
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

async function offlineDailyNoteState(page: Page, text: string, localDate: string) {
  return page.evaluate(async ({ expectedText, localDate }) => {
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
      throw new Error("No locally verified user is available for the production offline test.");
    }

    const state = await new Promise<{ workspace: any; outbox: any[] }>((resolve, reject) => {
      const tx = db.transaction(["workspaces", "outboxes"], "readonly");
      const workspaceRequest = tx.objectStore("workspaces").get(user.id);
      const outboxRequest = tx.objectStore("outboxes").get(user.id);
      let workspace: any;
      let outbox: any[] = [];
      workspaceRequest.onsuccess = () => { workspace = workspaceRequest.result; };
      workspaceRequest.onerror = () => reject(workspaceRequest.error);
      outboxRequest.onsuccess = () => { outbox = (outboxRequest.result as any[] | undefined) ?? []; };
      outboxRequest.onerror = () => reject(outboxRequest.error);
      tx.oncomplete = () => resolve({ workspace, outbox });
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("Local state read transaction aborted."));
    });

    db.close();
    return {
      hasDailyNote: Boolean(state.workspace?.dailyNotes?.some((note: { localDate: string; content: string }) => note.localDate === localDate && note.content === expectedText)),
      pendingDailyNotes: state.outbox.filter((mutation) => mutation.entityType === "dailyNotes").length
    };
  }, { expectedText: text, localDate });
}

async function activeProjectId(page: Page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/bootstrap", { cache: "no-store" });
    if (!response.ok) throw new Error(`bootstrap failed with ${response.status}`);
    const result = await response.json();
    const projects = result.data?.projects ?? [];
    const project = projects.find(
      (item: { status?: string; trashedAt?: string | null; archivedAt?: string | null }) =>
        item.status === "active" && !item.trashedAt && !item.archivedAt
    ) ?? projects.find((item: { trashedAt?: string | null }) => !item.trashedAt);
    if (!project?.id) throw new Error("No project is available for the offline dynamic-route check.");
    return project.id as string;
  });
}

async function activeAreaId(page: Page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/bootstrap", { cache: "no-store" });
    if (!response.ok) throw new Error(`bootstrap failed with ${response.status}`);
    const result = await response.json();
    const areas = result.data?.domains ?? [];
    const area = areas.find((item: { archived?: boolean }) => !item.archived) ?? areas[0];
    if (!area?.id) throw new Error("No Area is available for the offline dynamic-route check.");
    return area.id as string;
  });
}

async function openOfflineRoute(context: BrowserContext, route: string, assertion: (page: Page) => Promise<void>) {
  const page = await context.newPage();
  const response = await page.goto(route, { waitUntil: "domcontentloaded" });
  expect(response?.status()).not.toBe(503);
  await assertion(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  await assertion(page);
  await page.close();
}

test("verified readiness means the complete versioned shell is cached", async ({ page }) => {
  await login(page);
  await waitForOfflineReady(page);

  const snapshot = await page.evaluate(async () => {
    const cacheNames = await caches.keys();
    const cacheName = cacheNames.find((name) => name === "contextos-shell-v5");
    if (!cacheName) return { cacheName: null, version: null, resources: [] as string[], missing: ["cache"] };

    const cache = await caches.open(cacheName);
    const manifestResponse = await cache.match("/__contextos_shell_manifest__");
    if (!manifestResponse) return { cacheName, version: null, resources: [] as string[], missing: ["manifest"] };

    const manifest = await manifestResponse.json() as { version?: string; resources?: string[] };
    const resources = manifest.resources ?? [];
    const missing: string[] = [];
    for (const resource of resources) {
      if (!(await cache.match(resource))) missing.push(resource);
    }
    return { cacheName, version: manifest.version ?? null, resources, missing };
  });

  expect(snapshot.cacheName).toBe("contextos-shell-v5");
  expect(snapshot.version).toBe("v5");
  expect(snapshot.resources).toContain("/dashboard");
  expect(snapshot.resources).toContain("/manifest.webmanifest");
  expect(snapshot.resources.some((resource) => resource.startsWith("/_next/static/"))).toBe(true);
  expect(snapshot.missing).toEqual([]);
});

test("previously authenticated workspace cold-reopens offline without route warming", async ({ page, context }) => {
  await login(page);
  await waitForOfflineReady(page);

  await page.close();
  await context.setOffline(true);

  const reopened = await context.newPage();
  const response = await reopened.goto("/dashboard", { waitUntil: "domcontentloaded" });
  expect(response?.status()).not.toBe(503);
  await expect(reopened.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
  await expect(reopened.getByTestId("global-sync-indicator").first()).toContainText(/Offline|Loaded cached data\. Failed to fetch/i);
  await expect(reopened.getByTestId("offline-shell-readiness")).toHaveAttribute("data-ready", "true");
});

test("offline Daily Note edit survives hard reload with its queued mutation", async ({ page, context }) => {
  const { localDateKey } = await import("../../src/lib/dates");
  await login(page);
  await waitForOfflineReady(page);
  await context.setOffline(true);

  const today = localDateKey();
  const text = `offline daily note ${Date.now()}`;
  await page.getByLabel("Daily Notes").fill(text);
  await expect.poll(() => offlineDailyNoteState(page, text, today)).toMatchObject({ hasDailyNote: true, pendingDailyNotes: 1 });

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
  await expect(page.getByLabel("Daily Notes")).toHaveValue(text);
  await expect.poll(() => offlineDailyNoteState(page, text, today)).toMatchObject({ hasDailyNote: true, pendingDailyNotes: 1 });
});

test("core workspace routes and a dynamic project cold-open and hard-refresh offline", async ({ page, context }) => {
  await login(page);
  await waitForOfflineReady(page);
  const projectId = await activeProjectId(page);
  const areaId = await activeAreaId(page);

  await page.close();
  await context.setOffline(true);

  const routes: Array<[string, (page: Page) => Promise<void>]> = [
    ["/dashboard", async (routePage) => expect(routePage.getByRole("heading", { name: "Today", exact: true })).toBeVisible()],
    ["/inbox", async (routePage) => expect(routePage.getByRole("heading", { name: "Inbox", exact: true })).toBeVisible()],
    ["/projects", async (routePage) => expect(routePage.getByRole("heading", { name: "Projects", exact: true })).toBeVisible()],
    ["/dates", async (routePage) => expect(routePage.getByRole("heading", { name: "Dates", exact: true })).toBeVisible()],
    ["/areas", async (routePage) => expect(routePage.getByRole("heading", { name: "Areas", exact: true })).toBeVisible()],
    ["/resources", async (routePage) => expect(routePage.getByRole("heading", { name: "Resources", exact: true })).toBeVisible()],
    ["/lifeos", async (routePage) => expect(routePage.getByRole("heading", { name: "Module hub", exact: true })).toBeVisible()],
    ["/search", async (routePage) => expect(routePage.getByRole("heading", { name: "Search", exact: true })).toBeVisible()],
    ["/archive", async (routePage) => expect(routePage.getByRole("heading", { name: "Archive", exact: true })).toBeVisible()],
    ["/reviews", async (routePage) => expect(routePage.getByRole("heading", { name: "Reviews", exact: true })).toBeVisible()],
    ["/settings", async (routePage) => expect(routePage.getByRole("heading", { name: "Settings", exact: true })).toBeVisible()],
    [`/projects/${projectId}`, async (routePage) => expect(routePage.getByTestId("project-command-page")).toBeVisible()],
    [`/areas/${areaId}`, async (routePage) => expect(routePage.getByTestId("area-detail")).toBeVisible()]
  ];

  for (const [route, assertion] of routes) {
    await openOfflineRoute(context, route, assertion);
  }
});

test("API requests remain network-only and absent from the shell cache", async ({ page, context }) => {
  await login(page);
  await waitForOfflineReady(page);
  await context.setOffline(true);

  const apiResult = await page.evaluate(async () => {
    try {
      const response = await fetch("/api/bootstrap", { cache: "no-store" });
      return {
        resolved: true,
        status: response.status,
        contentType: response.headers.get("content-type"),
        body: (await response.text()).slice(0, 80)
      };
    } catch {
      return { resolved: false, status: null, contentType: null, body: "" };
    }
  });
  expect(apiResult.resolved).toBe(false);

  const cachedApiUrls = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const name of await caches.keys()) {
      if (!name.startsWith("contextos-shell-")) continue;
      const cache = await caches.open(name);
      for (const request of await cache.keys()) {
        const url = new URL(request.url);
        if (url.pathname.startsWith("/api/")) urls.push(url.pathname);
      }
    }
    return urls;
  });
  expect(cachedApiUrls).toEqual([]);
});