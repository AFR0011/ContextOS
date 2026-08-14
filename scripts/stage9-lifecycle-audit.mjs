import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

const checks = [];
function check(name, condition, detail) {
  checks.push({ name, ok: Boolean(condition), detail });
}

const localLifecycle = read("src/lib/local-lifecycle.ts");
const logoutDialog = read("src/components/workspace/LogoutDialog.tsx");
const accountDelete = read("src/app/api/account/delete/route.ts");
const clientStore = read("src/lib/client-store.tsx");
const syncServer = read("src/lib/sync-server.ts");
const schema = read("prisma/schema.prisma");
const views = read("src/components/workspace/Views.tsx");

check(
  "user-scoped IndexedDB cleanup",
  localLifecycle.includes("delete(userId)") && !localLifecycle.includes(".clear()"),
  "Lifecycle cleanup must delete user-keyed entries and must not clear whole stores."
);
check(
  "logout defaults to local retention",
  logoutDialog.includes('data-testid="logout-keep-local"') && logoutDialog.includes("Log out and keep local data"),
  "The ordinary logout path must visibly preserve local data."
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
check(
  "account deletion is authenticated and same-origin guarded",
  accountDelete.includes("rejectCrossOriginMutation(request)") && accountDelete.includes("getCurrentUser()"),
  "Account deletion must require both the authenticated session and the existing origin guard."
);
check(
  "account deletion re-verifies the password",
  accountDelete.includes("verifyPassword") && accountDelete.includes('confirmation: z.literal("DELETE")'),
  "A logged-in browser alone is not sufficient authority for destructive account removal."
);
check(
  "account deletion supports preflight verification",
  accountDelete.includes("verifyOnly") && accountDelete.includes("verified: true"),
  "The browser must be able to verify credentials before removing its local copy."
);
check(
  "server account deletion remains one cascade root",
  accountDelete.includes("prisma.user.delete") && schema.includes("onDelete: Cascade"),
  "User deletion should remain the atomic root for user-owned server persistence."
);
check(
  "client writes do not produce legacy hard-delete mutations",
  !/operation\s*:\s*["']delete["']/.test(clientStore),
  "Current clients must express ordinary deletion as synchronized tombstone state, not the legacy delete operation."
);
check(
  "legacy delete remains compatibility-only",
  syncServer.includes('if (mutation.operation === "delete")') &&
    syncServer.includes("await recordMutation(tx, userId, mutation)") &&
    !/mutation\.operation\s*===\s*["']delete["'][\s\S]{0,500}\.(delete|deleteMany)\(/.test(syncServer),
  "The legacy delete operation must not silently become physical deletion without an anti-resurrection protocol."
);
check(
  "recoverable tombstones remain modeled",
  ["Project", "Task", "Note", "Deadline"].every((model) => {
    const start = schema.indexOf(`model ${model} {`);
    const end = schema.indexOf("\n}", start);
    return start >= 0 && schema.slice(start, end).includes("trashedAt");
  }),
  "Projects, tasks, notes, and dates require recoverable tombstone state."
);
check(
  "trash UI restores tombstones",
  views.includes('tab, setTab] = useState<"archived" | "trash">') &&
    views.includes("trashedAt: null") &&
    views.includes("Trash is empty"),
  "Recoverable deletion must remain visible and reversible through the Archive/Trash UI."
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
