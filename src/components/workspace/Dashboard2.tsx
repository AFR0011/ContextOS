"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
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

function DashboardPageShell({ children, loading }: { children: React.ReactNode; loading: boolean }) {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-4 sm:px-5 sm:pt-6 lg:px-8">
      <header className="mb-4 px-1">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--cos-primary-text)]">Mobile Command Sheet</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--cos-text-strong)]">{loading ? "Loading dashboard" : "Dashboard"}</h1>
        <p className="mt-1 text-sm text-[var(--cos-text-muted)]">Mind, dates, tasks, and active projects in one calm operating view.</p>
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
    <section data-testid={`dashboard-section-${id}`} className="cos-surface overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle(id)}
        aria-expanded={!collapsed}
        aria-label={id === "projects" ? (collapsed ? "Open project recovery section" : "Collapse project recovery section") : undefined}
        className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left active:bg-[var(--cos-bg-soft)]"
      >
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--cos-bg-inset)] text-[var(--cos-text-muted)]">
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-[var(--cos-text-strong)]">{title}</h2>
          <p className="text-[11px] text-[var(--cos-text-subtle)]">Tap to {collapsed ? "open" : "collapse"}</p>
        </div>
        {count !== undefined ? <span className="cos-pill cos-pill-muted">{count}</span> : null}
        {collapsed ? <ChevronRight className="h-5 w-5 text-[var(--cos-text-subtle)]" /> : <ChevronDown className="h-5 w-5 text-[var(--cos-text-subtle)]" />}
      </button>
      {!collapsed ? <div className="border-t border-[var(--cos-border-soft)] px-4 py-4">{children}</div> : null}
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
        checked ? "border-[var(--cos-success)] bg-[var(--cos-success)] text-white" : "border-[var(--cos-border-strong)] bg-[var(--cos-bg-elevated)] text-transparent hover:border-[var(--cos-primary)]"
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
        className="cos-input w-full px-2 py-1.5 text-sm font-medium"
      />
    );
  }

  return (
    <button type="button" onClick={() => setEditing(true)} className="min-w-0 text-left text-sm font-medium text-[var(--cos-text-strong)] hover:text-[var(--cos-primary-text)]">
      {task.title}
    </button>
  );
}

