const baseUrl = process.env.STAGE7_BASE_URL ?? "http://127.0.0.1:3102";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function jsonResponse(path, init) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const text = await response.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    // Keep the raw text for diagnostics below.
  }
  return { response, body, text };
}

function assertNoRawDatabaseDiagnostics(text, label) {
  const forbidden = [
    "PrismaClient",
    "PrismaClientKnownRequestError",
    "postgresql://",
    "ECONNREFUSED",
    "P1001",
    "localhost:5432"
  ];
  for (const marker of forbidden) {
    assert(!text.includes(marker), `${label} exposed raw database diagnostic marker: ${marker}`);
  }
}

const health = await jsonResponse("/api/health");
assert(health.response.status === 503, `Expected DB-down health 503, received ${health.response.status}`);
assert(health.response.headers.get("cache-control")?.includes("no-store"), "DB-down health response must be no-store");
assert(health.body?.status === "unavailable", "DB-down health status must be unavailable");
assert(health.body?.database === "unavailable", "DB-down health database field must be unavailable");
assert(health.body?.code === "database_unavailable", "DB-down health must expose the stable database_unavailable code");
assertNoRawDatabaseDiagnostics(health.text, "health response");

const loginPage = await fetch(`${baseUrl}/login`);
const loginHtml = await loginPage.text();
assert(loginPage.status === 200, `Expected DB-down login page 200, received ${loginPage.status}`);
assert(
  loginHtml.includes("ContextOS cannot reach its database right now. Please try again shortly."),
  "DB-down login page must render the explicit service-unavailable message"
);
assertNoRawDatabaseDiagnostics(loginHtml, "login page");

const loginApi = await jsonResponse("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "demo@contextos.local", password: "contextos-demo-v011" })
});
assert(loginApi.response.status === 503, `Expected DB-down login API 503, received ${loginApi.response.status}`);
assert(loginApi.body?.code === "database_unavailable", "DB-down login API must expose the stable database_unavailable code");
assertNoRawDatabaseDiagnostics(loginApi.text, "login API");

console.log("Stage 7 database-outage smoke: PASS");
console.log("- health: 503 structured/no-store");
console.log("- login page: 200 with explicit unavailable state");
console.log("- login API: 503 structured without raw DB diagnostics");
