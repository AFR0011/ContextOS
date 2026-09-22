import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

const checks = [];
function check(name, condition, detail) {
  checks.push({ name, ok: Boolean(condition), detail });
}

const localLifecycle = read("src/lib/local-lifecycle.ts");
const localDb = read("src/lib/local-db.ts");
const logoutDialog = read("src/components/workspace/LogoutDialog.tsx");
const workspaceGate = read("src/components/workspace/WorkspaceGate.tsx");
const workspaceShell = read("src/components/workspace/WorkspaceShell.tsx");
const accountPanel = read("src/components/workspace/AccountDeletionPanel.tsx");
const accountDelete = read("src/app/api/account/delete/route.ts");
const clientStore = read("src/lib/client-store.tsx");
const syncRoute = read("src/app/api/sync/route.ts");
const syncServer = read("src/lib/sync-server.ts");
const types = read("src/lib/types.ts");
const schema = read("prisma/schema.prisma");

check(
  "user-scoped device cleanup",
  localLifecycle.includes("delete(userId)") && !localLifecycle.includes(".clear()"),
  "Normal remove-from-device must remain user-scoped rather than erasing every local identity."
);
check(
  "logout defaults to local retention",
  logoutDialog.includes('data-testid="logout-keep-local"') && logoutDialog.includes("Log out and keep local data"),
  "Ordinary logout should preserve the selected user's isolated local workspace by default."
);
check(
  "pending logout choices are explicit",
  logoutDialog.includes('data-testid="logout-sync"') &&
    logoutDialog.includes('data-testid="logout-discard-local"') &&
    logoutDialog.includes('data-testid="logout-remove-device-data"'),
  "Pending work must have explicit sync, discard, and device-removal paths."
);
check(
  "offline logout does not fake session invalidation",
  logoutDialog.includes("HttpOnly server session cannot be invalidated") && logoutDialog.includes("!sync.online"),
  "Offline browser code cannot truthfully claim to revoke the server-side HttpOnly session."
);
const logoutDiscardIndex = logoutDialog.indexOf('if (action === "discard")');
const logoutRemoveIndex = logoutDialog.indexOf('if (action === "remove")');
const logoutDestroyIndex = logoutDialog.indexOf("await destroyServerSession()");
check(
  "destructive logout cleans local state before revoking session",
  logoutDiscardIndex >= 0 && logoutRemoveIndex >= 0 && logoutDestroyIndex > logoutDiscardIndex && logoutDestroyIndex > logoutRemoveIndex,
  "Discard/remove-from-device paths must fail before server logout if user-scoped local cleanup cannot complete."
);
check(
  "multiple local identities require explicit selection",
  workspaceGate.includes('data-testid="local-account-chooser"') &&
    workspaceGate.includes("ContextOS will not guess which identity to open"),
  "Multiple eligible offline workspaces must never be selected implicitly."
);
check(
  "workspace interaction waits for local hydration",
  workspaceShell.includes("if (loading)") && workspaceShell.includes('data-testid="workspace-local-loading"'),
  "Workspace editing/logout controls must wait until the selected local identity has hydrated."
);

const mutationIncrementIndex = clientStore.indexOf("localMutationVersion.current += 1");
const bootVersionIndex = clientStore.indexOf("const bootMutationVersion = localMutationVersion.current");
const bootReadIndex = clientStore.indexOf("await rememberLocalUser(user)", bootVersionIndex);
const bootGuardIndex = clientStore.indexOf("localMutationVersion.current === bootMutationVersion", bootReadIndex);
const refreshVersionIndex = clientStore.indexOf("const refreshMutationVersion = localMutationVersion.current");
const refreshGuardIndex = clientStore.indexOf("localMutationVersion.current !== refreshMutationVersion", refreshVersionIndex);
check(
  "stale server snapshots cannot replace newer local mutations",
  mutationIncrementIndex >= 0 &&
    bootVersionIndex >= 0 && bootReadIndex > bootVersionIndex && bootGuardIndex > bootReadIndex &&
    refreshVersionIndex >= 0 && refreshGuardIndex > refreshVersionIndex,
  "Bootstrap/refresh must retain mutation-generation guards around server snapshots."
);

