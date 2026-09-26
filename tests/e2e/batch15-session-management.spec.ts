import { expect, test, type Page } from "@playwright/test";

async function registerFreshAccount(page: Page, email: string, credential: string) {
  const response = await page.request.post("/api/auth/register", {
    headers: { "x-forwarded-for": "203.0.113.215" },
    data: { email, password: credential }
  });
  expect(response.status()).toBe(200);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByTestId("first-run-setup")).toBeVisible();
}

async function login(page: Page, email: string, credential: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(credential);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("active-session controls revoke other sessions without bypassing the current browser lifecycle", async ({ browser, page }) => {
  const seed = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const email = `batch15-${seed}@example.test`;
  const credential = `B15-${seed}-Aa1!`;

  await registerFreshAccount(page, email, credential);

  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();
  const thirdContext = await browser.newContext();
  const thirdPage = await thirdContext.newPage();

  try {
    await login(secondPage, email, credential);

    await page.goto("/settings?section=security");
    await expect(page.getByTestId("session-management-settings")).toBeVisible();
    await expect(page.getByTestId("active-session-row")).toHaveCount(2);
    await expect(page.getByTestId("current-session-badge")).toHaveCount(1);
    await expect(page.getByTestId("revoke-session")).toHaveCount(1);

    const sessionsResponse = await page.request.get("/api/account/sessions");
    expect(sessionsResponse.status()).toBe(200);
    const sessionsBody = await sessionsResponse.json() as {
      sessions: Array<{ id: string; current: boolean }>;
    };
    const currentSession = sessionsBody.sessions.find((session) => session.current);
    expect(currentSession).toBeTruthy();

    const currentRevoke = await page.request.post("/api/account/sessions", {
      data: { action: "revoke", sessionId: currentSession!.id }
    });
    expect(currentRevoke.status()).toBe(400);
    const currentBootstrap = await page.request.get("/api/bootstrap");
    expect(currentBootstrap.status()).toBe(200);

    await page.getByTestId("revoke-session").click();
    await expect(page.getByTestId("session-management-success")).toHaveText("Session signed out.");
    await expect(page.getByTestId("active-session-row")).toHaveCount(1);
    await expect(page.getByTestId("revoke-other-sessions")).toBeDisabled();

    await secondPage.goto("/dashboard");
    await expect(secondPage).toHaveURL((url) => url.pathname === "/login");

    await login(thirdPage, email, credential);
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(page.getByTestId("active-session-row")).toHaveCount(2);
    await expect(page.getByTestId("revoke-other-sessions")).toBeEnabled();

    await page.getByTestId("revoke-other-sessions").click();
    await expect(page.getByTestId("session-management-success")).toHaveText("1 other signed-in session was signed out.");
    await expect(page.getByTestId("active-session-row")).toHaveCount(1);

    await thirdPage.goto("/dashboard");
    await expect(thirdPage).toHaveURL((url) => url.pathname === "/login");

    const bootstrap = await page.request.get("/api/bootstrap");
    expect(bootstrap.status()).toBe(200);
  } finally {
    await secondContext.close();
    await thirdContext.close();
  }
});
