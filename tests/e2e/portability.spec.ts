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
  return Object.fromEntries(
    Object.entries(workspace).map(([collection, records]) => [
      collection,
      Array.isArray(records)
        ? records.map((record: any) => {
            const { revision: _revision, ...portable } = record;
            return portable;
          })
        : records
    ])
  );
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
  const areas = new Set(workspace.areas.map((item: any) => item.id));
  const projects = new Set(workspace.projects.map((item: any) => item.id));

  for (const project of workspace.projects) {
    expect(areas.has(project.areaId)).toBe(true);
  }

  for (const task of workspace.tasks) {
    if (task.parent.type === "project") expect(projects.has(task.parent.projectId)).toBe(true);
    else expect(areas.has(task.parent.areaId)).toBe(true);
  }

  for (const date of workspace.dates) {
    if (date.parent.type === "project") expect(projects.has(date.parent.projectId)).toBe(true);
    else expect(areas.has(date.parent.areaId)).toBe(true);
  }

  const noteDates = new Set<string>();
  for (const note of workspace.dailyNotes) {
    expect(noteDates.has(note.localDate)).toBe(false);
    noteDates.add(note.localDate);
  }
}

test("portability v2 schema rejects unsupported versions and invalid canonical references", () => {
  const now = new Date().toISOString();
  const base: any = {
    format: "contextos-workspace",
    version: 2,
    exportedAt: now,
    workspace: {
      areas: [{ id: "area-a", name: "A", state: "active", createdAt: now, updatedAt: now }],
      projects: [{
        id: "proj-a",
        name: "A",
        areaId: "area-a",
        objective: "",
        state: "active",
        createdAt: now,
        updatedAt: now
      }],
      tasks: [{
        id: "task-a",
        title: "Do A",
        parent: { type: "project", projectId: "proj-a" },
        plannedDate: null,
        scheduledTime: null,
        state: "open",
        createdAt: now,
        updatedAt: now
      }],
      dates: [{
        id: "date-a",
        title: "A",
        kind: "deadline",
        parent: { type: "project", projectId: "proj-a" },
        date: "2026-09-20",
        startTime: null,
        endTime: null,
        details: "",
        createdAt: now,
        updatedAt: now
      }],
      dailyNotes: [{
        id: "note-a",
        localDate: "2026-09-20",
        content: "A",
        createdAt: now,
        updatedAt: now
      }]
    }
  };

  expect(workspaceExportBundleSchema.safeParse(base).success).toBe(true);
  expect(workspaceExportBundleSchema.safeParse({ ...base, version: 1 }).success).toBe(false);

  expect(workspaceExportBundleSchema.safeParse({
    ...base,
    workspace: {
      ...base.workspace,
      projects: [{ ...base.workspace.projects[0], areaId: "missing-area" }]
    }
  }).success).toBe(false);

  expect(workspaceExportBundleSchema.safeParse({
    ...base,
    workspace: {
      ...base.workspace,
      tasks: [{
        ...base.workspace.tasks[0],
        parent: { type: "project", projectId: "missing-project" }
      }]
    }
  }).success).toBe(false);

  expect(workspaceExportBundleSchema.safeParse({
    ...base,
    workspace: {
      ...base.workspace,
      tasks: [{
        ...base.workspace.tasks[0],
        plannedDate: null,
        scheduledTime: "09:30"
      }]
    }
  }).success).toBe(false);

  expect(workspaceExportBundleSchema.safeParse({
    ...base,
    workspace: {
      ...base.workspace,
      dates: [{
        ...base.workspace.dates[0],
        endTime: "18:00"
      }]
    }
  }).success).toBe(false);

  expect(workspaceExportBundleSchema.safeParse({
    ...base,
    workspace: {
      ...base.workspace,
      dailyNotes: [
        base.workspace.dailyNotes[0],
        { ...base.workspace.dailyNotes[0], id: "note-b" }
      ]
    }
  }).success).toBe(false);
});

