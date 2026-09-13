"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Archive, Download, Layers, Plus, Trash2 } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import {
  CommandDateRows,
  CommandPageEditor,
  CommandTaskRows,
  LiveBlock,
  type CommandDateGroup,
  type CommandTaskGroup,
  type CommandTaskRow
} from "@/components/workspace/CommandPageBlocks";
import { parseCommandPageLine } from "@/lib/command-page-commands";
import { useWorkspace } from "@/lib/client-store";
import { localDateKey } from "@/lib/dates";
import { useLocalRouter as useRouter } from "@/lib/local-router";
import type { Deadline, Domain, Project, Task } from "@/lib/types";

const projectStatus = {
  active: { label: "Active", color: "cos-pill-success" },
  paused: { label: "Paused", color: "cos-pill-warning" },
  done: { label: "Done", color: "cos-pill-primary" },
  archived: { label: "Archived", color: "cos-pill-muted" }
};

const domainColors = [
  "border border-[var(--cos-primary-border)] bg-[var(--cos-primary-soft)] text-[var(--cos-primary-text)]",
  "border border-[var(--cos-border-soft)] bg-[var(--cos-bg-inset)] text-[var(--cos-text-muted)]",
  "border border-[var(--cos-border-soft)] bg-[var(--cos-project-soft)] text-[var(--cos-project)]",
  "border border-[var(--cos-border-soft)] bg-[var(--cos-date-soft)] text-[var(--cos-date)]",
  "border border-[var(--cos-border-soft)] bg-[var(--cos-review-soft)] text-[var(--cos-review)]",
  "border border-[var(--cos-border-soft)] bg-[var(--cos-bg-inset)] text-[var(--cos-text-muted)]",
  "border border-[var(--cos-border-soft)] bg-[var(--cos-bg-inset)] text-[var(--cos-text-muted)]",
  "border border-[var(--cos-border-soft)] bg-[var(--cos-bg-inset)] text-[var(--cos-text-muted)]"
];

function domainName(domains: Domain[], id: string | null | undefined) {
  if (!id) return "";
  return domains.find((domain) => domain.id === id)?.name || "Unknown";
}

function domainColor(domains: Domain[], id: string | null | undefined) {
  const index = Math.max(0, domains.findIndex((domain) => domain.id === id));
  return domainColors[index % domainColors.length];
}

function projectName(projects: Project[], id: string | null | undefined) {
  if (!id) return "";
  return projects.find((project) => project.id === id)?.name || "";
}

function visibleProjects(projects: Project[]) {
  return projects.filter((project) => !project.trashedAt && project.status !== "archived");
}

function childProjects(projects: Project[], parentId: string) {
  return visibleProjects(projects).filter((project) => project.parentProjectId === parentId);
}

function descendantProjectIds(projects: Project[], projectId: string) {
  const ids = new Set<string>();
  const queue = childProjects(projects, projectId).map((project) => project.id);
  while (queue.length) {
    const id = queue.shift();
    if (!id || ids.has(id) || id === projectId) continue;
    ids.add(id);
    queue.push(...childProjects(projects, id).map((project) => project.id));
  }
  return ids;
}

function activeTasks(tasks: Task[]) {
  return tasks.filter((task) => !task.trashedAt && !task.archivedAt && task.status !== "done" && task.status !== "dropped");
}

function Page({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="cos-page">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--cos-text-strong)]">{title}</h1>
        </div>
      </div>
      {children}
    </div>
  );
}

