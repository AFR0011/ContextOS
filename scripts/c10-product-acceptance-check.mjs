import fs from "node:fs";

const registryPath = "audits/c10-product-acceptance.json";
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const entries = Array.isArray(registry.evidence) ? registry.evidence : [];
const allowedStatuses = new Set(registry.statusValues ?? []);
const errors = [];
const seen = new Set();

if (registry.program !== "C10") errors.push("Registry program must be C10.");
if (registry.baseline?.c9MergeCommit !== "16dffb7ad52dbcb9f2a8fd3ffbf0128c1a896d1f") {
  errors.push("C10 must remain anchored to the accepted C9 merge commit.");
}
if (!entries.length) errors.push("C10 acceptance registry is empty.");

for (const entry of entries) {
  if (!entry?.id || typeof entry.id !== "string") {
    errors.push("Every C10 acceptance item requires a string id.");
    continue;
  }
  if (seen.has(entry.id)) errors.push(`Duplicate C10 acceptance id: ${entry.id}`);
  seen.add(entry.id);

  if (!allowedStatuses.has(entry.status)) {
    errors.push(`${entry.id}: unsupported status ${String(entry.status)}`);
  }

  if (!Array.isArray(entry.artifacts) || entry.artifacts.length === 0) {
    errors.push(`${entry.id}: at least one repository artifact is required.`);
    continue;
  }

  for (const artifact of entry.artifacts) {
    if (typeof artifact !== "string" || !artifact.trim()) {
      errors.push(`${entry.id}: invalid artifact path.`);
    } else if (!fs.existsSync(artifact)) {
      errors.push(`${entry.id}: missing current artifact ${artifact}`);
    }
  }
}

for (const required of ["HISTORY-001", "WORKFLOW-001", "OFFLINE-001", "ACCESS-001", "CLAIMS-001", "CI-001", "VISUAL-001", "AUDIT-001", "CLOSE-001"]) {
  if (!seen.has(required)) errors.push(`Missing required C10 control ${required}.`);
}

const close = entries.find((entry) => entry.id === "CLOSE-001");
if (close?.status === "passed") {
  const pending = entries.filter((entry) => entry.status === "pending");
  if (pending.length) {
    errors.push(`C10 cannot close with pending evidence: ${pending.map((entry) => entry.id).join(", ")}`);
  }
  if (!close.verifiedCommit || !close.ciRun) {
    errors.push("CLOSE-001 requires exact verifiedCommit and ciRun when passed.");
  }
}

const ci = fs.readFileSync(".github/workflows/ci.yml", "utf8");
for (const retired of [
  "tests/e2e/stage9-tombstones.spec.ts",
  "tests/offline-production/stage9-tombstone.spec.ts",
  "tests/e2e/local-db-v2.spec.ts"
]) {
  if (ci.includes(retired)) errors.push(`Active CI still references retired artifact ${retired}.`);
}

const historicalStage10 = fs.readFileSync("docs/stage10/STAGE10_ACCEPTANCE.md", "utf8");
if (!historicalStage10.includes("f4ba02699c24210ddd6f4cfaf2b626f7a33b0c40") ||
    !historicalStage10.includes("31800346837")) {
  errors.push("Historical Stage 10 exact acceptance provenance changed unexpectedly.");
}

const current = fs.readFileSync("docs/c10/C10_ACCEPTANCE.md", "utf8");
if (!/historical \*\*Stage 10\*\*/i.test(current) || !/C10 remains open/i.test(current)) {
  errors.push("C10 documentation must distinguish current C10 from historical Stage 10 and remain open while pending.");
}

const syncServer = fs.readFileSync("src/lib/sync-server.ts", "utf8");
const syncRoute = fs.readFileSync("src/app/api/sync/route.ts", "utf8");
const restoreBarrier = fs.readFileSync("src/lib/restore-barrier.ts", "utf8");
const localDb = fs.readFileSync("src/lib/local-db.ts", "utf8");
const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
const revisionMigration = fs.readFileSync("prisma/migrations/20260922190000_server_record_revisions/migration.sql", "utf8");

