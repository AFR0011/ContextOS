import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@contextos.local");
  await page.getByLabel("Password").fill("contextos-demo-v011");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  const reset = await page.request.post("/api/reset-demo");
  expect(reset.status()).toBe(200);
  await page.reload();
  await expect(page.getByTestId("home-view")).toBeVisible();
}

test("Project archive is blocked until its open Tasks are resolved", async ({ page }) => {
  await login(page);

  await page.goto("/projects");
  const projectRow = page.getByText("ContextOS Demo", { exact: true }).first().locator("..").locator("..");
  const listArchive = page.getByRole("button", { name: "Archive ContextOS Demo", exact: true });
  await expect(listArchive).toBeDisabled();
  await expect(listArchive).toHaveAttribute("title", /Resolve or move .* open Task/);

  await page.getByText("ContextOS Demo", { exact: true }).first().click();
  const detailArchive = page.getByRole("button", { name: "Archive", exact: true });
  await expect(detailArchive).toBeDisabled();
  await expect(page.locator("#project-archive-blocked")).toContainText(/Resolve or move .* open Task/);

  const openTask = page.getByTestId("project-live-tasks").getByRole("button", { name: /Complete / }).first();
  await openTask.click();
  await expect(detailArchive).toBeEnabled();
  await detailArchive.click();
  await expect(page.getByText("Archived Project", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /Show completed/ }).click();
  const reopen = page.getByTestId("project-live-tasks").getByRole("button", { name: /Reopen / }).first();
  await expect(reopen).toBeDisabled();
  await expect(reopen).toHaveAttribute("title", /active context|restore/i);

  await page.goto("/dashboard");
  await expect(page.getByTestId("home-upcoming")).toContainText("ContextOS Demo (archived)");

  await page.goto("/dates");
  await expect(page.getByText(/ContextOS Demo \(archived\)/).first()).toBeVisible();

  await page.goto("/search");
  await page.getByRole("textbox", { name: "Search workspace", exact: true }).fill("ContextOS verification pass");
  const result = page.getByTestId(/search-result-date-/).filter({ hasText: "ContextOS verification pass" }).first();
  await result.click();
  await expect(page.getByTestId("search-selected-record")).toContainText("ContextOS Demo (archived)");
});

test("Area archive ignores child Project work but blocks direct open Tasks", async ({ page }) => {
  await login(page);

  await page.goto("/areas");
  await page.getByText("Engineering", { exact: true }).first().click();
  const area = page.getByTestId("area-detail");

  const title = `Direct archive blocker ${Date.now()}`;
  await area.getByRole("textbox", { name: "Task title", exact: true }).fill(title);
  await area.getByRole("button", { name: "Add", exact: true }).click();

  const archive = page.getByRole("button", { name: "Archive", exact: true });
  await expect(archive).toBeDisabled();
  await expect(page.locator("#area-archive-blocked")).toContainText("direct open Task");

  await area.getByRole("button", { name: `Complete ${title}`, exact: true }).click();
  await expect(archive).toBeEnabled();
  await archive.click();
  await expect(page.getByText("Archived responsibility domain", { exact: true })).toBeVisible();

  await page.goto("/projects");
  await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();
  await expect(page.getByText("ContextOS Demo", { exact: true }).first()).toBeVisible();
});
