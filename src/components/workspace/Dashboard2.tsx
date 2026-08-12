"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckSquare, Inbox } from "lucide-react";
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
import { localDateKey } from "@/lib/dates";
import { useWorkspace } from "@/lib/client-store";
import { useLocalRouter } from "@/lib/local-router";
import type { Capture, Deadline, Domain, Project, Task } from "@/lib/types";

type DashboardGroupMode = "time" | "area" | "project";

const VIEW_STORAGE_KEY = "contextos-dashboard-command-page-view";
const ALL_AREAS = "__all";

function domainName(domains: Domain[], id: string | null | undefined) {
  if (!id) return "";
  return domains.find((domain) => domain.id === id)?.name ?? "Unknown area";
}

function projectName(projects: Project[], id: string | null | undefined) {
  if (!id) return "";
  return projects.find((project) => project.id === id)?.name ?? "";
}

function projectDomainId(projects: Project[], projectId: string | null | undefined) {
  if (!projectId) return null;
  return projects.find((project) => project.id === projectId)?.domainId ?? null;
}

function taskDomainId(task: Task, projects: Project[]) {
  return task.domainId ?? projectDomainId(projects, task.projectId);
}

function deadlineDomainId(deadline: Deadline, projects: Project[]) {
  return projectDomainId(projects, deadline.projectId);
}

function doneToday(task: Task, today: string) {
  return task.status === "done" && (task.plannedDate === today || task.dueDate === today);
}

function activeDashboardTask(task: Task, today: string) {
  if (task.trashedAt || task.archivedAt || task.status === "dropped") return false;
  if (task.status === "done") return doneToday(task, today);
  return true;
}

function taskTimeGroup(task: Task, today: string) {
  if (doneToday(task, today)) return "done-today";
  if (task.dueDate && task.dueDate < today) return "overdue";
  if (task.dueDate === today || task.plannedDate === today) return "today";
  if (task.status === "in-progress") return "in-progress";
  if ((task.dueDate && task.dueDate > today) || (task.plannedDate && task.plannedDate > today)) return "upcoming";
  return "unscheduled";
}

function taskLabels(task: Task, today: string, projects: Project[], domains: Domain[]) {
  return [
    doneToday(task, today) ? "Done today" : "",
    task.dueDate && task.dueDate < today && task.status !== "done" ? "Overdue" : "",
    task.dueDate === today ? "Due today" : "",
    task.plannedDate === today ? "Planned today" : "",
    task.status === "in-progress" ? "In progress" : "",
    task.scheduledTime ?? "",
    projectName(projects, task.projectId),
    domainName(domains, taskDomainId(task, projects))
  ].filter(Boolean);
}

function taskSort(a: CommandTaskRow, b: CommandTaskRow) {
  const aDate = a.task.dueDate ?? a.task.plannedDate ?? "9999-12-31";
  const bDate = b.task.dueDate ?? b.task.plannedDate ?? "9999-12-31";
  if (aDate !== bDate) return aDate.localeCompare(bDate);
  const aTime = a.task.scheduledTime ?? "99:99";
  const bTime = b.task.scheduledTime ?? "99:99";
  if (aTime !== bTime) return aTime.localeCompare(bTime);
  return a.task.createdAt.localeCompare(b.task.createdAt);
}

function groupedByLabel<T>(items: T[], labelFor: (item: T) => { id: string; title: string }) {
  const map = new Map<string, { title: string; rows: T[] }>();
  for (const item of items) {
    const label = labelFor(item);
    const existing = map.get(label.id);
    if (existing) existing.rows.push(item);
    else map.set(label.id, { title: label.title, rows: [item] });
  }
  return Array.from(map, ([id, group]) => ({ id, ...group })).sort((a, b) => a.title.localeCompare(b.title));
}

function dashboardTaskGroups({
  tasks,
  projects,
  domains,
  today,
  scope,
  groupMode
}: {
  tasks: Task[];
  projects: Project[];
  domains: Domain[];
  today: string;
  scope: string;
  groupMode: DashboardGroupMode;
}): CommandTaskGroup[] {
  const rows = tasks
    .filter((task) => activeDashboardTask(task, today))
    .filter((task) => scope === ALL_AREAS || taskDomainId(task, projects) === scope)
    .map((task) => ({ task, labels: taskLabels(task, today, projects, domains) }))
    .sort(taskSort);

  if (groupMode === "area") {
    return groupedByLabel(rows, (row) => {
      const id = taskDomainId(row.task, projects) ?? "no-area";
      return { id, title: domainName(domains, id) || "No area" };
    });
  }

  if (groupMode === "project") {
    return groupedByLabel(rows, (row) => {
      const id = row.task.projectId ?? "no-project";
      return { id, title: projectName(projects, id) || "No project" };
    });
  }

  const labels: Record<string, string> = {
    overdue: "Overdue",
    today: "Today",
    "in-progress": "In progress",
    upcoming: "Upcoming",
    unscheduled: "Unscheduled",
    "done-today": "Done today"
  };
  const order = ["overdue", "today", "in-progress", "upcoming", "unscheduled", "done-today"];
  return order.map((id) => ({
    id,
    title: labels[id],
    rows: rows.filter((row) => taskTimeGroup(row.task, today) === id)
  }));
}

