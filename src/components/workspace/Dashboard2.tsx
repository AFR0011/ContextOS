"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Eraser,
  FolderKanban,
  NotebookPen,
  Plus,
  SquarePen,
  Target,
  type LucideIcon
} from "lucide-react";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { addDaysToDateKey, dateKeyToLocalDate, localDateKey } from "@/lib/dates";
import { useWorkspace } from "@/lib/client-store";
import type { DashboardPreference, DashboardSectionId, Deadline, Project, Task, TaskStatus } from "@/lib/types";

const DASHBOARD_SECTION_ORDER: DashboardSectionId[] = ["notepad", "dates", "tasks", "projects"];
const DONE_TASK_STATUSES: TaskStatus[] = ["done", "dropped"];
const PROJECT_STALE_DAYS = 14;

type DateDashboardItem = {
  id: string;
  kind: "task" | "deadline";
  title: string;
  dateKey: string;
  projectName: string;
  done: boolean;
  overdue: boolean;
  source: Task | Deadline;
};

function isTaskOpen(task: Task) {
  return !task.trashedAt && !task.archivedAt && !DONE_TASK_STATUSES.includes(task.status);
}

function isTaskVisible(task: Task, showCompleted: boolean) {
  if (task.trashedAt || task.archivedAt) return false;
  return showCompleted || !DONE_TASK_STATUSES.includes(task.status);
}

function projectName(projects: Project[], projectId: string | null | undefined) {
  if (!projectId) return "";
  return projects.find((project) => project.id === projectId)?.name ?? "";
}

function compareDateKeys(a: string, b: string) {
  return a.localeCompare(b);
}

function statusLabel(status: TaskStatus) {
  const labels: Record<TaskStatus, string> = {
    todo: "Todo",
    "in-progress": "In progress",
    blocked: "Blocked",
    waiting: "Waiting",
    done: "Done",
    dropped: "Dropped"
  };
  return labels[status];
}

function formatDateKey(dateKey: string) {
  const date = dateKeyToLocalDate(dateKey);
  return date ? format(date, "MMM d, yyyy") : dateKey;
}

function daysBetween(startKey: string, endKey: string) {
  const start = dateKeyToLocalDate(startKey);
  const end = dateKeyToLocalDate(endKey);
  if (!start || !end) return 0;
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

function dateBadge(dateKey: string, today: string) {
  if (dateKey < today) return "Overdue";
  if (dateKey === today) return "Today";
  const days = daysBetween(today, dateKey);
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

function sectionDefaults(preference?: DashboardPreference) {
  return {
    collapsedSections: preference?.collapsedSections ?? [],
    dateWindowDays: preference?.dateWindowDays ?? 14,
    showCompleted: preference?.showCompleted ?? false,
    sectionOrder: preference?.sectionOrder?.length ? preference.sectionOrder : DASHBOARD_SECTION_ORDER
  };
}

function DashboardPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-3 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-4 sm:px-5 sm:pt-6 lg:px-8">
      <header className="mb-4 px-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">Dashboard 2.0</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Mobile Command Sheet</h1>
        <p className="mt-1 text-sm text-slate-500">Mind, dates, tasks, projects. Not another wall of fake metrics. Humanity survives one fewer KPI card.</p>
      </header>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function CollapsibleSection({
  id,
  title,
  icon: Icon,
  count,
  collapsed,
  onToggle,
  children
}: {
  id: DashboardSectionId;
  title: string;
  icon: LucideIcon;
  count?: number;
  collapsed: boolean;
  onToggle: (id: DashboardSectionId) => void;
  children: React.ReactNode;
}) {
  return (
    <section data-testid={`dashboard-section-${id}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => onToggle(id)}
        aria-expanded={!collapsed}
        className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left active:bg-slate-50"
      >
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600">
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-slate-950">{title}</h2>
          <p className="text-[11px] text-slate-400">Tap to {collapsed ? "open" : "collapse"}</p>
        </div>
        {count !== undefined ? <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{count}</span> : null}
        {collapsed ? <ChevronRight className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
      </button>
      {!collapsed ? <div className="border-t border-slate-100 px-4 py-4">{children}</div> : null}
    </section>
  );
}

function CheckboxButton({ checked, onClick, label }: { checked: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 ${
        checked ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white text-transparent hover:border-indigo-400"
      }`}
    >
      <Check className="h-4 w-4" />
    </button>
  );
}

function InlineTaskTitle({ task }: { task: Task }) {
  const { updateTask } = useWorkspace();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);

  useEffect(() => {
    if (!editing) setDraft(task.title);
  }, [editing, task.title]);

  function save() {
    const title = draft.trim();
    if (title && title !== task.title) updateTask(task.id, { title });
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === "Enter") save();
          if (event.key === "Escape") {
            setDraft(task.title);
            setEditing(false);
          }
        }}
        className="w-full rounded-lg border border-indigo-200 bg-white px-2 py-1.5 text-sm font-medium text-slate-950 outline-none ring-2 ring-indigo-50"
      />
    );
  }

  return (
    <button type="button" onClick={() => setEditing(true)} className="min-w-0 text-left text-sm font-medium text-slate-900 hover:text-indigo-700">
      {task.title}
    </button>
  );
}

