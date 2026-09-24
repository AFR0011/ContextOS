import { defineConfig, devices } from "@playwright/test";

const inheritedEnv = Object.fromEntries(
  Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === "string")
);

export default defineConfig({
  testDir: ".",
  testMatch: [
    "tests/offline-production/**/*.spec.ts",
    "tests/e2e/local-first-characterization.spec.ts",
    "tests/e2e/workspace-gate.spec.ts"
  ],
  timeout: 60_000,
  expect: {
    timeout: 15_000
  },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100/login",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...inheritedEnv,
      ALLOW_PUBLIC_REGISTRATION: "false",
      ALLOW_DEMO_RESET: "true",
      CONTEXTOS_SSO_SECRET: "",
      SOCIALOS_APP_URL: "https://social-os-tau.vercel.app",
      NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3100"
    }
  }
});
