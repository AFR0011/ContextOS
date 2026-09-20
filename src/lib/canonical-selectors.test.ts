import test from "node:test";
import assert from "node:assert/strict";
import type { CanonicalWorkspace } from "./canonical-domain";
import { getContextsForToday, getProjectDates, getProjectOpenTasks, getTodayEvents, getTodayTasks, getUpcomingDates } from "./canonical-selectors";

const workspace: CanonicalWorkspace = {
  areas: [
    { id: "a1", name: "Research", state: "active", createdAt: "", updatedAt: "" },
    { id: "a2", name: "Career", state: "active", createdAt: "", updatedAt: "" }
  ],
  projects: [
    { id: "p1", name: "Paper", areaId: "a1", objective: "Submit", state: "active", createdAt: "", updatedAt: "" }
  ],
  tasks: [
    { id: "t1", title: "Write", parent: { type: "project", projectId: "p1" }, plannedDate: "2026-09-20", scheduledTime: "10:00", state: "open", createdAt: "", updatedAt: "" },
    { id: "t2", title: "Email", parent: { type: "area", areaId: "a2" }, plannedDate: "2026-09-20", scheduledTime: null, state: "done", createdAt: "", updatedAt: "" },
    { id: "t3", title: "Later", parent: { type: "project", projectId: "p1" }, plannedDate: "2026-09-21", scheduledTime: null, state: "open", createdAt: "", updatedAt: "" }
  ],
  dates: [
    { id: "d1", title: "Call", kind: "event", parent: { type: "area", areaId: "a2" }, date: "2026-09-20", startTime: "09:00", endTime: "09:30", details: "", createdAt: "", updatedAt: "" },
    { id: "d2", title: "Deadline", kind: "deadline", parent: { type: "project", projectId: "p1" }, date: "2026-09-22", startTime: null, endTime: null, details: "", createdAt: "", updatedAt: "" },
    { id: "d3", title: "Review", kind: "event", parent: { type: "project", projectId: "p1" }, date: "2026-09-21", startTime: "14:00", endTime: null, details: "", createdAt: "", updatedAt: "" }
  ],
  dailyNotes: [],
  insights: []
};

test("selects today and project projections without duplicating state", () => {
  assert.deepEqual(getTodayTasks(workspace, "2026-09-20").map((item) => item.id), ["t1", "t2"]);
  assert.deepEqual(getTodayEvents(workspace, "2026-09-20").map((item) => item.id), ["d1"]);
  assert.deepEqual(getUpcomingDates(workspace, "2026-09-20").map((item) => item.id), ["d3", "d2"]);
  assert.deepEqual(getProjectOpenTasks(workspace, "p1").map((item) => item.id), ["t1", "t3"]);
  assert.deepEqual(getProjectDates(workspace, "p1").map((item) => item.id), ["d3", "d2"]);

  const contexts = getContextsForToday(workspace, "2026-09-20");
  assert.deepEqual(contexts.projects.map((item) => item.id), ["p1"]);
  assert.deepEqual(contexts.areas.map((item) => item.id), ["a1", "a2"]);
});
