from pathlib import Path

READINESS_BODY = '''async function {name}(page: Page) {{
  const readiness = page.getByTestId("offline-shell-readiness");
  await expect(readiness).toHaveAttribute("data-ready", "true", {{ timeout: 30_000 }});
  await page.reload();
  await expect(page.getByRole("heading", {{ name: "Dashboard", exact: true }})).toBeVisible();
  await expect(page.getByTestId("offline-shell-readiness")).toHaveAttribute("data-ready", "true");
}}
'''


def replace_between(text: str, start: str, end: str, replacement: str) -> str:
    start_index = text.find(start)
    if start_index < 0:
        raise SystemExit(f"start marker not found: {start}")
    end_index = text.find(end, start_index)
    if end_index < 0:
        raise SystemExit(f"end marker not found after {start}: {end}")
    return text[:start_index] + replacement + text[end_index:]


contextos = Path("tests/e2e/contextos.spec.ts")
text = contextos.read_text()
text = replace_between(
    text,
    "async function warmOfflineShell(page: Page) {",
    "\ntest(\"date utilities keep date-only values on the local calendar day\"",
    READINESS_BODY.format(name="warmOfflineShell") + "\n",
)
contextos.write_text(text)

characterization = Path("tests/e2e/local-first-characterization.spec.ts")
text = characterization.read_text()
text = replace_between(
    text,
    "async function warmServiceWorker(page: Page) {",
    "\nasync function activeDemoProjectId(page: Page)",
    READINESS_BODY.format(name="warmServiceWorker") + "\n",
)
text = text.replace('reopened.getByTestId("global-sync-indicator")).toContainText("Offline")', 'reopened.getByTestId("global-sync-indicator").first()).toContainText("Offline")')
characterization.write_text(text)

workspace_gate = Path("tests/e2e/workspace-gate.spec.ts")
text = workspace_gate.read_text()
text = replace_between(
    text,
    "async function warmOfflineShell(page: Page) {",
    "\nasync function clearLocalIdentityAndWorkspace(page: Page)",
    READINESS_BODY.format(name="warmOfflineShell") + "\n",
)
workspace_gate.write_text(text)
