import { expect, test, type Page, type TestInfo } from "@playwright/test";

const DEMO_EMAIL = "demo@contextos.local";
const DEMO_PASSWORD = "contextos-demo-v011";

type Theme = "light" | "dark";
type Variant = {
  name: string;
  width: number;
  height: number;
  theme: Theme;
  mobile: boolean;
};

const variants: Variant[] = [
  { name: "desktop-light", width: 1440, height: 1000, theme: "light", mobile: false },
  { name: "desktop-dark", width: 1440, height: 1000, theme: "dark", mobile: false },
  { name: "compact-desktop-light", width: 1024, height: 768, theme: "light", mobile: false },
  { name: "compact-desktop-dark", width: 1024, height: 768, theme: "dark", mobile: false },
  { name: "mobile-light", width: 390, height: 844, theme: "light", mobile: true },
  { name: "mobile-dark", width: 390, height: 844, theme: "dark", mobile: true }
];

async function resetDemo(page: Page) {
  const response = await page.request.post("/api/reset-demo");
  expect(response.status()).toBe(200);
}

async function loginDemo(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(DEMO_EMAIL);
  await page.getByLabel("Password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await resetDemo(page);
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
  await expect.poll(() =>
    page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
  ).toBe(true);

  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage, animations: "disabled" });
  await testInfo.attach(name, { path, contentType: "image/png" });
}

async function openProjectDetail(page: Page) {
  await page.goto("/projects");
  await page.locator("main").getByRole("button", { name: /^ContextOS Demo/ }).click();
  await expect(page.getByTestId("project-command-page")).toBeVisible();
}

async function openAreaDetail(page: Page) {
  await page.goto("/areas");
  await page.getByText("Engineering", { exact: true }).first().click();
  await expect(page.getByTestId("area-detail")).toBeVisible();
}

async function capturePrimarySurfaces(page: Page, testInfo: TestInfo, variant: Variant) {
  await page.goto("/dashboard");
  await expect(page.getByTestId("home-view")).toBeVisible();
  await capture(page, testInfo, `${variant.name}-01-home`);
  if (variant.mobile) {
    await capture(page, testInfo, `${variant.name}-01-home-viewport`, false);
  }

  await page.goto("/projects");
  await capture(page, testInfo, `${variant.name}-02-projects`);

  await openProjectDetail(page);
  await capture(page, testInfo, `${variant.name}-03-project-detail`);

  await page.goto("/areas");
  await capture(page, testInfo, `${variant.name}-04-areas`);

  await openAreaDetail(page);
  await capture(page, testInfo, `${variant.name}-05-area-detail`);

  await page.goto("/dates");
  await capture(page, testInfo, `${variant.name}-06-dates`);

  await page.goto("/search");
  const search = page.getByRole("textbox", { name: "Search workspace", exact: true });
  await search.fill("ContextOS Demo");
  const projectResult = page.getByTestId(/search-result-project-/).filter({ hasText: "ContextOS Demo" }).first();
  await projectResult.click();
  await capture(page, testInfo, `${variant.name}-07-search-selected`);

  await page.goto("/lifeos");
  await capture(page, testInfo, `${variant.name}-09-lifeos`);

  await page.goto("/settings");
  await capture(page, testInfo, `${variant.name}-10-settings`);
}

async function openLogout(page: Page, mobile: boolean) {
  if (mobile) {
    await page.getByRole("button", { name: "Open navigation", exact: true }).click();
    const drawer = page.getByRole("dialog", { name: "Workspace navigation menu" });
    await drawer.getByRole("button", { name: "Log out", exact: true }).click();
  } else {
    await page.getByRole("button", { name: "Log out", exact: true }).click();
  }
  await expect(page.getByTestId("logout-dialog")).toBeVisible();
}

async function captureTransientStates(page: Page, testInfo: TestInfo, variant: Variant) {
  await page.goto("/dates");
  await page.getByRole("button", { name: "Add Date", exact: true }).click();
  await capture(page, testInfo, `${variant.name}-06-dates-add-open`);

  await page.goto("/dashboard");
  await page.keyboard.press("Control+K");
  const palette = page.getByTestId("command-palette");
  await expect(palette).toBeVisible();
  await capture(page, testInfo, `${variant.name}-08-command-palette`, false);

  const commandInput = palette.getByRole("combobox", { name: "Search or run a command" });
  await commandInput.fill("New Task");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("palette-task-create")).toBeVisible();
  await capture(page, testInfo, `${variant.name}-08-new-task-sheet`, false);
  await page.keyboard.press("Escape");

  await page.keyboard.press("Control+K");
  const datePalette = page.getByTestId("command-palette");
  await datePalette.getByRole("combobox", { name: "Search or run a command" }).fill("New Date");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("palette-date-create")).toBeVisible();
  await capture(page, testInfo, `${variant.name}-08-new-date-sheet`, false);
  await page.keyboard.press("Escape");

  await page.goto("/settings");
  const longFileName = `contextos-${"backup".repeat(45)}.json`;
  await page.getByTestId("workspace-import-file").setInputFiles({
    name: longFileName,
    mimeType: "application/json",
    buffer: Buffer.from("{}")
  });
  await expect(page.getByText(`Selected: ${longFileName}`, { exact: true })).toBeVisible();
  await capture(page, testInfo, `${variant.name}-10-settings-long-import-name`);

  await page.goto("/dashboard");
  if (variant.mobile) {
    await page.getByRole("button", { name: "Open navigation", exact: true }).click();
    await capture(page, testInfo, `${variant.name}-11-mobile-drawer`, false);
    await page.getByRole("button", { name: "Close navigation", exact: true }).click();
  }

  await openLogout(page, variant.mobile);
  await capture(page, testInfo, `${variant.name}-13-logout-dialog`, false);
});

test.describe("C10 visual baseline capture", () => {
  test.skip(
    process.env.CAPTURE_C10_VISUAL !== "1",
    "Run with the dedicated capture command when producing the human-reviewed C10 baseline."
  );
  test.describe.configure({ mode: "serial" });

  for (const variant of variants) {
    test(`primary surfaces - ${variant.name}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: variant.width, height: variant.height });
      await loginDemo(page);
      await applyTheme(page, variant.theme);
      await capturePrimarySurfaces(page, testInfo, variant);
    });

    test(`transient states - ${variant.name}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: variant.width, height: variant.height });
      await loginDemo(page);
      await applyTheme(page, variant.theme);
      await captureTransientStates(page, testInfo, variant);
    });
  }
});