test("replace import round-trips the canonical workspace and blocks pre-restore queued mutations", async ({ page }) => {
  await login(page.request);
  await resetDemo(page.request);
  const bundle = await exportBundle(page.request);

  expect(bundle.version).toBe(2);
  expect(bundle.workspace.areas.length).toBeGreaterThan(0);
  for (const records of Object.values(bundle.workspace)) {
    for (const record of records as any[]) {
      expect(record).not.toHaveProperty("revision");
    }
  }

  const markdown = await page.request.get("/api/portability/export?format=markdown");
  expect(markdown.status()).toBe(200);
  expect(markdown.headers()["content-type"]).toContain("text/markdown");
  expect(await markdown.text()).toContain("# ContextOS workspace export");

  const area = bundle.workspace.areas[0];
  const beforeChange = await bootstrap(page.request);
  const serverArea = beforeChange.areas.find((item: any) => item.id === area.id);
  expect(serverArea?.revision).toBeGreaterThan(0);

  const changedAt = new Date().toISOString();
  const changed = await page.request.post("/api/sync", {
    data: {
      mutations: [{
        mutationId: `portability-change-${Date.now()}`,
        entityType: "areas",
        entityId: area.id,
        operation: "upsert",
        payload: { ...area, name: `Changed after export ${Date.now()}`, updatedAt: changedAt },
        createdAt: changedAt,
        baseServerSyncedAt: beforeChange.serverSyncedAt,
        baseRevision: serverArea.revision
      }]
    }
  });
  expect(changed.status()).toBe(200);

  const preview = await page.request.post("/api/portability/import", {
    data: { action: "preview", mode: "replace", bundle }
  });
  expect(preview.status()).toBe(200);
  await expect(preview.json()).resolves.toMatchObject({ version: 2, mode: "replace" });

  const stillChanged = await bootstrap(page.request);
  expect(stillChanged.areas.find((item: any) => item.id === area.id)?.name).not.toBe(area.name);
  const preRestoreBaseline = stillChanged.serverSyncedAt;

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

  const futureClientTime = new Date(Date.now() + 86_400_000).toISOString();
  const staleMutationId = `pre-restore-stale-${Date.now()}`;
  const stale = await page.request.post("/api/sync", {
    data: {
      mutations: [{
        mutationId: staleMutationId,
        entityType: "areas",
        entityId: area.id,
        operation: "upsert",
        payload: {
          ...area,
          name: "This queued edit must not resurrect",
          updatedAt: futureClientTime
        },
        createdAt: futureClientTime,
        baseServerSyncedAt: preRestoreBaseline
      }]
    }
  });
  expect(stale.status()).toBe(200);
  const staleBody = await stale.json();
  expect(staleBody.appliedMutationIds).toContain(staleMutationId);
  expect(staleBody.warnings).toEqual(expect.arrayContaining([
    expect.objectContaining({ mutationId: staleMutationId, reason: "stale" })
  ]));

  const afterStale = await bootstrap(page.request);
  expect(afterStale.areas.find((item: any) => item.id === area.id)?.name).toBe(area.name);

  const missingBaselineMutationId = `pre-restore-missing-baseline-${Date.now()}`;
  const missingBaseline = await page.request.post("/api/sync", {
    data: {
      mutations: [{
        mutationId: missingBaselineMutationId,
        entityType: "areas",
        entityId: area.id,
        operation: "upsert",
        payload: {
          ...area,
          name: "Missing baseline must fail closed after restore",
          updatedAt: futureClientTime
        },
        createdAt: futureClientTime
      }]
    }
  });
  expect(missingBaseline.status()).toBe(200);
  const missingBaselineBody = await missingBaseline.json();
  expect(missingBaselineBody.appliedMutationIds).toContain(missingBaselineMutationId);
  expect(missingBaselineBody.warnings).toEqual(expect.arrayContaining([
    expect.objectContaining({ mutationId: missingBaselineMutationId, reason: "stale" })
  ]));

  const afterMissingBaseline = await bootstrap(page.request);
  expect(afterMissingBaseline.areas.find((item: any) => item.id === area.id)?.name).toBe(area.name);
});