if (!syncRoute.includes("baseServerSyncedAt") || !restoreBarrier.includes("mutation.baseServerSyncedAt")) {
  errors.push("C10 restore anti-resurrection must use the server snapshot observed by the queued mutation.");
}
if (!syncRoute.includes("baseRevision") || !syncServer.includes("shouldApplyRevision")) {
  errors.push("C10 existing-record conflicts must use server-owned revision preconditions.");
}
if (!syncServer.includes("updateMany") || !syncServer.includes("revision: { increment: 1 }") ||
    !syncServer.includes("revisionConflictAfterFailedCas")) {
  errors.push("C10 revision updates must remain atomic database compare-and-swap operations.");
}
for (const model of ["Area", "Project", "Task", "ContextDate", "DailyNote"]) {
  const start = schema.indexOf(`model ${model} {`);
  const end = start >= 0 ? schema.indexOf("\n}", start) : -1;
  const block = start >= 0 && end > start ? schema.slice(start, end + 2) : "";
  if (!/revision\s+Int\s+@default\(1\)/.test(block)) {
    errors.push(`${model} is missing the server-owned revision field.`);
  }
}
for (const table of ["Area", "Project", "Task", "ContextDate", "DailyNote"]) {
  if (!revisionMigration.includes(`ALTER TABLE "${table}" ADD COLUMN "revision"`)) {
    errors.push(`Revision migration is missing ${table}.`);
  }
}
if (!localDb.includes("const DB_VERSION = 4") || !localDb.includes("oldVersion < 4")) {
  errors.push("C10 revision protocol requires the IndexedDB v4 clean boundary.");
}

const workflowTest = fs.readFileSync("tests/e2e/c10-product-workflow.spec.ts", "utf8");
for (const [label, literal] of [
  ["understand the day", "Review today's open work"],
  ["execute", "Complete ${taskTitle}"],
  ["note", 'getByLabel("Daily Notes")'],
  ["open context", 'getByTestId("home-contexts")'],
  ["resume project", "Keep daily execution, temporal context, and project recovery coherent."],
  ["see upcoming", "ContextOS verification pass"],
  ["find history", 'toContainText("Done")'],
  ["LifeOS boundary", 'getByTestId("lifeos-hub")']
]) {
  if (!workflowTest.includes(literal)) {
    errors.push(`Definitive workflow acceptance is missing the ${label} stage marker: ${literal}`);
  }
}


const accessibilityTest = fs.readFileSync("tests/e2e/c10-accessibility.spec.ts", "utf8");
const workspaceShell = fs.readFileSync("src/components/workspace/WorkspaceShell.tsx", "utf8");
const globalCss = fs.readFileSync("src/app/globals.css", "utf8");
const stage9Lifecycle = fs.readFileSync("tests/e2e/stage9-lifecycle.spec.ts", "utf8");
const firstRunTest = fs.readFileSync("tests/e2e/batch3-clean-first-run.spec.ts", "utf8");

for (const marker of [
  "command palette exposes combobox ownership and active descendant state",
  "command palette stays inside a short mobile viewport and scrolls its results",
  "inline create disclosures expose state and return focus when cancelled",
  "light-theme subtle text token keeps AA contrast on canonical surfaces",
  "dynamic import errors are exposed as alerts"
]) {
  if (!accessibilityTest.includes(marker)) {
    errors.push(`C10 accessibility regression coverage is missing: ${marker}`);
  }
}
if (!workspaceShell.includes("inert={navigationIsHidden ? true : undefined}") ||
    !workspaceShell.includes('aria-hidden={navigationIsHidden ? true : undefined}')) {
  errors.push("Closed mobile navigation must remain inert and aria-hidden.");
}
if (!globalCss.includes("--cos-text-subtle: #646c79;")) {
  errors.push("Light-theme subtle text must retain the audited AA contrast token.");
}
if (!globalCss.includes("overflow-wrap: anywhere;") || !globalCss.includes("white-space: normal;")) {
  errors.push("Shared pill labels must retain hostile-content wrapping.");
}
if (!accessibilityTest.includes("contrastRatio(tokens.subtle, background)") ||
    !accessibilityTest.includes("toBeGreaterThanOrEqual(4.5)")) {
  errors.push("C10 must retain executable subtle-text contrast coverage.");
}
if (stage9Lifecycle.includes("indexedDB.open(databaseName, 3)") ||
    !stage9Lifecycle.includes("indexedDB.open(databaseName, 4)")) {
  errors.push("Stage 9 lifecycle coverage must use the current IndexedDB v4 contract.");
}
if (!stage9Lifecycle.includes("logout dialog stays reachable on a short mobile viewport with pending-error content")) {
  errors.push("Stage 9 lifecycle coverage must retain short-viewport logout overflow protection.");
}
if (stage9Lifecycle.includes('expect(fixtureResponse.status(), JSON.stringify(fixtureBody)).toBe(200)')) {
  errors.push("Stage 9 lifecycle coverage must not expect demo reset success for a non-demo account.");
}
if (!firstRunTest.includes('getByRole("heading", { name: "Home", exact: true })') ||
    !firstRunTest.includes("toBeFocused()")) {
  errors.push("First-run acceptance must verify focus moves into Home when setup disappears.");
}


