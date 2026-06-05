"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  Boxes,
  BookOpen,
  Calendar,
  CalendarCheck,
  CalendarClock,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  FileText,
  FolderKanban,
  Heading1,
  Heading2,
  Layers,
  List,
  MapPin,
  Inbox,
  MoreHorizontal,
  Plus,
  Quote,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  Star,
  Trash2,
  X,
  Zap
} from "lucide-react";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { MarkdownEditor } from "@/components/workspace/MarkdownEditor";
import { Dashboard2View } from "@/components/workspace/Dashboard2";
import { useWorkspace } from "@/lib/client-store";
import { isDateKeyInLocalWeek, localDateKey, localWeekStartKey } from "@/lib/dates";
import type { Capture, Deadline, Domain, Note, Priority, Project, ReviewType, Task, TaskStatus } from "@/lib/types";

const taskStatus: Record<TaskStatus, { label: string; color: string }> = {
  todo: { label: "Todo", color: "cos-pill-muted" },
  "in-progress": { label: "In Progress", color: "cos-pill-primary" },
  blocked: { label: "Blocked", color: "cos-pill-danger" },
  waiting: { label: "Waiting", color: "cos-pill-warning" },
  done: { label: "Done", color: "cos-pill-success" },
  dropped: { label: "Dropped", color: "cos-pill-muted" }
};

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

const DASHBOARD_CANVAS_TITLE = "Dashboard Canvas";

function isOverdue(task: Task) {
  return Boolean(task.dueDate && task.dueDate < localDateKey() && task.status !== "done" && task.status !== "dropped");
}

function isThisWeek(dateKeyValue: string | null) {
  return isDateKeyInLocalWeek(dateKeyValue);
}

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

function taskTimeLabel(task: Pick<Task, "startTime" | "endTime">) {
  if (task.startTime && task.endTime) return `${task.startTime}-${task.endTime}`;
  return task.startTime ?? task.endTime ?? "";
}

function visibleProjects(projects: Project[]) {
  return projects.filter((project) => !project.trashedAt && project.status !== "archived");
}

function rootProjects(projects: Project[]) {
  const visibleIds = new Set(visibleProjects(projects).map((project) => project.id));
  return visibleProjects(projects).filter((project) => !project.parentProjectId || !visibleIds.has(project.parentProjectId));
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

function executionTasks(tasks: Task[]) {
  return tasks.filter((task) => !task.trashedAt && !task.archivedAt && task.status !== "dropped");
}

function sortDoneLast(a: Task, b: Task) {
  if (a.status === "done" && b.status !== "done") return 1;
  if (a.status !== "done" && b.status === "done") return -1;
  return a.createdAt.localeCompare(b.createdAt);
}

function Page({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="cos-page">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--cos-text-strong)]">{title}</h1>
          {subtitle ? <p className="mt-1 max-w-2xl text-sm text-[var(--cos-text-muted)]">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function SectionTitle({ icon: Icon, title, count, tone = "slate" }: { icon?: any; title: string; count?: number; tone?: "slate" | "red" | "amber" | "indigo" | "emerald" }) {
  const color = {
    slate: "text-[var(--cos-text-muted)]",
    red: "text-[var(--cos-danger)]",
    amber: "text-[var(--cos-warning)]",
    indigo: "text-[var(--cos-primary)]",
    emerald: "text-[var(--cos-success)]"
  }[tone];
  return (
    <div className="flex items-center gap-2">
      {Icon ? <Icon className={`h-4 w-4 ${color}`} /> : null}
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--cos-text-muted)]">{title}</h2>
      {count !== undefined ? <span className="text-xs text-[var(--cos-text-subtle)]">({count})</span> : null}
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: any; title: string; description?: string }) {
  return (
    <div className="cos-empty px-4 py-8 text-center">
      <Icon className="mx-auto mb-3 h-10 w-10 text-[var(--cos-text-subtle)]" />
      <p className="text-sm font-medium text-[var(--cos-text-muted)]">{title}</p>
      {description ? <p className="mt-1 text-xs text-[var(--cos-text-subtle)]">{description}</p> : null}
    </div>
  );
}

function QuickCapture() {
  const [text, setText] = useState("");
  const [flash, setFlash] = useState(false);
  const { addCapture } = useWorkspace();

  function submit() {
    if (!text.trim()) return;
    addCapture(text);
    setText("");
    setFlash(true);
    window.setTimeout(() => setFlash(false), 450);
  }

  return (
    <div className={`cos-input flex items-center gap-2 px-4 py-3 ${flash ? "border-[var(--cos-success-border)] shadow-[0_0_0_3px_var(--cos-success-soft)]" : ""}`}>
      <Zap className={`h-5 w-5 shrink-0 ${flash ? "text-[var(--cos-success)]" : "text-[var(--cos-primary)]"}`} />
      <input
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") submit();
          if (event.key === "Escape") setText("");
        }}
        placeholder="Quick capture... try /task, /note, /project, /deadline, /status"
        className="min-w-0 flex-1 bg-transparent text-sm text-[var(--cos-text-strong)] outline-none placeholder:text-[var(--cos-text-subtle)]"
      />
      <button onClick={submit} disabled={!text.trim()} className="grid h-9 w-9 place-items-center rounded-lg text-[var(--cos-primary-text)] hover:bg-[var(--cos-primary-soft)] disabled:text-[var(--cos-text-subtle)]">
        <Send className="h-4 w-4" />
      </button>
    </div>
  );
}

