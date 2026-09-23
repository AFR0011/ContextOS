import { expect, test, type Page, type TestInfo } from "@playwright/test";

const DEMO_EMAIL = "demo@contextos.local";
const DEMO_PASSWORD = "contextos-demo-v011";
type Theme = "light" | "dark";

async function loginDemo(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(DEMO_EMAIL);
  await page.getByLabel("Password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  const reset = await page.request.post("/api/reset-demo");
  expect(reset.status()).toBe(200);
  await page.reload();
  await expect(page.getByTestId("home-view")).toBeVisible();
}

async function applyTheme(page: Page, theme: Theme) {
  await page.evaluate((nextTheme) => {
    localStorage.setItem("contextos-theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }, theme);
  await page.reload();
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(theme === "dark");
}

async function capture(page: Page, testInfo: TestInfo, name: string, fullPage = true) {
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));

  const diagnostics = await page.evaluate(() => {
    const root = document.documentElement;
    const viewportWidth = root.clientWidth;
    const offenders = Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return {
          tag: element.tagName.toLowerCase(),
          id: element.id || null,
          testId: element.getAttribute("data-testid"),
          ariaLabel: element.getAttribute("aria-label"),
          className: typeof element.className === "string" ? element.className : "",
          text: (element.textContent ?? "").trim().replace(/\\s+/g, " ").slice(0, 120),
          left: Math.round(rect.left * 100) / 100,
          right: Math.round(rect.right * 100) / 100,
          width: Math.round(rect.width * 100) / 100,
          display: style.display,
          visibility: style.visibility
        };
      })
      .filter((item) =>
        item.display !== "none" &&
        item.visibility !== "hidden" &&
        item.width > 0 &&
        (item.left < -1 || item.right > viewportWidth + 1)
      )
      .sort((a, b) => Math.max(b.right - viewportWidth, -b.left) - Math.max(a.right - viewportWidth, -a.left))
      .slice(0, 12);

    return {
      documentScrollWidth: root.scrollWidth,
      documentClientWidth: root.clientWidth,
      windowInnerWidth: window.innerWidth,
      bodyScrollWidth: document.body.scrollWidth,
      bodyClientWidth: document.body.clientWidth,
      devicePixelRatio: window.devicePixelRatio,
      offenders
    };
  });

  expect(
    diagnostics.documentScrollWidth,
    `Horizontal overflow at "${name}".\\n${JSON.stringify(diagnostics, null, 2)}`
  ).toBeLessThanOrEqual(diagnostics.documentClientWidth);

  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage, animations: "disabled" });
  await testInfo.attach(name, { path, contentType: "image/png" });
}

async function createHostileWorkspace(page: Page) {
  const longArea = `Area-${"X".repeat(140)}`;
  const longProject = `Project-${"Y".repeat(150)}`;
  const longDate = `Date-${"D".repeat(150)}`;

  await page.goto("/areas");
  await page.getByRole("button", { name: "New Area", exact: true }).click();
  await page.getByPlaceholder("Area name").fill(longArea);
  await page.getByRole("button", { name: "Create Area", exact: true }).click();

  await page.goto("/projects");
  await page.getByRole("button", { name: "New Project", exact: true }).click();
  await page.getByPlaceholder("Project name").fill(longProject);
  await page.getByTestId("project-create-form").getByRole("combobox").selectOption({ label: longArea });
  await page.getByPlaceholder("What outcome is this project trying to reach?").fill(`Objective ${"Z".repeat(220)}`);
  await page.getByRole("button", { name: "Create Project", exact: true }).click();

  const projectDates = page.getByTestId("project-dates");
  await projectDates.getByLabel("Date kind").selectOption("event");
  await projectDates.getByPlaceholder("Add a Date...").fill(longDate);
  await projectDates.getByRole("button", { name: "Add", exact: true }).click();
  await expect(projectDates.getByText(longDate, { exact: true })).toBeVisible();

  return { longArea, longProject, longDate };
}

test.describe("C10 narrow hostile-content visual stress", () => {
  test.skip(
    process.env.CAPTURE_C10_VISUAL !== "1",
    "Run through the dedicated C10 visual capture command."
  );
  test.describe.configure({ mode: "serial" });

  for (const theme of ["light", "dark"] as const) {
    test(`320x720 hostile content - ${theme}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: 320, height: 720 });
      await loginDemo(page);
      await applyTheme(page, theme);
      const { longArea, longProject, longDate } = await createHostileWorkspace(page);
      const prefix = `narrow-${theme}`;

      await capture(page, testInfo, `${prefix}-01-project-detail-long`);

      await page.goto("/projects");
      await expect(page.getByText(longProject, { exact: true }).first()).toBeVisible();
      await capture(page, testInfo, `${prefix}-02-projects-long`);

      await page.goto("/areas");
      await expect(page.getByText(longArea, { exact: true }).first()).toBeVisible();
      await page.getByText(longArea, { exact: true }).first().click();
      await expect(page.getByTestId("area-detail")).toContainText(longProject);
      await capture(page, testInfo, `${prefix}-03-area-detail-long`);

      await page.goto("/dates");
      await expect(page.getByText(longDate, { exact: true })).toBeVisible();
      await capture(page, testInfo, `${prefix}-04-dates-long`);

      await page.goto("/search");
      await page.getByRole("textbox", { name: "Search workspace", exact: true }).fill(longProject.slice(0, 20));
      const result = page.getByTestId(/search-result-project-/).filter({ hasText: longProject }).first();
      await expect(result).toBeVisible();
      await result.click();
      await expect(page.getByTestId("search-selected-record")).toContainText(longProject);
      await capture(page, testInfo, `${prefix}-05-search-long`);

      await page.goto("/settings");
      const longFileName = `contextos-${"backup".repeat(45)}.json`;
      await page.getByTestId("workspace-import-file").setInputFiles({
        name: longFileName,
        mimeType: "application/json",
        buffer: Buffer.from("{}")
      });
      await expect(page.getByText(`Selected: ${longFileName}`, { exact: true })).toBeVisible();
      await capture(page, testInfo, `${prefix}-06-settings-long-import`);

      await page.goto("/dashboard");
      await page.getByRole("button", { name: "Open navigation", exact: true }).click();
      await capture(page, testInfo, `${prefix}-07-drawer`, false);
      const drawer = page.getByRole("dialog", { name: "Workspace navigation menu" });
      await drawer.getByRole("button", { name: "Log out", exact: true }).click();
      await expect(page.getByTestId("logout-dialog")).toBeVisible();
      await capture(page, testInfo, `${prefix}-08-logout`, false);
    });
  }
});