check(
  "account deletion is authenticated and same-origin guarded",
  accountDelete.includes("rejectCrossOriginMutation(request)") && accountDelete.includes("getCurrentUser()"),
  "Account deletion requires both authenticated session and same-origin mutation protection."
);
check(
  "account deletion re-verifies the password",
  accountDelete.includes("verifyPassword") && accountDelete.includes('confirmation: z.literal("DELETE")'),
  "A logged-in browser alone is not sufficient authority for destructive account removal."
);
const verifyIndex = accountPanel.indexOf("await requestDeletion(true)");
const localRemovalIndex = accountPanel.indexOf("await removeLocalUserDeviceData(user.id)");
const deleteIndex = accountPanel.indexOf("await requestDeletion(false)");
check(
  "account deletion failure ordering",
  verifyIndex >= 0 && localRemovalIndex > verifyIndex && deleteIndex > localRemovalIndex,
  "Credentials are verified before local cleanup and server deletion occurs last."
);
check(
  "server account deletion remains one cascade root",
  accountDelete.includes("prisma.user.delete") && schema.includes("onDelete: Cascade"),
  "User deletion remains the atomic root for owned server persistence."
);

check(
  "canonical workspace shape only",
  types.includes('areas: Area[]') &&
    types.includes('projects: Project[]') &&
    types.includes('tasks: Task[]') &&
    types.includes('dates: ContextDate[]') &&
    types.includes('dailyNotes: DailyNote[]') &&
    !/captures:|notes: Note\[\]|deadlines:|reviews:|dashboardScratchpads:|dashboardPreferences:/.test(types),
  "WorkspaceData must expose only Area, Project, Task, Date, and Daily Note persistence."
);
check(
  "canonical sync entities only",
  syncRoute.includes('z.enum(["areas", "projects", "tasks", "dates", "dailyNotes"])') &&
    syncRoute.includes('operation: z.literal("upsert")'),
  "The live sync wire must accept only canonical collection names and upserts."
);
check(
  "current client never emits delete mutations",
  !/operation\s*:\s*["']delete["']/.test(clientStore) && !/operation\s*:\s*["']delete["']/.test(types),
  "C8 has no per-record tombstone/delete protocol in the canonical workspace."
);
check(
  "canonical schema has no retired models or tombstone fields",
  ["Capture", "Note", "Deadline", "Review", "DashboardScratchpad", "DashboardPreference", "Domain"].every(
    (model) => !schema.includes(`model ${model} {`)
  ) &&
    !schema.includes("trashedAt") &&
    !schema.includes("archivedAt") &&
    !schema.includes("dueDate") &&
    !schema.includes("parentProjectId"),
  "Retired persistence and old lifecycle fields must be physically absent after C8."
);
check(
  "stale canonical writes use server-owned revision compare-and-swap",
  syncServer.includes("shouldApplyRevision") &&
    syncServer.includes("revisionConflictAfterFailedCas") &&
    syncServer.includes('reason: "stale"') &&
    syncServer.includes("server record revision changed") &&
    syncServer.includes("revision: { increment: 1 }") &&
    syncRoute.includes("baseRevision"),
  "Current conflict protection must be based on server-owned record revisions rather than client wall-clock ordering."
);
check(
  "IndexedDB v4 intentionally resets revisionless workspace and outbox state",
  localDb.includes("const DB_VERSION = 4") &&
    localDb.includes("oldVersion < 4") &&
    localDb.includes("objectStore(WORKSPACE_STORE).clear()") &&
    localDb.includes("objectStore(OUTBOX_STORE).clear()"),
  "The revision protocol requires an explicit local v4 clean break rather than inventing server revisions for older cached records."
);

const failed = checks.filter((item) => !item.ok);
for (const item of checks) {
  console.log(`${item.ok ? "PASS" : "FAIL"} ${item.name} - ${item.detail}`);
}

if (failed.length > 0) {
  console.error(`Stage 9 lifecycle audit failed: ${failed.length}/${checks.length} controls failed.`);
  process.exit(1);
}

console.log(`Stage 9 lifecycle audit passed: ${checks.length}/${checks.length} controls passed.`);
