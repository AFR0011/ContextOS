import test from "node:test";
import assert from "node:assert/strict";
import { adaptLegacyWorkspace } from "./canonical-adapters";
import type { WorkspaceData } from "./types";

const now = "2026-09-20T12:00:00.000Z";

function workspaceFixture(): WorkspaceData {
  return ({
    domains: [
      { id: "area-active", name: "Active Area", archived: false, createdAt: now, updatedAt: now },
      { id: "area-archived", name: "Archived Area", archived: true, createdAt: now, updatedAt: now }
    ],
    projects: [
      { id: "p-active", name: "Active", domainId: "area-active", parentProjectId: null, status: "active", currentObjective: "Ship", nextAction: "legacy", latestStatus: "legacy", recoveryNotes: "legacy", openLoops: ["legacy"], createdAt: now, updatedAt: now, archivedAt: null, trashedAt: null },
      { id: "p-paused", name: "Paused", domainId: "area-active", parentProjectId: null, status: "paused", currentObjective: "Resume", nextAction: "", latestStatus: "", recoveryNotes: "", openLoops: [], createdAt: now, updatedAt: now, archivedAt: null, trashedAt: null },
      { id: "p-done", name: "Done", domainId: "area-active", parentProjectId: null, status: "done", currentObjective: "Complete", nextAction: "", latestStatus: "", recoveryNotes: "", openLoops: [], createdAt: now, updatedAt: now, archivedAt: null, trashedAt: null },
      { id: "p-archived", name: "Archived", domainId: "area-archived", parentProjectId: null, status: "archived", currentObjective: "", nextAction: "", latestStatus: "", recoveryNotes: "", openLoops: [], createdAt: now, updatedAt: now, archivedAt: now, trashedAt: null },
      { id: "p-nested", name: "Nested Legacy", domainId: "area-active", parentProjectId: "p-active", status: "active", currentObjective: "Flat in canonical view", nextAction: "", latestStatus: "", recoveryNotes: "", openLoops: [], createdAt: now, updatedAt: now, archivedAt: null, trashedAt: null },
      { id: "p-trash", name: "Trash", domainId: "area-active", parentProjectId: null, status: "active", currentObjective: "", nextAction: "", latestStatus: "", recoveryNotes: "", openLoops: [], createdAt: now, updatedAt: now, archivedAt: null, trashedAt: now },
      { id: "p-missing-area", name: "Orphan", domainId: "missing", parentProjectId: null, status: "active", currentObjective: "", nextAction: "", latestStatus: "", recoveryNotes: "", openLoops: [], createdAt: now, updatedAt: now, archivedAt: null, trashedAt: null }
    ],
    tasks: [
      { id: "t-todo", title: "Todo", plannedDate: "2026-09-20", dueDate: "2026-09-25", scheduledTime: "09:00", projectId: "p-active", domainId: "area-active", status: "todo", createdAt: now, updatedAt: now, archivedAt: null, trashedAt: null },
      { id: "t-dropped", title: "Dropped legacy", plannedDate: null, dueDate: null, scheduledTime: "10:00", projectId: null, domainId: "area-active", status: "dropped", createdAt: now, updatedAt: now, archivedAt: null, trashedAt: null },
      { id: "t-done", title: "Done", plannedDate: "2026-09-20", dueDate: null, scheduledTime: null, projectId: "p-active", domainId: "area-active", status: "done", createdAt: now, updatedAt: now, archivedAt: null, trashedAt: null },
      { id: "t-unscoped", title: "No owner", plannedDate: null, dueDate: null, scheduledTime: null, projectId: null, domainId: null, status: "todo", createdAt: now, updatedAt: now, archivedAt: null, trashedAt: null },
      { id: "t-archived", title: "Archived", plannedDate: null, dueDate: null, scheduledTime: null, projectId: null, domainId: "area-active", status: "todo", createdAt: now, updatedAt: now, archivedAt: now, trashedAt: null },
      { id: "t-trash", title: "Trash", plannedDate: null, dueDate: null, scheduledTime: null, projectId: null, domainId: "area-active", status: "todo", createdAt: now, updatedAt: now, archivedAt: null, trashedAt: now },
      { id: "t-missing-project", title: "Missing project", plannedDate: null, dueDate: null, scheduledTime: null, projectId: "p-trash", domainId: "area-active", status: "todo", createdAt: now, updatedAt: now, archivedAt: null, trashedAt: null },
      { id: "t-missing-area", title: "Missing area", plannedDate: null, dueDate: null, scheduledTime: null, projectId: null, domainId: "missing", status: "todo", createdAt: now, updatedAt: now, archivedAt: null, trashedAt: null }
    ],
    captures: [{ id: "c" }],
    notes: [{ id: "n" }],
    deadlines: [{ id: "d" }],
    contextDates: [
      { id: "cd-project", title: "Project deadline", kind: "deadline", date: "2026-09-22", startTime: null, endTime: null, details: "", projectId: "p-active", domainId: null, createdAt: now, updatedAt: now },
      { id: "cd-area", title: "Area event", kind: "event", date: "2026-09-20", startTime: "14:00", endTime: "15:00", details: "Review", projectId: null, domainId: "area-active", createdAt: now, updatedAt: now },
      { id: "cd-invalid", title: "Invalid", kind: "event", date: "2026-09-20", startTime: null, endTime: null, details: "", projectId: null, domainId: null, createdAt: now, updatedAt: now }
    ],
    reviews: [{ id: "r" }],
    dailyNotes: [{ id: "dn", localDate: "2026-09-20", content: "Daily context", createdAt: now, updatedAt: now }],
    dashboardScratchpads: [{ id: "s" }],
    dashboardPreferences: [{ id: "pref" }],
    serverSyncedAt: now
  } as unknown) as WorkspaceData;
}