const taskEditingTest = fs.readFileSync("tests/e2e/c10-task-editing.spec.ts", "utf8");
const areaEditingTest = fs.readFileSync("tests/e2e/c10-area-editing.spec.ts", "utf8");
const archivePolicyE2e = fs.readFileSync("tests/e2e/c10-archive-policy.spec.ts", "utf8");
const archivePolicyUnit = fs.readFileSync("src/lib/archive-policy.test.ts", "utf8");
const taskEditSheet = fs.readFileSync("src/components/workspace/TaskEditSheet.tsx", "utf8");
const starterSource = fs.readFileSync("src/lib/starter.ts", "utf8");
const responsiveLayoutTest = fs.readFileSync("tests/e2e/c10-responsive-layout.spec.ts", "utf8");
const productPrimitives = fs.readFileSync("src/components/workspace/ProductPrimitives.tsx", "utf8");
const logoutDialog = fs.readFileSync("src/components/workspace/LogoutDialog.tsx", "utf8");
const authForm = fs.readFileSync("src/components/AuthForm.tsx", "utf8");
const workspaceGate = fs.readFileSync("src/components/workspace/WorkspaceGate.tsx", "utf8");
const handoffPage = fs.readFileSync("src/app/handoff/page.tsx", "utf8");
const visualStressSpec = fs.readFileSync("tests/e2e/c10-visual-stress.spec.ts", "utf8");
const visualEmptySpec = fs.readFileSync("tests/e2e/c10-visual-empty.spec.ts", "utf8");
const visualOfflineSpec = fs.readFileSync("tests/offline-production/c10-visual-offline.spec.ts", "utf8");
const offlineProductionSpec = fs.readFileSync("tests/offline-production/offline-shell.spec.ts", "utf8");
const workspaceGateTest = fs.readFileSync("tests/e2e/workspace-gate.spec.ts", "utf8");
const localFirstCharacterization = fs.readFileSync("tests/e2e/local-first-characterization.spec.ts", "utf8");
const areaDetailRoute = fs.readFileSync("src/app/(workspace)/areas/[id]/page.tsx", "utf8");
const visualCaptureRunner = fs.readFileSync("scripts/capture-c10-visual.mjs", "utf8");
const ciWorkflow = fs.readFileSync(".github/workflows/ci.yml", "utf8");
const visualBaselineSpec = fs.readFileSync("tests/e2e/c10-visual-baseline.spec.ts", "utf8");
const screenshotBaseline = fs.readFileSync("docs/c10/SCREENSHOT_BASELINE.md", "utf8");
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