function TaskRow({ task, labels = [] }: { task: Task; labels?: string[] }) {
  const { updateTask } = useWorkspace();
  const done = task.status === "done";
  return (
    <div className="group flex items-start gap-3 px-3 py-3 hover:bg-[var(--cos-bg-soft)]">
      <button
        onClick={() => updateTask(task.id, { status: done ? "todo" : "done" })}
        aria-label={done ? `Mark ${task.title} todo` : `Mark ${task.title} done`}
        className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 ${done ? "border-[var(--cos-success)] bg-[var(--cos-success)]" : "border-[var(--cos-border-strong)] hover:border-[var(--cos-primary)]"}`}
      >
        {done ? <Check className="h-3 w-3 text-white" /> : null}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${done ? "text-[var(--cos-text-subtle)] line-through" : "text-[var(--cos-text-strong)]"}`}>{task.title}</p>
        {labels.length ? (
          <div className="mt-1 flex flex-wrap gap-1.5">
          {labels.map((label) => (
              <span key={label} className={`cos-pill ${label === "Overdue" ? "cos-pill-danger" : label.includes("Due") ? "cos-pill-warning" : label.includes("Progress") ? "cos-pill-primary" : "cos-pill-muted"}`}>
                {label}
              </span>
            ))}
            {taskTimeLabel(task) ? <span className="cos-pill cos-pill-primary">{taskTimeLabel(task)}</span> : null}
          </div>
        ) : null}
      </div>
      <select
        value={task.status}
        onChange={(event) => updateTask(task.id, { status: event.target.value as TaskStatus })}
        className={`cos-pill border-0 opacity-0 group-hover:opacity-100 ${taskStatus[task.status].color}`}
      >
        {Object.entries(taskStatus).map(([value, config]) => (
          <option key={value} value={value}>
            {config.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function PriorityEditor({ scope, dateKeyValue, limit }: { scope: "daily" | "weekly"; dateKeyValue: string; limit?: number }) {
  const { data, addPriority, updatePriority, removePriority } = useWorkspace();
  const [text, setText] = useState("");
  const priorities = data.priorities.filter((priority) => priority.scope === scope && priority.dateKey === dateKeyValue);
  const atLimit = Boolean(limit && priorities.length >= limit);

  function submit() {
    if (!text.trim() || atLimit) return;
    addPriority(scope, dateKeyValue, text.trim());
    setText("");
  }

  return (
    <div className="space-y-1">
      {priorities.map((priority) => (
        <div key={priority.id} className="group flex items-center gap-3 py-1.5">
          <button onClick={() => updatePriority(priority.id, { done: !priority.done })} className={`grid h-6 w-6 place-items-center rounded-lg border-2 ${priority.done ? "border-[var(--cos-warning)] bg-[var(--cos-warning)]" : "border-[var(--cos-warning-border)] hover:border-[var(--cos-warning)]"}`}>
            {priority.done ? <Check className="h-3 w-3 text-white" /> : null}
          </button>
          <span className={`flex-1 text-sm ${priority.done ? "text-[var(--cos-text-subtle)] line-through" : "font-medium text-[var(--cos-text-strong)]"}`}>{priority.text}</span>
          <button onClick={() => removePriority(priority.id)} className="opacity-0 text-[var(--cos-text-subtle)] hover:text-[var(--cos-danger)] group-hover:opacity-100">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2 pt-1">
        <input
          value={text}
          disabled={atLimit}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && submit()}
          placeholder={atLimit ? "Maximum reached" : scope === "daily" ? "Add a top priority..." : "Add weekly priority..."}
          className="min-w-0 flex-1 border-b border-[var(--cos-border)] bg-transparent py-1 text-sm outline-none placeholder:text-[var(--cos-text-subtle)] focus:border-[var(--cos-warning)] disabled:opacity-50"
        />
        <button onClick={submit} disabled={atLimit} className="rounded p-1 text-[var(--cos-warning-text)] hover:bg-[var(--cos-warning-soft)] disabled:opacity-40">
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function TaskList({ rows }: { rows: { task: Task; labels: string[] }[] }) {
  if (!rows.length) return <EmptyState icon={Clock} title="No tasks here" />;
  return (
    <div className="cos-surface overflow-hidden divide-y divide-[var(--cos-border-soft)]">
      {rows.map((row) => (
        <TaskRow key={row.task.id} task={row.task} labels={row.labels} />
      ))}
    </div>
  );
}

export function DashboardView() {
  return <Dashboard2View />;
}

function DashboardCanvas({
  note,
  canCreate,
  loading,
  today,
  todayRows,
  onCapture,
  onSave
}: {
  note?: Note;
  canCreate: boolean;
  loading: boolean;
  today: string;
  todayRows: { task: Task; labels: string[] }[];
  onCapture: (line: string) => void;
  onSave: (content: string) => void;
}) {
  return (
    <section className="cos-surface p-4">
      {loading ? (
        <p className="mt-3 rounded-lg bg-[var(--cos-bg-soft)] px-3 py-6 text-sm text-[var(--cos-text-subtle)]">Loading dashboard canvas...</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <SectionTitle icon={FileText} title="Dashboard Canvas" tone="indigo" />
            <div className="mt-3">
              <MarkdownEditor
                value={note?.content ?? ""}
                placeholder={canCreate ? "Type / for blocks or captures..." : "Create a domain before saving dashboard notes."}
                minLines={7}
                dataTestId="dashboard-canvas-editor"
                onCaptureLine={onCapture}
                onSave={onSave}
              />
            </div>
          </div>
          <div className="space-y-5">
            <section>
              <SectionTitle icon={Star} title="Today's Priorities" tone="amber" />
              <div className="mt-3">
                <PriorityEditor scope="daily" dateKeyValue={today} limit={3} />
              </div>
            </section>
            <section>
              <SectionTitle icon={Clock} title="Today" tone="indigo" count={todayRows.length} />
              <div className="mt-2">
                <TaskList rows={todayRows} />
              </div>
            </section>
          </div>
        </div>
      )}
    </section>
  );
}

export function InboxView() {
  const { data, convertCapture, updateCapture } = useWorkspace();
  const [filter, setFilter] = useState<"all" | "unprocessed" | "converted" | "archived">("unprocessed");
  const captures = data.captures.filter((capture) => capture.status !== "deleted" && (filter === "all" || capture.status === filter));

  return (
    <Page title="Inbox" subtitle="Capture and triage without deciding too early.">
      <QuickCapture />
      <div className="mt-4 flex gap-1 rounded-lg bg-[var(--cos-bg-inset)] p-1">
        {(["unprocessed", "all", "converted", "archived"] as const).map((tab) => (
          <button key={tab} onClick={() => setFilter(tab)} className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium capitalize ${filter === tab ? "bg-[var(--cos-bg-elevated)] text-[var(--cos-text-strong)] shadow-sm" : "text-[var(--cos-text-muted)] hover:text-[var(--cos-text-strong)]"}`}>{tab}</button>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {captures.map((capture) => (
          <CaptureCard key={capture.id} capture={capture} onConvert={convertCapture} onArchive={() => updateCapture(capture.id, { status: "archived" })} onDelete={() => updateCapture(capture.id, { status: "deleted" })} />
        ))}
        {!captures.length ? <EmptyState icon={Inbox} title="No captures here" description="Quick capture something to start." /> : null}
      </div>
    </Page>
  );
}

function CaptureCard({ capture, onConvert, onArchive, onDelete }: { capture: Capture; onConvert: (id: string, target: "task" | "project" | "note" | "deadline") => void; onArchive: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="cos-surface p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="whitespace-pre-wrap text-sm text-[var(--cos-text-strong)]">{capture.text}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {capture.type ? <span className="cos-pill cos-pill-primary">{capture.type}</span> : null}
            <span className="text-[11px] text-[var(--cos-text-subtle)]">{formatDistanceToNow(parseISO(capture.createdAt), { addSuffix: true })}</span>
            {capture.status !== "unprocessed" ? <span className="cos-pill cos-pill-success">{capture.status}</span> : null}
          </div>
        </div>
        {capture.status === "unprocessed" ? <button aria-label="Capture actions" onClick={() => setOpen(!open)} className="rounded p-1 text-[var(--cos-text-subtle)] hover:bg-[var(--cos-bg-soft)] hover:text-[var(--cos-text)]"><MoreHorizontal className="h-5 w-5" /></button> : null}
      </div>
      {open && capture.status === "unprocessed" ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--cos-border-soft)] pt-3">
          {(["task", "project", "note", "deadline"] as const).map((target) => (
            <button key={target} onClick={() => onConvert(capture.id, target)} className="rounded-lg bg-[var(--cos-primary-soft)] px-3 py-1.5 text-xs font-medium capitalize text-[var(--cos-primary-text)] hover:bg-[var(--cos-primary-border)]">Convert to {target}</button>
          ))}
          <div className="flex-1" />
          <button onClick={onArchive} className="rounded-lg bg-[var(--cos-bg-inset)] px-3 py-1.5 text-xs font-medium text-[var(--cos-text-muted)] hover:text-[var(--cos-text-strong)]">Archive</button>
          <button onClick={onDelete} className="rounded-lg bg-[var(--cos-danger-soft)] px-3 py-1.5 text-xs font-medium text-[var(--cos-danger-text)]">Delete</button>
        </div>
      ) : null}
    </div>
  );
}

export function TodayView() {
  const { data } = useWorkspace();
  const today = localDateKey();
  const tasks = executionTasks(data.tasks);
  const overdue = activeTasks(data.tasks).filter(isOverdue);
  const seen = new Set<string>();
  const rows: { task: Task; labels: string[] }[] = [];
  const add = (task: Task, labels: string[]) => {
    if (!seen.has(task.id)) {
      seen.add(task.id);
      rows.push({ task, labels: [task.status === "done" ? "Done" : "", ...labels, domainName(data.domains, task.domainId)].filter(Boolean) });
    }
  };
  overdue.forEach((task) => add(task, ["Overdue"]));
  tasks.filter((task) => task.dueDate === today && !isOverdue(task)).forEach((task) => add(task, ["Due Today"]));
  tasks.filter((task) => task.plannedDate === today && !isOverdue(task)).forEach((task) => add(task, ["Planned Today"]));
  tasks.filter((task) => task.status === "in-progress").forEach((task) => add(task, ["In Progress"]));
  rows.sort((a, b) => {
    const doneSort = sortDoneLast(a.task, b.task);
    if (doneSort !== 0) return doneSort;
    const aTime = a.task.startTime ?? a.task.endTime ?? "99:99";
    const bTime = b.task.startTime ?? b.task.endTime ?? "99:99";
    return aTime.localeCompare(bTime);
  });
  const deadlines = data.deadlines.filter((deadline) => !deadline.trashedAt && deadline.date === today);

  return (
    <Page title="Today" subtitle={format(new Date(), "EEEE, MMMM d, yyyy")}>
      <SectionTitle icon={Star} title="Top Priorities" tone="amber" />
      <div className="mt-3"><PriorityEditor scope="daily" dateKeyValue={today} limit={3} /></div>
      <section className="mt-6">
        <SectionTitle icon={CalendarCheck} title="Tasks" tone="indigo" count={rows.length} />
        <div className="mt-2"><TaskList rows={rows} /></div>
      </section>
      {deadlines.length ? (
        <section className="mt-6">
          <SectionTitle icon={Calendar} title="Deadlines Today" tone="amber" />
          <div className="mt-2 space-y-2">
            {deadlines.map((deadline) => <div key={deadline.id} className="rounded-lg border border-[var(--cos-warning-border)] bg-[var(--cos-warning-soft)] p-3 text-sm font-medium text-[var(--cos-warning-text)]">{deadline.title}</div>)}
          </div>
        </section>
      ) : null}
    </Page>
  );
}

export function ThisWeekView() {
  const router = useRouter();
  const { data } = useWorkspace();
  const wk = localWeekStartKey();
  const tasks = activeTasks(data.tasks);
  const overdue = tasks.filter(isOverdue);
  const weekTasks = tasks
    .filter((task) => isThisWeek(task.dueDate) || isThisWeek(task.plannedDate))
    .map((task) => ({ task, labels: [isOverdue(task) ? "Overdue" : task.dueDate && isThisWeek(task.dueDate) ? "Due This Week" : "", task.plannedDate && isThisWeek(task.plannedDate) ? "Planned" : "", domainName(data.domains, task.domainId)].filter(Boolean) }));
  const weekDeadlines = data.deadlines.filter((deadline) => !deadline.trashedAt && isThisWeek(deadline.date));
  const activeProjects = data.projects.filter((project) => !project.trashedAt && project.status === "active");

  return (
    <Page title="This Week" subtitle={`Week of ${format(parseISO(`${wk}T00:00:00`), "MMMM d, yyyy")}`}>
      <SectionTitle icon={Star} title="Weekly Priorities" tone="amber" />
      <div className="mt-3"><PriorityEditor scope="weekly" dateKeyValue={wk} /></div>
      {overdue.length ? <section className="mt-6"><SectionTitle icon={AlertTriangle} title="Overdue" tone="red" count={overdue.length} /><div className="mt-2"><TaskList rows={overdue.map((task) => ({ task, labels: ["Overdue", domainName(data.domains, task.domainId)].filter(Boolean) }))} /></div></section> : null}
      <section className="mt-6"><SectionTitle icon={CalendarCheck} title="Tasks This Week" tone="indigo" count={weekTasks.length} /><div className="mt-2"><TaskList rows={weekTasks} /></div></section>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section>
          <SectionTitle icon={Calendar} title="Deadlines This Week" tone="amber" count={weekDeadlines.length} />
          <div className="mt-2 space-y-2">{weekDeadlines.map((deadline) => <div key={deadline.id} className="rounded-lg border border-[var(--cos-warning-border)] bg-[var(--cos-warning-soft)] p-3 text-sm text-[var(--cos-warning-text)]">{deadline.title} <span className="text-xs">{deadline.date}</span></div>)}</div>
        </section>
        <section>
          <SectionTitle icon={FolderKanban} title="Active Projects" tone="emerald" count={activeProjects.length} />
          <div className="mt-2 grid gap-3 sm:grid-cols-2">{activeProjects.slice(0, 6).map((project) => <button key={project.id} onClick={() => router.push(`/projects/${project.id}`)} className="cos-surface p-3 text-left hover:border-[var(--cos-primary-border)]"><p className="truncate text-sm font-semibold text-[var(--cos-text-strong)]">{project.name}</p>{project.nextAction ? <p className="mt-1 truncate text-xs text-[var(--cos-primary-text)]">{project.nextAction}</p> : null}</button>)}</div>
        </section>
      </div>
    </Page>
  );
}

export function ProjectsView() {
  const router = useRouter();
  const { data, addProject } = useWorkspace();
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [domainId, setDomainId] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const activeDomains = data.domains.filter((domain) => !domain.archived);
  const projects = rootProjects(data.projects);

  function create() {
    const chosenDomain = domainId || activeDomains[0]?.id;
    if (!name.trim() || !chosenDomain) return;
    const id = addProject({ name: name.trim(), domainId: chosenDomain });
    setName("");
    setShowNew(false);
    router.push(`/projects/${id}`);
  }

  function toggle(projectId: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  }

  return (
    <Page title="Projects" subtitle="Track outcomes, next actions, and recovery context." action={<button onClick={() => setShowNew(true)} className="cos-btn cos-btn-primary px-4 py-2 text-sm"><Plus className="h-4 w-4" /> New Project</button>}>
      {showNew ? (
        <div className="cos-surface mb-4 p-4">
          <input value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && create()} autoFocus placeholder="Project name..." className="cos-input w-full px-3 py-2 text-sm" />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <select value={domainId} onChange={(event) => setDomainId(event.target.value)} className="cos-input px-3 py-2 text-sm">
              {activeDomains.map((domain) => <option key={domain.id} value={domain.id}>{domain.name}</option>)}
            </select>
            <button onClick={create} className="text-sm font-semibold text-[var(--cos-primary-text)]">Create</button>
            <button onClick={() => setShowNew(false)} className="text-sm text-[var(--cos-text-muted)]">Cancel</button>
          </div>
        </div>
      ) : null}
      <div className="space-y-3">
        {projects.map((project) => {
          const descendantIds = descendantProjectIds(data.projects, project.id);
          const projectIds = new Set([project.id, ...descendantIds]);
          const count = activeTasks(data.tasks).filter((task) => task.projectId && projectIds.has(task.projectId)).length;
          const deadlineCount = data.deadlines.filter((deadline) => !deadline.trashedAt && deadline.projectId && projectIds.has(deadline.projectId)).length;
          const children = childProjects(data.projects, project.id);
          return (
            <ProjectIndexRow
              key={project.id}
              project={project}
              projects={data.projects}
              taskCount={count}
              deadlineCount={deadlineCount}
              expanded={expanded}
              onToggle={toggle}
              onOpen={(id) => router.push(`/projects/${id}`)}
              domains={data.domains}
            />
          );
        })}
      </div>
      {!projects.length ? <EmptyState icon={FolderKanban} title="No projects yet" description="Create an outcome or subcontext to start." /> : null}
    </Page>
  );
}

function ProjectIndexRow({
  project,
  projects,
  taskCount,
  deadlineCount,
  expanded,
  onToggle,
  onOpen,
  domains,
  depth = 0
}: {
  project: Project;
  projects: Project[];
  taskCount?: number;
  deadlineCount?: number;
  expanded: Set<string>;
  onToggle: (projectId: string) => void;
  onOpen: (projectId: string) => void;
  domains: Domain[];
  depth?: number;
}) {
  const children = childProjects(projects, project.id);
  const isOpen = expanded.has(project.id);
  return (
    <section className={`${depth === 0 ? "cos-surface" : "rounded-lg border border-[var(--cos-border-soft)] bg-[var(--cos-bg-soft)]"} overflow-hidden`}>
      <div className="flex items-start gap-2 p-3">
        <button
          type="button"
          onClick={() => children.length ? onToggle(project.id) : onOpen(project.id)}
          aria-label={children.length ? (isOpen ? `Collapse ${project.name}` : `Expand ${project.name}`) : `Open ${project.name}`}
          className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md text-[var(--cos-text-subtle)] hover:bg-[var(--cos-bg-elevated)] hover:text-[var(--cos-primary-text)]"
        >
          {children.length ? (isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />) : <FolderKanban className="h-4 w-4" />}
        </button>
        <button type="button" onClick={() => onOpen(project.id)} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-[var(--cos-text-strong)]">{project.name}</h3>
            <span className={`cos-pill ${projectStatus[project.status].color}`}>{projectStatus[project.status].label}</span>
            {depth === 0 ? <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${domainColor(domains, project.domainId)}`}>{domainName(domains, project.domainId)}</span> : null}
          </div>
          <p className={`mt-1 truncate text-xs font-medium ${project.nextAction ? "text-[var(--cos-primary-text)]" : "text-[var(--cos-danger-text)]"}`}>Next: {project.nextAction || "Missing next action"}</p>
          <p className={`mt-1 line-clamp-2 text-xs ${project.latestStatus ? "text-[var(--cos-text-muted)]" : "font-medium text-[var(--cos-warning-text)]"}`}>Status: {project.latestStatus || "No latest status"}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[var(--cos-text-subtle)]">
            {children.length ? <span>{children.length} subcontext{children.length > 1 ? "s" : ""}</span> : null}
            {taskCount ? <span>{taskCount} open task{taskCount > 1 ? "s" : ""}</span> : null}
            {deadlineCount ? <span>{deadlineCount} deadline{deadlineCount > 1 ? "s" : ""}</span> : null}
          </div>
        </button>
      </div>
      {isOpen && children.length ? (
        <div className="space-y-2 border-t border-[var(--cos-border-soft)] p-3 pl-6">
          {children.map((child) => (
            <ProjectIndexRow key={child.id} project={child} projects={projects} expanded={expanded} onToggle={onToggle} onOpen={onOpen} domains={domains} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function AreaProjectTree({
  project,
  projects,
  tasks,
  deadlines,
  depth,
  onOpen,
  onDelete
}: {
  project: Project;
  projects: Project[];
  tasks: Task[];
  deadlines: Deadline[];
  depth: number;
  onOpen: (projectId: string) => void;
  onDelete: (projectId: string) => void;
}) {
  const children = childProjects(projects, project.id);
  const descendantIds = descendantProjectIds(projects, project.id);
  const projectIds = new Set([project.id, ...descendantIds]);
  const taskCount = activeTasks(tasks).filter((task) => task.projectId && projectIds.has(task.projectId)).length;
  const deadlineCount = deadlines.filter((deadline) => !deadline.trashedAt && deadline.projectId && projectIds.has(deadline.projectId)).length;

  return (
    <div className="space-y-1">
      <div
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[var(--cos-bg-elevated)]"
        style={{ paddingLeft: `${0.5 + depth * 1.1}rem` }}
      >
        <Layers className="h-3.5 w-3.5 shrink-0 text-[var(--cos-text-subtle)]" />
        <button type="button" onClick={() => onOpen(project.id)} className="min-w-0 flex-1 truncate text-left text-xs font-medium text-[var(--cos-text)] hover:text-[var(--cos-primary-text)]">{project.name}</button>
        {project.nextAction ? <span className="hidden max-w-36 truncate text-[11px] text-[var(--cos-primary-text)] sm:inline">Next: {project.nextAction}</span> : null}
        {taskCount ? <span className="cos-pill cos-pill-muted">{taskCount} task{taskCount > 1 ? "s" : ""}</span> : null}
        {deadlineCount ? <span className="cos-pill cos-pill-warning">{deadlineCount} date{deadlineCount > 1 ? "s" : ""}</span> : null}
        <button type="button" onClick={() => onDelete(project.id)} aria-label={`Delete ${project.name}`} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[var(--cos-text-subtle)] hover:bg-[var(--cos-danger-soft)] hover:text-[var(--cos-danger-text)]">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {children.map((child) => (
        <AreaProjectTree key={child.id} project={child} projects={projects} tasks={tasks} deadlines={deadlines} depth={depth + 1} onOpen={onOpen} onDelete={onDelete} />
      ))}
    </div>
  );
}

export function AreasView() {
  const router = useRouter();
  const { data, loading, addProject, updateProject } = useWorkspace();
  const [openAreaId, setOpenAreaId] = useState<string | null>(null);
  const [newProjectByArea, setNewProjectByArea] = useState<Record<string, string>>({});
  const activeDomains = data.domains.filter((domain) => !domain.archived);

  function createAreaProject(domainId: string) {
    const name = (newProjectByArea[domainId] ?? "").trim();
    if (!name) return;
    addProject({ name, domainId });
    setNewProjectByArea((current) => ({ ...current, [domainId]: "" }));
  }

  return (
    <Page title="Areas" subtitle="Ongoing responsibilities, systems, and domains that hold projects and resources.">
      {loading ? <EmptyState icon={Boxes} title="Loading areas" description="Workspace data is hydrating from cache or server." /> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {activeDomains.map((domain) => {
          const domainProjects = data.projects.filter((project) => project.domainId === domain.id && !project.trashedAt && project.status !== "archived");
          const projectIds = new Set(domainProjects.map((project) => project.id));
          const openTaskCount = activeTasks(data.tasks).filter((task) => task.domainId === domain.id || (task.projectId && projectIds.has(task.projectId))).length;
          const resourceCount = data.notes.filter((note) => note.domainId === domain.id && !note.projectId && !note.trashedAt).length;
          const deadlineCount = data.deadlines.filter((deadline) => !deadline.trashedAt && deadline.projectId && projectIds.has(deadline.projectId)).length;
          const roots = domainProjects.filter((project) => !project.parentProjectId || !projectIds.has(project.parentProjectId));
          const open = openAreaId === domain.id;
          return (
            <section key={domain.id} className="cos-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium ${domainColor(data.domains, domain.id)}`}>Area</span>
                  <h2 className="mt-2 text-base font-semibold text-[var(--cos-text-strong)]">{domain.name}</h2>
                </div>
                <button
                  type="button"
                  aria-label={open ? `Close ${domain.name}` : `Open ${domain.name}`}
                  onClick={() => setOpenAreaId(open ? null : domain.id)}
                  className="rounded-md p-1 text-[var(--cos-text-subtle)] hover:bg-[var(--cos-bg-soft)] hover:text-[var(--cos-primary-text)]"
                >
                  {open ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                </button>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-[var(--cos-bg-soft)] p-2"><p className="text-sm font-semibold text-[var(--cos-text-strong)]">{domainProjects.length}</p><p className="text-[10px] uppercase tracking-[0.14em] text-[var(--cos-text-subtle)]">Projects</p></div>
                <div className="rounded-lg bg-[var(--cos-bg-soft)] p-2"><p className="text-sm font-semibold text-[var(--cos-text-strong)]">{openTaskCount}</p><p className="text-[10px] uppercase tracking-[0.14em] text-[var(--cos-text-subtle)]">Tasks</p></div>
                <div className="rounded-lg bg-[var(--cos-bg-soft)] p-2"><p className="text-sm font-semibold text-[var(--cos-text-strong)]">{resourceCount}</p><p className="text-[10px] uppercase tracking-[0.14em] text-[var(--cos-text-subtle)]">Resources</p></div>
              </div>
              <div className="mt-4 space-y-2">
                {(!open ? roots.slice(0, 3) : []).map((project) => (
                  <button key={project.id} onClick={() => router.push(`/projects/${project.id}`)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[var(--cos-bg-soft)]">
                    <FolderKanban className="h-3.5 w-3.5 text-[var(--cos-text-subtle)]" />
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-[var(--cos-text)]">{project.name}</span>
                    {childProjects(data.projects, project.id).length ? <span className="text-[10px] text-[var(--cos-text-subtle)]">{childProjects(data.projects, project.id).length} sub</span> : null}
                  </button>
                ))}
                {!roots.length ? <p className="text-xs italic text-[var(--cos-text-subtle)]">No active projects in this area.</p> : null}
              </div>
              {open && roots.length ? (
                <div className="mt-4 rounded-lg border border-[var(--cos-border-soft)] bg-[var(--cos-bg-soft)] p-2">
                  {roots.map((project) => (
                    <AreaProjectTree
                      key={project.id}
                      project={project}
                      projects={data.projects}
                      tasks={data.tasks}
                      deadlines={data.deadlines}
                      depth={0}
                      onOpen={(id) => router.push(`/projects/${id}`)}
                      onDelete={(id) => updateProject(id, { trashedAt: new Date().toISOString() })}
                    />
                  ))}
                </div>
              ) : null}
              {open ? (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-[var(--cos-border-soft)] bg-[var(--cos-bg-soft)] p-2">
                  <Plus className="h-4 w-4 shrink-0 text-[var(--cos-primary)]" />
                  <input
                    value={newProjectByArea[domain.id] ?? ""}
                    onChange={(event) => setNewProjectByArea((current) => ({ ...current, [domain.id]: event.target.value }))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") createAreaProject(domain.id);
                      if (event.key === "Escape") setNewProjectByArea((current) => ({ ...current, [domain.id]: "" }));
                    }}
                    placeholder={`New project in ${domain.name}...`}
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--cos-text-subtle)]"
                  />
                  <button type="button" onClick={() => createAreaProject(domain.id)} disabled={!newProjectByArea[domain.id]?.trim()} className="cos-btn cos-btn-primary px-3 py-1.5 text-xs disabled:bg-[var(--cos-border)]">Add</button>
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-[var(--cos-text-subtle)]">
                {deadlineCount ? <span>{deadlineCount} deadline{deadlineCount > 1 ? "s" : ""}</span> : null}
                {domain.archived ? <span>Archived</span> : null}
              </div>
            </section>
          );
        })}
      </div>
      {!loading && !activeDomains.length ? <EmptyState icon={Boxes} title="No active areas" description="Add domains in Settings to create areas." /> : null}
    </Page>
  );
}

export function ResourcesView() {
  const { data, loading, addNote, updateNote } = useWorkspace();
  const activeDomains = data.domains.filter((domain) => !domain.archived);
  const [domainId, setDomainId] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newDomainId, setNewDomainId] = useState("");
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const selectedDomain = domainId || "all";
  const resources = data.notes.filter((note) => !note.trashedAt && !note.projectId && (selectedDomain === "all" || note.domainId === selectedDomain));

  function createResource() {
    const title = newTitle.trim();
    const chosenDomain = newDomainId || activeDomains[0]?.id;
    if (!title || !chosenDomain) return;
    const id = addNote({ title, content: "", projectId: null, domainId: chosenDomain });
    setNewTitle("");
    setNewDomainId("");
    setEditingNote(id);
  }

  return (
    <Page title="Resources" subtitle="Standalone markdown notes, reference lists, and knowledge you may want searchable later.">
      <div className="cos-surface mb-4 p-4">
        <SectionTitle icon={FileText} title="New Resource" tone="indigo" />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input value={newTitle} disabled={loading || !activeDomains.length} onChange={(event) => setNewTitle(event.target.value)} onKeyDown={(event) => event.key === "Enter" && createResource()} placeholder={loading ? "Loading resources..." : "Resource title..."} className="cos-input min-w-0 flex-1 px-3 py-2 text-sm disabled:bg-[var(--cos-bg-inset)] disabled:text-[var(--cos-text-subtle)]" />
          <select value={newDomainId} disabled={loading || !activeDomains.length} onChange={(event) => setNewDomainId(event.target.value)} className="cos-input px-3 py-2 text-sm disabled:bg-[var(--cos-bg-inset)] disabled:text-[var(--cos-text-subtle)]">
            {activeDomains.map((domain) => <option key={domain.id} value={domain.id}>{domain.name}</option>)}
          </select>
          <button onClick={createResource} disabled={loading || !activeDomains.length || !newTitle.trim()} className="cos-btn cos-btn-primary px-4 py-2 text-sm disabled:opacity-40">Add</button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => setDomainId("")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${selectedDomain === "all" ? "bg-[var(--cos-text-strong)] text-[var(--cos-text-inverse)]" : "bg-[var(--cos-bg-elevated)] text-[var(--cos-text-muted)] hover:bg-[var(--cos-bg-soft)]"}`}>All</button>
        {activeDomains.map((domain) => (
          <button key={domain.id} onClick={() => setDomainId(domain.id)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${selectedDomain === domain.id ? "bg-[var(--cos-text-strong)] text-[var(--cos-text-inverse)]" : "bg-[var(--cos-bg-elevated)] text-[var(--cos-text-muted)] hover:bg-[var(--cos-bg-soft)]"}`}>{domain.name}</button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {resources.map((note) => (
          <div key={note.id} className="cos-surface p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${domainColor(data.domains, note.domainId)}`}>{domainName(data.domains, note.domainId)}</span>
              {note.title === DASHBOARD_CANVAS_TITLE ? <span className="cos-pill cos-pill-primary">Dashboard</span> : null}
            </div>
            <NoteCard note={note} domains={data.domains} editing={editingNote === note.id} onEdit={() => setEditingNote(note.id)} onDone={() => setEditingNote(null)} onUpdate={(updates) => updateNote(note.id, updates)} />
          </div>
        ))}
      </div>
      {loading ? <EmptyState icon={FileText} title="Loading resources" description="Workspace data is hydrating from cache or server." /> : null}
      {!loading && !resources.length ? <EmptyState icon={FileText} title="No resources here" description="Add a standalone note or switch area filters." /> : null}
    </Page>
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

function MarkdownTextareaEditor({
  value,
  placeholder,
  dataTestId,
  rows = 10,
  onSave
}: {
  value: string;
  placeholder: string;
  dataTestId?: string;
  rows?: number;
  onSave: (value: string) => void;
}) {
  const { sync } = useWorkspace();
  const [draft, setDraft] = useState(value);
  const [savedFlash, setSavedFlash] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
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

  function insert(prefix: string, fallback = "") {
    const textarea = textareaRef.current;
    if (!textarea) {
      setDraft((current) => `${current}${current ? "\n" : ""}${prefix}${fallback}`);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = draft.slice(start, end) || fallback;
    const before = draft.slice(0, start);
    const after = draft.slice(end);
    const next = `${before}${prefix}${selected}${after}`;
    setDraft(next);
    window.setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  }

  return (
    <div data-testid={dataTestId} className="rounded-lg border border-[var(--cos-border)] bg-[var(--cos-bg-elevated)]">
      <div className="flex flex-wrap items-center gap-1 border-b border-[var(--cos-border-soft)] px-2 py-2">
        <button type="button" onClick={() => insert("# ", "Heading")} aria-label="Insert heading" className="cos-btn cos-btn-ghost min-h-8 px-2 text-xs"><Heading1 className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={() => insert("## ", "Section")} aria-label="Insert subheading" className="cos-btn cos-btn-ghost min-h-8 px-2 text-xs"><Heading2 className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={() => insert("- ", "List item")} aria-label="Insert list item" className="cos-btn cos-btn-ghost min-h-8 px-2 text-xs"><List className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={() => insert("- [ ] ", "To-do")} aria-label="Insert todo" className="cos-btn cos-btn-ghost min-h-8 px-2 text-xs"><CheckSquare className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={() => insert("> ", "Quote")} aria-label="Insert quote" className="cos-btn cos-btn-ghost min-h-8 px-2 text-xs"><Quote className="h-3.5 w-3.5" /></button>
      </div>
      <textarea
        ref={textareaRef}
        data-testid={dataTestId ? `${dataTestId}-textarea` : undefined}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key === "Enter") commit();
          if (event.key === "Escape") setDraft(value);
        }}
        rows={rows}
        placeholder={placeholder}
        className="min-h-64 w-full resize-y bg-transparent px-3 py-3 text-sm leading-6 text-[var(--cos-text)] outline-none placeholder:text-[var(--cos-text-subtle)]"
      />
      <div className="flex min-h-10 flex-wrap items-center justify-end gap-2 border-t border-[var(--cos-border-soft)] px-3 py-2 text-[11px]">
        {dirty ? <span className="text-[var(--cos-warning-text)]">Unsaved changes</span> : savedFlash ? <span className="text-[var(--cos-success-text)]">Saved</span> : null}
        {dirty && !sync.online ? <span className="cos-pill cos-pill-warning">Offline: save will queue</span> : null}
        <button type="button" disabled={!dirty} onClick={commit} className="inline-flex min-h-8 items-center gap-1 rounded-md px-2 py-1 font-semibold text-[var(--cos-primary-text)] hover:bg-[var(--cos-primary-soft)] disabled:text-[var(--cos-text-subtle)] disabled:hover:bg-transparent">
          <Send className="h-3.5 w-3.5" />
          Save
        </button>
      </div>
    </div>
  );
}

const recoveryHeadings = {
  currentObjective: "Current Objective",
  nextAction: "Next Action",
  latestStatus: "Latest Status",
  openLoops: "Open Loops"
} as const;

function projectRecoveryMarkdown(project: Project) {
  return [
    `## ${recoveryHeadings.currentObjective}`,
    project.currentObjective,
    "",
    `## ${recoveryHeadings.nextAction}`,
    project.nextAction,
    "",
    `## ${recoveryHeadings.latestStatus}`,
    project.latestStatus,
    "",
    `## ${recoveryHeadings.openLoops}`,
    ...project.openLoops.map((loop) => `- [ ] ${loop}`)
  ].join("\n");
}

function parseProjectRecoveryMarkdown(markdown: string) {
  const sections: Record<keyof typeof recoveryHeadings, string[] | null> = {
    currentObjective: null,
    nextAction: null,
    latestStatus: null,
    openLoops: null
  };
  const headingMap = new Map(Object.entries(recoveryHeadings).map(([key, value]) => [value.toLowerCase(), key as keyof typeof recoveryHeadings]));
  let active: keyof typeof recoveryHeadings | null = null;

  markdown.split(/\r?\n/).forEach((line) => {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      active = headingMap.get((heading[1] ?? "").trim().toLowerCase()) ?? null;
      if (active && sections[active] === null) sections[active] = [];
      return;
    }
    if (active) sections[active]?.push(line);
  });

  const cleanText = (key: keyof typeof recoveryHeadings) => (sections[key] === null ? null : sections[key]!.join("\n").trim());
  const rawLoops = sections.openLoops;
  const openLoops =
    rawLoops === null
      ? null
      : rawLoops
          .map((line) => line.replace(/^- \[( |x|X)\]\s?/, "").replace(/^- /, "").trim())
          .filter(Boolean);

  return {
    currentObjective: cleanText("currentObjective"),
    nextAction: cleanText("nextAction"),
    latestStatus: cleanText("latestStatus"),
    openLoops
  };
}

export function ProjectDetailView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { data, updateProject, addProject, addTask, addDeadline, updateDeadline, addNote, updateNote } = useWorkspace();
  const project = data.projects.find((item) => item.id === projectId);
  const [newSubcontext, setNewSubcontext] = useState("");
  const [newTask, setNewTask] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [newDeadlineDate, setNewDeadlineDate] = useState(localDateKey());
  const [newDeadlineTime, setNewDeadlineTime] = useState("");
  const [newDeadlineLocation, setNewDeadlineLocation] = useState("");
  const [newNote, setNewNote] = useState("");
  const [editingNote, setEditingNote] = useState<string | null>(null);

  if (!project) {
    return <Page title="Project not found"><button onClick={() => router.push("/projects")} className="text-sm font-semibold text-[var(--cos-primary-text)]">Back to projects</button></Page>;
  }

  const currentProject = project;
  const subcontexts = childProjects(data.projects, project.id);
  const descendantIds = descendantProjectIds(data.projects, project.id);
  const rollupProjectIds = new Set([project.id, ...descendantIds]);
  const tasks = data.tasks.filter((task) => task.projectId && rollupProjectIds.has(task.projectId) && !task.trashedAt);
  const deadlines = data.deadlines.filter((deadline) => deadline.projectId && rollupProjectIds.has(deadline.projectId) && !deadline.trashedAt);
  const notes = data.notes.filter((note) => note.projectId === project.id && !note.trashedAt);
  const activeTaskCount = tasks.filter((task) => task.status !== "done" && task.status !== "dropped").length;
  const activeDomains = data.domains.filter((domain) => !domain.archived);
  const suggestions = [
    !project.nextAction ? "Define a next action to make recovery easier." : "",
    !project.latestStatus ? "Add a latest status so future-you can resume quickly." : "",
    project.openLoops.length ? `Review ${project.openLoops.length} open loop(s).` : "",
    !activeTaskCount ? "No active tasks. Add one small concrete task." : ""
  ].filter(Boolean);

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
      "## Notes",
      ...notes.flatMap((note) => [`### ${note.title}`, note.content, ""])
    ].filter(Boolean).join("\n");
    const url = URL.createObjectURL(new Blob([md], { type: "text/markdown" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${currentProject.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Page title={project.name} subtitle="Recovery-first project detail." action={<button onClick={() => router.push("/projects")} className="text-sm font-semibold text-[var(--cos-primary-text)]">Back</button>}>
      <div className="cos-surface p-5">
        <EditableField value={project.name} placeholder="Project name" onSave={(value) => updateProject(project.id, { name: value })} inputClassName="text-base font-semibold" />
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <select value={project.status} onChange={(event) => updateProject(project.id, { status: event.target.value as any, archivedAt: event.target.value === "archived" ? new Date().toISOString() : null })} className={`rounded-full border-0 px-3 py-1 text-xs font-medium ${projectStatus[project.status].color}`}>
            {Object.entries(projectStatus).map(([value, config]) => <option key={value} value={value}>{config.label}</option>)}
          </select>
          <select value={project.domainId} onChange={(event) => updateProject(project.id, { domainId: event.target.value })} className={`rounded-full border-0 px-2 py-1 text-[11px] font-medium ${domainColor(data.domains, project.domainId)}`}>
            {activeDomains.map((domain) => <option key={domain.id} value={domain.id}>{domain.name}</option>)}
          </select>
          {project.parentProjectId ? <span className="cos-pill cos-pill-muted">Parent: {projectName(data.projects, project.parentProjectId)}</span> : null}
          <span className="text-[11px] text-[var(--cos-text-subtle)]">Updated {formatDistanceToNow(parseISO(project.updatedAt), { addSuffix: true })}</span>
        </div>
      </div>

      <InfoBlock title="Recovery Canvas" accent className="mt-4">
        <div data-testid="project-recovery-editor" className="space-y-4">
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
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--cos-primary-text)]">Freeform recovery notes</span>
              <span className="text-[11px] text-[var(--cos-text-subtle)]">Markdown supported</span>
            </div>
            <MarkdownTextareaEditor
              value={project.recoveryNotes}
              placeholder="Add togglable headings, lists, todos, rough handoff notes, blockers, and context you want future-you to find..."
              rows={12}
              dataTestId="project-recovery-notes"
              onSave={(recoveryNotes) => updateProject(project.id, { recoveryNotes })}
            />
          </div>
        </div>
      </InfoBlock>

      <InfoBlock title="Subcontexts" className="mt-4">
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
                    {childDeadlineCount ? <span>{childDeadlineCount} deadline{childDeadlineCount > 1 ? "s" : ""}</span> : null}
                    {childDescendants.size ? <span>{childDescendants.size} nested</span> : null}
                  </div>
                </div>
              </button>
            );
          })}
          {!subcontexts.length ? <p className="text-sm italic text-[var(--cos-text-subtle)]">No subcontexts yet.</p> : null}
          <div className="flex items-center gap-2 pt-2">
            <input value={newSubcontext} onChange={(event) => setNewSubcontext(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addSubcontext()} placeholder="Add subcontext, course, assignment, or duty..." className="flex-1 border-b border-[var(--cos-border)] bg-transparent py-1 text-sm outline-none focus:border-[var(--cos-primary-border)]" />
            <button onClick={addSubcontext} className="text-[var(--cos-primary-text)]"><Plus className="h-4 w-4" /></button>
          </div>
        </div>
      </InfoBlock>

      <InfoBlock title="Deadlines" className="mt-4">
        <div className="space-y-2">
          {deadlines.map((deadline) => (
            <div key={deadline.id} className="group grid gap-2 rounded-lg border border-[var(--cos-border-soft)] bg-[var(--cos-bg-soft)] p-2 text-sm sm:grid-cols-[1fr_auto_auto_auto] sm:items-center">
              <span className="min-w-0 text-[var(--cos-text)]">{deadline.title}</span>
              {deadline.projectId !== project.id ? <span className="cos-pill cos-pill-muted max-w-32 truncate">{projectName(data.projects, deadline.projectId)}</span> : null}
              <input type="date" value={deadline.date} onChange={(event) => updateDeadline(deadline.id, { date: event.target.value })} className="cos-input px-2 py-1 text-xs" />
              <input aria-label={`${deadline.title} time`} type="time" value={deadline.time ?? ""} onChange={(event) => updateDeadline(deadline.id, { time: event.target.value || null })} className="cos-input px-2 py-1 text-xs" />
              <EditableField value={deadline.location} placeholder="Location" onSave={(location) => updateDeadline(deadline.id, { location })} inputClassName="px-2 py-1 text-xs" />
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <input value={newDeadline} onChange={(event) => setNewDeadline(event.target.value)} placeholder="Deadline title..." className="min-w-0 flex-1 border-b border-[var(--cos-border)] bg-transparent py-1 text-sm outline-none focus:border-[var(--cos-primary-border)]" />
            <input type="date" value={newDeadlineDate} onChange={(event) => setNewDeadlineDate(event.target.value)} className="cos-input px-2 py-1 text-xs" />
            <input aria-label="New deadline time" type="time" value={newDeadlineTime} onChange={(event) => setNewDeadlineTime(event.target.value)} className="cos-input px-2 py-1 text-xs" />
            <input aria-label="New deadline location" value={newDeadlineLocation} onChange={(event) => setNewDeadlineLocation(event.target.value)} placeholder="Location" className="cos-input px-2 py-1 text-xs" />
            <button onClick={() => { if (newDeadline.trim()) { addDeadline({ title: newDeadline.trim(), date: newDeadlineDate, time: newDeadlineTime || null, location: newDeadlineLocation.trim(), projectId: project.id }); setNewDeadline(""); setNewDeadlineTime(""); setNewDeadlineLocation(""); } }} className="text-[var(--cos-primary-text)]"><Plus className="h-4 w-4" /></button>
          </div>
        </div>
      </InfoBlock>

      <details className="cos-surface mt-4">
        <summary className="flex cursor-pointer items-center gap-2 p-4 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--cos-text-muted)]">
          <ChevronRight className="h-4 w-4" /> Active Tasks ({activeTaskCount})
        </summary>
        <div className="border-t border-[var(--cos-border-soft)] p-4">
          <TaskList rows={tasks.map((task) => ({ task, labels: [taskStatus[task.status].label, task.projectId !== project.id ? projectName(data.projects, task.projectId) : ""].filter(Boolean) }))} />
          <div className="mt-3 flex items-center gap-2">
            <input value={newTask} onChange={(event) => setNewTask(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && newTask.trim()) { addTask({ title: newTask.trim(), projectId: project.id, domainId: project.domainId }); setNewTask(""); } }} placeholder="Add task..." className="cos-input flex-1 px-3 py-2 text-sm" />
            <button onClick={() => { if (newTask.trim()) { addTask({ title: newTask.trim(), projectId: project.id, domainId: project.domainId }); setNewTask(""); } }} className="cos-btn cos-btn-primary px-3 py-2 text-sm">Add</button>
          </div>
        </div>
      </details>

      <InfoBlock title="Notes / Decisions" className="mt-4">
        <div className="space-y-2">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} domains={data.domains} editing={editingNote === note.id} onEdit={() => setEditingNote(note.id)} onDone={() => setEditingNote(null)} onUpdate={(updates) => updateNote(note.id, updates)} />
          ))}
          <div className="flex items-center gap-2 pt-2">
            <input value={newNote} onChange={(event) => setNewNote(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && newNote.trim()) { const id = addNote({ title: newNote.trim(), projectId: project.id, domainId: project.domainId }); setNewNote(""); setEditingNote(id); } }} placeholder="Add a note..." className="flex-1 border-b border-[var(--cos-border)] bg-transparent py-1 text-sm outline-none focus:border-[var(--cos-primary-border)]" />
            <button onClick={() => { if (newNote.trim()) { const id = addNote({ title: newNote.trim(), projectId: project.id, domainId: project.domainId }); setNewNote(""); setEditingNote(id); } }} className="text-[var(--cos-primary-text)]"><Plus className="h-4 w-4" /></button>
          </div>
        </div>
      </InfoBlock>

      {suggestions.length ? <div className="mt-4 rounded-lg border border-[var(--cos-primary-border)] bg-[var(--cos-primary-soft)] p-4"><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--cos-primary-text)]"><Sparkles className="h-4 w-4" /> Agent Suggestions</div><ul className="space-y-1 text-sm text-[var(--cos-primary-text)]">{suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}</ul></div> : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <button onClick={exportMarkdown} className="cos-btn cos-btn-ghost px-3 py-2 text-sm"><Download className="h-4 w-4" /> Export Markdown</button>
        <button aria-label={project.status === "archived" ? "Unarchive project" : "Archive project"} onClick={() => updateProject(project.id, { status: project.status === "archived" ? "active" : "archived", archivedAt: project.status === "archived" ? null : new Date().toISOString() })} className="cos-btn cos-btn-ghost px-3 py-2 text-sm"><Archive className="h-4 w-4" /> {project.status === "archived" ? "Unarchive" : "Archive"}</button>
        <button onClick={() => { updateProject(project.id, { trashedAt: new Date().toISOString() }); router.push("/projects"); }} className="cos-btn px-3 py-2 text-sm text-[var(--cos-danger-text)] hover:bg-[var(--cos-danger-soft)]"><Trash2 className="h-4 w-4" /> Delete</button>
      </div>
    </Page>
  );
}

function InfoBlock({ title, children, accent, className = "" }: { title: string; children: React.ReactNode; accent?: boolean; className?: string }) {
  return <section className={`${className} rounded-lg border ${accent ? "border-[var(--cos-primary-border)] bg-[var(--cos-primary-soft)]" : "border-[var(--cos-border)] bg-[var(--cos-bg-elevated)]"} p-4 shadow-[var(--cos-shadow-sm)]`}><h3 className={`mb-2 text-xs font-semibold uppercase tracking-[0.14em] ${accent ? "text-[var(--cos-primary-text)]" : "text-[var(--cos-text-muted)]"}`}>{title}</h3>{children}</section>;
}

function NoteCard({ note, domains = [], editing, onEdit, onDone, onUpdate }: { note: Note; domains?: Domain[]; editing: boolean; onEdit: () => void; onDone: () => void; onUpdate: (updates: Partial<Note>) => void }) {
  if (editing) {
    return (
      <div className="rounded-lg border border-[var(--cos-border-soft)] p-3">
        <EditableField value={note.title} placeholder="Note title" onSave={(title) => onUpdate({ title })} inputClassName="font-semibold" />
        <div className="mt-2">
          <MarkdownEditor
            value={note.content}
            placeholder="Type / for blocks..."
            minLines={5}
            dataTestId={`note-editor-${note.id}`}
            onSave={(content) => onUpdate({ content })}
          />
        </div>
        <button onClick={onDone} className="mt-3 text-xs font-semibold text-[var(--cos-primary-text)]">Done</button>
      </div>
    );
  }
  return (
    <button onClick={onEdit} className="w-full rounded-lg border border-[var(--cos-border-soft)] p-3 text-left hover:bg-[var(--cos-bg-soft)]">
      <h4 className="text-sm font-semibold text-[var(--cos-text-strong)]">{note.title}</h4>
      {note.content ? (
        isPianoScheduleNote(note, domains) ? <PianoSchedulePreview content={note.content} /> : <MarkdownPreview content={note.content} />
      ) : <p className="mt-1 text-xs text-[var(--cos-text-subtle)]">Empty note</p>}
    </button>
  );
}

function isPianoScheduleNote(note: Note, domains: Domain[]) {
  const domain = domains.find((item) => item.id === note.domainId);
  return note.title.toLowerCase().includes("piano schedule") || domain?.name === "Piano / Content";
}

function parseMarkdownTables(content: string) {
  const lines = content.split(/\r?\n/);
  const tables: { headers: string[]; rows: string[][] }[] = [];
  for (let index = 0; index < lines.length - 1; index += 1) {
    const line = lines[index] ?? "";
    const next = lines[index + 1] ?? "";
    if (!line.includes("|") || !/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(next)) continue;
    const headers = line.split("|").map((cell) => cell.trim()).filter(Boolean);
    const rows: string[][] = [];
    index += 2;
    while (index < lines.length && (lines[index] ?? "").includes("|")) {
      rows.push((lines[index] ?? "").split("|").map((cell) => cell.trim()).filter(Boolean));
      index += 1;
    }
    tables.push({ headers, rows });
  }
  return tables;
}

function MarkdownTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="my-3 overflow-x-auto rounded-lg border border-[var(--cos-border-soft)]">
      <table className="min-w-full border-collapse text-left text-xs">
        <thead className="bg-[var(--cos-bg-inset)] text-[var(--cos-text-muted)]">
          <tr>{headers.map((header) => <th key={header} className="border-b border-[var(--cos-border-soft)] px-3 py-2 font-semibold">{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-t border-[var(--cos-border-soft)]">
              {headers.map((header, cellIndex) => <td key={`${header}-${cellIndex}`} className="px-3 py-2 text-[var(--cos-text)]">{row[cellIndex] ?? ""}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PianoSchedulePreview({ content }: { content: string }) {
  const table = parseMarkdownTables(content)[0];
  if (!table) return <MarkdownPreview content={content} />;
  return (
    <div data-testid="piano-schedule-table" className="mt-2">
      <MarkdownTable headers={table.headers} rows={table.rows} />
    </div>
  );
}

function MarkdownPreview({ content }: { content: string }) {
  const table = parseMarkdownTables(content)[0];
  if (table) {
    return (
      <div className="mt-2 line-clamp-5 text-xs text-[var(--cos-text-muted)]">
        <MarkdownTable headers={table.headers} rows={table.rows.slice(0, 4)} />
      </div>
    );
  }
  return (
    <div className="prose-lite mt-2 line-clamp-5 text-xs text-[var(--cos-text-muted)]">
      {content.split("\n").map((line, index) => {
        const checkbox = line.match(/^- \[( |x|X)\]\s?(.*)$/);
        if (checkbox) return <p key={index}>{checkbox[1].toLowerCase() === "x" ? "[x]" : "[ ]"} {checkbox[2]}</p>;
        if (line.startsWith("## ")) return <h2 key={index}>{line.slice(3)}</h2>;
        if (line.startsWith("# ")) return <h1 key={index}>{line.slice(2)}</h1>;
        if (line.startsWith("- ")) return <p key={index}>- {line.slice(2)}</p>;
        if (line.startsWith("> ")) return <blockquote key={index}>{line.slice(2)}</blockquote>;
        if (line.startsWith("```")) return <code key={index}>{line}</code>;
        return <p key={index}>{line || "\u00a0"}</p>;
      })}
    </div>
  );
}

export function DeadlinesView() {
  const { data, addDeadline, updateDeadline } = useWorkspace();
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(localDateKey());
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [projectId, setProjectId] = useState("");
  const activeProjects = data.projects.filter((project) => !project.trashedAt && project.status !== "archived");
  const deadlines = data.deadlines.filter((deadline) => !deadline.trashedAt).sort((a, b) => a.date.localeCompare(b.date));

  function create() {
    if (!title.trim()) return;
    addDeadline({ title: title.trim(), date, time: time || null, location: location.trim(), projectId: projectId || null });
    setTitle("");
    setTime("");
    setLocation("");
    setProjectId("");
    setShowAdd(false);
  }

  return (
    <Page title="Deadlines" subtitle="Separate hard dates from task due dates." action={<button onClick={() => setShowAdd(true)} className="cos-btn cos-btn-primary px-4 py-2 text-sm"><Plus className="h-4 w-4" /> Add Deadline</button>}>
      {showAdd ? <div className="cos-surface mb-4 p-4"><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Deadline title..." className="cos-input w-full px-3 py-2 text-sm" /><div className="mt-3 flex flex-wrap gap-3"><input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="cos-input px-3 py-2 text-sm" /><input aria-label="Deadline time" type="time" value={time} onChange={(event) => setTime(event.target.value)} className="cos-input px-3 py-2 text-sm" /><input aria-label="Deadline location" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Location" className="cos-input min-w-0 flex-1 px-3 py-2 text-sm" /><select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="cos-input px-3 py-2 text-sm"><option value="">No project</option>{activeProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><button onClick={create} className="text-sm font-semibold text-[var(--cos-primary-text)]">Add</button></div></div> : null}
      <div className="space-y-2">
        {deadlines.map((deadline) => {
          const overdue = deadline.date < localDateKey();
          return (
            <div key={deadline.id} className={`rounded-lg border bg-[var(--cos-bg-elevated)] p-3 shadow-[var(--cos-shadow-sm)] ${overdue ? "border-[var(--cos-danger-border)]" : "border-[var(--cos-border)]"}`}>
              <div className="flex items-start gap-3">
                <Calendar className={`mt-2 h-4 w-4 ${overdue ? "text-[var(--cos-danger)]" : "text-[var(--cos-date)]"}`} />
                <div className="min-w-0 flex-1">
                  <EditableField value={deadline.title} placeholder="Deadline title" onSave={(title) => updateDeadline(deadline.id, { title })} inputClassName={`font-medium ${overdue ? "text-[var(--cos-danger-text)]" : "text-[var(--cos-text-strong)]"}`} />
                  <div className="flex flex-wrap gap-1.5 px-3 text-xs text-[var(--cos-text-subtle)]">
                    {deadline.time ? <span className="cos-pill cos-pill-primary"><CalendarClock className="h-3 w-3" />{deadline.time}</span> : null}
                    {deadline.location ? <span className="cos-pill cos-pill-muted"><MapPin className="h-3 w-3" />{deadline.location}</span> : null}
                    {projectName(data.projects, deadline.projectId) ? <span>{projectName(data.projects, deadline.projectId)}</span> : null}
                  </div>
                </div>
                <input type="date" value={deadline.date} onChange={(event) => updateDeadline(deadline.id, { date: event.target.value })} className="cos-input mt-2 px-2 py-1 text-xs" />
                <input aria-label={`${deadline.title} time`} type="time" value={deadline.time ?? ""} onChange={(event) => updateDeadline(deadline.id, { time: event.target.value || null })} className="cos-input mt-2 px-2 py-1 text-xs" />
                <div className="mt-2 max-w-36"><EditableField value={deadline.location} placeholder="Location" onSave={(location) => updateDeadline(deadline.id, { location })} inputClassName="px-2 py-1 text-xs" /></div>
                <select aria-label={`${deadline.title} project`} value={deadline.projectId ?? ""} onChange={(event) => updateDeadline(deadline.id, { projectId: event.target.value || null })} className="cos-input mt-2 max-w-40 px-2 py-1 text-xs">
                  <option value="">No project</option>
                  {activeProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
                <button onClick={() => updateDeadline(deadline.id, { trashedAt: new Date().toISOString() })} className="mt-2 text-[var(--cos-text-subtle)] hover:text-[var(--cos-danger)]"><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="mt-2 pl-7">
                <EditableField value={deadline.notes} multiline rows={2} placeholder="Deadline notes..." onSave={(notes) => updateDeadline(deadline.id, { notes })} />
              </div>
            </div>
          );
        })}
        {!deadlines.length ? <EmptyState icon={Calendar} title="No deadlines" /> : null}
      </div>
    </Page>
  );
}

export function ReviewsView() {
  const { data, addReview } = useWorkspace();
  const [type, setType] = useState<ReviewType | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const questions = type === "daily-startup" ? [["priorities", "What are today's top 1-3 priorities?"]] : type === "daily-shutdown" ? [["changed", "What changed today?"], ["open", "What is still open?"], ["resume", "What should be resumed tomorrow?"], ["triage", "Any inbox items to triage?"]] : [["outcomes", "What are this week's top outcomes?"], ["active", "Which projects are active?"], ["stale", "Which projects are stale?"], ["deadlines", "What deadlines are coming?"], ["drop", "What should be dropped, deferred, or blocked?"], ["plan", "What should be planned for this week?"]];
  const labels: Record<ReviewType, string> = { "daily-startup": "Daily Startup", "daily-shutdown": "Daily Shutdown", weekly: "Weekly Review" };

  if (type) {
    return <Page title={labels[type]} subtitle="Store review context for recovery."><div className="cos-surface space-y-5 p-4">{questions.map(([key, label]) => <label key={key} className="block"><span className="mb-2 block text-sm font-medium text-[var(--cos-text)]">{label}</span><textarea value={responses[key] || ""} onChange={(event) => setResponses((prev) => ({ ...prev, [key]: event.target.value }))} rows={3} className="cos-input w-full px-3 py-2 text-sm" /></label>)}</div><div className="mt-6 flex gap-3"><button onClick={() => { addReview(type, responses); setType(null); setResponses({}); }} className="cos-btn cos-btn-primary px-5 py-2 text-sm">Save Review</button><button onClick={() => setType(null)} className="cos-btn cos-btn-ghost px-3 py-2 text-sm">Cancel</button></div></Page>;
  }

  return (
    <Page title="Reviews" subtitle="Daily and weekly recovery notes.">
      <div className="grid gap-4 sm:grid-cols-3">{(["daily-startup", "daily-shutdown", "weekly"] as ReviewType[]).map((reviewType) => <button key={reviewType} onClick={() => { setType(reviewType); setResponses({}); }} className="cos-surface p-5 text-left hover:border-[var(--cos-review)]"><BookOpen className="mb-2 h-5 w-5 text-[var(--cos-review)]" /><h3 className="text-sm font-semibold text-[var(--cos-text-strong)]">{labels[reviewType]}</h3></button>)}</div>
      <section className="mt-8"><SectionTitle title="Past Reviews" count={data.reviews.length} /><div className="mt-3 space-y-2">{data.reviews.map((review) => <details key={review.id} className="cos-surface"><summary className="cursor-pointer p-3 text-sm font-medium text-[var(--cos-text)]">{labels[review.type]} <span className="ml-2 text-xs text-[var(--cos-text-subtle)]">{format(parseISO(review.date), "MMM d, yyyy h:mm a")}</span></summary><div className="space-y-3 px-3 pb-3">{Object.entries(review.responses).map(([key, value]) => <div key={key}><p className="text-xs font-medium capitalize text-[var(--cos-text-muted)]">{key}</p><p className="whitespace-pre-wrap text-sm text-[var(--cos-text)]">{value}</p></div>)}</div></details>)}</div></section>
    </Page>
  );
}

export function SearchView() {
  const router = useRouter();
  const { data } = useWorkspace();
  const [query, setQuery] = useState("");
  const q = query.toLowerCase();
  const results = useMemo(() => {
    if (!q.trim()) return [];
    const items: { id: string; type: string; title: string; subtitle?: string; onClick: () => void }[] = [];
    data.projects.filter((p) => !p.trashedAt && [p.name, p.currentObjective, p.nextAction, p.latestStatus].join(" ").toLowerCase().includes(q)).forEach((p) => items.push({ id: p.id, type: "Project", title: p.name, subtitle: domainName(data.domains, p.domainId), onClick: () => router.push(`/projects/${p.id}`) }));
    data.tasks.filter((t) => !t.trashedAt && t.title.toLowerCase().includes(q)).forEach((t) => items.push({ id: t.id, type: "Task", title: t.title, subtitle: projectName(data.projects, t.projectId), onClick: () => undefined }));
    data.notes.filter((n) => !n.trashedAt && `${n.title} ${n.content}`.toLowerCase().includes(q)).forEach((n) => items.push({ id: n.id, type: "Note", title: n.title, subtitle: n.content.slice(0, 80), onClick: () => n.projectId ? router.push(`/projects/${n.projectId}`) : undefined }));
    data.deadlines.filter((d) => !d.trashedAt && d.title.toLowerCase().includes(q)).forEach((d) => items.push({ id: d.id, type: "Deadline", title: d.title, subtitle: d.date, onClick: () => router.push("/deadlines") }));
    data.captures.filter((c) => c.status !== "deleted" && c.text.toLowerCase().includes(q)).forEach((c) => items.push({ id: c.id, type: "Capture", title: c.text, onClick: () => router.push("/inbox") }));
    data.reviews.filter((r) => JSON.stringify(r.responses).toLowerCase().includes(q)).forEach((r) => items.push({ id: r.id, type: "Review", title: r.type, subtitle: format(parseISO(r.date), "MMM d, yyyy"), onClick: () => router.push("/reviews") }));
    return items.slice(0, 60);
  }, [data, q, router]);

  return <Page title="Search" subtitle="Find projects, tasks, captures, notes, deadlines, and reviews."><div className="relative"><Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--cos-text-subtle)]" /><input value={query} onChange={(event) => setQuery(event.target.value)} autoFocus placeholder="Search workspace..." className="cos-input w-full py-3 pl-10 pr-4 text-sm" /></div><div className="mt-4 space-y-1">{results.map((result) => <button key={`${result.type}-${result.id}`} onClick={result.onClick} className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-[var(--cos-bg-elevated)]"><span className="cos-pill cos-pill-muted">{result.type}</span><div className="min-w-0 flex-1"><p className="truncate text-sm text-[var(--cos-text-strong)]">{result.title}</p>{result.subtitle ? <p className="truncate text-xs text-[var(--cos-text-subtle)]">{result.subtitle}</p> : null}</div></button>)}{query && !results.length ? <EmptyState icon={Search} title={`No results for "${query}"`} /> : null}</div></Page>;
}

export function ArchiveView() {
  const router = useRouter();
  const { data, updateProject, updateTask, updateNote, updateDeadline } = useWorkspace();
  const [tab, setTab] = useState<"archived" | "trash">("archived");
  const archived = data.projects.filter((project) => project.status === "archived" && !project.trashedAt);
  const trash = [
    ...data.projects.filter((item) => item.trashedAt).map((item) => ({ id: item.id, type: "Project", title: item.name, restore: () => updateProject(item.id, { trashedAt: null, status: "active" as any, archivedAt: null }) })),
    ...data.tasks.filter((item) => item.trashedAt).map((item) => ({ id: item.id, type: "Task", title: item.title, restore: () => updateTask(item.id, { trashedAt: null, archivedAt: null }) })),
    ...data.notes.filter((item) => item.trashedAt).map((item) => ({ id: item.id, type: "Note", title: item.title, restore: () => updateNote(item.id, { trashedAt: null, archivedAt: null }) })),
    ...data.deadlines.filter((item) => item.trashedAt).map((item) => ({ id: item.id, type: "Deadline", title: item.title, restore: () => updateDeadline(item.id, { trashedAt: null, archivedAt: null }) }))
  ];

  return <Page title="Archive" subtitle="Archived records and soft-deleted trash."><div className="mb-4 flex gap-1 rounded-lg bg-[var(--cos-bg-inset)] p-1"><button onClick={() => setTab("archived")} className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${tab === "archived" ? "bg-[var(--cos-bg-elevated)] text-[var(--cos-text-strong)] shadow-sm" : "text-[var(--cos-text-muted)]"}`}>Archived ({archived.length})</button><button onClick={() => setTab("trash")} className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${tab === "trash" ? "bg-[var(--cos-bg-elevated)] text-[var(--cos-text-strong)] shadow-sm" : "text-[var(--cos-text-muted)]"}`}>Trash ({trash.length})</button></div>{tab === "archived" ? <div className="space-y-2">{archived.map((project) => <div key={project.id} className="cos-surface flex items-center gap-3 p-4"><FolderKanban className="h-4 w-4 text-[var(--cos-text-subtle)]" /><div className="flex-1"><p className="text-sm font-medium text-[var(--cos-text)]">{project.name}</p><p className="text-xs text-[var(--cos-text-subtle)]">{domainName(data.domains, project.domainId)}</p></div><button onClick={() => router.push(`/projects/${project.id}`)} className="text-xs font-medium text-[var(--cos-primary-text)]">View</button><button aria-label={`Restore ${project.name}`} onClick={() => updateProject(project.id, { status: "active" as any, archivedAt: null })} className="text-xs font-medium text-[var(--cos-success-text)]">Restore</button></div>)}{!archived.length ? <EmptyState icon={Archive} title="No archived projects" /> : null}</div> : <div className="space-y-2">{trash.map((item) => <div key={`${item.type}-${item.id}`} className="cos-surface flex items-center gap-3 p-4"><FileText className="h-4 w-4 text-[var(--cos-text-subtle)]" /><div className="flex-1"><p className="text-sm text-[var(--cos-text)]">{item.title}</p><p className="text-xs text-[var(--cos-text-subtle)]">{item.type}</p></div><button onClick={item.restore} className="flex items-center gap-1 text-xs font-medium text-[var(--cos-success-text)]"><RotateCcw className="h-3 w-3" /> Restore</button></div>)}{!trash.length ? <EmptyState icon={Trash2} title="Trash is empty" /> : null}</div>}</Page>;
}

export function SettingsView() {
  const { data, sync, syncNow, forceRefreshFromServer, addDomain, updateDomain, resetDemoData } = useWorkspace();
  const [newDomain, setNewDomain] = useState("");

  return (
    <Page title="Settings" subtitle="Domains, sync state, and demo reset.">
      <section className="cos-surface p-4">
        <SectionTitle title="Sync" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <SyncMetric label="Status" value={sync.syncing ? "Syncing" : sync.online ? "Online" : "Offline"} testId="sync-status" />
          <SyncMetric label="Pending" value={String(sync.pendingCount)} />
          <SyncMetric label="Last synced" value={formatSyncTimestamp(sync.lastSyncedAt)} />
          <SyncMetric label="Last refresh" value={formatSyncTimestamp(sync.lastRefreshAt)} />
          <SyncMetric label="Stale warnings" value={String(sync.staleMutationCount)} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => void syncNow()} disabled={!sync.online || sync.syncing} className="cos-btn cos-btn-primary px-4 py-2 text-sm disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${sync.syncing ? "animate-spin" : ""}`} />
            {sync.syncing ? "Syncing..." : "Sync now"}
          </button>
          <button onClick={() => void forceRefreshFromServer()} disabled={!sync.online || sync.refreshing || sync.syncing} className="cos-btn cos-btn-secondary px-4 py-2 text-sm disabled:opacity-50">
            <Download className="h-4 w-4" />
            {sync.refreshing ? "Refreshing..." : "Refresh from server"}
          </button>
        </div>
        {!sync.online ? <p className="mt-3 rounded-lg border border-[var(--cos-warning-border)] bg-[var(--cos-warning-soft)] px-3 py-2 text-sm text-[var(--cos-warning-text)]">Offline. Edits are saved locally and will sync when the connection returns.</p> : null}
        {sync.error ? (
          <p data-testid="sync-error" className="mt-3 flex items-start gap-2 rounded-lg border border-[var(--cos-danger-border)] bg-[var(--cos-danger-soft)] px-3 py-2 text-sm text-[var(--cos-danger-text)]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{sync.error}{sync.lastErrorAt ? ` Last error: ${formatSyncTimestamp(sync.lastErrorAt)}.` : ""}</span>
          </p>
        ) : null}
        {sync.lastWarning ? (
          <p data-testid="sync-warning" className="mt-3 flex items-start gap-2 rounded-lg border border-[var(--cos-warning-border)] bg-[var(--cos-warning-soft)] px-3 py-2 text-sm text-[var(--cos-warning-text)]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{sync.lastWarning}{sync.lastWarningAt ? ` Last warning: ${formatSyncTimestamp(sync.lastWarningAt)}.` : ""}</span>
          </p>
        ) : null}
      </section>

      <section className="cos-surface mt-6 p-4">
        <SectionTitle title="Domains" />
        <div className="mt-3 divide-y divide-[var(--cos-border-soft)] rounded-lg border border-[var(--cos-border-soft)]">
          {data.domains.map((domain) => (
            <div key={domain.id} className="flex items-center gap-3 px-4 py-3">
              <EditableField value={domain.name} placeholder="Domain name" onSave={(name) => updateDomain(domain.id, { name })} className="flex-1" inputClassName="py-1 text-[var(--cos-text)]" />
              <button onClick={() => updateDomain(domain.id, { archived: !domain.archived })} className="text-xs font-medium text-[var(--cos-text-muted)] hover:text-[var(--cos-primary-text)]">{domain.archived ? "Restore" : "Archive"}</button>
            </div>
          ))}
          <div className="flex items-center gap-2 px-4 py-3">
            <input value={newDomain} onChange={(event) => setNewDomain(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && newDomain.trim()) { addDomain(newDomain.trim()); setNewDomain(""); } }} placeholder="Add domain..." className="flex-1 bg-transparent text-sm outline-none" />
            <button onClick={() => { if (newDomain.trim()) { addDomain(newDomain.trim()); setNewDomain(""); } }} className="text-[var(--cos-primary-text)]"><Plus className="h-4 w-4" /></button>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-[var(--cos-warning-border)] bg-[var(--cos-warning-soft)] p-4">
        <h2 className="text-sm font-semibold text-[var(--cos-warning-text)]">Demo data</h2>
        <p className="mt-1 text-sm text-[var(--cos-warning-text)]">Reset this account to the seeded demo workspace. Pending offline changes are cleared.</p>
        <button onClick={() => void resetDemoData()} className="cos-btn mt-3 bg-[var(--cos-warning)] px-4 py-2 text-sm text-white hover:opacity-90">Reset demo data</button>
      </section>
    </Page>
  );
}

function formatSyncTimestamp(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Never";
}

function SyncMetric({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="rounded-lg bg-[var(--cos-bg-soft)] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--cos-text-subtle)]">{label}</p>
      <p data-testid={testId ?? (label === "Pending" ? "pending-count" : undefined)} className="mt-1 text-sm font-semibold text-[var(--cos-text)]">{value}</p>
    </div>
  );
}