function TaskLine({ task, meta }: { task: Task; meta?: string }) {
  const { updateTask } = useWorkspace();
  const done = task.status === "done";
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-3">
      <CheckboxButton checked={done} onClick={() => updateTask(task.id, { status: done ? "todo" : "done" })} label={done ? `Mark ${task.title} todo` : `Mark ${task.title} done`} />
      <div className="min-w-0 flex-1">
        <div className={done ? "line-through opacity-50" : ""}>
          <InlineTaskTitle task={task} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500">{statusLabel(task.status)}</span>
          {meta ? <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500">{meta}</span> : null}
          {task.dueDate ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Due {formatDateKey(task.dueDate)}</span> : null}
          {task.plannedDate ? <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">Planned {formatDateKey(task.plannedDate)}</span> : null}
        </div>
      </div>
    </div>
  );
}

function NotepadSection() {
  const { data, sync, updateDashboardScratchpad } = useWorkspace();
  const scratchpad = data.dashboardScratchpads[0];
  const savedContent = scratchpad?.content ?? "";
  const [draft, setDraft] = useState(savedContent);
  const [saveState, setSaveState] = useState<"idle" | "dirty" | "saved">("idle");
  const lastSavedRef = useRef(savedContent);

  useEffect(() => {
    lastSavedRef.current = savedContent;
    setDraft(savedContent);
    setSaveState("idle");
  }, [savedContent]);

  useEffect(() => {
    if (draft === lastSavedRef.current) return;
    setSaveState("dirty");
    const handle = window.setTimeout(() => {
      updateDashboardScratchpad(draft);
      lastSavedRef.current = draft;
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1200);
    }, 900);
    return () => window.clearTimeout(handle);
  }, [draft, updateDashboardScratchpad]);

  function clear() {
    setDraft("");
    updateDashboardScratchpad("");
    lastSavedRef.current = "";
    setSaveState("saved");
  }

  return (
    <div>
      <textarea
        data-testid="dashboard-scratchpad"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Scratch what is on your mind. Loose thoughts go here; real tasks and dates belong below. Revolutionary concept: putting things where they belong."
        rows={8}
        className="min-h-44 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base leading-6 text-slate-950 outline-none placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
      />
      <div className="mt-3 flex min-h-9 flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-400">
          {saveState === "dirty" ? "Autosaving..." : saveState === "saved" ? "Saved locally" : scratchpad?.updatedAt ? `Updated ${formatDistanceToNow(parseISO(scratchpad.updatedAt), { addSuffix: true })}` : "Ready"}
        </span>
        {!sync.online ? <span className="rounded-full bg-amber-50 px-2 py-1 font-semibold text-amber-700">Offline: queued for sync</span> : null}
        <button
          type="button"
          onClick={clear}
          disabled={!draft.trim()}
          className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 py-2 font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-40"
        >
          <Eraser className="h-4 w-4" />
          Clear
        </button>
      </div>
    </div>
  );
}

