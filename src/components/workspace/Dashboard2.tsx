"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  BookOpen,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Eraser,
  FolderKanban,
  MapPin,
  NotebookPen,
  ListChecks,
  Plus,
  Send,
  SquarePen,
  Trash2,
  Zap,
  type LucideIcon
} from "lucide-react";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { DailySchedule, type DailyScheduleRow } from "@/components/workspace/DailySchedule";
import { MarkdownEditor } from "@/components/workspace/MarkdownEditor";
import { normalizeDashboardPreference } from "@/lib/dashboard-preferences";
import { addDaysToDateKey, dateKeyToLocalDate, localDateKey, localWeekStartKey } from "@/lib/dates";
import { useWorkspace } from "@/lib/client-store";
import type { DashboardPreference, DashboardSectionId, Project, ReviewType, Task, TaskStatus } from "@/lib/types";

const DONE_TASK_STATUSES: TaskStatus[] = ["done", "dropped"];
const PROJECT_STALE_DAYS = 14;

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

function formatDateKey(dateKey: string) {
  const date = dateKeyToLocalDate(dateKey);
  return date ? format(date, "MMM d, yyyy") : dateKey;
}

function activeProjectOptions(projects: Project[]) {
  return projects.filter((project) => !project.trashedAt && !project.archivedAt && project.status !== "archived").sort((a, b) => a.name.localeCompare(b.name));
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
  return normalizeDashboardPreference(preference);
}

function reviewLabel(type: ReviewType) {
  const labels: Record<ReviewType, string> = {
    "daily-startup": "Daily startup",
    "daily-shutdown": "Daily shutdown",
    weekly: "Weekly review"
  };
  return labels[type];
}

function dueReviewType(reviews: { type: ReviewType; date: string }[], dismissals: string[]) {
  const today = localDateKey();
  const week = localWeekStartKey();
  const nowHour = new Date().getHours();
  const reviewedToday = (type: ReviewType) => reviews.some((review) => review.type === type && localDateKey(parseISO(review.date)) === today);
  const weeklyDone = reviews.some((review) => review.type === "weekly" && localWeekStartKey(parseISO(review.date)) === week);
  const candidates: { type: ReviewType; key: string; message: string }[] = [
    { type: "daily-startup", key: `daily-startup:${today}`, message: "Start the day with one short review." }
  ];
  if (nowHour >= 16) candidates.push({ type: "daily-shutdown", key: `daily-shutdown:${today}`, message: "Close today with a shutdown note." });
  candidates.push({ type: "weekly", key: `weekly:${week}`, message: "Set or refresh this week's recovery plan." });
  return candidates.find((candidate) => !dismissals.includes(candidate.key) && (candidate.type === "weekly" ? !weeklyDone : !reviewedToday(candidate.type)));
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

function QuickCapture() {
  const { addCapture } = useWorkspace();
  const [text, setText] = useState("");
  const [captured, setCaptured] = useState(false);

  function submit() {
    if (!text.trim()) return;
    addCapture(text);
    setText("");
    setCaptured(true);
    window.setTimeout(() => setCaptured(false), 700);
  }

  return (
    <div data-testid="dashboard-quick-capture" className={`cos-input flex items-center gap-2 px-4 py-3 ${captured ? "border-[var(--cos-success-border)]" : ""}`}>
      <Zap className={`h-5 w-5 shrink-0 ${captured ? "text-[var(--cos-success)]" : "text-[var(--cos-primary)]"}`} />
      <input
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") submit();
          if (event.key === "Escape") setText("");
        }}
        placeholder="Quick capture... try /task, /note, /project, /date, /status"
        className="min-w-0 flex-1 bg-transparent text-sm text-[var(--cos-text-strong)] outline-none placeholder:text-[var(--cos-text-subtle)]"
      />
      <button type="button" onClick={submit} disabled={!text.trim()} aria-label="Capture" className="grid h-9 w-9 place-items-center rounded-lg text-[var(--cos-primary-text)] hover:bg-[var(--cos-primary-soft)] disabled:text-[var(--cos-text-subtle)]">
        <Send className="h-4 w-4" />
      </button>
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
    <MarkdownEditor
      dataTestId="dashboard-scratchpad"
      value={draft}
      onChange={setDraft}
      placeholder="Scratch what is on your mind. Capture first; organize when it matters."
      minLines={8}
      hideSaveButton
      className="min-h-56 bg-[var(--cos-bg-soft)]"
      footer={
        <>
          <span className="mr-auto text-[var(--cos-text-subtle)]">
            {saveState === "dirty" ? "Autosaving..." : saveState === "saved" ? "Saved locally" : scratchpad?.updatedAt ? `Updated ${formatDistanceToNow(parseISO(scratchpad.updatedAt), { addSuffix: true })}` : "Ready"}
          </span>
          {!sync.online ? <span className="cos-pill cos-pill-warning">Offline: queued for sync</span> : null}
          <button
            type="button"
            onClick={clear}
            disabled={!draft.trim()}
            className="cos-btn cos-btn-ghost min-h-9 px-3 py-2 text-xs disabled:opacity-40"
          >
            <Eraser className="h-4 w-4" />
            Clear
          </button>
        </>
      }
    />
  );
}

