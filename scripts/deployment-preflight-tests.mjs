import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const safeEnv = {
  DATABASE_URL: "postgresql://contextos:contextos@localhost:5432/contextos?schema=public",
  AUTH_SECRET: "stage8-test-auth-secret-with-more-than-32-bytes",
  NEXT_PUBLIC_APP_URL: "https://contextos-preview.example",
  APP_URL: "",
  VERCEL_URL: "",
  ALLOW_PUBLIC_REGISTRATION: "false",
  ALLOW_DEMO_RESET: "false",
  CONTEXTOS_SSO_SECRET: "",
  SOCIALOS_APP_URL: "https://socialos-preview.example",
  SEED_DEMO_EMAIL: "",
  SEED_DEMO_PASSWORD: ""
};

function run(overrides = {}) {
  return spawnSync(process.execPath, ["scripts/deployment-preflight.mjs"], {
    cwd: root,
    env: { ...process.env, ...safeEnv, ...overrides },
    encoding: "utf8"
  });
}

function output(result) {
  return `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
}

const cases = [
  {
    name: "safe production-like environment",
    overrides: {},
    expectSuccess: true,
    expected: "PASS Stage 8 deployment preflight"
  },
  {
    name: "weak authentication secret",
    overrides: { AUTH_SECRET: "short" },
    expectSuccess: false,
    expected: "AUTH_SECRET must contain at least 32 UTF-8 bytes"
  },
  {
    name: "non-HTTPS canonical origin",
    overrides: { NEXT_PUBLIC_APP_URL: "http://contextos-preview.example" },
    expectSuccess: false,
    expected: "must use https://"
  },
  {
    name: "canonical origin with a path",
    overrides: { NEXT_PUBLIC_APP_URL: "https://contextos-preview.example/workspace" },
    expectSuccess: false,
    expected: "must identify an origin only"
  },
  {
    name: "public registration accidentally enabled",
    overrides: { ALLOW_PUBLIC_REGISTRATION: "true" },
    expectSuccess: false,
    expected: "ALLOW_PUBLIC_REGISTRATION must be false/unset"
  },
  {
    name: "demo reset accidentally enabled",
    overrides: { ALLOW_DEMO_RESET: "1" },
    expectSuccess: false,
    expected: "ALLOW_DEMO_RESET must be false/unset"
  },
  {
    name: "weak SSO secret",
    overrides: { CONTEXTOS_SSO_SECRET: "weak", SOCIALOS_APP_URL: "https://socialos-preview.example" },
    expectSuccess: false,
    expected: "CONTEXTOS_SSO_SECRET must contain at least 32 UTF-8 bytes"
  },
  {
    name: "SSO secret reuses authentication secret",
    overrides: {
      CONTEXTOS_SSO_SECRET: "stage8-test-auth-secret-with-more-than-32-bytes",
      SOCIALOS_APP_URL: "https://socialos-preview.example"
    },
    expectSuccess: false,
    expected: "must be distinct from AUTH_SECRET"
  },
  {
    name: "SSO destination contains a path",
    overrides: {
      CONTEXTOS_SSO_SECRET: "stage8-test-sso-secret-with-more-than-32-bytes",
      SOCIALOS_APP_URL: "https://socialos-preview.example/callback"
    },
    expectSuccess: false,
    expected: "must identify an exact HTTPS origin"
  }
];

const failures = [];
for (const testCase of cases) {
  const result = run(testCase.overrides);
  const actualSuccess = result.status === 0;
  const combined = output(result);
  if (actualSuccess !== testCase.expectSuccess || !combined.includes(testCase.expected)) {
    failures.push(
      `${testCase.name}: expected success=${testCase.expectSuccess} and output containing ${JSON.stringify(testCase.expected)}, ` +
        `got status=${result.status}\n${combined}`
    );
  } else {
    console.log(`PASS ${testCase.name}`);
  }
}

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`PASS Stage 8 deployment preflight regression cases: ${cases.length}/${cases.length}.`);
}
