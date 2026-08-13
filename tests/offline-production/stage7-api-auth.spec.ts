import { expect, test } from "@playwright/test";

test("enabled demo reset rejects unauthenticated production requests", async ({ page }) => {
  const reset = await page.request.post("/api/reset-demo");
  expect(reset.status()).toBe(401);
  await expect(reset.json()).resolves.toEqual({ error: "Unauthorized" });
});
