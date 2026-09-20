import type { CanonicalWorkspace, ProjectState, TaskParent, TaskState } from "./canonical-domain";
import type { Project as LegacyProject, Task as LegacyTask, WorkspaceData } from "./types";

export interface LegacyDiscardReport {
  captures: number;
  notes: number;
  deadlines: number;
  reviews: number;
  dashboardScratchpads: number;
  dashboardPreferences: number;
  trashedProjects: number;
  projectsWithMissingArea: number;
  archivedOrTrashedTasks: number;
  unscopedTasks: number;
  tasksWithMissingProject: number;
  tasksWithMissingArea: number;
}

export interface CanonicalAdaptationResult {
  workspace: CanonicalWorkspace;
  discarded: LegacyDiscardReport;
}

function projectState(project: LegacyProject): ProjectState {
  if (project.archivedAt || project.status === "done" || project.status === "archived") return "archived";
  return "active";
}

function taskState(task: LegacyTask): TaskState {
  return task.status === "done" ? "done" : "open";
}

/**
 * Compatibility-only projection from the v1 workspace into the definitive
 * ContextOS domain. It deliberately preserves only concepts that survive the
 * redesign. No persistence mutation happens here.
 */
export function adaptLegacyWorkspace(source: WorkspaceData): CanonicalAdaptationResult {
  const discarded: LegacyDiscardReport = {
    captures: source.captures.length,
    notes: source.notes.length,
    deadlines: source.deadlines.length,
    reviews: source.reviews.length,
    dashboardScratchpads: source.dashboardScratchpads.length,
    dashboardPreferences: source.dashboardPreferences.length,
    trashedProjects: 0,
    projectsWithMissingArea: 0,
    archivedOrTrashedTasks: 0,
    unscopedTasks: 0,
    tasksWithMissingProject: 0,
    tasksWithMissingArea: 0
  };

  const areas = source.domains.map((area) => ({
    id: area.id,
    name: area.name,
    state: area.archived ? "archived" as const : "active" as const,
    createdAt: area.createdAt,
    updatedAt: area.updatedAt
  }));
  const areaIds = new Set(areas.map((area) => area.id));

  const projects = source.projects.flatMap((project) => {
    if (project.trashedAt) {
      discarded.trashedProjects += 1;
      return [];
    }
    if (!areaIds.has(project.domainId)) {
      discarded.projectsWithMissingArea += 1;
      return [];
    }
    return [{
      id: project.id,
      name: project.name,
      areaId: project.domainId,
      objective: project.currentObjective,
      state: projectState(project),
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    }];
  });
  const projectIds = new Set(projects.map((project) => project.id));

  const tasks = source.tasks.flatMap((task) => {
    if (task.archivedAt || task.trashedAt) {
      discarded.archivedOrTrashedTasks += 1;
      return [];
    }

    let parent: TaskParent;
    if (task.projectId) {
      if (!projectIds.has(task.projectId)) {
        discarded.tasksWithMissingProject += 1;
        return [];
      }
      parent = { type: "project", projectId: task.projectId };
    } else if (task.domainId) {
      if (!areaIds.has(task.domainId)) {
        discarded.tasksWithMissingArea += 1;
        return [];
      }
      parent = { type: "area", areaId: task.domainId };
    } else {
      discarded.unscopedTasks += 1;
      return [];
    }

    return [{
      id: task.id,
      title: task.title,
      parent,
      plannedDate: task.plannedDate,
      scheduledTime: task.plannedDate ? task.scheduledTime : null,
      state: taskState(task),
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    }];
  });

  return {
    workspace: {
      areas,
      projects,
      tasks,
      dates: (source.contextDates ?? []).flatMap((date) => {
        if (date.projectId) {
          if (!projectIds.has(date.projectId)) return [];
          return [{
            id: date.id,
            title: date.title,
            kind: date.kind,
            parent: { type: "project" as const, projectId: date.projectId },
            date: date.date,
            startTime: date.startTime,
            endTime: date.endTime,
            details: date.details,
            createdAt: date.createdAt,
            updatedAt: date.updatedAt
          }];
        }
        if (date.domainId && areaIds.has(date.domainId)) {
          return [{
            id: date.id,
            title: date.title,
            kind: date.kind,
            parent: { type: "area" as const, areaId: date.domainId },
            date: date.date,
            startTime: date.startTime,
            endTime: date.endTime,
            details: date.details,
            createdAt: date.createdAt,
            updatedAt: date.updatedAt
          }];
        }
        return [];
      }),
      dailyNotes: (source.dailyNotes ?? []).map((note) => ({
        id: note.id,
        localDate: note.localDate,
        content: note.content,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt
      })),
      insights: []
    },
    discarded
  };
}
