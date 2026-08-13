import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@contextos.local");
  await page.getByLabel("Password").fill("contextos-demo-v011");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
}

async function warmServiceWorker(page: Page) {
  const readiness = page.getByTestId("offline-shell-readiness");
  await expect(readiness).toHaveAttribute("data-ready", "true", { timeout: 30_000 });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await expect(page.getByTestId("offline-shell-readiness")).toHaveAttribute("data-ready", "true");
}


async function activeDemoProjectId(page: Page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/bootstrap");
    if (!response.ok) throw new Error(`bootstrap failed with ${response.status}`);
    const result = await response.json();
    const project = result.data.projects.find(
      (item: { archivedAt?: string | null; trashedAt?: string | null; status?: string }) =>
        !item.archivedAt && !item.trashedAt && item.status === "active"
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

    await page.getByRole("button", { name: "Inbox", exact: true }).click();
    await expect(page).toHaveURL(/\/inbox$/);
    await expect(page.getByRole("heading", { name: "Inbox", exact: true })).toBeVisible();

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

  test("the workspace can be reopened offline on a previously authenticated browser context", async ({ page, context }) => {
    await login(page);
    await warmServiceWorker(page);

    // Warm a representative set of core surfaces before simulating an app close.
    for (const route of ["/inbox", "/projects", "/dates", "/areas", "/resources", "/archive", "/search", "/reviews", "/settings"]) {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(`${route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
    }

    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();

    await context.setOffline(true);
    await page.close();

    const reopened = await context.newPage();
    await reopened.goto("/dashboard", { waitUntil: "domcontentloaded" });

    await expect(reopened).toHaveURL(/\/dashboard$/);
    await expect(reopened.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
    await expect(reopened.getByTestId("global-sync-indicator").first()).toContainText(/Offline|Loaded cached data\. Failed to fetch/i);
  });
});