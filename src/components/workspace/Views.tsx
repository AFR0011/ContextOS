"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  Boxes,
  BookOpen,
  Calendar,
  CalendarCheck,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  FileText,
  FolderKanban,
  Layers,
  Inbox,
  MoreHorizontal,
  Plus,
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
import { useWorkspace } from "@/lib/client-store";
import { isDateKeyInLocalWeek, localDateKey, localWeekStartKey } from "@/lib/dates";
import type { Capture, Deadline, Domain, Note, Priority, Project, ReviewType, Task, TaskStatus } from "@/lib/types";

const taskStatus: Record<TaskStatus, { label: string; color: string }> = {
  todo: { label: "Todo", color: "bg-slate-100 text-slate-700" },
  "in-progress": { label: "In Progress", color: "bg-blue-100 text-blue-700" },
  blocked: { label: "Blocked", color: "bg-red-100 text-red-700" },
  waiting: { label: "Waiting", color: "bg-purple-100 text-purple-700" },
  done: { label: "Done", color: "bg-emerald-100 text-emerald-700" },
  dropped: { label: "Dropped", color: "bg-slate-100 text-slate-500" }
};

const projectStatus = {
  active: { label: "Active", color: "bg-emerald-100 text-emerald-700" },
  paused: { label: "Paused", color: "bg-amber-100 text-amber-700" },
  done: { label: "Done", color: "bg-blue-100 text-blue-700" },
  archived: { label: "Archived", color: "bg-slate-100 text-slate-500" }
};

