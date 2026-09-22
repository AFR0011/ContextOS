import { expect, test } from "@playwright/test";

test("replace restore keeps the current session and revokes another signed-in session", async ({ page, browser }) => {
  const token = `portability-session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const email = `${token}@example.test`;
  const password = `Portability-${Date.now()}-${Math.random().toString(36).slice(2)}!`;

  const registered = await page.request.post("/api/auth/register", {
    data: { email, password },
    headers: { "x-forwarded-for": `${token}-register` }
  });
  expect(registered.status()).toBe(200);

  const now = new Date().toISOString();
  const area = {
    id: `area-session-${Date.now()}`,
    name: "Session safety",
    state: "active",
    createdAt: now,
    updatedAt: now
  };
  const seeded = await page.request.post("/api/sync", {
    data: {
      mutations: [{
        mutationId: `mut-session-${Date.now()}`,
        entityType: "areas",
        entityId: area.id,
        operation: "upsert",
        payload: area,
        createdAt: now
      }]
    }
  });
  expect(seeded.status()).toBe(200);

  const exported = await page.request.get("/api/portability/export?format=json");
  expect(exported.status()).toBe(200);
  const bundle = await exported.json();

  const secondContext = await browser.newContext();
  try {
    const secondLogin = await secondContext.request.post("http://127.0.0.1:3000/api/auth/login", {
      data: { email, password },
      headers: { "x-forwarded-for": `${token}-second` }
    });
    expect(secondLogin.status()).toBe(200);

    const secondBefore = await secondContext.request.get("http://127.0.0.1:3000/api/bootstrap");
    expect(secondBefore.status()).toBe(200);

    const restored = await page.request.post("/api/portability/import", {
      data: {
        action: "restore",
        mode: "replace",
        bundle,
        confirmedNoPendingChanges: true,
        confirmation: "REPLACE"
      }
    });
    expect(restored.status()).toBe(200);

    const currentAfter = await page.request.get("/api/bootstrap");
    expect(currentAfter.status()).toBe(200);

    const secondAfter = await secondContext.request.get("http://127.0.0.1:3000/api/bootstrap");
    expect(secondAfter.status()).toBe(401);
  } finally {
    await secondContext.close();
  }
});
