import { expect, test } from "@playwright/test";

test("public landing page presents ContextOS without requiring authentication", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Keep the context. Resume the work." })).toBeVisible();
  await expect(page.getByText("Synthetic preview")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open workspace" }).first()).toHaveAttribute("href", "/dashboard");
  await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  await expect(page.getByRole("heading", { name: "The useful part is not remembering everything. It is recovering enough to continue." })).toBeVisible();
});