for (const marker of [
  "desktop-light",
  "desktop-dark",
  "compact-desktop-light",
  "compact-desktop-dark",
  "mobile-light",
  "mobile-dark",
  "01-home",
  "03-project-detail",
  "05-area-detail",
  "07-search-selected",
  "08-command-palette",
  "04-area-archive-blocked",
  "08-task-edit-sheet",
  "08-new-task-sheet",
  "08-new-date-sheet",
  "10-settings",
  "11-mobile-drawer",
  "13-logout-dialog"
]) {
  if (!visualBaselineSpec.includes(marker)) {
    errors.push(`C10 visual baseline capture matrix is missing: ${marker}`);
  }
}
if (!visualBaselineSpec.includes("document.documentElement.scrollWidth <= document.documentElement.clientWidth")) {
  errors.push("C10 visual capture must reject horizontal page overflow before screenshots.");
}
if (packageJson.scripts?.["capture:c10:visual"] !== "node scripts/capture-c10-visual.mjs") {
  errors.push("C10 visual capture command is missing or changed unexpectedly.");
}
if (!screenshotBaseline.includes("npm run capture:c10:visual") ||
    !screenshotBaseline.includes("Current render-evidence blocker")) {
  errors.push("C10 screenshot documentation must retain the executable capture command and current render-evidence boundary.");
}
if (!visualStressSpec.includes("320x720 hostile content") ||
    !visualStressSpec.includes('for (const theme of ["light", "dark"] as const)')) {
  errors.push("C10 visual evidence must retain 320x720 hostile-content coverage in both themes.");
}
for (const marker of ["empty-desktop-light", "empty-desktop-dark", "empty-mobile-light", "empty-mobile-dark"]) {
  if (!visualEmptySpec.includes(marker)) {
    errors.push(`C10 clean-account visual baseline is missing: ${marker}`);
  }
}
for (const marker of ["01-online-ready", "02-offline", "03-offline-pending", "04-reconnecting", "05-reconnected"]) {
  if (!visualOfflineSpec.includes(marker)) {
    errors.push(`C10 production offline visual coverage is missing: ${marker}`);
  }
}
if (visualOfflineSpec.includes('indexedDB.open("contextos-offline-v1", 3)') ||
    !visualOfflineSpec.includes('indexedDB.open("contextos-offline-v1", 4)')) {
  errors.push("Production offline visual evidence must use the current IndexedDB v4 contract.");
}
if (offlineProductionSpec.includes('indexedDB.open("contextos-offline-v1", 3)') ||
    !offlineProductionSpec.includes('indexedDB.open("contextos-offline-v1", 4)')) {
  errors.push("Production offline behavioral coverage must use the current IndexedDB v4 contract.");
}
if (workspaceGateTest.includes("indexedDB.open(databaseName, 3)") ||
    !workspaceGateTest.includes("indexedDB.open(databaseName, 4)")) {
  errors.push("Workspace-gate offline identity coverage must use the current IndexedDB v4 contract.");
}
if (localFirstCharacterization.includes('indexedDB.open("contextos-offline-v1", 3)') ||
    !localFirstCharacterization.includes('indexedDB.open("contextos-offline-v1", 4)')) {
  errors.push("Local-first characterization must use the current IndexedDB v4 contract.");
}
if (!localFirstCharacterization.includes('fetch("/api/reset-demo", { method: "POST" })') ||
    !localFirstCharacterization.includes('fetch("/api/bootstrap", { cache: "no-store" })')) {
  errors.push("Production local-first characterization must use browser-origin authenticated requests.");
}
if (!localFirstCharacterization.includes('getByTestId("project-create-form").getByLabel("Area", { exact: true })')) {
  errors.push("Local-first Project creation coverage must scope the Area selector to the creation form.");
}
if (!areaDetailRoute.includes("WorkspaceRouteHandoff")) {
  errors.push("Area detail must retain a physical App Router handoff route for direct/offline navigation.");
}
if (!visualCaptureRunner.includes('run(npm, ["run", "build"])') ||
    !visualCaptureRunner.includes("c10-visual-stress.spec.ts") ||
    !visualCaptureRunner.includes("c10-visual-empty.spec.ts") ||
    !visualCaptureRunner.includes("c10-visual-offline.spec.ts") ||
    !visualCaptureRunner.includes("playwright.production.config.ts")) {
  errors.push("C10 visual capture runner must build first and execute standard, hostile, empty-account, and production-offline evidence.");
}
if (!visualCaptureRunner.includes("--output=test-results/c10-production") ||
    !visualCaptureRunner.includes("--output=test-results/c10-standard")) {
  errors.push("C10 visual capture runner must keep production and standard artifacts in separate output directories.");
}
if (!ciWorkflow.includes("Capture C10 visual audit evidence") ||
    !ciWorkflow.includes("Upload C10 visual audit evidence") ||
    !ciWorkflow.includes("test-results/c10-production/**/*.png") ||
    !ciWorkflow.includes("test-results/c10-standard/**/*.png")) {
  errors.push("C10 CI must capture and upload rendered visual evidence for the audit branch.");
}


for (const marker of [
  "Task editor can rename, reschedule, clear planning, and move context",
  "Task editor is available from completed Task rows without changing state"
]) {
  if (!taskEditingTest.includes(marker)) {
    errors.push(`C10 Task editing coverage is missing: ${marker}`);
  }
}
if (!taskEditSheet.includes('title="Edit Task"') ||
    !taskEditSheet.includes('aria-label="Task context"') ||
    !taskEditSheet.includes('aria-label="Task planned day"') ||
    !taskEditSheet.includes('aria-label="Task scheduled time"')) {
  errors.push("Shared Task editor must retain title, context, planned-day, and scheduled-time controls.");
}
if (!areaEditingTest.includes("Area detail can rename the canonical Area without changing lifecycle") ||
    !areaEditingTest.includes("Area rename rejects an empty name and Escape restores the canonical value")) {
  errors.push("C10 Area rename regression coverage is incomplete.");
}
for (const marker of [
  "Project archive is blocked until its open Tasks are resolved",
  "Area archive ignores child Project work but blocks direct open Tasks"
]) {
  if (!archivePolicyE2e.includes(marker)) {
    errors.push(`C10 archive-policy E2E coverage is missing: ${marker}`);
  }
}
if (!archivePolicyUnit.includes("Area archive blocker counts only direct open Tasks, not child Project work") ||
    !archivePolicyUnit.includes("completed Tasks under archived parents cannot be reopened until moved or restored")) {
  errors.push("Archive-policy unit coverage must preserve the approved Project/Area lifecycle semantics.");
}
if (!/name:\s*"Release Planning"[\s\S]{0,300}state:\s*"archived"/.test(starterSource) ||
    !/title:\s*"Review release milestones and identify risk points"[\s\S]{0,300}projectId:\s*releaseProjectId[\s\S]{0,200}state:\s*"done"/.test(starterSource)) {
  errors.push("Demo seed must not ship an Open Task inside the archived Release Planning Project.");
}

