import type { CanonicalWorkspace, Task } from "./canonical-domain";

export function projectOpenTasks(workspace: CanonicalWorkspace, projectId: string): Task[] {
  return workspace.tasks.filter(
    (task) => task.state === "open" && task.parent.type === "project" && task.parent.projectId === projectId
  );
}

export function areaDirectOpenTasks(workspace: CanonicalWorkspace, areaId: string): Task[] {
  return workspace.tasks.filter(
    (task) => task.state === "open" && task.parent.type === "area" && task.parent.areaId === areaId
  );
}

export function projectArchiveBlockReason(workspace: CanonicalWorkspace, projectId: string) {
  const count = projectOpenTasks(workspace, projectId).length;
  return count
    ? `Resolve or move ${count} open Task${count === 1 ? "" : "s"} before archiving this Project.`
    : null;
}

export function areaArchiveBlockReason(workspace: CanonicalWorkspace, areaId: string) {
  const count = areaDirectOpenTasks(workspace, areaId).length;
  return count
    ? `Resolve or move ${count} direct open Task${count === 1 ? "" : "s"} before archiving this Area.`
    : null;
}
