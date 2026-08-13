import { expect, test } from "@playwright/test";

test("demo reset and current-user endpoints reject unauthenticated production requests", async ({ page }) => {
  const reset = await page.request.post("/api/reset-demo");
  expect(reset.status()).toBe(401);
  await expect(reset.json()).resolves.toEqual({ error: "Unauthorized" });

  const me = await page.request.get("/api/auth/me");
  expect(me.status()).toBe(401);
  await expect(me.json()).resolves.toEqual({ error: "Unauthorized" });
});