const domainColors = [
  "bg-blue-100 text-blue-800",
  "bg-emerald-100 text-emerald-800",
  "bg-purple-100 text-purple-800",
  "bg-amber-100 text-amber-800",
  "bg-rose-100 text-rose-800",
  "bg-cyan-100 text-cyan-800",
  "bg-orange-100 text-orange-800",
  "bg-slate-100 text-slate-800"
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

function Page({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function SectionTitle({ icon: Icon, title, count, tone = "slate" }: { icon?: any; title: string; count?: number; tone?: "slate" | "red" | "amber" | "indigo" | "emerald" }) {
  const color = { slate: "text-slate-500", red: "text-red-500", amber: "text-amber-500", indigo: "text-indigo-500", emerald: "text-emerald-500" }[tone];
  return (
    <div className="flex items-center gap-2">
      {Icon ? <Icon className={`h-4 w-4 ${color}`} /> : null}
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</h2>
      {count !== undefined ? <span className="text-xs text-slate-400">({count})</span> : null}
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: any; title: string; description?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-white py-8 text-center">
      <Icon className="mx-auto mb-3 h-10 w-10 text-slate-300" />
      <p className="text-sm font-medium text-slate-500">{title}</p>
      {description ? <p className="mt-1 text-xs text-slate-400">{description}</p> : null}
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
    <div className={`flex items-center gap-2 rounded-xl border bg-white px-4 py-3 shadow-sm transition-all ${flash ? "border-emerald-300 ring-2 ring-emerald-100" : "border-slate-200 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100"}`}>
      <Zap className={`h-5 w-5 shrink-0 ${flash ? "text-emerald-500" : "text-indigo-500"}`} />
      <input
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") submit();
          if (event.key === "Escape") setText("");
        }}
        placeholder="Quick capture... try /task, /note, /project, /deadline, /status"
        className="min-w-0 flex-1 bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
      />
      <button onClick={submit} disabled={!text.trim()} className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50 disabled:text-slate-300">
        <Send className="h-4 w-4" />
      </button>
    </div>
  );
}

function TaskRow({ task, labels = [] }: { task: Task; labels?: string[] }) {
  const { updateTask } = useWorkspace();
  const done = task.status === "done";
  return (
    <div className="group flex items-start gap-3 px-3 py-2.5 hover:bg-slate-50">
      <button
        onClick={() => updateTask(task.id, { status: done ? "todo" : "done" })}
        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border-2 ${done ? "border-emerald-500 bg-emerald-500" : "border-slate-300 hover:border-indigo-400"}`}
      >
        {done ? <Check className="h-3 w-3 text-white" /> : null}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${done ? "text-slate-400 line-through" : "text-slate-900"}`}>{task.title}</p>
        {labels.length ? (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {labels.map((label) => (
              <span key={label} className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${label === "Overdue" ? "bg-red-50 text-red-600" : label.includes("Due") ? "bg-amber-50 text-amber-700" : label.includes("Progress") ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-600"}`}>
                {label}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <select
        value={task.status}
        onChange={(event) => updateTask(task.id, { status: event.target.value as TaskStatus })}
        className={`rounded-full border-0 px-2 py-0.5 text-[11px] font-medium opacity-0 transition-opacity group-hover:opacity-100 ${taskStatus[task.status].color}`}
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
          <button onClick={() => updatePriority(priority.id, { done: !priority.done })} className={`grid h-5 w-5 place-items-center rounded border-2 ${priority.done ? "border-amber-500 bg-amber-500" : "border-amber-300 hover:border-amber-400"}`}>
            {priority.done ? <Check className="h-3 w-3 text-white" /> : null}
          </button>
          <span className={`flex-1 text-sm ${priority.done ? "text-slate-400 line-through" : "font-medium text-slate-900"}`}>{priority.text}</span>
          <button onClick={() => removePriority(priority.id)} className="opacity-0 text-slate-400 transition-opacity hover:text-red-500 group-hover:opacity-100">
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
          className="min-w-0 flex-1 border-b border-slate-200 bg-transparent py-1 text-sm outline-none placeholder:text-slate-400 focus:border-amber-300 disabled:opacity-50"
        />
        <button onClick={submit} disabled={atLimit} className="rounded p-1 text-amber-600 hover:bg-amber-50 disabled:opacity-40">
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function TaskList({ rows }: { rows: { task: Task; labels: string[] }[] }) {
  if (!rows.length) return <EmptyState icon={Clock} title="No tasks here" />;
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
      {rows.map((row) => (
        <TaskRow key={row.task.id} task={row.task} labels={row.labels} />
      ))}
    </div>
  );
}

export function DashboardView() {
  const router = useRouter();
  const { data, loading, addNote, updateNote } = useWorkspace();
  const today = localDateKey();
  const tasks = activeTasks(data.tasks);
  const overdue = tasks.filter(isOverdue);
  const overdueIds = new Set(overdue.map((task) => task.id));
  const todayRows = tasks
    .filter((task) => !overdueIds.has(task.id) && (task.dueDate === today || task.plannedDate === today || task.status === "in-progress"))
    .map((task) => ({
      task,
      labels: [task.dueDate === today ? "Due Today" : "", task.plannedDate === today ? "Planned" : "", task.status === "in-progress" ? "In Progress" : "", domainName(data.domains, task.domainId)].filter(Boolean)
    }));
  const inbox = data.captures.filter((capture) => capture.status === "unprocessed").slice(0, 5);
  const recentProjects = data.projects.filter((project) => !project.trashedAt && project.status === "active").slice(0, 6);
  const weekDeadlines = data.deadlines.filter((deadline) => !deadline.trashedAt && isThisWeek(deadline.date));
  const dashboardCanvas = data.notes.find((note) => !note.trashedAt && !note.projectId && note.title === DASHBOARD_CANVAS_TITLE);
  const notesDomainId = data.domains.find((domain) => domain.name === "Notes")?.id || data.domains.find((domain) => !domain.archived)?.id || "";

  return (
    <Page title="Dashboard" subtitle={loading ? "Loading cached workspace..." : "Capture first. Choose today's work. Recover context fast."}>
      <QuickCapture />

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <DashboardCanvas
          loading={loading}
          note={dashboardCanvas}
          canCreate={Boolean(notesDomainId)}
          onSave={(content) => {
            if (dashboardCanvas) {
              updateNote(dashboardCanvas.id, { content });
              return;
            }
            if (content.trim() && notesDomainId) addNote({ title: DASHBOARD_CANVAS_TITLE, content, projectId: null, domainId: notesDomainId });
          }}
        />

        <section>
          <SectionTitle icon={Star} title="Today's Priorities" tone="amber" />
          <div className="mt-3">
            <PriorityEditor scope="daily" dateKeyValue={today} limit={3} />
          </div>
        </section>
      </div>

      <section className="mt-6">
        <SectionTitle icon={Clock} title="Today" tone="indigo" count={todayRows.length} />
        <div className="mt-2">
          <TaskList rows={todayRows} />
        </div>
      </section>

      {overdue.length ? (
        <section className="mt-6">
          <SectionTitle icon={AlertTriangle} title="Overdue" tone="red" count={overdue.length} />
          <div className="mt-2">
            <TaskList rows={overdue.map((task) => ({ task, labels: ["Overdue", domainName(data.domains, task.domainId)].filter(Boolean) }))} />
          </div>
        </section>
      ) : null}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <section>
          <div className="flex items-center justify-between">
            <SectionTitle icon={Inbox} title="Inbox" count={data.captures.filter((capture) => capture.status === "unprocessed").length} />
            <button onClick={() => router.push("/inbox")} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">View all</button>
          </div>
          <div className="mt-2 space-y-1">
            {inbox.map((capture) => (
              <div key={capture.id} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-white">
                <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{capture.text}</span>
                {capture.type ? <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600">{capture.type}</span> : null}
              </div>
            ))}
            {!inbox.length ? <p className="py-2 text-sm italic text-slate-400">Inbox is clear.</p> : null}
          </div>
        </section>

        <section>
          <SectionTitle icon={FolderKanban} title="Recent Contexts" />
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {recentProjects.map((project) => (
              <button key={project.id} onClick={() => router.push(`/projects/${project.id}`)} className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-indigo-200 hover:shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="truncate text-sm font-semibold text-slate-950">{project.name}</h3>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${projectStatus[project.status].color}`}>{projectStatus[project.status].label}</span>
                </div>
                <span className={`mt-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${domainColor(data.domains, project.domainId)}`}>{domainName(data.domains, project.domainId)}</span>
                {project.nextAction ? <p className="mt-2 truncate text-xs text-indigo-600">Next: {project.nextAction}</p> : null}
                {project.latestStatus ? <p className="mt-1 truncate text-[11px] text-slate-400">{project.latestStatus}</p> : null}
              </button>
            ))}
          </div>
        </section>
      </div>

      <details className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-slate-500">This Week and Agent Suggestions</summary>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Deadlines this week</h3>
            <div className="mt-2 space-y-2">
              {weekDeadlines.map((deadline) => (
                <div key={deadline.id} className="text-sm text-slate-700">{deadline.title} <span className="text-xs text-slate-400">- {deadline.date}</span></div>
              ))}
              {!weekDeadlines.length ? <p className="text-sm text-slate-400">No deadlines this week.</p> : null}
            </div>
          </div>
          <div className="rounded-lg bg-indigo-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-indigo-700"><Sparkles className="h-4 w-4" /> Suggestions</div>
            <ul className="space-y-1 text-sm text-indigo-800">
              {overdue.length ? <li>{overdue.length} overdue task(s) need reschedule, completion, or dropping.</li> : null}
              {data.captures.filter((capture) => capture.status === "unprocessed").length > 5 ? <li>Your inbox is getting dense. Run a quick triage.</li> : null}
              {recentProjects.filter((project) => !project.nextAction).length ? <li>Some active projects need a next action.</li> : null}
              {!overdue.length ? <li>Use today priorities to keep the surface small.</li> : null}
            </ul>
          </div>
        </div>
      </details>
    </Page>
  );
}

function DashboardCanvas({ note, canCreate, loading, onSave }: { note?: Note; canCreate: boolean; loading: boolean; onSave: (content: string) => void }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <SectionTitle icon={FileText} title="Dashboard Canvas" tone="indigo" />
      {loading ? (
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-6 text-sm text-slate-400">Loading dashboard canvas...</p>
      ) : (
        <>
          <div className="mt-3">
            <EditableField
              value={note?.content ?? ""}
              placeholder={canCreate ? "Loose dashboard notes, dates, goals, or checklists..." : "Create a domain before saving dashboard notes."}
              multiline
              rows={7}
              onSave={onSave}
            />
          </div>
          <p className="mt-2 text-xs text-slate-400">Markdown/checklists stay local to the canvas unless you turn them into tasks.</p>
        </>
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
      <div className="mt-4 flex gap-1 rounded-lg bg-slate-100 p-1">
        {(["unprocessed", "all", "converted", "archived"] as const).map((tab) => (
          <button key={tab} onClick={() => setFilter(tab)} className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium capitalize ${filter === tab ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>{tab}</button>
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
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="whitespace-pre-wrap text-sm text-slate-900">{capture.text}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {capture.type ? <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[11px] font-medium text-indigo-600">{capture.type}</span> : null}
            <span className="text-[11px] text-slate-400">{formatDistanceToNow(parseISO(capture.createdAt), { addSuffix: true })}</span>
            {capture.status !== "unprocessed" ? <span className="text-[11px] font-medium text-emerald-600">{capture.status}</span> : null}
          </div>
        </div>
        {capture.status === "unprocessed" ? <button aria-label="Capture actions" onClick={() => setOpen(!open)} className="rounded p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600"><MoreHorizontal className="h-5 w-5" /></button> : null}
      </div>
      {open && capture.status === "unprocessed" ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          {(["task", "project", "note", "deadline"] as const).map((target) => (
            <button key={target} onClick={() => onConvert(capture.id, target)} className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium capitalize text-indigo-700 hover:bg-indigo-100">Convert to {target}</button>
          ))}
          <div className="flex-1" />
          <button onClick={onArchive} className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100">Archive</button>
          <button onClick={onDelete} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100">Delete</button>
        </div>
      ) : null}
    </div>
  );
}

export function TodayView() {
  const { data } = useWorkspace();
  const today = localDateKey();
  const tasks = activeTasks(data.tasks);
  const seen = new Set<string>();
  const rows: { task: Task; labels: string[] }[] = [];
  const add = (task: Task, labels: string[]) => {
    if (!seen.has(task.id)) {
      seen.add(task.id);
      rows.push({ task, labels: [...labels, domainName(data.domains, task.domainId)].filter(Boolean) });
    }
  };
  tasks.filter(isOverdue).forEach((task) => add(task, ["Overdue"]));
  tasks.filter((task) => task.dueDate === today && !isOverdue(task)).forEach((task) => add(task, ["Due Today"]));
  tasks.filter((task) => task.plannedDate === today && !isOverdue(task)).forEach((task) => add(task, ["Planned Today"]));
  tasks.filter((task) => task.status === "in-progress").forEach((task) => add(task, ["In Progress"]));
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
            {deadlines.map((deadline) => <div key={deadline.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">{deadline.title}</div>)}
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
          <div className="mt-2 space-y-2">{weekDeadlines.map((deadline) => <div key={deadline.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{deadline.title} <span className="text-xs">{deadline.date}</span></div>)}</div>
        </section>
        <section>
          <SectionTitle icon={FolderKanban} title="Active Projects" tone="emerald" count={activeProjects.length} />
          <div className="mt-2 grid gap-3 sm:grid-cols-2">{activeProjects.slice(0, 6).map((project) => <button key={project.id} onClick={() => router.push(`/projects/${project.id}`)} className="rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-indigo-200"><p className="truncate text-sm font-semibold text-slate-900">{project.name}</p>{project.nextAction ? <p className="mt-1 truncate text-xs text-indigo-600">{project.nextAction}</p> : null}</button>)}</div>
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

  return (
    <Page title="Projects" subtitle="Track outcomes, next actions, and recovery context." action={<button onClick={() => setShowNew(true)} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"><Plus className="h-4 w-4" /> New Project</button>}>
      {showNew ? (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
          <input value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && create()} autoFocus placeholder="Project name..." className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-300" />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <select value={domainId} onChange={(event) => setDomainId(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
              {activeDomains.map((domain) => <option key={domain.id} value={domain.id}>{domain.name}</option>)}
            </select>
            <button onClick={create} className="text-sm font-semibold text-indigo-600">Create</button>
            <button onClick={() => setShowNew(false)} className="text-sm text-slate-500">Cancel</button>
          </div>
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => {
          const descendantIds = descendantProjectIds(data.projects, project.id);
          const projectIds = new Set([project.id, ...descendantIds]);
          const count = activeTasks(data.tasks).filter((task) => task.projectId && projectIds.has(task.projectId)).length;
          const deadlineCount = data.deadlines.filter((deadline) => !deadline.trashedAt && deadline.projectId && projectIds.has(deadline.projectId)).length;
          const children = childProjects(data.projects, project.id);
          return (
            <button key={project.id} onClick={() => router.push(`/projects/${project.id}`)} className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-indigo-200 hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-950">{project.name}</h3>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${projectStatus[project.status].color}`}>{projectStatus[project.status].label}</span>
              </div>
              <span className={`mt-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${domainColor(data.domains, project.domainId)}`}>{domainName(data.domains, project.domainId)}</span>
              {project.currentObjective ? <p className="mt-2 line-clamp-2 text-xs text-slate-600">{project.currentObjective}</p> : null}
              {project.nextAction ? <p className="mt-2 truncate text-xs font-medium text-indigo-600">Next: {project.nextAction}</p> : null}
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-400">
                {children.length ? <span>{children.length} subcontext{children.length > 1 ? "s" : ""}</span> : null}
                {count ? <span>{count} open task{count > 1 ? "s" : ""}</span> : null}
                {deadlineCount ? <span>{deadlineCount} deadline{deadlineCount > 1 ? "s" : ""}</span> : null}
              </div>
              {children.length ? (
                <div className="mt-3 space-y-1 border-t border-slate-100 pt-3">
                  {children.slice(0, 3).map((child) => (
                    <div key={child.id} className="flex items-center gap-2 text-xs text-slate-600">
                      <Layers className="h-3.5 w-3.5 text-slate-300" />
                      <span className="min-w-0 flex-1 truncate">{child.name}</span>
                      {child.nextAction ? <span className="max-w-24 truncate text-indigo-500">{child.nextAction}</span> : null}
                    </div>
                  ))}
                  {children.length > 3 ? <p className="pl-5 text-[11px] text-slate-400">+{children.length - 3} more</p> : null}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
      {!projects.length ? <EmptyState icon={FolderKanban} title="No projects yet" description="Create an outcome or subcontext to start." /> : null}
    </Page>
  );
}

export function AreasView() {
  const router = useRouter();
  const { data, loading } = useWorkspace();
  const activeDomains = data.domains.filter((domain) => !domain.archived);

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
          return (
            <section key={domain.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${domainColor(data.domains, domain.id)}`}>Area</span>
                  <h2 className="mt-2 text-base font-semibold text-slate-950">{domain.name}</h2>
                </div>
                <Boxes className="h-5 w-5 text-slate-300" />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-slate-50 p-2"><p className="text-sm font-semibold text-slate-900">{domainProjects.length}</p><p className="text-[10px] uppercase tracking-wider text-slate-400">Projects</p></div>
                <div className="rounded-lg bg-slate-50 p-2"><p className="text-sm font-semibold text-slate-900">{openTaskCount}</p><p className="text-[10px] uppercase tracking-wider text-slate-400">Tasks</p></div>
                <div className="rounded-lg bg-slate-50 p-2"><p className="text-sm font-semibold text-slate-900">{resourceCount}</p><p className="text-[10px] uppercase tracking-wider text-slate-400">Resources</p></div>
              </div>
              <div className="mt-4 space-y-2">
                {roots.slice(0, 3).map((project) => (
                  <button key={project.id} onClick={() => router.push(`/projects/${project.id}`)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-slate-50">
                    <FolderKanban className="h-3.5 w-3.5 text-slate-300" />
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700">{project.name}</span>
                    {childProjects(data.projects, project.id).length ? <span className="text-[10px] text-slate-400">{childProjects(data.projects, project.id).length} sub</span> : null}
                  </button>
                ))}
                {!roots.length ? <p className="text-xs italic text-slate-400">No active projects in this area.</p> : null}
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-400">
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
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
        <SectionTitle icon={FileText} title="New Resource" tone="indigo" />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input value={newTitle} disabled={loading || !activeDomains.length} onChange={(event) => setNewTitle(event.target.value)} onKeyDown={(event) => event.key === "Enter" && createResource()} placeholder={loading ? "Loading resources..." : "Resource title..."} className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-300 disabled:bg-slate-50 disabled:text-slate-400" />
          <select value={newDomainId} disabled={loading || !activeDomains.length} onChange={(event) => setNewDomainId(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-400">
            {activeDomains.map((domain) => <option key={domain.id} value={domain.id}>{domain.name}</option>)}
          </select>
          <button onClick={createResource} disabled={loading || !activeDomains.length || !newTitle.trim()} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40">Add</button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => setDomainId("")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${selectedDomain === "all" ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>All</button>
        {activeDomains.map((domain) => (
          <button key={domain.id} onClick={() => setDomainId(domain.id)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${selectedDomain === domain.id ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>{domain.name}</button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {resources.map((note) => (
          <div key={note.id} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${domainColor(data.domains, note.domainId)}`}>{domainName(data.domains, note.domainId)}</span>
              {note.title === DASHBOARD_CANVAS_TITLE ? <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600">Dashboard</span> : null}
            </div>
            <NoteCard note={note} editing={editingNote === note.id} onEdit={() => setEditingNote(note.id)} onDone={() => setEditingNote(null)} onUpdate={(updates) => updateNote(note.id, updates)} />
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

  const baseClass = `w-full rounded-lg border border-transparent bg-transparent px-3 py-2 text-sm outline-none placeholder:text-slate-400 hover:bg-slate-50 focus:border-indigo-200 focus:bg-white focus:ring-2 focus:ring-indigo-100 ${inputClassName}`;

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
          <span className={dirty ? "text-amber-600" : "text-emerald-600"}>{dirty ? "Unsaved changes" : "Saved"}</span>
          {dirty && !sync.online ? <span data-testid="offline-edit-warning" className="rounded bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700">Offline: save will queue</span> : null}
          {dirty ? (
            <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={commit} className="rounded px-2 py-0.5 font-semibold text-indigo-600 hover:bg-indigo-50">
              Save
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ProjectDetailView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { data, updateProject, addProject, addTask, addDeadline, updateDeadline, addNote, updateNote } = useWorkspace();
  const project = data.projects.find((item) => item.id === projectId);
  const [newSubcontext, setNewSubcontext] = useState("");
  const [newLoop, setNewLoop] = useState("");
  const [newTask, setNewTask] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [newDeadlineDate, setNewDeadlineDate] = useState(localDateKey());
  const [newNote, setNewNote] = useState("");
  const [editingNote, setEditingNote] = useState<string | null>(null);

  if (!project) {
    return <Page title="Project not found"><button onClick={() => router.push("/projects")} className="text-sm font-semibold text-indigo-600">Back to projects</button></Page>;
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

  function addLoop() {
    if (!newLoop.trim()) return;
    updateProject(currentProject.id, { openLoops: [...currentProject.openLoops, newLoop.trim()] });
    setNewLoop("");
  }

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
    <Page title={project.name} subtitle="Recovery-first project detail." action={<button onClick={() => router.push("/projects")} className="text-sm font-semibold text-indigo-600">Back</button>}>
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <EditableField value={project.name} placeholder="Project name" onSave={(value) => updateProject(project.id, { name: value })} inputClassName="text-base font-semibold" />
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <select value={project.status} onChange={(event) => updateProject(project.id, { status: event.target.value as any, archivedAt: event.target.value === "archived" ? new Date().toISOString() : null })} className={`rounded-full border-0 px-3 py-1 text-xs font-medium ${projectStatus[project.status].color}`}>
            {Object.entries(projectStatus).map(([value, config]) => <option key={value} value={value}>{config.label}</option>)}
          </select>
          <select value={project.domainId} onChange={(event) => updateProject(project.id, { domainId: event.target.value })} className={`rounded border-0 px-2 py-1 text-[11px] font-medium ${domainColor(data.domains, project.domainId)}`}>
            {activeDomains.map((domain) => <option key={domain.id} value={domain.id}>{domain.name}</option>)}
          </select>
          {project.parentProjectId ? <span className="rounded bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500">Parent: {projectName(data.projects, project.parentProjectId)}</span> : null}
          <span className="text-[11px] text-slate-400">Updated {formatDistanceToNow(parseISO(project.updatedAt), { addSuffix: true })}</span>
        </div>
      </div>

      <div className="mt-4 grid gap-4">
        <InfoBlock title="Current Objective"><EditableField value={project.currentObjective} placeholder="What is this project trying to achieve?" multiline onSave={(value) => updateProject(project.id, { currentObjective: value })} /></InfoBlock>
        <InfoBlock title="Next Action" accent><EditableField value={project.nextAction} placeholder="What is the next concrete action?" onSave={(value) => updateProject(project.id, { nextAction: value })} /></InfoBlock>
        <InfoBlock title="Latest Status"><EditableField value={project.latestStatus} placeholder="Where did you leave off?" multiline onSave={(value) => updateProject(project.id, { latestStatus: value })} /></InfoBlock>
      </div>

      <InfoBlock title="Subcontexts" className="mt-4">
        <div className="space-y-2">
          {subcontexts.map((child) => {
            const childDescendants = descendantProjectIds(data.projects, child.id);
            const childIds = new Set([child.id, ...childDescendants]);
            const childTaskCount = activeTasks(data.tasks).filter((task) => task.projectId && childIds.has(task.projectId)).length;
            const childDeadlineCount = data.deadlines.filter((deadline) => !deadline.trashedAt && deadline.projectId && childIds.has(deadline.projectId)).length;
            return (
              <button key={child.id} onClick={() => router.push(`/projects/${child.id}`)} className="flex w-full items-start gap-3 rounded-lg border border-slate-100 p-3 text-left hover:bg-slate-50">
                <Layers className="mt-0.5 h-4 w-4 text-indigo-400" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-slate-900">{child.name}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${projectStatus[child.status].color}`}>{projectStatus[child.status].label}</span>
                  </div>
                  {child.nextAction ? <p className="mt-1 truncate text-xs font-medium text-indigo-600">Next: {child.nextAction}</p> : null}
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-400">
                    {childTaskCount ? <span>{childTaskCount} open task{childTaskCount > 1 ? "s" : ""}</span> : null}
                    {childDeadlineCount ? <span>{childDeadlineCount} deadline{childDeadlineCount > 1 ? "s" : ""}</span> : null}
                    {childDescendants.size ? <span>{childDescendants.size} nested</span> : null}
                  </div>
                </div>
              </button>
            );
          })}
          {!subcontexts.length ? <p className="text-sm italic text-slate-400">No subcontexts yet.</p> : null}
          <div className="flex items-center gap-2 pt-2">
            <input value={newSubcontext} onChange={(event) => setNewSubcontext(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addSubcontext()} placeholder="Add subcontext, course, assignment, or duty..." className="flex-1 border-b border-slate-200 bg-transparent py-1 text-sm outline-none focus:border-indigo-300" />
            <button onClick={addSubcontext} className="text-indigo-600"><Plus className="h-4 w-4" /></button>
          </div>
        </div>
      </InfoBlock>

      <InfoBlock title="Open Loops / Blockers" className="mt-4">
        <div className="space-y-1">
          {project.openLoops.map((loop, index) => (
            <div key={`${loop}-${index}`} className="group flex items-center gap-2 py-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span className="flex-1 text-sm text-slate-700">{loop}</span>
              <button onClick={() => updateProject(project.id, { openLoops: project.openLoops.filter((_, i) => i !== index) })} className="opacity-0 text-slate-400 hover:text-red-500 group-hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-2">
            <input value={newLoop} onChange={(event) => setNewLoop(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addLoop()} placeholder="Add open loop or blocker..." className="flex-1 border-b border-slate-200 bg-transparent py-1 text-sm outline-none focus:border-indigo-300" />
            <button onClick={addLoop} className="text-indigo-600"><Plus className="h-4 w-4" /></button>
          </div>
        </div>
      </InfoBlock>

      <InfoBlock title="Deadlines" className="mt-4">
        <div className="space-y-2">
          {deadlines.map((deadline) => (
            <div key={deadline.id} className="group flex items-center gap-2 text-sm">
              <span className="flex-1 text-slate-700">{deadline.title}</span>
              {deadline.projectId !== project.id ? <span className="max-w-32 truncate rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">{projectName(data.projects, deadline.projectId)}</span> : null}
              <input type="date" value={deadline.date} onChange={(event) => updateDeadline(deadline.id, { date: event.target.value })} className="rounded border border-slate-200 px-2 py-1 text-xs" />
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <input value={newDeadline} onChange={(event) => setNewDeadline(event.target.value)} placeholder="Deadline title..." className="min-w-0 flex-1 border-b border-slate-200 bg-transparent py-1 text-sm outline-none focus:border-indigo-300" />
            <input type="date" value={newDeadlineDate} onChange={(event) => setNewDeadlineDate(event.target.value)} className="rounded border border-slate-200 px-2 py-1 text-xs" />
            <button onClick={() => { if (newDeadline.trim()) { addDeadline({ title: newDeadline.trim(), date: newDeadlineDate, projectId: project.id }); setNewDeadline(""); } }} className="text-indigo-600"><Plus className="h-4 w-4" /></button>
          </div>
        </div>
      </InfoBlock>

      <details className="mt-4 rounded-xl border border-slate-200 bg-white">
        <summary className="flex cursor-pointer items-center gap-2 p-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <ChevronRight className="h-4 w-4" /> Active Tasks ({activeTaskCount})
        </summary>
        <div className="border-t border-slate-100 p-4">
          <TaskList rows={tasks.map((task) => ({ task, labels: [taskStatus[task.status].label, task.projectId !== project.id ? projectName(data.projects, task.projectId) : ""].filter(Boolean) }))} />
          <div className="mt-3 flex items-center gap-2">
            <input value={newTask} onChange={(event) => setNewTask(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && newTask.trim()) { addTask({ title: newTask.trim(), projectId: project.id, domainId: project.domainId }); setNewTask(""); } }} placeholder="Add task..." className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-300" />
            <button onClick={() => { if (newTask.trim()) { addTask({ title: newTask.trim(), projectId: project.id, domainId: project.domainId }); setNewTask(""); } }} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">Add</button>
          </div>
        </div>
      </details>

      <InfoBlock title="Notes / Decisions" className="mt-4">
        <div className="space-y-2">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} editing={editingNote === note.id} onEdit={() => setEditingNote(note.id)} onDone={() => setEditingNote(null)} onUpdate={(updates) => updateNote(note.id, updates)} />
          ))}
          <div className="flex items-center gap-2 pt-2">
            <input value={newNote} onChange={(event) => setNewNote(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && newNote.trim()) { const id = addNote({ title: newNote.trim(), projectId: project.id, domainId: project.domainId }); setNewNote(""); setEditingNote(id); } }} placeholder="Add a note..." className="flex-1 border-b border-slate-200 bg-transparent py-1 text-sm outline-none focus:border-indigo-300" />
            <button onClick={() => { if (newNote.trim()) { const id = addNote({ title: newNote.trim(), projectId: project.id, domainId: project.domainId }); setNewNote(""); setEditingNote(id); } }} className="text-indigo-600"><Plus className="h-4 w-4" /></button>
          </div>
        </div>
      </InfoBlock>

      {suggestions.length ? <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 p-4"><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600"><Sparkles className="h-4 w-4" /> Agent Suggestions</div><ul className="space-y-1 text-sm text-indigo-800">{suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}</ul></div> : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <button onClick={exportMarkdown} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"><Download className="h-4 w-4" /> Export Markdown</button>
        <button aria-label={project.status === "archived" ? "Unarchive project" : "Archive project"} onClick={() => updateProject(project.id, { status: project.status === "archived" ? "active" : "archived", archivedAt: project.status === "archived" ? null : new Date().toISOString() })} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"><Archive className="h-4 w-4" /> {project.status === "archived" ? "Unarchive" : "Archive"}</button>
        <button onClick={() => { updateProject(project.id, { trashedAt: new Date().toISOString() }); router.push("/projects"); }} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /> Delete</button>
      </div>
    </Page>
  );
}

function InfoBlock({ title, children, accent, className = "" }: { title: string; children: React.ReactNode; accent?: boolean; className?: string }) {
  return <section className={`${className} rounded-xl border ${accent ? "border-indigo-200 bg-indigo-50" : "border-slate-200 bg-white"} p-4`}><h3 className={`mb-2 text-xs font-semibold uppercase tracking-wider ${accent ? "text-indigo-600" : "text-slate-500"}`}>{title}</h3>{children}</section>;
}

function NoteCard({ note, editing, onEdit, onDone, onUpdate }: { note: Note; editing: boolean; onEdit: () => void; onDone: () => void; onUpdate: (updates: Partial<Note>) => void }) {
  if (editing) {
    return (
      <div className="rounded-lg border border-slate-100 p-3">
        <EditableField value={note.title} placeholder="Note title" onSave={(title) => onUpdate({ title })} inputClassName="font-semibold" />
        <div className="mt-2">
          <EditableField value={note.content} multiline rows={5} placeholder="Markdown supported: #, ##, -, [], >" onSave={(content) => onUpdate({ content })} />
        </div>
        <button onClick={onDone} className="mt-3 text-xs font-semibold text-indigo-600">Done</button>
      </div>
    );
  }
  return (
    <button onClick={onEdit} className="w-full rounded-lg border border-slate-100 p-3 text-left hover:bg-slate-50">
      <h4 className="text-sm font-semibold text-slate-900">{note.title}</h4>
      {note.content ? <MarkdownPreview content={note.content} /> : <p className="mt-1 text-xs text-slate-400">Empty note</p>}
    </button>
  );
}

function MarkdownPreview({ content }: { content: string }) {
  return (
    <div className="prose-lite mt-2 line-clamp-5 text-xs text-slate-600">
      {content.split("\n").map((line, index) => {
        if (line.startsWith("## ")) return <h2 key={index}>{line.slice(3)}</h2>;
        if (line.startsWith("# ")) return <h1 key={index}>{line.slice(2)}</h1>;
        if (line.startsWith("- ")) return <p key={index}>• {line.slice(2)}</p>;
        if (line.startsWith("> ")) return <blockquote key={index}>{line.slice(2)}</blockquote>;
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
  const [projectId, setProjectId] = useState("");
  const activeProjects = data.projects.filter((project) => !project.trashedAt && project.status !== "archived");
  const deadlines = data.deadlines.filter((deadline) => !deadline.trashedAt).sort((a, b) => a.date.localeCompare(b.date));

  function create() {
    if (!title.trim()) return;
    addDeadline({ title: title.trim(), date, projectId: projectId || null });
    setTitle("");
    setProjectId("");
    setShowAdd(false);
  }

  return (
    <Page title="Deadlines" subtitle="Separate hard dates from task due dates." action={<button onClick={() => setShowAdd(true)} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Add Deadline</button>}>
      {showAdd ? <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4"><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Deadline title..." className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /><div className="mt-3 flex flex-wrap gap-3"><input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" /><select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm"><option value="">No project</option>{activeProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><button onClick={create} className="text-sm font-semibold text-indigo-600">Add</button></div></div> : null}
      <div className="space-y-2">
        {deadlines.map((deadline) => {
          const overdue = deadline.date < localDateKey();
          return (
            <div key={deadline.id} className={`rounded-xl border bg-white p-3 ${overdue ? "border-red-200" : "border-slate-200"}`}>
              <div className="flex items-start gap-3">
                <Calendar className={`mt-2 h-4 w-4 ${overdue ? "text-red-500" : "text-slate-400"}`} />
                <div className="min-w-0 flex-1">
                  <EditableField value={deadline.title} placeholder="Deadline title" onSave={(title) => updateDeadline(deadline.id, { title })} inputClassName={`font-medium ${overdue ? "text-red-700" : "text-slate-900"}`} />
                  <p className="px-3 text-xs text-slate-400">{projectName(data.projects, deadline.projectId)}</p>
                </div>
                <input type="date" value={deadline.date} onChange={(event) => updateDeadline(deadline.id, { date: event.target.value })} className="mt-2 rounded border border-slate-200 px-2 py-1 text-xs" />
                <button onClick={() => updateDeadline(deadline.id, { trashedAt: new Date().toISOString() })} className="mt-2 text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
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
    return <Page title={labels[type]} subtitle="Store review context for recovery."><div className="space-y-5">{questions.map(([key, label]) => <label key={key} className="block"><span className="mb-2 block text-sm font-medium text-slate-700">{label}</span><textarea value={responses[key] || ""} onChange={(event) => setResponses((prev) => ({ ...prev, [key]: event.target.value }))} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-300" /></label>)}</div><div className="mt-6 flex gap-3"><button onClick={() => { addReview(type, responses); setType(null); setResponses({}); }} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white">Save Review</button><button onClick={() => setType(null)} className="text-sm text-slate-500">Cancel</button></div></Page>;
  }

  return (
    <Page title="Reviews" subtitle="Daily and weekly recovery notes.">
      <div className="grid gap-4 sm:grid-cols-3">{(["daily-startup", "daily-shutdown", "weekly"] as ReviewType[]).map((reviewType) => <button key={reviewType} onClick={() => { setType(reviewType); setResponses({}); }} className="rounded-xl border border-slate-200 bg-white p-5 text-left hover:border-indigo-200"><BookOpen className="mb-2 h-5 w-5 text-indigo-500" /><h3 className="text-sm font-semibold text-slate-900">{labels[reviewType]}</h3></button>)}</div>
      <section className="mt-8"><SectionTitle title="Past Reviews" count={data.reviews.length} /><div className="mt-3 space-y-2">{data.reviews.map((review) => <details key={review.id} className="rounded-xl border border-slate-200 bg-white"><summary className="cursor-pointer p-3 text-sm font-medium text-slate-800">{labels[review.type]} <span className="ml-2 text-xs text-slate-400">{format(parseISO(review.date), "MMM d, yyyy h:mm a")}</span></summary><div className="space-y-3 px-3 pb-3">{Object.entries(review.responses).map(([key, value]) => <div key={key}><p className="text-xs font-medium capitalize text-slate-500">{key}</p><p className="whitespace-pre-wrap text-sm text-slate-700">{value}</p></div>)}</div></details>)}</div></section>
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

  return <Page title="Search" subtitle="Find projects, tasks, captures, notes, deadlines, and reviews."><div className="relative"><Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} autoFocus placeholder="Search workspace..." className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100" /></div><div className="mt-4 space-y-1">{results.map((result) => <button key={`${result.type}-${result.id}`} onClick={result.onClick} className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-white"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">{result.type}</span><div className="min-w-0 flex-1"><p className="truncate text-sm text-slate-900">{result.title}</p>{result.subtitle ? <p className="truncate text-xs text-slate-400">{result.subtitle}</p> : null}</div></button>)}{query && !results.length ? <EmptyState icon={Search} title={`No results for "${query}"`} /> : null}</div></Page>;
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

  return <Page title="Archive" subtitle="Archived records and soft-deleted trash."><div className="mb-4 flex gap-1 rounded-lg bg-slate-100 p-1"><button onClick={() => setTab("archived")} className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${tab === "archived" ? "bg-white shadow-sm" : "text-slate-500"}`}>Archived ({archived.length})</button><button onClick={() => setTab("trash")} className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${tab === "trash" ? "bg-white shadow-sm" : "text-slate-500"}`}>Trash ({trash.length})</button></div>{tab === "archived" ? <div className="space-y-2">{archived.map((project) => <div key={project.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4"><FolderKanban className="h-4 w-4 text-slate-400" /><div className="flex-1"><p className="text-sm font-medium text-slate-700">{project.name}</p><p className="text-xs text-slate-400">{domainName(data.domains, project.domainId)}</p></div><button onClick={() => router.push(`/projects/${project.id}`)} className="text-xs font-medium text-indigo-600">View</button><button aria-label={`Restore ${project.name}`} onClick={() => updateProject(project.id, { status: "active" as any, archivedAt: null })} className="text-xs font-medium text-emerald-600">Restore</button></div>)}{!archived.length ? <EmptyState icon={Archive} title="No archived projects" /> : null}</div> : <div className="space-y-2">{trash.map((item) => <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4"><FileText className="h-4 w-4 text-slate-400" /><div className="flex-1"><p className="text-sm text-slate-700">{item.title}</p><p className="text-xs text-slate-400">{item.type}</p></div><button onClick={item.restore} className="flex items-center gap-1 text-xs font-medium text-emerald-600"><RotateCcw className="h-3 w-3" /> Restore</button></div>)}{!trash.length ? <EmptyState icon={Trash2} title="Trash is empty" /> : null}</div>}</Page>;
}

export function SettingsView() {
  const { data, sync, syncNow, forceRefreshFromServer, addDomain, updateDomain, resetDemoData } = useWorkspace();
  const [newDomain, setNewDomain] = useState("");

  return (
    <Page title="Settings" subtitle="Domains, sync state, and demo reset.">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <SectionTitle title="Sync" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <SyncMetric label="Status" value={sync.syncing ? "Syncing" : sync.online ? "Online" : "Offline"} testId="sync-status" />
          <SyncMetric label="Pending" value={String(sync.pendingCount)} />
          <SyncMetric label="Last synced" value={formatSyncTimestamp(sync.lastSyncedAt)} />
          <SyncMetric label="Last refresh" value={formatSyncTimestamp(sync.lastRefreshAt)} />
          <SyncMetric label="Stale warnings" value={String(sync.staleMutationCount)} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => void syncNow()} disabled={!sync.online || sync.syncing} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${sync.syncing ? "animate-spin" : ""}`} />
            {sync.syncing ? "Syncing..." : "Sync now"}
          </button>
          <button onClick={() => void forceRefreshFromServer()} disabled={!sync.online || sync.refreshing || sync.syncing} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <Download className="h-4 w-4" />
            {sync.refreshing ? "Refreshing..." : "Refresh from server"}
          </button>
        </div>
        {!sync.online ? <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">Offline. Edits are saved locally and will sync when the connection returns.</p> : null}
        {sync.error ? (
          <p data-testid="sync-error" className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{sync.error}{sync.lastErrorAt ? ` Last error: ${formatSyncTimestamp(sync.lastErrorAt)}.` : ""}</span>
          </p>
        ) : null}
        {sync.lastWarning ? (
          <p data-testid="sync-warning" className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{sync.lastWarning}{sync.lastWarningAt ? ` Last warning: ${formatSyncTimestamp(sync.lastWarningAt)}.` : ""}</span>
          </p>
        ) : null}
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
        <SectionTitle title="Domains" />
        <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-100">
          {data.domains.map((domain) => (
            <div key={domain.id} className="flex items-center gap-3 px-4 py-3">
              <EditableField value={domain.name} placeholder="Domain name" onSave={(name) => updateDomain(domain.id, { name })} className="flex-1" inputClassName="py-1 text-slate-800" />
              <button onClick={() => updateDomain(domain.id, { archived: !domain.archived })} className="text-xs font-medium text-slate-500 hover:text-indigo-600">{domain.archived ? "Restore" : "Archive"}</button>
            </div>
          ))}
          <div className="flex items-center gap-2 px-4 py-3">
            <input value={newDomain} onChange={(event) => setNewDomain(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && newDomain.trim()) { addDomain(newDomain.trim()); setNewDomain(""); } }} placeholder="Add domain..." className="flex-1 bg-transparent text-sm outline-none" />
            <button onClick={() => { if (newDomain.trim()) { addDomain(newDomain.trim()); setNewDomain(""); } }} className="text-indigo-600"><Plus className="h-4 w-4" /></button>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <h2 className="text-sm font-semibold text-amber-900">Demo data</h2>
        <p className="mt-1 text-sm text-amber-800">Reset this account to the seeded demo workspace. Pending offline changes are cleared.</p>
        <button onClick={() => void resetDemoData()} className="mt-3 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700">Reset demo data</button>
      </section>
    </Page>
  );
}

function formatSyncTimestamp(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Never";
}

function SyncMetric({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p data-testid={testId ?? (label === "Pending" ? "pending-count" : undefined)} className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}
