import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { safeOperationalErrorMetadata } from "../src/lib/safe-error-metadata";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

const secretLookingMessage = "postgresql://user:super-secret-password@example.invalid/contextos?sslmode=require";
const prismaError = Object.assign(new Error(secretLookingMessage), { code: "P1001" });
const prismaMetadata = safeOperationalErrorMetadata(prismaError);
const prismaSerialized = JSON.stringify(prismaMetadata);

assert.equal(prismaMetadata.kind, "error");
assert.equal(prismaMetadata.className, "Error");
assert.equal(prismaMetadata.code, "P1001");
assert.ok(!prismaSerialized.includes("super-secret-password"));
assert.ok(!prismaSerialized.includes("postgresql://"));
assert.ok(!prismaSerialized.includes("example.invalid"));

const sqlStateMetadata = safeOperationalErrorMetadata({ code: "08006", message: secretLookingMessage });
assert.equal(sqlStateMetadata.code, "08006");
assert.ok(!JSON.stringify(sqlStateMetadata).includes("super-secret-password"));

const networkMetadata = safeOperationalErrorMetadata({ code: "ECONNREFUSED", cause: secretLookingMessage });
assert.equal(networkMetadata.code, "ECONNREFUSED");
assert.ok(!JSON.stringify(networkMetadata).includes("super-secret-password"));

const hostileMetadata = safeOperationalErrorMetadata({
  code: "super-secret-password",
  message: secretLookingMessage,
  stack: `Error: ${secretLookingMessage}`
});
assert.equal(hostileMetadata.code, undefined);
assert.ok(!JSON.stringify(hostileMetadata).includes("super-secret-password"));

const apiRoutes = [
  "src/app/api/health/route.ts",
  "src/app/api/sync/route.ts",
  "src/app/api/auth/login/route.ts",
  "src/app/api/auth/me/route.ts",
  "src/app/api/auth/register/route.ts",
  "src/app/api/bootstrap/route.ts",
  "src/app/api/reset-demo/route.ts"
];

for (const route of apiRoutes) {
  const source = read(route);
  assert.ok(source.includes("logOperationalError"), `${route} must use the sanitized operational logger.`);
  assert.ok(!source.includes("console.error("), `${route} must not log raw error objects.`);
}

const healthRoute = read("src/app/api/health/route.ts");
assert.ok(healthRoute.includes('const noStoreHeaders = { "Cache-Control": "no-store" }'));
assert.ok(healthRoute.includes('export const dynamic = "force-dynamic"'));
assert.ok(healthRoute.includes('status: "ok"'));
assert.ok(healthRoute.includes('database: "ok"'));
assert.ok(!healthRoute.includes("DATABASE_URL"));

const operationalLogger = read("src/lib/operational-log.ts");
assert.ok(operationalLogger.includes("safeOperationalErrorMetadata(error)"));
assert.ok(!operationalLogger.includes("error.message"));
assert.ok(!operationalLogger.includes("error.stack"));

const restoreWorkflow = read(".github/workflows/stage8-db-restore.yml");
assert.ok(restoreWorkflow.includes('echo "::add-mask::$secret"'));
assert.ok(restoreWorkflow.includes('echo "AUTH_SECRET=$secret" >> "$GITHUB_ENV"'));

const releaseWorkflow = read(".github/workflows/stage8-release-rehearsal.yml");
assert.ok(releaseWorkflow.includes('echo "::add-mask::$stage7_secret"'));
assert.ok(releaseWorkflow.includes('echo "::add-mask::$stage8_secret"'));
assert.ok(releaseWorkflow.includes('echo "STAGE7_AUTH_SECRET=$stage7_secret" >> "$GITHUB_ENV"'));
assert.ok(releaseWorkflow.includes('echo "STAGE8_AUTH_SECRET=$stage8_secret" >> "$GITHUB_ENV"'));

console.log("STAGE8_OPERATIONAL_LOG_AUDIT=PASS");