function dateTimeGroup(deadline: Deadline, today: string) {
  if (deadline.date < today) return "overdue";
  if (deadline.date === today) return "today";
  return "upcoming";
}

function dateSort(a: Deadline, b: Deadline) {
  const byDate = a.date.localeCompare(b.date);
  if (byDate) return byDate;
  const byTime = (a.time ?? "99:99").localeCompare(b.time ?? "99:99");
  if (byTime) return byTime;
  return a.createdAt.localeCompare(b.createdAt);
}

function dashboardDateGroups({
  deadlines,
  projects,
  domains,
  today,
  scope,
  groupMode
}: {
  deadlines: Deadline[];
  projects: Project[];
  domains: Domain[];
  today: string;
  scope: string;
  groupMode: DashboardGroupMode;
}): CommandDateGroup[] {
  const rows = deadlines
    .filter((deadline) => !deadline.trashedAt && !deadline.archivedAt)
    .filter((deadline) => scope === ALL_AREAS || deadlineDomainId(deadline, projects) === scope)
    .sort(dateSort);

  if (groupMode === "area") {
    return groupedByLabel(rows, (deadline) => {
      const id = deadlineDomainId(deadline, projects) ?? "no-area";
      return { id, title: domainName(domains, id) || "No area" };
    });
  }

  if (groupMode === "project") {
    return groupedByLabel(rows, (deadline) => {
      const id = deadline.projectId ?? "no-project";
      return { id, title: projectName(projects, id) || "No project" };
    });
  }

  return ["overdue", "today", "upcoming"].map((id) => ({
    id,
    title: id === "overdue" ? "Overdue" : id === "today" ? "Today" : "Upcoming",
    rows: rows.filter((deadline) => dateTimeGroup(deadline, today) === id)
  }));
}

function readStoredView() {
  try {
    const value = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (!value) return null;
    return JSON.parse(value) as { scope?: string; groupMode?: DashboardGroupMode };
  } catch {
    return null;
  }
}

function dashboardCaptureType(capture: Capture) {
  if (capture.type === "deadline") return "Date";
  if (capture.type) return capture.type[0].toUpperCase() + capture.type.slice(1);
  return "Capture";
}

function DashboardInboxPreview({ captures, count, onReview }: { captures: Capture[]; count: number; onReview: () => void }) {
  if (!count) return null;
  return (
    <LiveBlock
      title="Inbox"
      count={count}
      testId="dashboard-inbox-preview"
      action={
        <button onClick={onReview} className="cos-btn cos-btn-primary min-h-10 w-full justify-center px-3 py-2 text-sm sm:w-auto sm:text-xs">
          <Inbox className="h-4 w-4" />
          Review Inbox
        </button>
      }
    >
      <div className="space-y-1">
        {captures.map((capture) => (
          <button key={capture.id} onClick={onReview} className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left hover:bg-[var(--cos-bg-soft)]">
            <span className="cos-pill cos-pill-primary shrink-0">{dashboardCaptureType(capture)}</span>
            <span className="min-w-0 flex-1 break-words text-sm text-[var(--cos-text-strong)]">{capture.text}</span>
            <span className="hidden shrink-0 text-[11px] text-[var(--cos-text-subtle)] sm:inline">{formatDistanceToNow(parseISO(capture.createdAt), { addSuffix: true })}</span>
          </button>
        ))}
      </div>
    </LiveBlock>
  );
}

