import { expect, test, type Page } from "@playwright/test";
import { CAPTURE_COMMANDS } from "../../src/components/workspace/editor/SlashCommandMenu";
import { parseCommandPageLine } from "../../src/lib/command-page-commands";

const demoEmail = "demo@contextos.local";
const demoPassword = "contextos-demo-v011";

async function resetDemo(page: Page) {
  const response = await page.request.post("/api/reset-demo");
  expect(response.status()).toBe(200);
}

async function loginDemo(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(demoEmail);
  await page.getByLabel("Password").fill(demoPassword);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await resetDemo(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
}

test("Dashboard visibly teaches durable command date and time formats", async ({ page }) => {
  await loginDemo(page);
  await expect(page.getByText("Hint: /task or /date with [YYYY-MM-DD] (HH:MM)", { exact: true })).toBeVisible();
});

test("capture slash-command descriptions use format examples rather than an aging literal date", () => {
  const task = CAPTURE_COMMANDS.find((command) => command.command === "/task");
  const date = CAPTURE_COMMANDS.find((command) => command.command === "/date");

  expect(task?.description).toBe("Capture a task. Add [YYYY-MM-DD] (HH:MM)");
  expect(date?.description).toBe("Capture a Date. Add [YYYY-MM-DD] (HH:MM)");
  expect(`${task?.description} ${date?.description}`).not.toContain("2026-07-10");
});

test("empty date commands return evergreen syntax guidance", () => {
  expect(parseCommandPageLine("/date", "2026-09-13")).toEqual({
    type: "error",
    message: "Add a title and date, like /date Exam [YYYY-MM-DD] (HH:MM)."
  });
});
