import { expect, test, type Page, type TestInfo } from "@playwright/test";

type Theme = "light" | "dark";
type Variant = {
  name: string;
  width: number;
  height: number;
  theme: Theme;
};

const variants: Variant[] = [
  { name: "empty-desktop-light", width: 1440, height: 1000, theme: "light" },
  { name: "empty-desktop-dark", width: 1440, height: 1000, theme: "dark" },
  { name: "empty-mobile-light", width: 390, height: 844, theme: "light" },
  { name: "empty-mobile-dark", width: 390, height: 844, theme: "dark" }
];

async function registerFreshAccount(page: Page) {
  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const email = `c10-visual-clean-${nonce}@example.test`;
  const response = await page.request.post("/api/auth/register", {
    data: { email, password: "c10-visual-clean-workspace" },
    headers: { "x-forwarded-for": `c10-visual-clean-${nonce}` }
  });
  expect(response.status()).toBe(200);
  await page.goto("/dashboard");
  await expect(page.getByTestId("first-run-setup")).toBeVisible();
}

async function applyVariant(page: Page, variant: Variant) {
  await page.setViewportSize({ width: variant.width, height: variant.height });
  await page.evaluate((nextTheme) => {
    localStorage.setItem("contextos-theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }, variant.theme);
  await page.reload();
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(variant.theme === "dark");
}

async function capture(page: Page, testInfo: TestInfo, name: string, fullPage = true) {
  await expect.poll(() =>
    page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
  ).toBe(true);
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage, animations: "disabled" });
  await testInfo.attach(name, { path, contentType: "image/png" });
}

test.describe("C10 clean-account visual baseline", () => {
  test.skip(
    process.env.CAPTURE_C10_VISUAL !== "1",
    "Run through the dedicated C10 visual capture command."
  );

  test("one clean account covers first-run and empty states across themes and viewports", async ({ page }, testInfo) => {
    await registerFreshAccount(page);

    for (const variant of variants) {
      await page.goto("/dashboard");
      await applyVariant(page, variant);
      await expect(page.getByTestId("first-run-setup")).toBeVisible();
      await expect(page.getByText("ContextOS Demo", { exact: true })).toHaveCount(0);
      await capture(page, testInfo, `${variant.name}-01-first-run`);
    }

    await page.goto("/dashboard");
    const areaName = `Visual Area ${Date.now()}`;
    await page.getByRole("textbox", { name: "Area name", exact: true }).fill(areaName);
    await page.getByRole("button", { name: "Add Area", exact: true }).click();
    await expect(page.getByTestId("first-run-setup")).toHaveCount(0);
    await expect(page.getByTestId("home-view")).toBeVisible();

    for (const variant of variants) {
      await page.goto("/dashboard");
      await applyVariant(page, variant);
      await expect(page.getByTestId("home-view")).toBeVisible();
      await capture(page, testInfo, `${variant.name}-02-empty-home`);

      await page.goto("/projects");
      await expect(page.getByText("No active projects", { exact: true })).toBeVisible();
      await capture(page, testInfo, `${variant.name}-03-empty-projects`);

      await page.goto("/dates");
      await expect(page.getByText("No Dates today.", { exact: true })).toBeVisible();
      await expect(page.getByText("No upcoming Dates.", { exact: true })).toBeVisible();
      await capture(page, testInfo, `${variant.name}-04-empty-dates`);
    }
  });
});