function EditableField({
  value,
  placeholder,
  multiline,
  rows = 3,
  className = "",
  inputClassName = "",
  onSave
}: {
  value: string;
  placeholder: string;
  multiline?: boolean;
  rows?: number;
  className?: string;
  inputClassName?: string;
  onSave: (value: string) => void;
}) {
  const { sync } = useWorkspace();
  const [draft, setDraft] = useState(value);
  const [savedFlash, setSavedFlash] = useState(false);
  const dirty = draft !== value;

  useEffect(() => {
    setDraft(value);
  }, [value]);

  function commit() {
    if (!dirty) return;
    onSave(draft);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1200);
  }

  function reset() {
    setDraft(value);
    setSavedFlash(false);
  }

  const baseClass = `w-full rounded-lg border border-transparent bg-transparent px-3 py-2 text-sm outline-none placeholder:text-[var(--cos-text-subtle)] hover:bg-[var(--cos-bg-soft)] focus:border-[var(--cos-primary-border)] focus:bg-[var(--cos-bg-elevated)] focus:ring-2 focus:ring-[var(--cos-focus)] ${inputClassName}`;

  return (
    <div className={`min-w-0 ${className}`}>
      {multiline ? (
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") commit();
            if (event.key === "Escape") reset();
          }}
          rows={rows}
          placeholder={placeholder}
          className={`${baseClass} min-h-24 resize-y`}
        />
      ) : (
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              commit();
              event.currentTarget.blur();
            }
            if (event.key === "Escape") reset();
          }}
          placeholder={placeholder}
          className={baseClass}
        />
      )}
      {(dirty || savedFlash) ? (
        <div className="mt-1 flex flex-wrap items-center justify-end gap-2 text-[11px]">
          <span className={dirty ? "text-[var(--cos-warning-text)]" : "text-[var(--cos-success-text)]"}>{dirty ? "Unsaved changes" : "Saved"}</span>
          {dirty && !sync.online ? <span data-testid="offline-edit-warning" className="cos-pill cos-pill-warning">Offline: save will queue</span> : null}
          {dirty ? (
            <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={commit} className="rounded px-2 py-0.5 font-semibold text-[var(--cos-primary-text)] hover:bg-[var(--cos-primary-soft)]">
              Save
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function projectCommandTaskActive(task: Task, today: string) {
  if (task.trashedAt || task.archivedAt || task.status === "dropped") return false;
  if (task.status === "done") return task.plannedDate === today || task.dueDate === today;
  return true;
}

function projectCommandTaskLabels(task: Task, today: string, projects: Project[]) {
  return [
    task.status === "done" ? "Done today" : "",
    task.dueDate && task.dueDate < today && task.status !== "done" ? "Overdue" : "",
    task.dueDate === today ? "Due today" : "",
    task.plannedDate === today ? "Planned today" : "",
    task.status === "in-progress" ? "In progress" : "",
    task.scheduledTime ?? "",
    projectName(projects, task.projectId)
  ].filter(Boolean);
}

function projectCommandTaskSort(a: CommandTaskRow, b: CommandTaskRow) {
  const aDate = a.task.dueDate ?? a.task.plannedDate ?? "9999-12-31";
  const bDate = b.task.dueDate ?? b.task.plannedDate ?? "9999-12-31";
  if (aDate !== bDate) return aDate.localeCompare(bDate);
  const aTime = a.task.scheduledTime ?? "99:99";
  const bTime = b.task.scheduledTime ?? "99:99";
  if (aTime !== bTime) return aTime.localeCompare(bTime);
  return a.task.createdAt.localeCompare(b.task.createdAt);
}

function projectCommandDateSort(a: Deadline, b: Deadline) {
  const byDate = a.date.localeCompare(b.date);
  if (byDate) return byDate;
  const byTime = (a.time ?? "99:99").localeCompare(b.time ?? "99:99");
  if (byTime) return byTime;
  return a.createdAt.localeCompare(b.createdAt);
}

export function ProjectDetailView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { data, updateProject, addProject, addTask, addDeadline } = useWorkspace();
  const project = data.projects.find((item) => item.id === projectId);
  const [newSubcontext, setNewSubcontext] = useState("");
  const [showTaskComposer, setShowTaskComposer] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPlannedDate, setNewTaskPlannedDate] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskScheduledTime, setNewTaskScheduledTime] = useState("");
  const [showDateComposer, setShowDateComposer] = useState(false);
  const [newDateTitle, setNewDateTitle] = useState("");
  const [newDateDate, setNewDateDate] = useState(localDateKey());
  const [newDateTime, setNewDateTime] = useState("");

  if (!project) {
    return <Page title="Project not found"><button onClick={() => router.push("/projects")} className="text-sm font-semibold text-[var(--cos-primary-text)]">Back to projects</button></Page>;
  }

  const currentProject = project;
  const today = localDateKey();
  const subcontexts = childProjects(data.projects, project.id);
  const descendantIds = descendantProjectIds(data.projects, project.id);
  const rollupProjectIds = new Set([project.id, ...descendantIds]);
  const tasks = data.tasks.filter((task) => task.projectId && rollupProjectIds.has(task.projectId) && projectCommandTaskActive(task, today));
  const deadlines = data.deadlines.filter((deadline) => deadline.projectId && rollupProjectIds.has(deadline.projectId) && !deadline.trashedAt && !deadline.archivedAt);
  const activeDomains = data.domains.filter((domain) => !domain.archived);

  const directTaskRows = tasks
    .filter((task) => task.projectId === project.id)
    .map((task) => ({ task, labels: projectCommandTaskLabels(task, today, data.projects) }))
    .sort(projectCommandTaskSort);
  const taskGroups: CommandTaskGroup[] = [
    { id: "this-project", title: "This project", rows: directTaskRows },
    ...subcontexts.map((child) => {
      const childDescendants = descendantProjectIds(data.projects, child.id);
      const childIds = new Set([child.id, ...childDescendants]);
      return {
        id: child.id,
        title: child.name,
        rows: tasks
          .filter((task) => task.projectId && childIds.has(task.projectId))
          .map((task) => ({ task, labels: projectCommandTaskLabels(task, today, data.projects) }))
          .sort(projectCommandTaskSort)
      };
    })
  ];
  const dateGroups: CommandDateGroup[] = [
    { id: "this-project", title: "This project", rows: deadlines.filter((deadline) => deadline.projectId === project.id).sort(projectCommandDateSort) },
    ...subcontexts.map((child) => {
      const childDescendants = descendantProjectIds(data.projects, child.id);
      const childIds = new Set([child.id, ...childDescendants]);
      return {
        id: child.id,
        title: child.name,
        rows: deadlines.filter((deadline) => deadline.projectId && childIds.has(deadline.projectId)).sort(projectCommandDateSort)
      };
    })
  ];
  const taskCount = taskGroups.reduce((count, group) => count + group.rows.length, 0);
  const dateCount = dateGroups.reduce((count, group) => count + group.rows.length, 0);

  function addSubcontext() {
    const name = newSubcontext.trim();
    if (!name) return;
    addProject({
      name,
      domainId: currentProject.domainId,
      parentProjectId: currentProject.id,
      currentObjective: "",
      nextAction: ""
    });
    setNewSubcontext("");
  }

  function createProjectTask() {
    const title = newTaskTitle.trim();
    if (!title) return;
    addTask({
      title,
      plannedDate: newTaskPlannedDate || null,
      dueDate: newTaskDueDate || null,
      scheduledTime: newTaskScheduledTime || null,
      projectId: currentProject.id,
      domainId: currentProject.domainId
    });
    setNewTaskTitle("");
    setNewTaskPlannedDate("");
    setNewTaskDueDate("");
    setNewTaskScheduledTime("");
    setShowTaskComposer(false);
  }

  function createProjectDate() {
    const title = newDateTitle.trim();
    if (!title) return;
    addDeadline({
      title,
      date: newDateDate || today,
      time: newDateTime || null,
      projectId: currentProject.id
    });
    setNewDateTitle("");
    setNewDateDate(today);
    setNewDateTime("");
    setShowDateComposer(false);
  }

  function handleCommandLine(line: string) {
    const parsed = parseCommandPageLine(line, today);
    if (parsed.type === "error") return { ok: false, message: parsed.message };
    if (parsed.type === "none") return { ok: false, message: "Use /task or /date here." };
    if (parsed.type === "task") {
      addTask({
        title: parsed.title,
        plannedDate: parsed.plannedDate,
        dueDate: parsed.dueDate,
        scheduledTime: parsed.scheduledTime,
        projectId: currentProject.id,
        domainId: currentProject.domainId
      });
      return { ok: true };
    }
    addDeadline({ title: parsed.title, date: parsed.date, time: parsed.time, projectId: currentProject.id });
    return { ok: true };
  }

  function exportMarkdown() {
    const md = [
      `# ${currentProject.name}`,
      `**Status:** ${currentProject.status}`,
      `**Domain:** ${domainName(data.domains, currentProject.domainId)}`,
      currentProject.parentProjectId ? `**Parent:** ${projectName(data.projects, currentProject.parentProjectId)}` : "",
      "",
      "## Current Objective",
      currentProject.currentObjective,
      "",
      "## Next Action",
      currentProject.nextAction,
      "",
      "## Latest Status",
      currentProject.latestStatus,
      "",
      "## Open Loops",
      ...currentProject.openLoops.map((loop) => `- ${loop}`),
      "",
      "## Recovery Notes",
      currentProject.recoveryNotes,
      "",
      "## Subcontexts",
      ...subcontexts.map((child) => `- ${child.name}${child.nextAction ? ` — Next: ${child.nextAction}` : ""}`),
      "",
      "## Tasks",
      ...tasks.map((task) => `- [${task.status === "done" ? "x" : " "}] ${task.title}${task.projectId !== currentProject.id ? ` (${projectName(data.projects, task.projectId)})` : ""}`),
      "",
      "## Dates",
      ...deadlines.map((date) => `- ${date.date}${date.time ? ` ${date.time}` : ""}: ${date.title}`)
    ].filter(Boolean).join("\n");
    const url = URL.createObjectURL(new Blob([md], { type: "text/markdown" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${currentProject.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div data-testid="project-command-page" className="cos-page mx-auto max-w-3xl">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button onClick={() => router.push("/projects")} className="cos-btn cos-btn-ghost min-h-10 w-full justify-center px-3 py-2 text-sm sm:w-auto">Back</button>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
          <button onClick={exportMarkdown} className="cos-btn cos-btn-ghost min-h-10 justify-center px-3 py-2 text-xs"><Download className="h-4 w-4" /> Export</button>
          <button aria-label={project.status === "archived" ? "Unarchive project" : "Archive project"} onClick={() => updateProject(project.id, { status: project.status === "archived" ? "active" : "archived", archivedAt: project.status === "archived" ? null : new Date().toISOString() })} className="cos-btn cos-btn-ghost min-h-10 justify-center px-3 py-2 text-xs"><Archive className="h-4 w-4" /> {project.status === "archived" ? "Unarchive" : "Archive"}</button>
        </div>
      </div>

      <header className="mb-5">
        <EditableField value={project.name} placeholder="Project name" onSave={(value) => updateProject(project.id, { name: value })} inputClassName="text-3xl font-bold tracking-tight text-[var(--cos-text-strong)]" />
        <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
          <select value={project.status} onChange={(event) => updateProject(project.id, { status: event.target.value as any, archivedAt: event.target.value === "archived" ? new Date().toISOString() : null })} className={`min-h-10 w-full rounded-md border-0 px-3 py-2 text-sm font-medium sm:min-h-0 sm:w-auto sm:rounded-full sm:py-1 sm:text-xs ${projectStatus[project.status].color}`}>
            {Object.entries(projectStatus).map(([value, config]) => <option key={value} value={value}>{config.label}</option>)}
          </select>
          <select value={project.domainId} onChange={(event) => updateProject(project.id, { domainId: event.target.value })} className={`min-h-10 w-full rounded-md border-0 px-3 py-2 text-sm font-medium sm:min-h-0 sm:w-auto sm:rounded-full sm:px-2 sm:py-1 sm:text-[11px] ${domainColor(data.domains, project.domainId)}`}>
            {activeDomains.map((domain) => <option key={domain.id} value={domain.id}>{domain.name}</option>)}
          </select>
          {project.parentProjectId ? <span className="cos-pill cos-pill-muted">Parent: {projectName(data.projects, project.parentProjectId)}</span> : null}
          <span className="text-[11px] text-[var(--cos-text-subtle)]">Updated {formatDistanceToNow(parseISO(project.updatedAt), { addSuffix: true })}</span>
        </div>
      </header>

      <CommandPageEditor
        dataTestId="project-recovery-notes"
        value={project.recoveryNotes}
        onSave={(recoveryNotes) => updateProject(project.id, { recoveryNotes })}
        onCommandLine={handleCommandLine}
        placeholder="Write project context. /task Draft next note [2026-07-10] (09:30) or /date Final review [2026-07-10]..."
        minLines={9}
      />

      <div className="mt-6 space-y-1">
        <LiveBlock
          title="Tasks"
          count={taskCount}
          testId="project-live-tasks"
          action={
            <button
              type="button"
              aria-expanded={showTaskComposer}
              aria-controls="project-task-composer"
              onClick={() => setShowTaskComposer((open) => !open)}
              className="cos-btn cos-btn-secondary min-h-10 w-full justify-center px-3 py-2 text-sm sm:w-auto sm:min-h-9 sm:py-1 sm:text-xs"
            >
              <Plus className="h-4 w-4" /> Add task
            </button>
          }
        >
          {showTaskComposer ? (
            <form
              id="project-task-composer"
              data-testid="project-task-composer"
              onSubmit={(event) => {
                event.preventDefault();
                createProjectTask();
              }}
              className="mb-3 rounded-lg border border-[var(--cos-primary-border)] bg-[var(--cos-primary-soft)] p-3"
            >
              <input
                value={newTaskTitle}
                onChange={(event) => setNewTaskTitle(event.target.value)}
                placeholder="Task title..."
                className="cos-input w-full px-3 py-2 text-sm"
                autoFocus
              />
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_0.8fr_auto_auto] sm:items-center">
                <input
                  aria-label="Task planned date"
                  type="date"
                  value={newTaskPlannedDate}
                  onChange={(event) => setNewTaskPlannedDate(event.target.value)}
                  className="cos-input px-3 py-2 text-sm"
                />
                <input
                  aria-label="Task due date"
                  type="date"
                  value={newTaskDueDate}
                  onChange={(event) => setNewTaskDueDate(event.target.value)}
                  className="cos-input px-3 py-2 text-sm"
                />
                <input
                  aria-label="Task scheduled time"
                  type="time"
                  value={newTaskScheduledTime}
                  onChange={(event) => setNewTaskScheduledTime(event.target.value)}
                  className="cos-input px-3 py-2 text-sm"
                />
                <button type="submit" className="cos-btn cos-btn-primary min-h-10 px-3 py-2 text-sm">Add task</button>
                <button type="button" onClick={() => setShowTaskComposer(false)} className="cos-btn cos-btn-ghost min-h-10 px-3 py-2 text-sm">Cancel</button>
              </div>
            </form>
          ) : null}
          <CommandTaskRows groups={taskGroups} emptyTitle="No active tasks for this project" />
        </LiveBlock>

        <LiveBlock
          title="Dates"
          count={dateCount}
          testId="project-live-dates"
          action={
            <button
              type="button"
              aria-expanded={showDateComposer}
              aria-controls="project-date-composer"
              onClick={() => setShowDateComposer((open) => !open)}
              className="cos-btn cos-btn-secondary min-h-10 w-full justify-center px-3 py-2 text-sm sm:w-auto sm:min-h-9 sm:py-1 sm:text-xs"
            >
              <Plus className="h-4 w-4" /> Add Date
            </button>
          }
        >
          {showDateComposer ? (
            <form
              id="project-date-composer"
              data-testid="project-date-composer"
              onSubmit={(event) => {
                event.preventDefault();
                createProjectDate();
              }}
              className="mb-3 rounded-lg border border-[var(--cos-date)] bg-[var(--cos-date-soft)] p-3"
            >
              <input
                value={newDateTitle}
                onChange={(event) => setNewDateTitle(event.target.value)}
                placeholder="Date title..."
                className="cos-input w-full px-3 py-2 text-sm"
                autoFocus
              />
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_0.8fr_auto_auto] sm:items-center">
                <input
                  aria-label="Date date"
                  type="date"
                  value={newDateDate}
                  onChange={(event) => setNewDateDate(event.target.value)}
                  className="cos-input px-3 py-2 text-sm"
                  required
                />
                <input
                  aria-label="Date time"
                  type="time"
                  value={newDateTime}
                  onChange={(event) => setNewDateTime(event.target.value)}
                  className="cos-input px-3 py-2 text-sm"
                />
                <button type="submit" className="cos-btn cos-btn-primary min-h-10 px-3 py-2 text-sm">Add Date</button>
                <button type="button" onClick={() => setShowDateComposer(false)} className="cos-btn cos-btn-ghost min-h-10 px-3 py-2 text-sm">Cancel</button>
              </div>
            </form>
          ) : null}
          <CommandDateRows groups={dateGroups} emptyTitle="No active dates for this project" />
        </LiveBlock>

        <LiveBlock title="Recovery" testId="project-recovery-editor">
          <div className="grid gap-3 lg:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--cos-primary-text)]">Next action</span>
              <EditableField value={project.nextAction} placeholder="Concrete next action..." onSave={(nextAction) => updateProject(project.id, { nextAction })} inputClassName="font-medium text-[var(--cos-primary-text)]" />
            </label>
            <label className="block lg:col-span-2">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--cos-primary-text)]">Latest status</span>
              <EditableField value={project.latestStatus} placeholder="What changed most recently?" onSave={(latestStatus) => updateProject(project.id, { latestStatus })} />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--cos-primary-text)]">Current objective</span>
            <EditableField value={project.currentObjective} multiline rows={3} placeholder="What is this project trying to achieve right now?" onSave={(currentObjective) => updateProject(project.id, { currentObjective })} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--cos-primary-text)]">Open loops</span>
            <EditableField
              value={project.openLoops.join("\n")}
              multiline
              rows={3}
              placeholder="One open loop per line..."
              onSave={(value) => updateProject(project.id, { openLoops: value.split(/\r?\n/).map((line) => line.replace(/^- \[( |x|X)\]\s?/, "").replace(/^- /, "").trim()).filter(Boolean) })}
            />
          </label>
        </LiveBlock>

        <LiveBlock title="Subcontexts" count={subcontexts.length} testId="project-subcontexts">
          <div className="space-y-2">
          {subcontexts.map((child) => {
            const childDescendants = descendantProjectIds(data.projects, child.id);
            const childIds = new Set([child.id, ...childDescendants]);
            const childTaskCount = activeTasks(data.tasks).filter((task) => task.projectId && childIds.has(task.projectId)).length;
            const childDeadlineCount = data.deadlines.filter((deadline) => !deadline.trashedAt && deadline.projectId && childIds.has(deadline.projectId)).length;
            return (
              <button key={child.id} onClick={() => router.push(`/projects/${child.id}`)} className="cos-row flex w-full items-start gap-3 p-3 text-left hover:bg-[var(--cos-bg-soft)]">
                <Layers className="mt-0.5 h-4 w-4 text-[var(--cos-primary)]" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-[var(--cos-text-strong)]">{child.name}</h3>
                    <span className={`cos-pill ${projectStatus[child.status].color}`}>{projectStatus[child.status].label}</span>
                  </div>
                  {child.nextAction ? <p className="mt-1 truncate text-xs font-medium text-[var(--cos-primary-text)]">Next: {child.nextAction}</p> : null}
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[var(--cos-text-subtle)]">
                    {childTaskCount ? <span>{childTaskCount} open task{childTaskCount > 1 ? "s" : ""}</span> : null}
                    {childDeadlineCount ? <span>{childDeadlineCount} date{childDeadlineCount > 1 ? "s" : ""}</span> : null}
                    {childDescendants.size ? <span>{childDescendants.size} nested</span> : null}
                  </div>
                </div>
              </button>
            );
          })}
          {!subcontexts.length ? <p className="text-sm italic text-[var(--cos-text-subtle)]">No subcontexts yet.</p> : null}
          <div className="grid gap-2 pt-2 sm:grid-cols-[1fr_auto] sm:items-center">
            <input value={newSubcontext} onChange={(event) => setNewSubcontext(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addSubcontext()} placeholder="Add subcontext, course, assignment, or duty..." className="cos-input w-full px-3 py-2 text-sm" />
            <button onClick={addSubcontext} className="cos-btn cos-btn-secondary min-h-10 justify-center px-3 py-2 text-sm"><Plus className="h-4 w-4" /> Add</button>
          </div>
          </div>
        </LiveBlock>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 border-t border-[var(--cos-border)] pt-4">
        <button onClick={() => { updateProject(project.id, { trashedAt: new Date().toISOString() }); router.push("/projects"); }} className="cos-btn min-h-10 w-full justify-center px-3 py-2 text-sm text-[var(--cos-danger-text)] hover:bg-[var(--cos-danger-soft)] sm:w-auto"><Trash2 className="h-4 w-4" /> Delete</button>
      </div>
    </div>
  );
}
