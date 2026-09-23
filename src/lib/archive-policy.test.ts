import test from "node:test";
import assert from "node:assert/strict";
import type { CanonicalWorkspace } from "./canonical-domain";
import {
  areaArchiveBlockReason,
  areaDirectOpenTasks,
  projectArchiveBlockReason,
  projectOpenTasks,
  taskParentIsArchived,
  taskReopenBlockReason
} from "./archive-policy";

const workspace: CanonicalWorkspace = {
  areas: [
    { id: "a1", name: "Engineering", state: "active", createdAt: "", updatedAt: "", revision: 1 },
    { id: "a2", name: "Archive", state: "archived", createdAt: "", updatedAt: "", revision: 1 }
  ],
  projects: [
    { id: "p1", name: "Build", areaId: "a1", objective: "", state: "active", createdAt: "", updatedAt: "", revision: 1 },
    { id: "p2", name: "Old build", areaId: "a1", objective: "", state: "archived", createdAt: "", updatedAt: "", revision: 1 }
  ],
  tasks: [
    { id: "t1", title: "Project open", parent: { type: "project", projectId: "p1" }, plannedDate: null, scheduledTime: null, state: "open", createdAt: "", updatedAt: "", revision: 1 },
    { id: "t2", title: "Area open", parent: { type: "area", areaId: "a1" }, plannedDate: null, scheduledTime: null, state: "open", createdAt: "", updatedAt: "", revision: 1 },
    { id: "t3", title: "Archived project done", parent: { type: "project", projectId: "p2" }, plannedDate: null, scheduledTime: null, state: "done", createdAt: "", updatedAt: "", revision: 1 },
    { id: "t4", title: "Archived area done", parent: { type: "area", areaId: "a2" }, plannedDate: null, scheduledTime: null, state: "done", createdAt: "", updatedAt: "", revision: 1 }
  ],
  dates: [],
  dailyNotes: []
};

test("Project archive blocker counts only that Project's open Tasks", () => {
  assert.deepEqual(projectOpenTasks(workspace, "p1").map((task) => task.id), ["t1"]);
  assert.equal(projectArchiveBlockReason(workspace, "p1"), "Resolve or move 1 open Task before archiving this Project.");
  assert.equal(projectArchiveBlockReason(workspace, "p2"), null);
});

test("Area archive blocker counts only direct open Tasks, not child Project work", () => {
  assert.deepEqual(areaDirectOpenTasks(workspace, "a1").map((task) => task.id), ["t2"]);
  assert.equal(areaArchiveBlockReason(workspace, "a1"), "Resolve or move 1 direct open Task before archiving this Area.");

  const withoutDirectTask = { ...workspace, tasks: workspace.tasks.filter((task) => task.id !== "t2") };
  assert.equal(areaArchiveBlockReason(withoutDirectTask, "a1"), null);
  assert.equal(projectArchiveBlockReason(withoutDirectTask, "p1"), "Resolve or move 1 open Task before archiving this Project.");
});

test("completed Tasks under archived parents cannot be reopened until moved or restored", () => {
  const projectTask = workspace.tasks.find((task) => task.id === "t3")!;
  const areaTask = workspace.tasks.find((task) => task.id === "t4")!;
  assert.equal(taskParentIsArchived(workspace, projectTask), true);
  assert.equal(taskParentIsArchived(workspace, areaTask), true);
  assert.match(taskReopenBlockReason(workspace, projectTask) ?? "", /active context|restore/i);
  assert.match(taskReopenBlockReason(workspace, areaTask) ?? "", /active context|restore/i);
});