export function Dashboard2View() {
  const router = useLocalRouter();
  const { data, loading, sync, addTask, addDeadline, updateDashboardScratchpad } = useWorkspace();
  const today = localDateKey();
  const scratchpad = data.dashboardScratchpads[0];
  const [scope, setScope] = useState(ALL_AREAS);
  const [groupMode, setGroupMode] = useState<DashboardGroupMode>("time");

  useEffect(() => {
    const stored = readStoredView();
    if (stored?.scope) setScope(stored.scope);
    if (stored?.groupMode && ["time", "area", "project"].includes(stored.groupMode)) setGroupMode(stored.groupMode);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify({ scope, groupMode }));
  }, [groupMode, scope]);

  const taskGroups = useMemo(
    () => dashboardTaskGroups({ tasks: data.tasks, projects: data.projects, domains: data.domains, today, scope, groupMode }),
    [data.domains, data.projects, data.tasks, groupMode, scope, today]
  );
  const dateGroups = useMemo(
    () => dashboardDateGroups({ deadlines: data.deadlines, projects: data.projects, domains: data.domains, today, scope, groupMode }),
    [data.deadlines, data.domains, data.projects, groupMode, scope, today]
  );
  const taskCount = taskGroups.reduce((count, group) => count + group.rows.length, 0);
  const dateCount = dateGroups.reduce((count, group) => count + group.rows.length, 0);
  const unprocessedCaptures = useMemo(
    () => data.captures.filter((capture) => capture.status === "unprocessed").sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [data.captures]
  );

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
        projectId: null,
        domainId: null
      });
      return { ok: true };
    }
    addDeadline({ title: parsed.title, date: parsed.date, time: parsed.time, projectId: null });
    return { ok: true };
  }

  return (
    <div data-testid="dashboard-command-page" className="mx-auto max-w-3xl px-4 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-4 sm:px-5 sm:pt-6 lg:px-8">
      <header className="mb-5 px-1">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--cos-primary-text)]">Daily Command Page</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-[var(--cos-text-strong)]">{loading ? "Loading dashboard" : "Dashboard"}</h1>
        <p className="mt-2 text-sm text-[var(--cos-text-muted)]">Write freely. Use /task and /date when a line should become a real record. Add [date] and (time) for timing.</p>
      </header>

      {loading ? <div className="mb-4 rounded-lg border border-[var(--cos-border)] p-3 text-sm text-[var(--cos-text-muted)]">Loading cached command page...</div> : null}

      <CommandPageEditor
        dataTestId="dashboard-scratchpad"
        value={scratchpad?.content ?? ""}
        onSave={updateDashboardScratchpad}
        onCommandLine={handleCommandLine}
        placeholder="Start typing. /task Send update [2026-07-10] (09:30) or /date Exam [2026-07-10] (14:30)..."
        minLines={8}
      />

      <div className="mt-6 space-y-1">
        <DashboardInboxPreview captures={unprocessedCaptures.slice(0, 3)} count={unprocessedCaptures.length} onReview={() => router.push("/inbox?review=1")} />
        <LiveBlock
          title="Tasks"
          count={taskCount}
          testId="dashboard-live-tasks"
          action={
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end">
              <label className="flex min-w-0 items-center gap-1 text-xs font-semibold text-[var(--cos-text-muted)]">
                Scope
                <select data-testid="dashboard-scope-select" value={scope} onChange={(event) => setScope(event.target.value)} className="min-h-10 min-w-0 flex-1 rounded-md border border-[var(--cos-border)] bg-[var(--cos-bg-elevated)] px-2 py-2 text-sm text-[var(--cos-text)] outline-none sm:min-h-0 sm:flex-none sm:py-1 sm:text-xs">
                  <option value={ALL_AREAS}>All areas</option>
                  {data.domains.filter((domain) => !domain.archived).map((domain) => <option key={domain.id} value={domain.id}>{domain.name}</option>)}
                </select>
              </label>
              <label className="flex min-w-0 items-center gap-1 text-xs font-semibold text-[var(--cos-text-muted)]">
                Group
                <select data-testid="dashboard-group-select" value={groupMode} onChange={(event) => setGroupMode(event.target.value as DashboardGroupMode)} className="min-h-10 min-w-0 flex-1 rounded-md border border-[var(--cos-border)] bg-[var(--cos-bg-elevated)] px-2 py-2 text-sm text-[var(--cos-text)] outline-none sm:min-h-0 sm:flex-none sm:py-1 sm:text-xs">
                  <option value="time">Time</option>
                  <option value="area">Area</option>
                  <option value="project">Project</option>
                </select>
              </label>
            </div>
          }
        >
          <div className="mb-2 flex items-center gap-2 text-xs text-[var(--cos-text-subtle)]">
            <CheckSquare className="h-3.5 w-3.5" />
            <span>{sync.online ? "Structured task records" : "Offline changes queue until sync"}</span>
          </div>
          <CommandTaskRows groups={taskGroups} emptyTitle="No active tasks in this view" />
        </LiveBlock>

        <LiveBlock title="Dates" count={dateCount} testId="dashboard-live-dates">
          <div className="mb-2 flex items-center gap-2 text-xs text-[var(--cos-text-subtle)]">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>Important dates are separate from task checkboxes</span>
          </div>
          <CommandDateRows groups={dateGroups} emptyTitle="No active dates in this view" />
        </LiveBlock>
      </div>
    </div>
  );
}