function TaskLine({ task, meta }: { task: Task; meta?: string }) {
  const { updateTask } = useWorkspace();
  const done = task.status === "done";
  return (
    <div className="cos-row-muted flex items-start gap-3 px-3 py-3">
      <CheckboxButton checked={done} onClick={() => updateTask(task.id, { status: done ? "todo" : "done" })} label={done ? `Mark ${task.title} todo` : `Mark ${task.title} done`} />
      <div className="min-w-0 flex-1">
        <div className={done ? "line-through opacity-50" : ""}>
          <InlineTaskTitle task={task} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="cos-pill cos-pill-muted">{statusLabel(task.status)}</span>
          {meta ? <span className="cos-pill cos-pill-warning">{meta}</span> : null}
          {task.dueDate ? <span className="cos-pill cos-pill-warning">Due {formatDateKey(task.dueDate)}</span> : null}
          {task.plannedDate ? <span className="cos-pill cos-pill-primary">Planned {formatDateKey(task.plannedDate)}</span> : null}
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
        placeholder="Scratch what is on your mind. Capture first; organize when it matters."
        rows={8}
        className="cos-input min-h-44 w-full resize-y bg-[var(--cos-bg-soft)] px-3 py-3 text-base leading-6 placeholder:text-[var(--cos-text-subtle)] focus:bg-[var(--cos-bg-elevated)]"
      />
      <div className="mt-3 flex min-h-9 flex-wrap items-center gap-2 text-xs">
        <span className="text-[var(--cos-text-subtle)]">
          {saveState === "dirty" ? "Autosaving..." : saveState === "saved" ? "Saved locally" : scratchpad?.updatedAt ? `Updated ${formatDistanceToNow(parseISO(scratchpad.updatedAt), { addSuffix: true })}` : "Ready"}
        </span>
        {!sync.online ? <span className="cos-pill cos-pill-warning">Offline: queued for sync</span> : null}
        <button
          type="button"
          onClick={clear}
          disabled={!draft.trim()}
          className="cos-btn cos-btn-ghost ml-auto min-h-9 px-3 py-2 text-xs disabled:opacity-40"
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
          <div key={item.id} className="cos-row-muted flex items-start gap-3 px-3 py-3">
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
                  <p className={`text-sm font-semibold ${item.done ? "text-[var(--cos-text-subtle)] line-through" : "text-[var(--cos-text-strong)]"}`}>{item.title}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <span className={`cos-pill ${item.overdue ? "cos-pill-danger" : item.dateKey === today ? "cos-pill-primary" : "cos-pill-muted"}`}>{dateBadge(item.dateKey, today)}</span>
                    <span className="cos-pill cos-pill-muted">{item.kind === "deadline" ? "Deadline" : task?.dueDate ? "Task due" : "Task planned"}</span>
                    {item.projectName ? <span className="cos-pill cos-pill-muted">{item.projectName}</span> : null}
                  </div>
                </div>
                <span className="shrink-0 text-xs font-semibold text-[var(--cos-text-subtle)]">{formatDateKey(item.dateKey)}</span>
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
      <div className="cos-input flex items-center gap-2 bg-[var(--cos-bg-soft)] p-2 focus-within:bg-[var(--cos-bg-elevated)]">
        <Plus className="ml-1 h-5 w-5 shrink-0 text-[var(--cos-primary)]" />
        <input
          data-testid="dashboard-add-task-input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") createTask();
            if (event.key === "Escape") setTitle("");
          }}
          placeholder="Add a real task for today..."
          className="min-h-10 min-w-0 flex-1 bg-transparent text-base text-[var(--cos-text-strong)] outline-none placeholder:text-[var(--cos-text-subtle)]"
        />
        <button type="button" onClick={createTask} disabled={!title.trim()} className="cos-btn cos-btn-primary min-h-10 px-3 text-sm disabled:bg-[var(--cos-border)]">
          Add
        </button>
      </div>
      {rows.length ? rows.map((task) => <TaskLine key={task.id} task={task} meta={task.dueDate && task.dueDate < today && isTaskOpen(task) ? "Overdue" : task.status === "in-progress" ? "In progress" : undefined} />) : <EmptySmall icon={Target} title="No operational tasks" description="Add one small task for today." />}
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
          <button key={project.id} type="button" onClick={() => router.push(`/projects/${project.id}`)} className="cos-row-muted w-full px-3 py-3 text-left active:bg-[var(--cos-bg-inset)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-bold text-[var(--cos-text-strong)]">{project.name}</h3>
                <p className={`mt-1 text-sm ${missingNext ? "font-semibold text-[var(--cos-danger-text)]" : "text-[var(--cos-primary-text)]"}`}>Next: {project.nextAction || "Missing next action"}</p>
                <p className={`mt-1 line-clamp-2 text-xs ${missingStatus ? "font-semibold text-[var(--cos-warning-text)]" : "text-[var(--cos-text-muted)]"}`}>Status: {project.latestStatus || "No latest status"}</p>
              </div>
              <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-[var(--cos-text-subtle)]" />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {missingNext ? <WarningPill tone="red" label="No next action" /> : null}
              {missingStatus ? <WarningPill tone="amber" label="No status" /> : null}
              {stale ? <WarningPill tone="amber" label={`Stale ${PROJECT_STALE_DAYS}+d`} /> : null}
              {!missingNext && !missingStatus && !stale ? <span className="cos-pill cos-pill-success">Recoverable</span> : null}
              <span className="cos-pill cos-pill-muted">Changed {formatDistanceToNow(updatedAt, { addSuffix: true })}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function WarningPill({ tone, label }: { tone: "red" | "amber"; label: string }) {
  const classes = tone === "red" ? "cos-pill-danger" : "cos-pill-warning";
  return <span className={`cos-pill ${classes}`}><AlertTriangle className="h-3 w-3" />{label}</span>;
}

function EmptySmall({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="cos-empty px-4 py-6 text-center">
      <Icon className="mx-auto mb-2 h-7 w-7 text-[var(--cos-text-subtle)]" />
      <p className="text-sm font-semibold text-[var(--cos-text-muted)]">{title}</p>
      <p className="mt-1 text-xs text-[var(--cos-text-subtle)]">{description}</p>
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
    <DashboardPageShell loading={loading}>
      {loading ? <div className="cos-surface p-4 text-sm text-[var(--cos-text-muted)]">Loading cached command sheet...</div> : null}
      <div className="rounded-lg border border-[var(--cos-primary-border)] bg-[var(--cos-primary-soft)] px-4 py-3 text-sm text-[var(--cos-primary-text)]">
        <div className="flex items-start gap-2">
          <Circle className="mt-1 h-3 w-3 fill-[var(--cos-primary)] text-[var(--cos-primary)]" />
          <p><span className="font-semibold">Today:</span> recover notes, dated pressure, executable tasks, and active projects in one pass.</p>
        </div>
      </div>
      {preferences.sectionOrder.map((id) => (
        <Fragment key={id}>{sectionComponents[id] ?? null}</Fragment>
      ))}
    </DashboardPageShell>
  );
}