test("maps only surviving ContextOS concepts into the canonical workspace", () => {
  const result = adaptLegacyWorkspace(workspaceFixture());
  const { workspace, discarded } = result;

  assert.deepEqual(workspace.areas.map(({ id, state }) => ({ id, state })), [
    { id: "area-active", state: "active" },
    { id: "area-archived", state: "archived" }
  ]);

  assert.deepEqual(workspace.projects.map(({ id, state }) => ({ id, state })), [
    { id: "p-active", state: "active" },
    { id: "p-paused", state: "active" },
    { id: "p-done", state: "archived" },
    { id: "p-archived", state: "archived" },
    { id: "p-nested", state: "active" }
  ]);
  assert.equal(workspace.projects.find((project) => project.id === "p-nested")?.areaId, "area-active");
  assert.equal("parentProjectId" in (workspace.projects[0] as object), false);

  assert.deepEqual(workspace.tasks.map(({ id, state }) => ({ id, state })), [
    { id: "t-todo", state: "open" },
    { id: "t-dropped", state: "open" },
    { id: "t-done", state: "done" }
  ]);
  assert.deepEqual(workspace.tasks.find((task) => task.id === "t-todo")?.parent, { type: "project", projectId: "p-active" });
  assert.deepEqual(workspace.tasks.find((task) => task.id === "t-dropped")?.parent, { type: "area", areaId: "area-active" });
  assert.equal(workspace.tasks.find((task) => task.id === "t-dropped")?.scheduledTime, null);
  assert.equal("dueDate" in (workspace.tasks[0] as object), false);

  assert.deepEqual(workspace.dates, []);
  assert.deepEqual(workspace.dailyNotes, [{
    id: "dn",
    localDate: "2026-09-20",
    content: "Daily context",
    createdAt: now,
    updatedAt: now
  }]);
  assert.deepEqual(workspace.insights, []);

  assert.deepEqual(discarded, {
    captures: 1,
    notes: 1,
    deadlines: 1,
    reviews: 1,
    dashboardScratchpads: 1,
    dashboardPreferences: 1,
    trashedProjects: 1,
    projectsWithMissingArea: 1,
    archivedOrTrashedTasks: 2,
    unscopedTasks: 1,
    tasksWithMissingProject: 1,
    tasksWithMissingArea: 1
  });
});
