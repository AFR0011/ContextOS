import { expect, test, type Page } from "@playwright/test";

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

test("canonical shell exposes the definitive ContextOS navigation", async ({ page }) => {
  await login(page);

  const primary = page.getByTestId("workspace-primary-nav");
  for (const label of ["Home", "Projects", "Areas", "Dates", "LifeOS", "Search"]) {
    await expect(primary.getByRole("button", { name: label, exact: true })).toBeVisible();
  }
  for (const retired of ["Inbox", "Resources", "Reviews", "Archive"]) {
    await expect(primary.getByRole("button", { name: retired, exact: true })).toHaveCount(0);
  }

  const work = page.getByTestId("workspace-secondary-nav");
  for (const label of ["Projects", "Areas", "Dates"]) {
    await expect(work.getByRole("button", { name: label, exact: true })).toBeVisible();
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Open navigation", exact: true }).click();
  await expect(page.getByTestId("workspace-utility-nav").getByRole("button", { name: "Settings", exact: true })).toBeVisible();
});

test("retired product URLs resolve to their canonical destinations", async ({ page }) => {
  await login(page);

  const redirects = [
    ["/inbox", /\/dashboard$/],
    ["/resources", /\/lifeos$/],
    ["/reviews", /\/lifeos$/],
    ["/archive", /\/search$/]
  ] as const;

  for (const [source, destination] of redirects) {
    await page.goto(source);
    await expect(page).toHaveURL(destination);
  }
});

test("archiving an Area does not cascade into its Projects", async ({ page }) => {
  await login(page);

  const bootstrap = await page.request.get("/api/bootstrap");
  expect(bootstrap.ok()).toBeTruthy();
  const workspace = await bootstrap.json();
  const project = workspace.data.projects.find(
    (item: { state?: string }) => item.state === "active"
  );
  expect(project?.id).toBeTruthy();
  const area = workspace.data.areas.find((item: { id: string }) => item.id === project.areaId);
  expect(area?.id).toBeTruthy();
  const initialProjectState = project.state;

  await page.goto("/areas");
  await page.getByRole("button", { name: `Archive ${area.name}`, exact: true }).click();

  await expect.poll(async () => {
    const response = await page.request.get("/api/bootstrap");
    const result = await response.json();
    return result.data.areas.find((item: { id: string; state: string }) => item.id === area.id)?.state;
  }).toBe("archived");

  await expect.poll(async () => {
    const response = await page.request.get("/api/bootstrap");
    const result = await response.json();
    return result.data.projects.find((item: { id: string; state: string }) => item.id === project.id)?.state;
  }).toBe(initialProjectState);

  await page.goto("/projects");
  await expect(page.getByText(project.name, { exact: true }).first()).toBeVisible();
});