function DatesSection({ today, windowDays, showCompleted }: { today: string; windowDays: number; showCompleted: boolean }) {
  const router = useRouter();
  const { data, addDeadline, updateDeadline } = useWorkspace();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [projectId, setProjectId] = useState("");
  const windowEnd = addDaysToDateKey(today, windowDays) ?? today;
  const projects = activeProjectOptions(data.projects);

  const items = useMemo(() => data.deadlines
      .filter((deadline) => !deadline.trashedAt && (showCompleted || !deadline.archivedAt))
      .filter((deadline) => deadline.date < today || deadline.date <= windowEnd)
      .sort((a, b) => {
        const byDate = a.date.localeCompare(b.date);
        return byDate || a.title.localeCompare(b.title);
      }), [data.deadlines, showCompleted, today, windowEnd]);

  if (!items.length) {
    return (
      <div className="space-y-3">
        <DateComposer
          title={title}
          date={date}
          time={time}
          location={location}
          projectId={projectId}
          projects={projects}
          onTitle={setTitle}
          onDate={setDate}
          onTime={setTime}
          onLocation={setLocation}
          onProject={setProjectId}
          onCreate={() => {
            const trimmed = title.trim();
            if (!trimmed) return;
            addDeadline({ title: trimmed, date, time: time || null, location: location.trim(), projectId: projectId || null });
            setTitle("");
            setTime("");
            setLocation("");
            setProjectId("");
          }}
        />
        <EmptySmall icon={CalendarDays} title="No important dates in range" description={`Showing past dates plus the next ${windowDays} days.`} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <DateComposer
        title={title}
        date={date}
        time={time}
        location={location}
        projectId={projectId}
        projects={projects}
        onTitle={setTitle}
        onDate={setDate}
        onTime={setTime}
        onLocation={setLocation}
        onProject={setProjectId}
        onCreate={() => {
          const trimmed = title.trim();
          if (!trimmed) return;
          addDeadline({ title: trimmed, date, time: time || null, location: location.trim(), projectId: projectId || null });
          setTitle("");
          setTime("");
          setLocation("");
          setProjectId("");
        }}
      />
      {items.map((item) => (
        <div key={item.id} className={`cos-row-muted flex items-start gap-3 px-3 py-3 ${item.archivedAt ? "opacity-60" : ""}`}>
          <button type="button" onClick={() => router.push("/dates")} className="min-w-0 flex-1 text-left">
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--cos-text-strong)]">{item.title}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <span className={`cos-pill ${item.date < today && !item.archivedAt ? "cos-pill-danger" : item.date === today ? "cos-pill-primary" : "cos-pill-muted"}`}>{dateBadge(item.date, today)}</span>
                  {item.time ? <span className="cos-pill cos-pill-primary"><CalendarClock className="h-3 w-3" />{item.time}</span> : null}
                  {item.location ? <span className="cos-pill cos-pill-muted"><MapPin className="h-3 w-3" />{item.location}</span> : null}
                  {projectName(data.projects, item.projectId) ? <span className="cos-pill cos-pill-muted">{projectName(data.projects, item.projectId)}</span> : null}
                  {item.archivedAt ? <span className="cos-pill cos-pill-muted">Archived</span> : null}
                </div>
              </div>
              <span className="shrink-0 text-xs font-semibold text-[var(--cos-text-subtle)]">{formatDateKey(item.date)}</span>
            </div>
          </button>
          <button type="button" aria-label={item.archivedAt ? `Restore ${item.title}` : `Archive ${item.title}`} onClick={() => updateDeadline(item.id, { archivedAt: item.archivedAt ? null : new Date().toISOString() })} className="grid h-8 w-8 shrink-0 place-items-center rounded text-[var(--cos-text-subtle)] hover:bg-[var(--cos-bg-inset)] hover:text-[var(--cos-text)]">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

function DateComposer({
  title,
  date,
  time,
  location,
  projectId,
  projects,
  onTitle,
  onDate,
  onTime,
  onLocation,
  onProject,
  onCreate
}: {
  title: string;
  date: string;
  time: string;
  location: string;
  projectId: string;
  projects: Project[];
  onTitle: (value: string) => void;
  onDate: (value: string) => void;
  onTime: (value: string) => void;
  onLocation: (value: string) => void;
  onProject: (value: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="rounded-xl border border-[var(--cos-border-soft)] bg-[var(--cos-bg-soft)] p-2">
      <div className="flex items-center gap-2">
        <CalendarClock className="ml-1 h-5 w-5 shrink-0 text-[var(--cos-date)]" />
        <input
          data-testid="dashboard-add-deadline-input"
          value={title}
          onChange={(event) => onTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onCreate();
            if (event.key === "Escape") onTitle("");
          }}
          placeholder="Add an important date..."
          className="min-h-10 min-w-0 flex-1 bg-transparent text-base text-[var(--cos-text-strong)] outline-none placeholder:text-[var(--cos-text-subtle)]"
        />
        <button type="button" onClick={onCreate} disabled={!title.trim()} className="cos-btn cos-btn-primary min-h-10 px-3 text-sm disabled:bg-[var(--cos-border)]">
          Add
        </button>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_0.8fr_1.1fr_1.1fr]">
        <input aria-label="Date" type="date" value={date} onChange={(event) => onDate(event.target.value)} className="cos-input bg-[var(--cos-bg-elevated)] px-2 py-2 text-xs" />
        <input aria-label="Date time" type="time" value={time} onChange={(event) => onTime(event.target.value)} className="cos-input bg-[var(--cos-bg-elevated)] px-2 py-2 text-xs" />
        <input aria-label="Date location" value={location} onChange={(event) => onLocation(event.target.value)} placeholder="Location" className="cos-input bg-[var(--cos-bg-elevated)] px-2 py-2 text-xs" />
        <select aria-label="Date project" value={projectId} onChange={(event) => onProject(event.target.value)} className="cos-input bg-[var(--cos-bg-elevated)] px-2 py-2 text-xs">
          <option value="">No project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>{project.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function DailyTimelineSection({ today }: { today: string }) {
  const { data, addTask } = useWorkspace();
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const projects = activeProjectOptions(data.projects);
  const rows = useMemo<DailyScheduleRow[]>(() => {
    return data.tasks
      .filter((task) => !task.trashedAt && !task.archivedAt)
      .filter((task) => task.dueDate === today || task.plannedDate === today || task.status === "in-progress" || (task.dueDate && task.dueDate < today && isTaskOpen(task)))
      .sort((a, b) => {
        const aOverdue = Boolean(a.dueDate && a.dueDate < today && isTaskOpen(a));
        const bOverdue = Boolean(b.dueDate && b.dueDate < today && isTaskOpen(b));
        if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
        const aTime = a.scheduledTime ?? "99:99";
        const bTime = b.scheduledTime ?? "99:99";
        if (aTime !== bTime) return aTime.localeCompare(bTime);
        return a.createdAt.localeCompare(b.createdAt);
      })
      .map((task) => ({
        task,
        labels: [
          task.dueDate && task.dueDate < today && isTaskOpen(task) ? "Overdue" : "",
          task.status === "in-progress" ? "In progress" : "",
          task.dueDate ? `Due ${formatDateKey(task.dueDate)}` : "",
          task.plannedDate ? `Planned ${formatDateKey(task.plannedDate)}` : "",
          projectName(data.projects, task.projectId)
        ].filter(Boolean)
      }));
  }, [data.projects, data.tasks, today]);

  function createTask() {
    const trimmed = title.trim();
    if (!trimmed) return;
    const project = projects.find((item) => item.id === projectId);
    addTask({ title: trimmed, plannedDate: today, scheduledTime: scheduledTime || null, projectId: projectId || null, domainId: project?.domainId ?? null });
    setTitle("");
    setProjectId("");
    setScheduledTime("");
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
          placeholder="Add something to today's timeline..."
          className="min-h-10 min-w-0 flex-1 bg-transparent text-base text-[var(--cos-text-strong)] outline-none placeholder:text-[var(--cos-text-subtle)]"
        />
        <button type="button" onClick={createTask} disabled={!title.trim()} className="cos-btn cos-btn-primary min-h-10 px-3 text-sm disabled:bg-[var(--cos-border)]">
          Add
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-[0.7fr_1.4fr]">
        <input aria-label="Task scheduled time" type="time" value={scheduledTime} onChange={(event) => setScheduledTime(event.target.value)} className="cos-input bg-[var(--cos-bg-soft)] px-3 py-2 text-xs" />
        {projects.length ? (
          <select aria-label="Task project" value={projectId} onChange={(event) => setProjectId(event.target.value)} className="cos-input w-full bg-[var(--cos-bg-soft)] px-3 py-2 text-xs">
            <option value="">No project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        ) : null}
      </div>
      <DailySchedule rows={rows} today={today} />
    </div>
  );
}

function AllTasksSection({ showCompleted }: { showCompleted: boolean }) {
  const { data } = useWorkspace();
  const rows = data.tasks
    .filter((task) => isTaskVisible(task, showCompleted))
    .map((task) => ({
      task,
      labels: [
        task.dueDate ? `Due ${formatDateKey(task.dueDate)}` : "",
        task.plannedDate ? `Planned ${formatDateKey(task.plannedDate)}` : "",
        projectName(data.projects, task.projectId)
      ].filter(Boolean)
    }));

  return <DailySchedule rows={rows} today={localDateKey()} emptyTitle="No active tasks" emptyDescription="Tasks from every date and project will appear here." />;
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

function ReviewPrompt({ preferences }: { preferences: ReturnType<typeof sectionDefaults> }) {
  const router = useRouter();
  const { data, updateDashboardPreferences } = useWorkspace();
  const due = dueReviewType(data.reviews, preferences.reviewPromptDismissals);
  if (!due) return null;

  function dismiss() {
    if (!due) return;
    updateDashboardPreferences({
      sectionOrder: preferences.sectionOrder,
      collapsedSections: preferences.collapsedSections,
      dateWindowDays: preferences.dateWindowDays,
      reviewPromptDismissals: [...preferences.reviewPromptDismissals, due.key],
      showCompleted: preferences.showCompleted
    });
  }

  return (
    <section className="rounded-lg border border-[var(--cos-review)] bg-[var(--cos-review-soft)] px-4 py-3 text-sm text-[var(--cos-review)]">
      <div className="flex items-start gap-3">
        <Bell className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{reviewLabel(due.type)} is due</p>
          <p className="mt-0.5 text-xs opacity-90">{due.message}</p>
        </div>
        <button type="button" onClick={() => router.push("/reviews")} className="cos-btn cos-btn-ghost min-h-8 px-2 py-1 text-xs">
          <BookOpen className="h-3.5 w-3.5" />
          Review
        </button>
        <button type="button" onClick={dismiss} aria-label={`Dismiss ${reviewLabel(due.type)} prompt`} className="grid h-8 w-8 shrink-0 place-items-center rounded-md hover:bg-[var(--cos-bg-elevated)]">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}

export function Dashboard2View() {
  const { data, loading, updateDashboardPreferences } = useWorkspace();
  const today = localDateKey();
  const preferences = sectionDefaults(data.dashboardPreferences[0]);
  const collapsed = new Set(preferences.collapsedSections);
  const activeDateWindowEnd = addDaysToDateKey(today, preferences.dateWindowDays) ?? today;
  const datesCount = data.deadlines.filter((deadline) => !deadline.trashedAt && (preferences.showCompleted || !deadline.archivedAt) && (deadline.date < today || deadline.date <= activeDateWindowEnd)).length;
  const tasksCount = data.tasks.filter((task) => !task.trashedAt && !task.archivedAt && (task.dueDate === today || task.plannedDate === today || task.status === "in-progress" || (task.dueDate && task.dueDate < today && isTaskOpen(task)))).length;
  const allTasksCount = data.tasks.filter((task) => isTaskVisible(task, preferences.showCompleted)).length;
  const projectsCount = data.projects.filter((project) => !project.trashedAt && !project.archivedAt && project.status === "active").length;

  function toggleSection(id: DashboardSectionId) {
    const next = new Set(preferences.collapsedSections);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    updateDashboardPreferences({
      sectionOrder: preferences.sectionOrder,
      collapsedSections: Array.from(next),
      dateWindowDays: preferences.dateWindowDays,
      reviewPromptDismissals: preferences.reviewPromptDismissals,
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
      <CollapsibleSection id="tasks" title="Daily timeline" icon={SquarePen} count={tasksCount} collapsed={collapsed.has("tasks")} onToggle={toggleSection}>
        <DailyTimelineSection today={today} />
      </CollapsibleSection>
    ),
    allTasks: (
      <CollapsibleSection id="allTasks" title="Tasks" icon={ListChecks} count={allTasksCount} collapsed={collapsed.has("allTasks")} onToggle={toggleSection}>
        <AllTasksSection showCompleted={preferences.showCompleted} />
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
      <QuickCapture />
      <div className="rounded-lg border border-[var(--cos-primary-border)] bg-[var(--cos-primary-soft)] px-4 py-3 text-sm text-[var(--cos-primary-text)]">
        <div className="flex items-start gap-2">
          <Circle className="mt-1 h-3 w-3 fill-[var(--cos-primary)] text-[var(--cos-primary)]" />
          <p><span className="font-semibold">Today:</span> capture quickly, write the day as a task list, and keep important dates separate.</p>
        </div>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          aria-pressed={preferences.showCompleted}
          onClick={() => updateDashboardPreferences({
            sectionOrder: preferences.sectionOrder,
            collapsedSections: preferences.collapsedSections,
            dateWindowDays: preferences.dateWindowDays,
            reviewPromptDismissals: preferences.reviewPromptDismissals,
            showCompleted: !preferences.showCompleted
          })}
          className={`cos-btn px-3 py-1.5 text-xs ${preferences.showCompleted ? "cos-btn-primary" : "cos-btn-ghost"}`}
        >
          {preferences.showCompleted ? <Check className="h-3.5 w-3.5" /> : null}
          Show completed
        </button>
      </div>
      <ReviewPrompt preferences={preferences} />
      {preferences.sectionOrder.map((id) => (
        <Fragment key={id}>{sectionComponents[id] ?? null}</Fragment>
      ))}
    </DashboardPageShell>
  );
}
