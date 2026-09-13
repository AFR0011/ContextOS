import { expect, test, type APIRequestContext } from "@playwright/test";
import { workspaceExportBundleSchema } from "../../src/lib/portability";

const demoEmail = "demo@contextos.local";
const password = "contextos-demo-v011";

async function login(request: APIRequestContext, email = demoEmail) {
  const response = await request.post("/api/auth/login", { data: { email, password } });
  expect(response.status()).toBe(200);
}

async function logout(request: APIRequestContext) {
  const response = await request.post("/api/auth/logout");
  expect(response.status()).toBe(200);
}

async function registerFresh(request: APIRequestContext, prefix: string) {
  const token = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const response = await request.post("/api/auth/register", {
    data: { email: `${token}@example.test`, password },
    headers: { "x-forwarded-for": `portability-${token}` }
  });
  expect(response.status()).toBe(200);
}

async function resetDemo(request: APIRequestContext) {
  const response = await request.post("/api/reset-demo");
  expect(response.status()).toBe(200);
}

async function exportBundle(request: APIRequestContext) {
  const response = await request.get("/api/portability/export?format=json");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-disposition"]).toContain("contextos-workspace-");
  const bundle = await response.json();
  return workspaceExportBundleSchema.parse(bundle);
}

async function bootstrap(request: APIRequestContext) {
  const response = await request.get("/api/bootstrap");
  expect(response.status()).toBe(200);
  return (await response.json()).data;
}

function workspaceOnly(data: any) {
  const { serverSyncedAt: _serverSyncedAt, ...workspace } = data;
  return workspace;
}

function normalizeWorkspace(workspace: any) {
  return Object.fromEntries(
    Object.entries(workspace).map(([key, value]) => [
      key,
      Array.isArray(value)
        ? [...value].sort((a: any, b: any) => String(a.id).localeCompare(String(b.id)))
        : value
    ])
  );
}

function sortedNames(records: { name: string }[]) {
  return records.map((item) => item.name).sort((a, b) => a.localeCompare(b));
}

function assertRelationships(workspace: any) {
  const domains = new Set(workspace.domains.map((item: any) => item.id));
  const projects = new Set(workspace.projects.map((item: any) => item.id));
  const tasks = new Set(workspace.tasks.map((item: any) => item.id));
  const targets = new Set([
    ...workspace.projects.map((item: any) => item.id),
    ...workspace.tasks.map((item: any) => item.id),
    ...workspace.notes.map((item: any) => item.id),
    ...workspace.deadlines.map((item: any) => item.id)
  ]);

  for (const project of workspace.projects) {
    expect(domains.has(project.domainId)).toBe(true);
    if (project.parentProjectId) expect(projects.has(project.parentProjectId)).toBe(true);
  }
  for (const task of workspace.tasks) {
    if (task.domainId) expect(domains.has(task.domainId)).toBe(true);
    if (task.projectId) expect(projects.has(task.projectId)).toBe(true);
  }
  for (const note of workspace.notes) {
    expect(domains.has(note.domainId)).toBe(true);
    if (note.projectId) expect(projects.has(note.projectId)).toBe(true);
  }
  for (const date of workspace.deadlines) {
    if (date.projectId) expect(projects.has(date.projectId)).toBe(true);
    for (const taskId of date.taskIds) expect(tasks.has(taskId)).toBe(true);
  }
  for (const capture of workspace.captures) {
    if (capture.convertedToId) expect(targets.has(capture.convertedToId)).toBe(true);
  }
}

