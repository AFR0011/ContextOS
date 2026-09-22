import { expect, test, type APIRequestContext } from "@playwright/test";

const demoEmail = "demo@contextos.local";
const demoPassword = "contextos-demo-v011";

async function login(request: APIRequestContext, email: string, password = demoPassword) {
  const response = await request.post("/api/auth/login", { data: { email, password } });
  expect(response.status()).toBe(200);
}

async function logout(request: APIRequestContext) {
  const response = await request.post("/api/auth/logout");
  expect(response.status()).toBe(200);
}

test("Stage 7 rejects cross-user canonical parent references and leaves no partial records", async ({ page }) => {
  await login(page.request, demoEmail);
  const demoBootstrap = await page.request.get("/api/bootstrap");
  expect(demoBootstrap.status()).toBe(200);
  const demoWorkspace = (await demoBootstrap.json()).data;
  const foreignProject = demoWorkspace.projects.find((project: { state?: string }) => project.state === "active") ?? demoWorkspace.projects[0];
  const foreignArea = demoWorkspace.areas.find((area: { state?: string }) => area.state === "active") ?? demoWorkspace.areas[0];
  expect(foreignProject?.id).toBeTruthy();
  expect(foreignArea?.id).toBeTruthy();

  await logout(page.request);
  const nonce = Date.now();
  const email = `stage7-owner-${nonce}@example.test`;
  const registered = await page.request.post("/api/auth/register", {
    data: { email, password: demoPassword },
    headers: { "x-forwarded-for": `stage7-owner-${nonce}` }
  });
  expect(registered.status()).toBe(200);

  const now = new Date().toISOString();

  const projectId = `stage7-foreign-project-${Date.now()}`;
  const foreignAreaProject = await page.request.post("/api/sync", {
    data: {
      mutations: [{
        mutationId: `stage7-foreign-project-mut-${Date.now()}`,
        entityType: "projects",
        entityId: projectId,
        operation: "upsert",
        payload: {
          id: projectId,
          name: "Must not attach to another user's Area",
          areaId: foreignArea.id,
          objective: "",
          state: "active",
          createdAt: now,
          updatedAt: now
        },
        createdAt: now
      }]
    }
  });
  expect(foreignAreaProject.status()).toBe(403);

  const taskId = `stage7-foreign-task-${Date.now()}`;
  const foreignProjectTask = await page.request.post("/api/sync", {
    data: {
      mutations: [{
        mutationId: `stage7-foreign-task-mut-${Date.now()}`,
        entityType: "tasks",
        entityId: taskId,
        operation: "upsert",
        payload: {
          id: taskId,
          title: "Must not attach to another user's Project",
          parent: { type: "project", projectId: foreignProject.id },
          plannedDate: null,
          scheduledTime: null,
          state: "open",
          createdAt: now,
          updatedAt: now
        },
        createdAt: now
      }]
    }
  });
  expect(foreignProjectTask.status()).toBe(403);

  const dateId = `stage7-foreign-date-${Date.now()}`;
  const foreignAreaDate = await page.request.post("/api/sync", {
    data: {
      mutations: [{
        mutationId: `stage7-foreign-date-mut-${Date.now()}`,
        entityType: "dates",
        entityId: dateId,
        operation: "upsert",
        payload: {
          id: dateId,
          title: "Must not attach to another user's Area",
          kind: "event",
          parent: { type: "area", areaId: foreignArea.id },
          date: "2026-09-22",
          startTime: "10:00",
          endTime: "11:00",
          details: "",
          createdAt: now,
          updatedAt: now
        },
        createdAt: now
      }]
    }
  });
  expect(foreignAreaDate.status()).toBe(403);

  const ownBootstrap = await page.request.get("/api/bootstrap");
  expect(ownBootstrap.status()).toBe(200);
  const ownWorkspace = (await ownBootstrap.json()).data;
  expect(ownWorkspace.projects.some((project: { id: string }) => project.id === projectId)).toBe(false);
  expect(ownWorkspace.tasks.some((task: { id: string }) => task.id === taskId)).toBe(false);
  expect(ownWorkspace.dates.some((date: { id: string }) => date.id === dateId)).toBe(false);
});

test("Stage 7 accepted canonical mutation replay is idempotent per user", async ({ page }) => {
  const nonce = Date.now();
  const email = `stage7-replay-${nonce}@example.test`;
  const registered = await page.request.post("/api/auth/register", {
    data: { email, password: demoPassword },
    headers: { "x-forwarded-for": `stage7-replay-${nonce}` }
  });
  expect(registered.status()).toBe(200);

  const now = new Date().toISOString();
  const areaId = `stage7-replay-area-${Date.now()}`;
  const mutationId = `stage7-replay-mut-${Date.now()}`;
  const body = {
    mutations: [{
      mutationId,
      entityType: "areas",
      entityId: areaId,
      operation: "upsert",
      payload: {
        id: areaId,
        name: "Replay exactly once",
        state: "active",
        createdAt: now,
        updatedAt: now
      },
      createdAt: now
    }]
  };

  const first = await page.request.post("/api/sync", { data: body });
  expect(first.status()).toBe(200);
  const firstBody = await first.json();
  expect(firstBody.appliedMutationIds).toContain(mutationId);

  const replay = await page.request.post("/api/sync", { data: body });
  expect(replay.status()).toBe(200);
  const replayBody = await replay.json();
  expect(replayBody.appliedMutationIds).toContain(mutationId);

  const bootstrap = await page.request.get("/api/bootstrap");
  expect(bootstrap.status()).toBe(200);
  const workspace = (await bootstrap.json()).data;
  expect(workspace.areas.filter((area: { id: string }) => area.id === areaId)).toHaveLength(1);
});