function DatesSection({ today, windowDays, showCompleted }: { today: string; windowDays: number; showCompleted: boolean }) {
  const router = useRouter();
  const { data, updateTask, updateDeadline } = useWorkspace();
  const windowEnd = addDaysToDateKey(today, windowDays) ?? today;

  const items = useMemo<DateDashboardItem[]>(() => {
    const taskItems: DateDashboardItem[] = [];
    data.tasks
      .filter((task) => isTaskVisible(task, showCompleted))
      .forEach((task) => {
        const dateKey = task.dueDate ?? task.plannedDate;
        if (!dateKey) return;
        taskItems.push({
          id: `task-${task.id}`,
          kind: "task",
          title: task.title,
          dateKey,
          projectName: projectName(data.projects, task.projectId),
          done: task.status === "done",
          overdue: dateKey < today && isTaskOpen(task),
          source: task
        });
      });

    const deadlineItems: DateDashboardItem[] = data.deadlines
      .filter((deadline) => !deadline.trashedAt && (showCompleted || !deadline.archivedAt))
      .map((deadline) => ({
        id: `deadline-${deadline.id}`,
        kind: "deadline",
        title: deadline.title,
        dateKey: deadline.date,
        projectName: projectName(data.projects, deadline.projectId),
        done: Boolean(deadline.archivedAt),
        overdue: deadline.date < today && !deadline.archivedAt,
        source: deadline
      }));

    return [...taskItems, ...deadlineItems]
      .filter((item) => item.dateKey < today || item.dateKey <= windowEnd)
      .sort((a, b) => {
        if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
        const byDate = compareDateKeys(a.dateKey, b.dateKey);
        if (byDate !== 0) return byDate;
        if (a.kind !== b.kind) return a.kind === "deadline" ? -1 : 1;
        return a.title.localeCompare(b.title);
      });
  }, [data.deadlines, data.projects, data.tasks, showCompleted, today, windowEnd]);

  if (!items.length) {
    return <EmptySmall icon={CalendarDays} title="No dated items in range" description={`Showing overdue plus the next ${windowDays} days.`} />;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const isTask = item.kind === "task";
        const task = isTask ? (item.source as Task) : null;
        const deadline = !isTask ? (item.source as Deadline) : null;
        return (
          <div key={item.id} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-3">
            <CheckboxButton
              checked={item.done}
              onClick={() => {
                if (task) updateTask(task.id, { status: item.done ? "todo" : "done" });
                if (deadline) updateDeadline(deadline.id, { archivedAt: item.done ? null : new Date().toISOString() });
              }}
              label={item.done ? `Reopen ${item.title}` : item.kind === "deadline" ? `Mark ${item.title} handled` : `Mark ${item.title} done`}
            />
            <button type="button" onClick={() => (item.kind === "deadline" ? router.push("/deadlines") : undefined)} className="min-w-0 flex-1 text-left">
              <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${item.done ? "text-slate-400 line-through" : "text-slate-900"}`}>{item.title}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${item.overdue ? "bg-red-50 text-red-700" : item.dateKey === today ? "bg-indigo-50 text-indigo-700" : "bg-white text-slate-500"}`}>{dateBadge(item.dateKey, today)}</span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500">{item.kind === "deadline" ? "Deadline" : task?.dueDate ? "Task due" : "Task planned"}</span>
                    {item.projectName ? <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500">{item.projectName}</span> : null}
                  </div>
                </div>
                <span className="shrink-0 text-xs font-semibold text-slate-400">{formatDateKey(item.dateKey)}</span>
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}

function TasksSection({ today, showCompleted }: { today: string; showCompleted: boolean }) {
  const { data, addTask } = useWorkspace();
  const [title, setTitle] = useState("");
  const rows = useMemo(() => {
    return data.tasks
      .filter((task) => isTaskVisible(task, showCompleted))
      .filter((task) => task.dueDate === today || task.plannedDate === today || task.status === "in-progress" || (task.dueDate && task.dueDate < today && isTaskOpen(task)))
      .sort((a, b) => {
        const aOverdue = Boolean(a.dueDate && a.dueDate < today && isTaskOpen(a));
        const bOverdue = Boolean(b.dueDate && b.dueDate < today && isTaskOpen(b));
        if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
        if (a.status === "done" && b.status !== "done") return 1;
        if (a.status !== "done" && b.status === "done") return -1;
        return a.createdAt.localeCompare(b.createdAt);
      });
  }, [data.tasks, showCompleted, today]);

  function createTask() {
    const trimmed = title.trim();
    if (!trimmed) return;
    addTask({ title: trimmed, plannedDate: today });
    setTitle("");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 focus-within:border-indigo-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100">
        <Plus className="ml-1 h-5 w-5 shrink-0 text-indigo-500" />
        <input
          data-testid="dashboard-add-task-input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") createTask();
            if (event.key === "Escape") setTitle("");
          }}
          placeholder="Add a real task for today..."
          className="min-h-10 min-w-0 flex-1 bg-transparent text-base text-slate-950 outline-none placeholder:text-slate-400"
        />
        <button type="button" onClick={createTask} disabled={!title.trim()} className="min-h-10 rounded-lg bg-indigo-600 px-3 text-sm font-bold text-white disabled:bg-slate-200">
          Add
        </button>
      </div>
      {rows.length ? rows.map((task) => <TaskLine key={task.id} task={task} meta={task.dueDate && task.dueDate < today && isTaskOpen(task) ? "Overdue" : task.status === "in-progress" ? "In progress" : undefined} />) : <EmptySmall icon={Target} title="No operational tasks" description="Add one small task. Not a life philosophy. A task." />}
    </div>
  );
}