if (!responsiveLayoutTest.includes("detail Date composers remain usable at the 1024px sidebar breakpoint") ||
    !responsiveLayoutTest.includes("toBeGreaterThanOrEqual(minimum)")) {
  errors.push("C10 responsive layout coverage must protect usable Date-composer width at the 1024px sidebar breakpoint.");
}
if (!productPrimitives.includes("sm:max-h-[calc(88dvh-1rem)]") ||
    !productPrimitives.includes("sm:max-h-[calc(100dvh-2rem)]")) {
  errors.push("Shared overlays must remain bounded by the dynamic viewport at narrow and sm breakpoints.");
}
if (!logoutDialog.includes("max-h-[calc(100dvh-2rem)]") ||
    !logoutDialog.includes("overflow-y-auto")) {
  errors.push("Logout dialog must remain scrollable inside short viewports.");
}
for (const [label, source] of [
  ["authentication", authForm],
  ["workspace gate", workspaceGate],
  ["handoff gate", handoffPage],
  ["workspace shell", workspaceShell]
]) {
  if (!source.includes("dvh")) {
    errors.push(`Phase C dynamic viewport contract is missing from ${label}.`);
  }
}

const buildTsconfig = fs.readFileSync("tsconfig.build.json", "utf8");
const nextConfigSource = fs.readFileSync("next.config.ts", "utf8");
const rootTsconfig = fs.readFileSync("tsconfig.json", "utf8");

if (!nextConfigSource.includes('tsconfigPath: "tsconfig.build.json"')) {
  errors.push("Next production build must use tsconfig.build.json.");
}
for (const required of ['"src/**/*.ts"', '"src/**/*.tsx"', '".next/types/**/*.ts"']) {
  if (!buildTsconfig.includes(required)) {
    errors.push(`Production build tsconfig is missing required include ${required}.`);
  }
}
for (const excluded of [
  '"tests"',
  '"scripts"',
  '"docs"',
  '"audits"',
  '"prisma"',
  '"src/**/*.test.ts"',
  '"src/**/*.test.tsx"',
  '"src/**/*.spec.ts"',
  '"src/**/*.spec.tsx"'
]) {
  if (!buildTsconfig.includes(excluded)) {
    errors.push(`Production build tsconfig is missing non-runtime exclusion ${excluded}.`);
  }
}
if (!rootTsconfig.includes('"**/*.ts"') || !rootTsconfig.includes('"**/*.tsx"')) {
  errors.push("Repository-wide tsconfig must remain broad so npm run typecheck still checks tests and scripts.");
}
if (packageJson.scripts?.["typecheck"] !== "tsc --noEmit") {
  errors.push("Repository-wide typecheck contract changed unexpectedly.");
}
if (packageJson.scripts?.["typecheck:build"] !== "tsc --noEmit -p tsconfig.build.json") {
  errors.push("Production build typecheck command is missing or changed unexpectedly.");
}


const prismaConfigSource = fs.readFileSync("prisma.config.ts", "utf8");
if (prismaConfigSource.includes('env("DATABASE_URL")')) {
  errors.push("Prisma config must not require DATABASE_URL merely to load generation-time configuration.");
}
if (!prismaConfigSource.includes('process.env.DATABASE_URL ?? ""')) {
  errors.push("Prisma config must allow credential-free prisma generate while leaving DB commands dependent on a real URL.");
}


if (errors.length) {
  for (const error of errors) console.error(`FAIL ${error}`);
  process.exit(1);
}

const counts = Object.fromEntries(
  [...allowedStatuses].map((status) => [status, entries.filter((entry) => entry.status === status).length])
);
console.log(`C10 product acceptance registry passed structural validation: ${entries.length} controls. ${JSON.stringify(counts)}`);
