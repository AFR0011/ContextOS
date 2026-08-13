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

test("Stage 7 rejects cross-user relationship references and leaves no partial record", async ({ page }) => {
  await login(page.request, demoEmail);
  const demoBootstrap = await page.request.get("/api/bootstrap");
  expect(demoBootstrap.status()).toBe(200);
  const demoWorkspace = (await demoBootstrap.json()).data;
  const foreignProject = demoWorkspace.projects.find((project: { status?: string }) => project.status === "active") ?? demoWorkspace.projects[0];
  const foreignDomain = demoWorkspace.domains[0];
  const foreignTask = demoWorkspace.tasks[0];
  expect(foreignProject?.id).toBeTruthy();
  expect(foreignDomain?.id).toBeTruthy();
  expect(foreignTask?.id).toBeTruthy();

  await logout(page.request);
  const email = `stage7-owner-${Date.now()}@example.test`;
  const registered = await page.request.post("/api/auth/register", {
    data: { email, password: demoPassword }
  });
  expect(registered.status()).toBe(200);

  const now = new Date().toISOString();
  const taskId = `stage7-foreign-task-${Date.now()}`;
  const foreignTaskReference = await page.request.post("/api/sync", {
    data: {
      mutations: [
        {
          mutationId: `stage7-foreign-task-mut-${Date.now()}`,
          entityType: "tasks",
          entityId: taskId,
          operation: "upsert",
          payload: {
            id: taskId,
            title: "Must not attach to another user's project",
            plannedDate: null,
            dueDate: null,
            scheduledTime: null,
            projectId: foreignProject.id,
            domainId: foreignDomain.id,
            status: "todo",
            createdAt: now,
            updatedAt: now,
            archivedAt: null,
            trashedAt: null
          },
          createdAt: now
        }
      ]
    }
  });
  expect(foreignTaskReference.status()).toBe(403);

  const deadlineId = `stage7-foreign-deadline-${Date.now()}`;
  const foreignTaskIdsReference = await page.request.post("/api/sync", {
    data: {
      mutations: [
        {
          mutationId: `stage7-foreign-deadline-mut-${Date.now()}`,
          entityType: "deadlines",
          entityId: deadlineId,
          operation: "upsert",
          payload: {
            id: deadlineId,
            title: "Must not reference another user's task",
            date: "2026-08-13",
            time: null,
            location: "",
            projectId: null,
            taskIds: [foreignTask.id],
            notes: "",
            createdAt: now,
            updatedAt: now,
            archivedAt: null,
            trashedAt: null
          },
          createdAt: now
        }
      ]
    }
  });
  expect(foreignTaskIdsReference.status()).toBe(403);

  const ownBootstrap = await page.request.get("/api/bootstrap");
  expect(ownBootstrap.status()).toBe(200);
  const ownWorkspace = (await ownBootstrap.json()).data;
  expect(ownWorkspace.tasks.some((task: { id: string }) => task.id === taskId)).toBe(false);
  expect(ownWorkspace.deadlines.some((deadline: { id: string }) => deadline.id === deadlineId)).toBe(false);
});

test("Stage 7 accepted mutation replay is idempotent per user", async ({ page }) => {
  const email = `stage7-replay-${Date.now()}@example.test`;
  const registered = await page.request.post("/api/auth/register", {
    data: { email, password: demoPassword }
  });
  expect(registered.status()).toBe(200);

  const now = new Date().toISOString();
  const captureId = `stage7-replay-capture-${Date.now()}`;
  const mutationId = `stage7-replay-mut-${Date.now()}`;
  const body = {
    mutations: [
      {
        mutationId,
        entityType: "captures",
        entityId: captureId,
        operation: "upsert",
        payload: {
          id: captureId,
          text: "Replay exactly once",
          status: "unprocessed",
          type: "note",
          parsedData: null,
          convertedToId: null,
          createdAt: now,
          updatedAt: now
        },
        createdAt: now
      }
    ]
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
  expect(workspace.captures.filter((capture: { id: string }) => capture.id === captureId)).toHaveLength(1);
});