function ProjectsSection() {
  const router = useRouter();
  const { data } = useWorkspace();
  const projects = data.projects
    .filter((project) => !project.trashedAt && !project.archivedAt && project.status === "active")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const nowMs = Date.now();

  if (!projects.length) {
    return <EmptySmall icon={FolderKanban} title="No active projects" description="Active project recovery will appear here." />;
  }

  return (
    <div className="space-y-2">
      {projects.map((project) => {
        const updatedAt = parseISO(project.updatedAt);
        const stale = Number.isFinite(updatedAt.getTime()) && nowMs - updatedAt.getTime() > PROJECT_STALE_DAYS * 86_400_000;
        const missingNext = !project.nextAction.trim();
        const missingStatus = !project.latestStatus.trim();
        return (
          <button key={project.id} type="button" onClick={() => router.push(`/projects/${project.id}`)} className="w-full rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-3 text-left active:bg-slate-100">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-bold text-slate-950">{project.name}</h3>
                <p className={`mt-1 text-sm ${missingNext ? "font-semibold text-red-700" : "text-indigo-700"}`}>Next: {project.nextAction || "Missing next action"}</p>
                <p className={`mt-1 line-clamp-2 text-xs ${missingStatus ? "font-semibold text-amber-700" : "text-slate-500"}`}>Status: {project.latestStatus || "No latest status"}</p>
              </div>
              <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-300" />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {missingNext ? <WarningPill tone="red" label="No next action" /> : null}
              {missingStatus ? <WarningPill tone="amber" label="No status" /> : null}
              {stale ? <WarningPill tone="amber" label={`Stale ${PROJECT_STALE_DAYS}+d`} /> : null}
              {!missingNext && !missingStatus && !stale ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Recoverable</span> : null}
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500">Updated {formatDistanceToNow(updatedAt, { addSuffix: true })}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function WarningPill({ tone, label }: { tone: "red" | "amber"; label: string }) {
  const classes = tone === "red" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700";
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${classes}`}><AlertTriangle className="h-3 w-3" />{label}</span>;
}

function EmptySmall({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
      <Icon className="mx-auto mb-2 h-7 w-7 text-slate-300" />
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
    </div>
  );
}

export function Dashboard2View() {
  const { data, loading, updateDashboardPreferences } = useWorkspace();
  const today = localDateKey();
  const preferences = sectionDefaults(data.dashboardPreferences[0]);
  const collapsed = new Set(preferences.collapsedSections);
  const activeDateWindowEnd = addDaysToDateKey(today, preferences.dateWindowDays) ?? today;
  const datesCount = data.tasks.filter((task) => isTaskVisible(task, preferences.showCompleted) && (task.dueDate ?? task.plannedDate) && ((task.dueDate ?? task.plannedDate)! < today || (task.dueDate ?? task.plannedDate)! <= activeDateWindowEnd)).length +
    data.deadlines.filter((deadline) => !deadline.trashedAt && (preferences.showCompleted || !deadline.archivedAt) && (deadline.date < today || deadline.date <= activeDateWindowEnd)).length;
  const tasksCount = data.tasks.filter((task) => isTaskVisible(task, preferences.showCompleted) && (task.dueDate === today || task.plannedDate === today || task.status === "in-progress" || (task.dueDate && task.dueDate < today && isTaskOpen(task)))).length;
  const projectsCount = data.projects.filter((project) => !project.trashedAt && !project.archivedAt && project.status === "active").length;

  function toggleSection(id: DashboardSectionId) {
    const next = new Set(preferences.collapsedSections);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    updateDashboardPreferences({
      sectionOrder: preferences.sectionOrder,
      collapsedSections: Array.from(next),
      dateWindowDays: preferences.dateWindowDays,
      showCompleted: preferences.showCompleted
    });
  }

  const sectionComponents: Record<DashboardSectionId, React.ReactNode> = {
    notepad: (
      <CollapsibleSection id="notepad" title="Notepad" icon={NotebookPen} collapsed={collapsed.has("notepad")} onToggle={toggleSection}>
        <NotepadSection />
      </CollapsibleSection>
    ),
    dates: (
      <CollapsibleSection id="dates" title="Dates" icon={CalendarDays} count={datesCount} collapsed={collapsed.has("dates")} onToggle={toggleSection}>
        <DatesSection today={today} windowDays={preferences.dateWindowDays} showCompleted={preferences.showCompleted} />
      </CollapsibleSection>
    ),
    tasks: (
      <CollapsibleSection id="tasks" title="Tasks" icon={SquarePen} count={tasksCount} collapsed={collapsed.has("tasks")} onToggle={toggleSection}>
        <TasksSection today={today} showCompleted={preferences.showCompleted} />
      </CollapsibleSection>
    ),
    projects: (
      <CollapsibleSection id="projects" title="Projects" icon={FolderKanban} count={projectsCount} collapsed={collapsed.has("projects")} onToggle={toggleSection}>
        <ProjectsSection />
      </CollapsibleSection>
    )
  };

  return (
    <DashboardPageShell>
      {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Loading cached command sheet...</div> : null}
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
        <div className="flex items-start gap-2">
          <Circle className="mt-1 h-3 w-3 fill-indigo-500 text-indigo-500" />
          <p><span className="font-semibold">Today:</span> recover the mind, dates, tasks, and active projects without spelunking through five pages like a productivity goblin.</p>
        </div>
      </div>
      {preferences.sectionOrder.map((id) => sectionComponents[id] ?? null)}
    </DashboardPageShell>
  );
}