test("portability schema rejects unsupported versions, dangling references, and hierarchy cycles", () => {
  const now = new Date().toISOString();
  const base: any = {
    format: "contextos-workspace",
    version: 1,
    exportedAt: now,
    workspace: {
      domains: [{ id: "dom-a", name: "A", archived: false, createdAt: now, updatedAt: now }],
      projects: [{
        id: "proj-a", name: "A", domainId: "dom-a", parentProjectId: null, status: "active",
        currentObjective: "", nextAction: "", latestStatus: "", recoveryNotes: "", openLoops: [],
        createdAt: now, updatedAt: now, archivedAt: null, trashedAt: null
      }],
      tasks: [], captures: [], notes: [], deadlines: [], reviews: [], dashboardScratchpads: [], dashboardPreferences: []
    }
  };

  expect(workspaceExportBundleSchema.safeParse(base).success).toBe(true);
  expect(workspaceExportBundleSchema.safeParse({ ...base, version: 2 }).success).toBe(false);
  expect(workspaceExportBundleSchema.safeParse({
    ...base,
    workspace: { ...base.workspace, projects: [{ ...base.workspace.projects[0], domainId: "missing" }] }
  }).success).toBe(false);
  expect(workspaceExportBundleSchema.safeParse({
    ...base,
    workspace: {
      ...base.workspace,
      projects: [
        { ...base.workspace.projects[0], parentProjectId: "proj-b" },
        { ...base.workspace.projects[0], id: "proj-b", name: "B", parentProjectId: "proj-a" }
      ]
    }
  }).success).toBe(false);
});

test("replace import round-trips the complete workspace and blocks pre-restore queued mutations", async ({ page }) => {
  await login(page.request);
  await resetDemo(page.request);
  const bundle = await exportBundle(page.request);

  const markdown = await page.request.get("/api/portability/export?format=markdown");
  expect(markdown.status()).toBe(200);
  expect(markdown.headers()["content-type"]).toContain("text/markdown");
  expect(await markdown.text()).toContain("# ContextOS workspace export");

  const domain = bundle.workspace.domains[0];
  const changedAt = new Date().toISOString();
  const changed = await page.request.post("/api/sync", {
    data: {
      mutations: [{
        mutationId: `portability-change-${Date.now()}`,
        entityType: "domains",
        entityId: domain.id,
        operation: "upsert",
        payload: { ...domain, name: `Changed after export ${Date.now()}`, updatedAt: changedAt },
        createdAt: changedAt
      }]
    }
  });
  expect(changed.status()).toBe(200);

  const preview = await page.request.post("/api/portability/import", {
    data: { action: "preview", mode: "replace", bundle }
  });
  expect(preview.status()).toBe(200);
  await expect(preview.json()).resolves.toMatchObject({ version: 1, mode: "replace" });

  const stillChanged = await bootstrap(page.request);
  expect(stillChanged.domains.find((item: any) => item.id === domain.id)?.name).not.toBe(domain.name);

  const restore = await page.request.post("/api/portability/import", {
    data: {
      action: "restore",
      mode: "replace",
      bundle,
      confirmedNoPendingChanges: true,
      confirmation: "REPLACE"
    }
  });
  expect(restore.status()).toBe(200);

  const restored = await bootstrap(page.request);
  expect(normalizeWorkspace(workspaceOnly(restored))).toEqual(normalizeWorkspace(bundle.workspace));
  assertRelationships(restored);

  const staleMutationId = `pre-restore-stale-${Date.now()}`;
  const stale = await page.request.post("/api/sync", {
    data: {
      mutations: [{
        mutationId: staleMutationId,
        entityType: "domains",
        entityId: domain.id,
        operation: "upsert",
        payload: {
          ...domain,
          name: "This stale queued edit must not resurrect",
          updatedAt: new Date(Date.now() + 86_400_000).toISOString()
        },
        createdAt: bundle.exportedAt
      }]
    }
  });
  expect(stale.status()).toBe(200);
  const staleBody = await stale.json();
  expect(staleBody.appliedMutationIds).toContain(staleMutationId);
  expect(staleBody.warnings).toEqual(expect.arrayContaining([expect.objectContaining({ mutationId: staleMutationId, reason: "stale" })]));

  const afterStale = await bootstrap(page.request);
  expect(afterStale.domains.find((item: any) => item.id === domain.id)?.name).toBe(domain.name);
});

