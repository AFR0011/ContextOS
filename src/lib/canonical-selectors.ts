import type { Area, CanonicalWorkspace, ContextDate, Project, Task } from "./canonical-domain";

function byTimeThenTitle<T extends { startTime: string | null; title: string }>(a: T, b: T) {
  return (a.startTime ?? "99:99").localeCompare(b.startTime ?? "99:99") || a.title.localeCompare(b.title);
}

export function getTodayTasks(workspace: CanonicalWorkspace, today: string): Task[] {
  return workspace.tasks.filter((task) => task.plannedDate === today);
}

export function getTodayEvents(workspace: CanonicalWorkspace, today: string): ContextDate[] {
  return workspace.dates.filter((date) => date.kind === "event" && date.date === today).sort(byTimeThenTitle);
}

export function getUpcomingDates(workspace: CanonicalWorkspace, today: string): ContextDate[] {
  return workspace.dates
    .filter((date) => date.date > today)
    .sort((a, b) => a.date.localeCompare(b.date) || byTimeThenTitle(a, b));
}

export function getProjectOpenTasks(workspace: CanonicalWorkspace, projectId: string): Task[] {
  return workspace.tasks.filter(
    (task) => task.state === "open" && task.parent.type === "project" && task.parent.projectId === projectId
  );
}

export function getProjectDates(workspace: CanonicalWorkspace, projectId: string): ContextDate[] {
  return workspace.dates
    .filter((date) => date.parent.type === "project" && date.parent.projectId === projectId)
    .sort((a, b) => a.date.localeCompare(b.date) || byTimeThenTitle(a, b));
}

export interface TodayContexts {
  areas: Area[];
  projects: Project[];
}

export function getContextsForToday(workspace: CanonicalWorkspace, today: string): TodayContexts {
  const projectIds = new Set<string>();
  const areaIds = new Set<string>();

  const addParent = (parent: Task["parent"] | ContextDate["parent"]) => {
    if (parent.type === "project") projectIds.add(parent.projectId);
    if (parent.type === "area") areaIds.add(parent.areaId);
  };

  for (const task of getTodayTasks(workspace, today)) addParent(task.parent);
  for (const date of workspace.dates.filter((item) => item.date === today)) addParent(date.parent);

  for (const project of workspace.projects) {
    if (projectIds.has(project.id)) areaIds.add(project.areaId);
  }

  return {
    areas: workspace.areas.filter((area) => areaIds.has(area.id)),
    projects: workspace.projects.filter((project) => projectIds.has(project.id))
  };
}
