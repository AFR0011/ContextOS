import { expect, test, type Page } from "@playwright/test";

const demoEmail = "demo@contextos.local";
const demoPassword = "contextos-demo-v011";

async function apiLogin(page: Page, withOrigin = false) {
  if (withOrigin) await page.goto("/login");
  const headers = withOrigin
    ? {
        Origin: new URL(page.url()).origin,
        "Sec-Fetch-Site": "same-origin"
      }
    : undefined;
  const response = await page.request.post("/api/auth/login", {
    headers,
    data: { email: demoEmail, password: demoPassword }
  });
  expect(response.status()).toBe(200);
  return response;
}

test("production security headers are strict and API responses are no-store", async ({ page }) => {
  const response = await page.request.get("/api/health");
  expect(response.status()).toBe(200);
  const headers = response.headers();

  expect(headers["cache-control"]).toContain("no-store");
  expect(headers["content-security-policy"]).toContain("default-src 'self'");
  expect(headers["content-security-policy"]).not.toContain("'unsafe-eval'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("camera=()");
  expect(headers["cross-origin-opener-policy"]).toBe("same-origin");
  expect(headers["cross-origin-resource-policy"]).toBe("same-origin");
  expect(headers["x-dns-prefetch-control"]).toBe("off");
  expect(headers["x-permitted-cross-domain-policies"]).toBe("none");
  expect(headers["strict-transport-security"]).toContain("max-age=31536000");
});

test("browser cross-origin state-changing API requests are rejected before mutation", async ({ page }) => {
  const crossOriginHeaders = {
    Origin: "https://attacker.example",
    "Sec-Fetch-Site": "cross-site"
  };
  const requests: Array<Promise<ReturnType<Page["request"]["post"]>> | any> = [];
  void requests;

  const responses = [
    await page.request.post("/api/auth/login", {
      headers: crossOriginHeaders,
      data: { email: demoEmail, password: demoPassword }
    }),
    await page.request.post("/api/auth/register", {
      headers: crossOriginHeaders,
      data: { email: "cross-origin@example.test", password: "not-a-real-password" }
    }),
    await page.request.post("/api/auth/logout", { headers: crossOriginHeaders }),
    await page.request.post("/api/sync", {
      headers: crossOriginHeaders,
      data: { mutations: [] }
    }),
    await page.request.post("/api/reset-demo", { headers: crossOriginHeaders })
  ];

  for (const response of responses) {
    expect(response.status()).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: "Cross-origin request rejected." });
  }
});

test("same-origin authentication still succeeds with bounded inputs and secure session cookie", async ({ page, context }) => {
  const oversized = await page.request.post("/api/auth/login", {
    data: { email: `${"a".repeat(255)}@example.test`, password: "x".repeat(257) }
  });
  expect(oversized.status()).toBe(400);

  await apiLogin(page, true);
  const session = (await context.cookies()).find((cookie) => cookie.name === "contextos_session");
  expect(session).toBeTruthy();
  expect(session?.httpOnly).toBe(true);
  expect(session?.secure).toBe(true);
  expect(session?.sameSite).toBe("Lax");
  expect(session?.path).toBe("/");
  expect(session?.expires ?? 0).toBeGreaterThan(Date.now() / 1000);
});

test("unauthenticated workspace APIs remain closed while health stays minimal", async ({ page }) => {
  const bootstrap = await page.request.get("/api/bootstrap");
  expect(bootstrap.status()).toBe(401);

  const sync = await page.request.post("/api/sync", { data: { mutations: [] } });
  expect(sync.status()).toBe(401);

  const health = await page.request.get("/api/health");
  expect(health.status()).toBe(200);
  const body = await health.json();
  expect(body).toMatchObject({ status: "ok", service: "contextos", database: "ok" });
  expect(Object.keys(body).sort()).toEqual(["database", "service", "status", "version"]);
});

test("sync rejects mutation-ledger identity mismatch and malformed timestamps", async ({ page }) => {
  await apiLogin(page);
  const now = new Date().toISOString();

  const mismatch = await page.request.post("/api/sync", {
    data: {
      mutations: [
        {
          mutationId: `audit-mismatch-${Date.now()}`,
          entityType: "domains",
          entityId: "dom-a",
          operation: "upsert",
          payload: {
            id: "dom-b",
            name: "Mismatched domain",
            archived: false,
            createdAt: now,
            updatedAt: now
          },
          createdAt: now
        }
      ]
    }
  });
  expect(mismatch.status()).toBe(400);

  const invalidMutationTime = await page.request.post("/api/sync", {
    data: {
      mutations: [
        {
          mutationId: `audit-time-${Date.now()}`,
          entityType: "domains",
          entityId: "dom-invalid-time",
          operation: "upsert",
          payload: {
            id: "dom-invalid-time",
            name: "Invalid time",
            archived: false,
            createdAt: now,
            updatedAt: now
          },
          createdAt: "not-a-date"
        }
      ]
    }
  });
  expect(invalidMutationTime.status()).toBe(400);

  const invalidPayloadTime = await page.request.post("/api/sync", {
    data: {
      mutations: [
        {
          mutationId: `audit-payload-time-${Date.now()}`,
          entityType: "domains",
          entityId: "dom-invalid-payload-time",
          operation: "upsert",
          payload: {
            id: "dom-invalid-payload-time",
            name: "Invalid payload time",
            archived: false,
            createdAt: now,
            updatedAt: "not-a-date"
          },
          createdAt: now
        }
      ]
    }
  });
  expect(invalidPayloadTime.status()).toBe(400);
});

test("sync payload limits count UTF-8 bytes rather than JavaScript code units", async ({ page }) => {
  await apiLogin(page);
  const now = new Date().toISOString();
  const multibyteText = "😀".repeat(6_000);
  expect(multibyteText.length).toBeLessThan(20_000);
  expect(new TextEncoder().encode(multibyteText).byteLength).toBeGreaterThan(20_000);

  const response = await page.request.post("/api/sync", {
    data: {
      mutations: [
        {
          mutationId: `audit-utf8-${Date.now()}`,
          entityType: "captures",
          entityId: "cap-audit-utf8",
          operation: "upsert",
          payload: {
            id: "cap-audit-utf8",
            text: multibyteText,
            status: "unprocessed",
            type: "note",
            parsedData: null,
            convertedToId: null,
            createdAt: now,
            updatedAt: now
          },
          createdAt: now
        }
      ]
    }
  });

  expect(response.status()).toBe(400);
});
