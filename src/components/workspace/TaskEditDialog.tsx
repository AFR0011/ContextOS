"use client";

import { useEffect, useMemo, useState } from "react";
import { FolderKanban, Layers3, Trash2, X } from "lucide-react";
import { useWorkspace } from "@/lib/client-store";
import type { Project, Task, TaskStatus } from "@/lib/types";

const taskStatuses: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "Todo" },
  { value: "in-progress", label: "In progress" },
  { value: "blocked", label: "Blocked" },
  { value: "waiting", label: "Waiting" },
  { value: "done", label: "Done" },
  { value: "dropped", label: "Dropped" }
];

function projectLabel(project: Project, projects: Project[]) {
  if (!project.parentProjectId) return project.name;
  const parent = projects.find((candidate) => candidate.id === project.parentProjectId);
  return parent ? `${parent.name} / ${project.name}` : project.name;
}

export function TaskEditDialog({ task, onClose }: { task: Task; onClose: () => void }) {
  const { data, updateTask } = useWorkspace();
  const initialProject = data.projects.find((project) => project.id === task.projectId);
  const [title, setTitle] = useState(task.title);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [plannedDate, setPlannedDate] = useState(task.plannedDate ?? "");
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");
  const [scheduledTime, setScheduledTime] = useState(task.scheduledTime ?? "");
  const [projectId, setProjectId] = useState(task.projectId ?? "");
  const [domainId, setDomainId] = useState(initialProject?.domainId ?? task.domainId ?? "");

  const projects = useMemo(
    () => data.projects
      .filter((project) => ((!project.trashedAt && project.status !== "archived") || project.id === task.projectId))
      .sort((a, b) => projectLabel(a, data.projects).localeCompare(projectLabel(b, data.projects))),
    [data.projects, task.projectId]
  );
  const selectedProject = data.projects.find((project) => project.id === projectId);
  const effectiveDomainId = selectedProject?.domainId ?? domainId;
  const domains = useMemo(
    () => data.domains
      .filter((domain) => !domain.archived || domain.id === effectiveDomainId)
      .sort((a, b) => a.name.localeCompare(b.name)),
    [data.domains, effectiveDomainId]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function changeProject(nextProjectId: string) {
    const currentDomainId = selectedProject?.domainId ?? domainId;
    setProjectId(nextProjectId);
    if (!nextProjectId) {
      setDomainId(currentDomainId);
      return;
    }
    const nextProject = data.projects.find((project) => project.id === nextProjectId);
    if (nextProject) setDomainId(nextProject.domainId);
  }

  function saveTask() {
    const nextTitle = title.trim();
    if (!nextTitle) return;
    updateTask(task.id, {
      title: nextTitle,
      status,
      plannedDate: plannedDate || null,
      dueDate: dueDate || null,
      scheduledTime: scheduledTime || null,
      projectId: projectId || null,
      domainId: effectiveDomainId || null
    });
    onClose();
  }

  function moveToTrash() {
    updateTask(task.id, { trashedAt: new Date().toISOString() });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-edit-dialog-title"
        data-testid="task-edit-dialog"
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border border-[var(--cos-border)] bg-[var(--cos-bg-elevated)] p-5 shadow-xl sm:max-w-xl sm:rounded-2xl"
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 id="task-edit-dialog-title" className="text-lg font-semibold text-[var(--cos-text-strong)]">Edit task</h2>
            <p className="mt-1 text-sm text-[var(--cos-text-muted)]">Correct or replan this task without recreating it.</p>
          </div>
          <button type="button" aria-label="Close task editor" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-[var(--cos-text-subtle)] hover:bg-[var(--cos-bg-inset)] hover:text-[var(--cos-text)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={(event) => { event.preventDefault(); saveTask(); }}>
          <label className="block text-sm font-medium text-[var(--cos-text)]">
            Title
            <input autoFocus aria-label="Title" value={title} onChange={(event) => setTitle(event.target.value)} className="cos-input mt-1 w-full" />
          </label>

          <label className="block text-sm font-medium text-[var(--cos-text)]">
            Status
            <select aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value as TaskStatus)} className="cos-input mt-1 w-full">
              {taskStatuses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-[var(--cos-text)]">
              Planned date
              <input aria-label="Planned date" type="date" value={plannedDate} onChange={(event) => setPlannedDate(event.target.value)} className="cos-input mt-1 w-full" />
            </label>
            <label className="block text-sm font-medium text-[var(--cos-text)]">
              Due date
              <input aria-label="Due date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="cos-input mt-1 w-full" />
            </label>
          </div>

          <label className="block text-sm font-medium text-[var(--cos-text)]">
            Scheduled time
            <input aria-label="Scheduled time" type="time" value={scheduledTime} onChange={(event) => setScheduledTime(event.target.value)} className="cos-input mt-1 w-full" />
          </label>

          <label className="block text-sm font-medium text-[var(--cos-text)]">
            <span className="flex items-center gap-2"><FolderKanban className="h-4 w-4 text-[var(--cos-text-subtle)]" /> Project</span>
            <select aria-label="Project" value={projectId} onChange={(event) => changeProject(event.target.value)} className="cos-input mt-1 w-full">
              <option value="">No project</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{projectLabel(project, data.projects)}</option>)}
            </select>
          </label>

          <label className="block text-sm font-medium text-[var(--cos-text)]">
            <span className="flex items-center gap-2"><Layers3 className="h-4 w-4 text-[var(--cos-text-subtle)]" /> Area</span>
            <select aria-label="Area" value={effectiveDomainId} disabled={Boolean(selectedProject)} onChange={(event) => setDomainId(event.target.value)} className="cos-input mt-1 w-full disabled:cursor-not-allowed disabled:opacity-70">
              <option value="">No area</option>
              {domains.map((domain) => <option key={domain.id} value={domain.id}>{domain.name}</option>)}
            </select>
            <span className="mt-1 block text-xs font-normal text-[var(--cos-text-subtle)]">
              {selectedProject ? "Inherited from the selected project." : "Standalone tasks can be assigned directly to an area."}
            </span>
          </label>

          <div className="flex flex-col-reverse gap-2 border-t border-[var(--cos-border-soft)] pt-4 sm:flex-row sm:items-center">
            <button type="button" onClick={moveToTrash} className="cos-btn cos-btn-ghost min-h-11 justify-center px-4 text-sm text-[var(--cos-danger-text)] sm:mr-auto">
              <Trash2 className="h-4 w-4" /> Move to trash
            </button>
            <button type="button" onClick={onClose} className="cos-btn cos-btn-secondary min-h-11 justify-center px-4 text-sm">Cancel</button>
            <button type="submit" disabled={!title.trim()} className="cos-btn cos-btn-primary min-h-11 justify-center px-4 text-sm disabled:opacity-50">Save task</button>
          </div>
        </form>
      </section>
    </div>
  );
}