test("replace import into another account remaps foreign ids while preserving canonical relationships", async ({ page }) => {
  await login(page.request);
  await resetDemo(page.request);
  const bundle = await exportBundle(page.request);
  const sourceAreaIds = new Set(bundle.workspace.areas.map((item) => item.id));
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
  expect(restored.areas).toHaveLength(bundle.workspace.areas.length);
  expect(restored.projects).toHaveLength(bundle.workspace.projects.length);
  expect(restored.tasks).toHaveLength(bundle.workspace.tasks.length);
  expect(restored.dates).toHaveLength(bundle.workspace.dates.length);
  expect(restored.dailyNotes).toHaveLength(bundle.workspace.dailyNotes.length);
  expect(restored.areas.some((item: any) => sourceAreaIds.has(item.id))).toBe(false);
  expect(restored.projects.some((item: any) => sourceProjectIds.has(item.id))).toBe(false);
  assertRelationships(restored);

  const exportedAgain = await exportBundle(page.request);
  expect(sortedNames(exportedAgain.workspace.areas)).toEqual(sortedNames(bundle.workspace.areas));
  expect(sortedNames(exportedAgain.workspace.projects)).toEqual(sortedNames(bundle.workspace.projects));
});

test("invalid canonical imports are rejected before mutation", async ({ page }) => {
  await login(page.request);
  await resetDemo(page.request);
  const bundle: any = await exportBundle(page.request);
  await logout(page.request);
  await registerFresh(page.request, "portability-invalid");
  const before = workspaceOnly(await bootstrap(page.request));

  bundle.workspace.projects[0].areaId = "missing-area";
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

test("merge import advances matching server revisions while export v2 remains revision-free", async ({ page }) => {
  await login(page.request);
  await resetDemo(page.request);

  const before = await bootstrap(page.request);
  const area = before.areas[0];
  expect(area.revision).toBeGreaterThan(0);

  const bundle: any = await exportBundle(page.request);
  expect(bundle.workspace.areas[0]).not.toHaveProperty("revision");
  const exportedArea = bundle.workspace.areas.find((item: any) => item.id === area.id);
  expect(exportedArea).toBeTruthy();
  exportedArea.name = `Merged revision ${Date.now()}`;
  exportedArea.updatedAt = new Date().toISOString();

  const merged = await page.request.post("/api/portability/import", {
    data: {
      action: "restore",
      mode: "merge",
      bundle,
      confirmedNoPendingChanges: true,
      confirmation: "MERGE"
    }
  });
  expect(merged.status()).toBe(200);

  const after = await bootstrap(page.request);
  const afterArea = after.areas.find((item: any) => item.id === area.id);
  expect(afterArea.name).toBe(exportedArea.name);
  expect(afterArea.revision).toBe(area.revision + 1);
});

test("merge keeps existing canonical records while adding an imported workspace", async ({ page }) => {
  await login(page.request);
  await resetDemo(page.request);
  const bundle = await exportBundle(page.request);
  await logout(page.request);
  await registerFresh(page.request, "portability-merge");

  const now = new Date().toISOString();
  const ownArea = {
    id: `area-own-${Date.now()}`,
    name: "Existing personal Area",
    state: "active",
    createdAt: now,
    updatedAt: now
  };
  const own = await page.request.post("/api/sync", {
    data: {
      mutations: [{
        mutationId: `mut-own-${Date.now()}`,
        entityType: "areas",
        entityId: ownArea.id,
        operation: "upsert",
        payload: ownArea,
        createdAt: now
      }]
    }
  });
  expect(own.status()).toBe(200);

  const preview = await page.request.post("/api/portability/import", {
    data: { action: "preview", mode: "merge", bundle }
  });
  expect(preview.status()).toBe(200);
  await expect(preview.json()).resolves.toMatchObject({ version: 2, mode: "merge" });

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
  expect(merged.areas.some((item: any) => item.id === ownArea.id && item.name === ownArea.name)).toBe(true);
  expect(merged.areas).toHaveLength(bundle.workspace.areas.length + 1);
  for (const imported of bundle.workspace.areas) {
    expect(merged.areas.some((item: any) => item.name === imported.name)).toBe(true);
  }
  assertRelationships(merged);
});