test("replace import into another account remaps foreign ids while preserving relationships", async ({ page }) => {
  await login(page.request);
  await resetDemo(page.request);
  const bundle = await exportBundle(page.request);
  const sourceDomainIds = new Set(bundle.workspace.domains.map((item) => item.id));
  const sourceProjectIds = new Set(bundle.workspace.projects.map((item) => item.id));

  await logout(page.request);
  await registerFresh(page.request, "portability-replace");

  const restore = await page.request.post("/api/portability/import", {
    data: {
      action: "restore",
      mode: "replace",
      bundle,
      confirmedNoPendingChanges: true,
      confirmation: "REPLACE"
    }
  });
  expect(restore.status()).toBe(200);

  const restored = await bootstrap(page.request);
  expect(restored.domains).toHaveLength(bundle.workspace.domains.length);
  expect(restored.projects).toHaveLength(bundle.workspace.projects.length);
  expect(restored.tasks).toHaveLength(bundle.workspace.tasks.length);
  expect(restored.notes).toHaveLength(bundle.workspace.notes.length);
  expect(restored.deadlines).toHaveLength(bundle.workspace.deadlines.length);
  expect(restored.reviews).toHaveLength(bundle.workspace.reviews.length);
  expect(restored.domains.some((item: any) => sourceDomainIds.has(item.id))).toBe(false);
  expect(restored.projects.some((item: any) => sourceProjectIds.has(item.id))).toBe(false);
  assertRelationships(restored);

  const exportedAgain = await exportBundle(page.request);
  expect(sortedNames(exportedAgain.workspace.domains)).toEqual(sortedNames(bundle.workspace.domains));
  expect(sortedNames(exportedAgain.workspace.projects)).toEqual(sortedNames(bundle.workspace.projects));
});

test("invalid imports are rejected before mutation", async ({ page }) => {
  await login(page.request);
  await resetDemo(page.request);
  const bundle: any = await exportBundle(page.request);
  await logout(page.request);
  await registerFresh(page.request, "portability-invalid");
  const before = workspaceOnly(await bootstrap(page.request));

  bundle.workspace.projects[0].domainId = "missing-area";
  const restore = await page.request.post("/api/portability/import", {
    data: {
      action: "restore",
      mode: "replace",
      bundle,
      confirmedNoPendingChanges: true,
      confirmation: "REPLACE"
    }
  });
  expect(restore.status()).toBe(400);
  await expect(restore.json()).resolves.toMatchObject({ error: "Workspace export is invalid or unsupported." });

  const after = workspaceOnly(await bootstrap(page.request));
  expect(after).toEqual(before);
});

test("merge keeps existing records while adding an imported workspace", async ({ page }) => {
  await login(page.request);
  await resetDemo(page.request);
  const bundle = await exportBundle(page.request);
  await logout(page.request);
  await registerFresh(page.request, "portability-merge");

  const now = new Date().toISOString();
  const ownDomain = {
    id: `dom-own-${Date.now()}`,
    name: "Existing personal Area",
    archived: false,
    createdAt: now,
    updatedAt: now
  };
  const own = await page.request.post("/api/sync", {
    data: {
      mutations: [{
        mutationId: `mut-own-${Date.now()}`,
        entityType: "domains",
        entityId: ownDomain.id,
        operation: "upsert",
        payload: ownDomain,
        createdAt: now
      }]
    }
  });
  expect(own.status()).toBe(200);

  const preview = await page.request.post("/api/portability/import", {
    data: { action: "preview", mode: "merge", bundle }
  });
  expect(preview.status()).toBe(200);
  await expect(preview.json()).resolves.toMatchObject({ mode: "merge" });

  const restore = await page.request.post("/api/portability/import", {
    data: {
      action: "restore",
      mode: "merge",
      bundle,
      confirmedNoPendingChanges: true,
      confirmation: "MERGE"
    }
  });
  expect(restore.status()).toBe(200);

  const merged = await bootstrap(page.request);
  expect(merged.domains.some((item: any) => item.id === ownDomain.id && item.name === ownDomain.name)).toBe(true);
  expect(merged.domains).toHaveLength(bundle.workspace.domains.length + 1);
  for (const imported of bundle.workspace.domains) {
    expect(merged.domains.some((item: any) => item.name === imported.name)).toBe(true);
  }
  assertRelationships(merged);
});
