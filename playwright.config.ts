import { defineConfig, devices } from "@playwright/test";

const inheritedEnv = Object.fromEntries(
  Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === "string")
);
const port = process.env.PLAYWRIGHT_PORT ?? "3000";
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: ["**/local-first-characterization.spec.ts", "**/workspace-gate.spec.ts"],
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry"
  },
  webServer: {
    command: `npm run dev -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...inheritedEnv,
      ALLOW_PUBLIC_REGISTRATION: "true",
      ALLOW_DEMO_RESET: "true",
      CONTEXTOS_SSO_SECRET: "",
      SOCIALOS_APP_URL: "https://social-os-tau.vercel.app",
      NEXT_PUBLIC_APP_URL: baseURL
    }
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
