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
  CalendarClock,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  FileText,
  FolderKanban,
  Layers,
  MapPin,
  Inbox,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Trash2,
  Zap
} from "lucide-react";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { MarkdownEditor } from "@/components/workspace/MarkdownEditor";
import { MarkdownPreview as SharedMarkdownPreview } from "@/components/workspace/editor/MarkdownPreview";
import { Dashboard2View } from "@/components/workspace/Dashboard2";
import {
  CommandDateRows,
  CommandPageEditor,
  CommandTaskRows,
  LiveBlock,
  type CommandDateGroup,
  type CommandTaskGroup,
  type CommandTaskRow
} from "@/components/workspace/CommandPageBlocks";
import { DailySchedule, type DailyScheduleRow } from "@/components/workspace/DailySchedule";
import { parseCommandPageLine } from "@/lib/command-page-commands";
import { useWorkspace, type TriageCaptureAction } from "@/lib/client-store";
import { isDateKeyInLocalWeek, localDateKey, localWeekStartKey } from "@/lib/dates";
import type { Capture, Deadline, Domain, Note, Project, ReviewType, Task, TaskStatus } from "@/lib/types";

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

function taskTimeLabel(task: Pick<Task, "scheduledTime">) {
  return task.scheduledTime ?? "";
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
        placeholder="Quick capture... try /task, /note, /project, /date, /status"
        className="min-w-0 flex-1 bg-transparent text-sm text-[var(--cos-text-strong)] outline-none placeholder:text-[var(--cos-text-subtle)]"
      />
      <button onClick={submit} disabled={!text.trim()} className="grid h-10 w-10 place-items-center rounded-lg text-[var(--cos-primary-text)] hover:bg-[var(--cos-primary-soft)] disabled:text-[var(--cos-text-subtle)]">
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
        <p className={`break-words text-sm ${done ? "text-[var(--cos-text-subtle)] line-through" : "text-[var(--cos-text-strong)]"}`}>{task.title}</p>
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

type InboxFilter = "unprocessed" | "suggestions" | "processed" | "archived" | "all";
type TriageMode = "task" | "date" | "project" | "note" | "attach-project";
type QuickCaptureTarget = Exclude<TriageMode, "attach-project">;

interface CaptureReviewDraft {
  mode: TriageMode;
  title: string;
  details: string;
  taskPlannedDate: string;
  taskDueDate: string;
  taskScheduledTime: string;
  taskProjectId: string;
  dateDate: string;
  dateTime: string;
  dateProjectId: string;
  projectName: string;
  projectDomainId: string;
  noteTitle: string;
  noteDomainId: string;
  noteContent: string;
  attachProjectId: string;
}

function activeDomainOptions(domains: Domain[]) {
  return domains.filter((domain) => !domain.archived);
}

function notesDomainId(domains: Domain[]) {
  return domains.find((domain) => domain.name === "Notes")?.id ?? activeDomainOptions(domains)[0]?.id ?? "";
}

function captureTypeLabel(capture: Capture) {
  if (capture.type === "deadline") return "Date";
  if (capture.type) return capture.type[0].toUpperCase() + capture.type.slice(1);
  return "Capture";
}

function captureWorkingTitle(capture: Capture) {
  const text = capture.text.trim();
  if (capture.type === "deadline") return text.replace(/^\/(?:date|deadline)\s+/i, "").trim() || text;
  if (capture.type) return text.replace(new RegExp(`^\\/${capture.type}\\s+`, "i"), "").trim() || text;
  return text;
}

function defaultModeForCapture(capture: Capture, today: string): TriageMode {
  const parsed = parseCommandPageLine(capture.text, today);
  if (parsed.type === "task") return "task";
  if (parsed.type === "date") return "date";
  if (capture.type === "deadline") return "date";
  if (capture.type === "project") return "project";
  if (capture.type === "note" || capture.type === "status") return "note";
  return "task";
}

function captureDraftFor(capture: Capture, today: string, domains: Domain[], projects: Project[]): CaptureReviewDraft {
  const parsed = parseCommandPageLine(capture.text, today);
  const fallbackTitle = parsed.type === "task" || parsed.type === "date" ? parsed.title : captureWorkingTitle(capture);
  const defaultDomain = notesDomainId(domains);
  const firstProject = visibleProjects(projects)[0]?.id ?? "";

  return {
    mode: defaultModeForCapture(capture, today),
    title: fallbackTitle,
    details: capture.text,
    taskPlannedDate: parsed.type === "task" ? parsed.plannedDate ?? "" : "",
    taskDueDate: parsed.type === "task" ? parsed.dueDate ?? "" : "",
    taskScheduledTime: parsed.type === "task" ? parsed.scheduledTime ?? "" : "",
    taskProjectId: "",
    dateDate: parsed.type === "date" ? parsed.date : today,
    dateTime: parsed.type === "date" ? parsed.time ?? "" : "",
    dateProjectId: "",
    projectName: fallbackTitle,
    projectDomainId: defaultDomain,
    noteTitle: fallbackTitle,
    noteDomainId: defaultDomain,
    noteContent: capture.text,
    attachProjectId: firstProject
  };
}

function quickTriageAction(capture: Capture, target: QuickCaptureTarget, today: string, domains: Domain[], projects: Project[]): TriageCaptureAction {
  const draft = captureDraftFor(capture, today, domains, projects);
  if (target === "task") {
    return {
      type: "task",
      title: draft.title,
      plannedDate: draft.taskPlannedDate || null,
      dueDate: draft.taskDueDate || null,
      scheduledTime: draft.taskScheduledTime || null,
      projectId: draft.taskProjectId || null
    };
  }
  if (target === "date") {
    return {
      type: "date",
      title: draft.title,
      date: draft.dateDate || today,
      time: draft.dateTime || null,
      projectId: draft.dateProjectId || null
    };
  }
  if (target === "project") {
    return { type: "project", name: draft.projectName, domainId: draft.projectDomainId };
  }
  return { type: "note", title: draft.noteTitle, content: draft.noteContent, domainId: draft.noteDomainId };
}

export function InboxView() {
  const router = useRouter();
  const { data, triageCapture } = useWorkspace();
  const today = localDateKey();
  const [filter, setFilter] = useState<InboxFilter>("unprocessed");
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewStartId, setReviewStartId] = useState<string | null>(null);
  const [skippedIds, setSkippedIds] = useState<string[]>([]);
  const [processedReviewIds, setProcessedReviewIds] = useState<string[]>([]);
  const [reviewProgress, setReviewProgress] = useState({ done: 0, total: 0 });
  const unprocessed = useMemo(
    () => data.captures.filter((capture) => capture.status === "unprocessed").sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [data.captures]
  );
  const suggestionCount = useMemo(
    () => data.captures.filter((capture) => capture.status === "unprocessed" && Boolean(capture.parsedData?.handoffId)).length,
    [data.captures]
  );
  const captures = useMemo(
    () =>
      data.captures
        .filter((capture) => capture.status !== "deleted")
        .filter((capture) => {
          if (filter === "all") return true;
          if (filter === "suggestions") return capture.status === "unprocessed" && Boolean(capture.parsedData?.handoffId);
          if (filter === "processed") return capture.status === "converted" || capture.status === "attached";
          return capture.status === filter;
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [data.captures, filter]
  );
  const reviewQueue = useMemo(() => {
    const processed = new Set(processedReviewIds);
    const remaining = unprocessed.filter((capture) => !processed.has(capture.id));
    const start = reviewStartId ? remaining.find((capture) => capture.id === reviewStartId) : null;
    const ordered = start ? [start, ...remaining.filter((capture) => capture.id !== start.id)] : remaining;
    const skipped = new Set(skippedIds);
    return [...ordered.filter((capture) => !skipped.has(capture.id)), ...ordered.filter((capture) => skipped.has(capture.id))];
  }, [processedReviewIds, reviewStartId, skippedIds, unprocessed]);
  const currentReviewCapture = reviewQueue[0] ?? null;
  const reviewTotal = reviewProgress.total || unprocessed.length;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const active = new URLSearchParams(window.location.search).get("review") === "1";
    if (new URLSearchParams(window.location.search).get("filter") === "suggestions") setFilter("suggestions");
    setReviewMode(active);
    if (active) setReviewProgress({ done: 0, total: unprocessed.length });
  }, []);

  useEffect(() => {
    if (reviewMode && reviewProgress.total === 0 && unprocessed.length) {
      setReviewProgress({ done: 0, total: unprocessed.length });
    }
  }, [reviewMode, reviewProgress.total, unprocessed.length]);

  function startReview(captureId?: string) {
    setReviewMode(true);
    setReviewStartId(captureId ?? null);
    setSkippedIds([]);
    setProcessedReviewIds([]);
    setReviewProgress({ done: 0, total: unprocessed.length });
    router.push("/inbox?review=1");
  }

  function closeReview() {
    setReviewMode(false);
    setReviewStartId(null);
    setSkippedIds([]);
    setProcessedReviewIds([]);
    router.push("/inbox");
  }

  function completeReviewItem(captureId: string) {
    setReviewStartId(null);
    setSkippedIds((ids) => ids.filter((id) => id !== captureId));
    setProcessedReviewIds((ids) => [...ids.filter((id) => id !== captureId), captureId]);
    setReviewProgress((current) => {
      const total = current.total || unprocessed.length;
      return { done: Math.min(current.done + 1, total), total };
    });
  }

  function skipReviewItem(captureId: string) {
    setReviewStartId(null);
    setSkippedIds((ids) => [...ids.filter((id) => id !== captureId), captureId]);
  }

  function runQuickTriage(capture: Capture, target: QuickCaptureTarget) {
    triageCapture(capture.id, quickTriageAction(capture, target, today, data.domains, data.projects));
  }

  if (reviewMode) {
    return (
      <Page title="Review Inbox" subtitle="Walk unprocessed captures into the right place, one item at a time.">
        <InboxReviewPanel
          capture={currentReviewCapture}
          domains={data.domains}
          projects={data.projects}
          today={today}
          progressDone={reviewProgress.done}
          progressTotal={reviewTotal}
          onTriage={(id, action) => {
            triageCapture(id, action);
            completeReviewItem(id);
          }}
          onSkip={() => currentReviewCapture && skipReviewItem(currentReviewCapture.id)}
          onClose={closeReview}
        />
      </Page>
    );
  }

  return (
    <Page title="Inbox" subtitle="Capture and triage without deciding too early.">
      <QuickCapture />
      <div data-testid="inbox-triage-summary" className="mt-4 flex flex-col gap-3 rounded-lg border border-[var(--cos-border)] bg-[var(--cos-bg-elevated)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--cos-text-strong)]">{unprocessed.length} unprocessed capture{unprocessed.length === 1 ? "" : "s"}</p>
          <p className="mt-1 text-xs text-[var(--cos-text-muted)]">Newest captures stay visible here; review mode works oldest-first.</p>
        </div>
        <button onClick={() => startReview()} disabled={!unprocessed.length} className="cos-btn cos-btn-primary min-h-10 px-4 py-2 text-sm disabled:opacity-50">
          <Inbox className="h-4 w-4" />
          Review Inbox
        </button>
      </div>
      <div className="mt-4 flex gap-1 rounded-lg bg-[var(--cos-bg-inset)] p-1">
        {(["unprocessed", "suggestions", "processed", "archived", "all"] as const).map((tab) => (
          <button key={tab} onClick={() => setFilter(tab)} className={`min-h-10 flex-1 rounded-md px-3 py-2 text-sm font-medium capitalize ${filter === tab ? "bg-[var(--cos-bg-elevated)] text-[var(--cos-text-strong)] shadow-sm" : "text-[var(--cos-text-muted)] hover:text-[var(--cos-text-strong)]"}`}>{tab}{tab === "suggestions" && suggestionCount ? ` (${suggestionCount})` : ""}</button>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {captures.map((capture) => (
          <CaptureCard
            key={capture.id}
            capture={capture}
            today={today}
            domains={data.domains}
            projects={data.projects}
            onReview={() => startReview(capture.id)}
            onQuickTriage={(target) => runQuickTriage(capture, target)}
            onArchive={() => triageCapture(capture.id, { type: "archive" })}
            onDelete={() => triageCapture(capture.id, { type: "delete" })}
          />
        ))}
        {!captures.length ? <EmptyState icon={Inbox} title="No captures here" description="Quick capture something to start." /> : null}
      </div>
    </Page>
  );
}

function CaptureCard({
  capture,
  today,
  domains,
  projects,
  onReview,
  onQuickTriage,
  onArchive,
  onDelete
}: {
  capture: Capture;
  today: string;
  domains: Domain[];
  projects: Project[];
  onReview: () => void;
  onQuickTriage: (target: QuickCaptureTarget) => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const parsed = parseCommandPageLine(capture.text, today);
  const detected = parsed.type === "task" ? "Task" : parsed.type === "date" ? "Date" : captureTypeLabel(capture);
  return (
    <div data-testid="capture-card" className="cos-surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <p className="whitespace-pre-wrap text-sm text-[var(--cos-text-strong)]">{capture.text}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="cos-pill cos-pill-primary">{detected}</span>
            <span className="text-[11px] text-[var(--cos-text-subtle)]">{formatDistanceToNow(parseISO(capture.createdAt), { addSuffix: true })}</span>
            {capture.status !== "unprocessed" ? <span className="cos-pill cos-pill-success">{capture.status}</span> : null}
            {capture.parsedData?.handoffId ? <span className="cos-pill cos-pill-primary">Suggestion</span> : null}
          </div>
        </div>
        {capture.status === "unprocessed" ? (
          <button onClick={onReview} className="cos-btn cos-btn-secondary min-h-10 shrink-0 px-3 py-2 text-xs">
            Review
          </button>
        ) : null}
      </div>
      {capture.status === "unprocessed" ? (
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[var(--cos-border-soft)] pt-3 sm:flex sm:flex-wrap sm:items-center">
          <button aria-label="Convert to task" onClick={() => onQuickTriage("task")} className="cos-btn cos-btn-ghost min-h-10 justify-center px-3 py-2 text-xs sm:w-auto"><CheckSquare className="h-4 w-4" /> Task</button>
          <button aria-label="Convert to date" onClick={() => onQuickTriage("date")} className="cos-btn cos-btn-ghost min-h-10 justify-center px-3 py-2 text-xs sm:w-auto"><Calendar className="h-4 w-4" /> Date</button>
          <button aria-label="Convert to project" onClick={() => onQuickTriage("project")} className="cos-btn cos-btn-ghost min-h-10 justify-center px-3 py-2 text-xs sm:w-auto"><FolderKanban className="h-4 w-4" /> Project</button>
          <button aria-label="Convert to resource note" onClick={() => onQuickTriage("note")} className="cos-btn cos-btn-ghost min-h-10 justify-center px-3 py-2 text-xs sm:w-auto"><FileText className="h-4 w-4" /> Resource</button>
          <div className="hidden flex-1 sm:block" />
          <button onClick={onArchive} className="cos-btn cos-btn-ghost min-h-10 justify-center px-3 py-2 text-xs sm:w-auto"><Archive className="h-4 w-4" /> Archive</button>
          <button onClick={onDelete} className="cos-btn min-h-10 justify-center px-3 py-2 text-xs text-[var(--cos-danger-text)] hover:bg-[var(--cos-danger-soft)] sm:w-auto"><Trash2 className="h-4 w-4" /> Delete</button>
        </div>
      ) : null}
    </div>
  );
}

function InboxReviewPanel({
  capture,
  domains,
  projects,
  today,
  progressDone,
  progressTotal,
  onTriage,
  onSkip,
  onClose
}: {
  capture: Capture | null;
  domains: Domain[];
  projects: Project[];
  today: string;
  progressDone: number;
  progressTotal: number;
  onTriage: (id: string, action: TriageCaptureAction) => void;
  onSkip: () => void;
  onClose: () => void;
}) {
  const activeDomains = activeDomainOptions(domains);
  const activeProjects = visibleProjects(projects);
  const [draft, setDraft] = useState<CaptureReviewDraft | null>(capture ? captureDraftFor(capture, today, domains, projects) : null);

  useEffect(() => {
    setDraft(capture ? captureDraftFor(capture, today, domains, projects) : null);
  }, [capture, domains, projects, today]);

  if (!capture || !draft) {
    return (
      <div data-testid="inbox-review-empty" className="space-y-4">
        <EmptyState icon={Inbox} title="Inbox review is done" description="There are no unprocessed captures in the queue." />
        <button onClick={onClose} className="cos-btn cos-btn-primary min-h-10 px-4 py-2 text-sm">Done</button>
      </div>
    );
  }

  const detected = captureTypeLabel(capture);
  const progressCurrent = Math.min(progressDone + 1, Math.max(progressTotal, 1));

  function update<K extends keyof CaptureReviewDraft>(key: K, value: CaptureReviewDraft[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  function submit() {
    const currentDraft = draft;
    const currentCapture = capture;
    if (!currentDraft || !currentCapture) return;

    if (currentDraft.mode === "task") {
      onTriage(currentCapture.id, {
        type: "task",
        title: currentDraft.title,
        plannedDate: currentDraft.taskPlannedDate || null,
        dueDate: currentDraft.taskDueDate || null,
        scheduledTime: currentDraft.taskScheduledTime || null,
        projectId: currentDraft.taskProjectId || null
      });
      return;
    }
    if (currentDraft.mode === "date") {
      onTriage(currentCapture.id, {
        type: "date",
        title: currentDraft.title,
        date: currentDraft.dateDate || today,
        time: currentDraft.dateTime || null,
        projectId: currentDraft.dateProjectId || null,
        notes: currentDraft.details
      });
      return;
    }
    if (currentDraft.mode === "project") {
      onTriage(currentCapture.id, {
        type: "project",
        name: currentDraft.projectName,
        domainId: currentDraft.projectDomainId || notesDomainId(domains),
        currentObjective: currentDraft.details === currentCapture.text ? "" : currentDraft.details
      });
      return;
    }
    if (currentDraft.mode === "note") {
      onTriage(currentCapture.id, {
        type: "note",
        title: currentDraft.noteTitle,
        content: currentDraft.noteContent,
        domainId: currentDraft.noteDomainId || notesDomainId(domains)
      });
      return;
    }
    if (currentDraft.attachProjectId) onTriage(currentCapture.id, { type: "attach-project", projectId: currentDraft.attachProjectId });
  }

  const canSubmit =
    draft.mode === "attach-project"
      ? Boolean(draft.attachProjectId)
      : draft.mode === "project"
        ? Boolean(draft.projectName.trim())
        : draft.mode === "note"
          ? Boolean(draft.noteTitle.trim())
          : Boolean(draft.title.trim());

  return (
    <div data-testid="inbox-review-panel" className="space-y-4">
      <div className="cos-surface p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="cos-pill cos-pill-primary">{progressCurrent} of {progressTotal || 1}</span>
          <span className="cos-pill cos-pill-muted">{detected}</span>
          <span className="text-xs text-[var(--cos-text-subtle)]">{formatDistanceToNow(parseISO(capture.createdAt), { addSuffix: true })}</span>
        </div>
        <p className="whitespace-pre-wrap text-sm text-[var(--cos-text-strong)]">{capture.text}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {([
          ["task", "Task", CheckSquare],
          ["date", "Date", Calendar],
          ["project", "Project", FolderKanban],
          ["note", "Resource note", FileText],
          ["attach-project", "Attach to project", Layers]
        ] as const).map(([mode, label, Icon]) => (
          <button
            key={mode}
            type="button"
            onClick={() => update("mode", mode)}
            className={`cos-btn min-h-10 justify-center px-3 py-2 text-xs ${mode === "attach-project" ? "col-span-2 sm:col-span-1" : ""} ${draft.mode === mode ? "cos-btn-primary" : "cos-btn-ghost"}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <form
        className="cos-surface space-y-4 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit) submit();
        }}
      >
        {draft.mode === "task" ? (
          <>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--cos-text-muted)]">Task title</span>
              <input data-testid="triage-title-input" value={draft.title} onChange={(event) => update("title", event.target.value)} className="cos-input w-full px-3 py-2 text-sm" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--cos-text-muted)]">Planned date</span>
                <input type="date" value={draft.taskPlannedDate} onChange={(event) => update("taskPlannedDate", event.target.value)} className="cos-input w-full px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--cos-text-muted)]">Due date</span>
                <input type="date" value={draft.taskDueDate} onChange={(event) => update("taskDueDate", event.target.value)} className="cos-input w-full px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--cos-text-muted)]">Time</span>
                <input type="time" value={draft.taskScheduledTime} onChange={(event) => update("taskScheduledTime", event.target.value)} className="cos-input w-full px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--cos-text-muted)]">Project</span>
                <select value={draft.taskProjectId} onChange={(event) => update("taskProjectId", event.target.value)} className="cos-input w-full px-3 py-2 text-sm">
                  <option value="">No project</option>
                  {activeProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
              </label>
            </div>
          </>
        ) : null}

        {draft.mode === "date" ? (
          <>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--cos-text-muted)]">Date title</span>
              <input data-testid="triage-title-input" value={draft.title} onChange={(event) => update("title", event.target.value)} className="cos-input w-full px-3 py-2 text-sm" />
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--cos-text-muted)]">Date</span>
                <input data-testid="triage-date-input" type="date" value={draft.dateDate} onChange={(event) => update("dateDate", event.target.value)} className="cos-input w-full px-3 py-2 text-sm" required />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--cos-text-muted)]">Time</span>
                <input data-testid="triage-time-input" type="time" value={draft.dateTime} onChange={(event) => update("dateTime", event.target.value)} className="cos-input w-full px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--cos-text-muted)]">Project</span>
                <select value={draft.dateProjectId} onChange={(event) => update("dateProjectId", event.target.value)} className="cos-input w-full px-3 py-2 text-sm">
                  <option value="">No project</option>
                  {activeProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--cos-text-muted)]">Details</span>
              <textarea value={draft.details} onChange={(event) => update("details", event.target.value)} className="cos-input min-h-24 w-full px-3 py-2 text-sm" />
            </label>
          </>
        ) : null}

        {draft.mode === "project" ? (
          <>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--cos-text-muted)]">Project name</span>
              <input value={draft.projectName} onChange={(event) => update("projectName", event.target.value)} className="cos-input w-full px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--cos-text-muted)]">Area</span>
              <select value={draft.projectDomainId} onChange={(event) => update("projectDomainId", event.target.value)} className="cos-input w-full px-3 py-2 text-sm">
                {activeDomains.map((domain) => <option key={domain.id} value={domain.id}>{domain.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--cos-text-muted)]">Details</span>
              <textarea value={draft.details} onChange={(event) => update("details", event.target.value)} className="cos-input min-h-24 w-full px-3 py-2 text-sm" />
            </label>
          </>
        ) : null}

        {draft.mode === "note" ? (
          <>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--cos-text-muted)]">Resource title</span>
              <input value={draft.noteTitle} onChange={(event) => update("noteTitle", event.target.value)} className="cos-input w-full px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--cos-text-muted)]">Area</span>
              <select value={draft.noteDomainId} onChange={(event) => update("noteDomainId", event.target.value)} className="cos-input w-full px-3 py-2 text-sm">
                {activeDomains.map((domain) => <option key={domain.id} value={domain.id}>{domain.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--cos-text-muted)]">Content</span>
              <textarea value={draft.noteContent} onChange={(event) => update("noteContent", event.target.value)} className="cos-input min-h-32 w-full px-3 py-2 text-sm" />
            </label>
          </>
        ) : null}

        {draft.mode === "attach-project" ? (
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-[var(--cos-text-muted)]">Project</span>
            <select data-testid="triage-attach-project-select" value={draft.attachProjectId} onChange={(event) => update("attachProjectId", event.target.value)} className="cos-input w-full px-3 py-2 text-sm">
              {activeProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </label>
        ) : null}

        <div className="grid grid-cols-2 gap-2 border-t border-[var(--cos-border-soft)] pt-4 sm:flex sm:flex-wrap sm:items-center">
          <button type="submit" disabled={!canSubmit} className="cos-btn cos-btn-primary min-h-10 justify-center px-4 py-2 text-sm disabled:opacity-50 sm:w-auto">
            {draft.mode === "attach-project" ? "Attach" : draft.mode === "note" ? "Create resource" : draft.mode === "date" ? "Create Date" : draft.mode === "project" ? "Create project" : "Create task"}
          </button>
          <button type="button" onClick={onSkip} className="cos-btn cos-btn-secondary min-h-10 justify-center px-4 py-2 text-sm sm:w-auto">Skip</button>
          <button type="button" onClick={() => onTriage(capture.id, { type: "archive" })} className="cos-btn cos-btn-ghost min-h-10 justify-center px-3 py-2 text-sm sm:w-auto"><Archive className="h-4 w-4" /> Archive</button>
          <button type="button" onClick={() => onTriage(capture.id, { type: "delete" })} className="cos-btn min-h-10 justify-center px-3 py-2 text-sm text-[var(--cos-danger-text)] hover:bg-[var(--cos-danger-soft)] sm:w-auto"><Trash2 className="h-4 w-4" /> Delete</button>
          <button type="button" onClick={onClose} className="cos-btn cos-btn-ghost col-span-2 min-h-10 justify-center px-3 py-2 text-sm sm:ml-auto sm:w-auto">Done</button>
        </div>
      </form>
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
    const aTime = a.task.scheduledTime ?? "99:99";
    const bTime = b.task.scheduledTime ?? "99:99";
    if (aTime !== bTime) return aTime.localeCompare(bTime);
    return a.task.createdAt.localeCompare(b.task.createdAt);
  });
  const deadlines = data.deadlines.filter((deadline) => !deadline.trashedAt && deadline.date === today);

  return (
    <Page title="Today" subtitle={format(new Date(), "EEEE, MMMM d, yyyy")}>
      <section>
        <SectionTitle icon={CalendarCheck} title="Tasks" tone="indigo" count={rows.length} />
        <div className="mt-2"><DailySchedule rows={rows} today={today} emptyTitle="No tasks today" emptyDescription="Timed work and unscheduled items will appear here." /></div>
      </section>
      {deadlines.length ? (
        <section className="mt-6">
          <SectionTitle icon={Calendar} title="Dates Today" tone="amber" />
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
      {overdue.length ? <section><SectionTitle icon={AlertTriangle} title="Overdue" tone="red" count={overdue.length} /><div className="mt-2"><TaskList rows={overdue.map((task) => ({ task, labels: ["Overdue", domainName(data.domains, task.domainId)].filter(Boolean) }))} /></div></section> : null}
      <section className="mt-6"><SectionTitle icon={CalendarCheck} title="Tasks This Week" tone="indigo" count={weekTasks.length} /><div className="mt-2"><TaskList rows={weekTasks} /></div></section>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section>
          <SectionTitle icon={Calendar} title="Dates This Week" tone="amber" count={weekDeadlines.length} />
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
          <div className="mt-3 grid gap-3 sm:flex sm:flex-wrap sm:items-center">
            <select value={domainId} onChange={(event) => setDomainId(event.target.value)} className="cos-input w-full px-3 py-2 text-sm sm:w-auto">
              {activeDomains.map((domain) => <option key={domain.id} value={domain.id}>{domain.name}</option>)}
            </select>
            <button onClick={create} className="cos-btn cos-btn-primary px-4 py-2 text-sm">Create</button>
            <button onClick={() => setShowNew(false)} className="cos-btn cos-btn-ghost px-4 py-2 text-sm">Cancel</button>
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
          className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-[var(--cos-text-subtle)] hover:bg-[var(--cos-bg-elevated)] hover:text-[var(--cos-primary-text)] sm:mt-0.5 sm:h-8 sm:w-8"
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
            {deadlineCount ? <span>{deadlineCount} date{deadlineCount > 1 ? "s" : ""}</span> : null}
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
        className="flex min-h-10 w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-[var(--cos-bg-elevated)]"
        style={{ paddingLeft: `${0.5 + depth * 1.1}rem` }}
      >
        <Layers className="h-3.5 w-3.5 shrink-0 text-[var(--cos-text-subtle)]" />
        <button type="button" onClick={() => onOpen(project.id)} className="min-w-0 flex-1 truncate text-left text-xs font-medium text-[var(--cos-text)] hover:text-[var(--cos-primary-text)]">{project.name}</button>
        {project.nextAction ? <span className="hidden max-w-36 truncate text-[11px] text-[var(--cos-primary-text)] sm:inline">Next: {project.nextAction}</span> : null}
        {taskCount ? <span className="cos-pill cos-pill-muted">{taskCount} task{taskCount > 1 ? "s" : ""}</span> : null}
        {deadlineCount ? <span className="cos-pill cos-pill-warning">{deadlineCount} date{deadlineCount > 1 ? "s" : ""}</span> : null}
        <button type="button" onClick={() => onDelete(project.id)} aria-label={`Delete ${project.name}`} className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-[var(--cos-text-subtle)] hover:bg-[var(--cos-danger-soft)] hover:text-[var(--cos-danger-text)] sm:h-7 sm:w-7">
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
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-[var(--cos-text-subtle)] hover:bg-[var(--cos-bg-soft)] hover:text-[var(--cos-primary-text)]"
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
                  <button key={project.id} onClick={() => router.push(`/projects/${project.id}`)} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-[var(--cos-bg-soft)]">
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
                  <button type="button" onClick={() => createAreaProject(domain.id)} disabled={!newProjectByArea[domain.id]?.trim()} className="cos-btn cos-btn-primary min-h-10 px-3 py-1.5 text-xs disabled:bg-[var(--cos-border)]">Add</button>
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-[var(--cos-text-subtle)]">
                {deadlineCount ? <span>{deadlineCount} date{deadlineCount > 1 ? "s" : ""}</span> : null}
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
        <div className="mt-3 grid gap-3 sm:flex sm:flex-wrap sm:items-center">
          <input value={newTitle} disabled={loading || !activeDomains.length} onChange={(event) => setNewTitle(event.target.value)} onKeyDown={(event) => event.key === "Enter" && createResource()} placeholder={loading ? "Loading resources..." : "Resource title..."} className="cos-input min-w-0 flex-1 px-3 py-2 text-sm disabled:bg-[var(--cos-bg-inset)] disabled:text-[var(--cos-text-subtle)]" />
          <select value={newDomainId} disabled={loading || !activeDomains.length} onChange={(event) => setNewDomainId(event.target.value)} className="cos-input w-full px-3 py-2 text-sm disabled:bg-[var(--cos-bg-inset)] disabled:text-[var(--cos-text-subtle)] sm:w-auto">
            {activeDomains.map((domain) => <option key={domain.id} value={domain.id}>{domain.name}</option>)}
          </select>
          <button onClick={createResource} disabled={loading || !activeDomains.length || !newTitle.trim()} className="cos-btn cos-btn-primary px-4 py-2 text-sm disabled:opacity-40">Add</button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => setDomainId("")} className={`min-h-10 rounded-lg px-3 py-1.5 text-xs font-semibold ${selectedDomain === "all" ? "bg-[var(--cos-text-strong)] text-[var(--cos-text-inverse)]" : "bg-[var(--cos-bg-elevated)] text-[var(--cos-text-muted)] hover:bg-[var(--cos-bg-soft)]"}`}>All</button>
        {activeDomains.map((domain) => (
          <button key={domain.id} onClick={() => setDomainId(domain.id)} className={`min-h-10 rounded-lg px-3 py-1.5 text-xs font-semibold ${selectedDomain === domain.id ? "bg-[var(--cos-text-strong)] text-[var(--cos-text-inverse)]" : "bg-[var(--cos-bg-elevated)] text-[var(--cos-text-muted)] hover:bg-[var(--cos-bg-soft)]"}`}>{domain.name}</button>
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
        isPianoScheduleNote(note, domains) ? <PianoSchedulePreview content={note.content} /> : <SharedMarkdownPreview content={note.content} />
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
  if (!table) return <SharedMarkdownPreview content={content} />;
  return (
    <div data-testid="piano-schedule-table" className="mt-2">
      <MarkdownTable headers={table.headers} rows={table.rows} />
    </div>
  );
}

export function DatesView() {
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
    <Page title="Dates" subtitle="Important real-world dates, kept separate from task due dates." action={<button onClick={() => setShowAdd(true)} className="cos-btn cos-btn-primary px-4 py-2 text-sm"><Plus className="h-4 w-4" /> Add Date</button>}>
      {showAdd ? (
        <div className="cos-surface mb-4 p-4">
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Date title..." className="cos-input w-full px-3 py-2 text-sm" />
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:flex lg:items-center">
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="cos-input w-full px-3 py-2 text-sm lg:w-auto" />
            <input aria-label="Date time" type="time" value={time} onChange={(event) => setTime(event.target.value)} className="cos-input w-full px-3 py-2 text-sm lg:w-auto" />
            <input aria-label="Date location" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Location" className="cos-input min-w-0 px-3 py-2 text-sm lg:flex-1" />
            <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="cos-input w-full px-3 py-2 text-sm lg:w-auto">
              <option value="">No project</option>
              {activeProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
            <button onClick={create} className="cos-btn cos-btn-primary px-4 py-2 text-sm">Add</button>
          </div>
        </div>
      ) : null}
      <div className="space-y-2">
        {deadlines.map((deadline) => {
          const overdue = deadline.date < localDateKey() && !deadline.archivedAt;
          return (
            <div key={deadline.id} className={`rounded-lg border bg-[var(--cos-bg-elevated)] p-3 shadow-[var(--cos-shadow-sm)] ${overdue ? "border-[var(--cos-danger-border)]" : "border-[var(--cos-border)]"} ${deadline.archivedAt ? "opacity-60" : ""}`}>
              <div className="flex items-start gap-3">
                <Calendar className={`mt-2 h-4 w-4 ${overdue ? "text-[var(--cos-danger)]" : "text-[var(--cos-date)]"}`} />
                <div className="min-w-0 flex-1">
                  <EditableField value={deadline.title} placeholder="Date title" onSave={(title) => updateDeadline(deadline.id, { title })} inputClassName={`font-medium ${overdue ? "text-[var(--cos-danger-text)]" : "text-[var(--cos-text-strong)]"}`} />
                  <div className="flex flex-wrap gap-1.5 px-3 text-xs text-[var(--cos-text-subtle)]">
                    {deadline.time ? <span className="cos-pill cos-pill-primary"><CalendarClock className="h-3 w-3" />{deadline.time}</span> : null}
                    {deadline.location ? <span className="cos-pill cos-pill-muted"><MapPin className="h-3 w-3" />{deadline.location}</span> : null}
                    {projectName(data.projects, deadline.projectId) ? <span>{projectName(data.projects, deadline.projectId)}</span> : null}
                  </div>
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:flex lg:items-start lg:pl-7">
                <input type="date" value={deadline.date} onChange={(event) => updateDeadline(deadline.id, { date: event.target.value })} className="cos-input w-full px-3 py-2 text-sm lg:w-auto lg:px-2 lg:py-1 lg:text-xs" />
                <input aria-label={`${deadline.title} time`} type="time" value={deadline.time ?? ""} onChange={(event) => updateDeadline(deadline.id, { time: event.target.value || null })} className="cos-input w-full px-3 py-2 text-sm lg:w-auto lg:px-2 lg:py-1 lg:text-xs" />
                <div className="min-w-0 lg:w-36"><EditableField value={deadline.location} placeholder="Location" onSave={(location) => updateDeadline(deadline.id, { location })} inputClassName="px-3 py-2 text-sm lg:px-2 lg:py-1 lg:text-xs" /></div>
                <select aria-label={`${deadline.title} project`} value={deadline.projectId ?? ""} onChange={(event) => updateDeadline(deadline.id, { projectId: event.target.value || null })} className="cos-input w-full px-3 py-2 text-sm lg:w-40 lg:px-2 lg:py-1 lg:text-xs">
                  <option value="">No project</option>
                  {activeProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
                <button aria-label={deadline.archivedAt ? `Restore ${deadline.title}` : `Archive ${deadline.title}`} onClick={() => updateDeadline(deadline.id, { archivedAt: deadline.archivedAt ? null : new Date().toISOString() })} className="cos-btn cos-btn-ghost min-h-10 px-3 py-2 text-xs">{deadline.archivedAt ? "Restore" : "Archive"}</button>
                <button aria-label={`Delete ${deadline.title}`} onClick={() => updateDeadline(deadline.id, { trashedAt: new Date().toISOString() })} className="grid h-10 w-10 place-items-center rounded-md text-[var(--cos-text-subtle)] hover:bg-[var(--cos-danger-soft)] hover:text-[var(--cos-danger)]"><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="mt-3 lg:pl-7">
                <MarkdownEditor
                  value={deadline.notes}
                  placeholder="Date notes..."
                  minLines={2}
                  mode="compact"
                  dataTestId={`deadline-notes-${deadline.id}`}
                  onSave={(notes) => updateDeadline(deadline.id, { notes })}
                />
              </div>
            </div>
          );
        })}
        {!deadlines.length ? <EmptyState icon={Calendar} title="No important dates" /> : null}
      </div>
    </Page>
  );
}

export function ReviewsView() {
  const { data, addReview } = useWorkspace();
  const [type, setType] = useState<ReviewType | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const questions = type === "daily-startup" ? [["focus", "What needs focus today?"]] : type === "daily-shutdown" ? [["changed", "What changed today?"], ["open", "What is still open?"], ["resume", "What should be resumed tomorrow?"], ["triage", "Any inbox items to triage?"]] : [["outcomes", "What outcomes matter this week?"], ["active", "Which projects are active?"], ["stale", "Which projects are stale?"], ["dates", "What important dates are coming?"], ["drop", "What should be dropped, deferred, or blocked?"], ["plan", "What should be planned for this week?"]];
  const labels: Record<ReviewType, string> = { "daily-startup": "Daily Startup", "daily-shutdown": "Daily Shutdown", weekly: "Weekly Review" };

  if (type) {
    return (
      <Page title={labels[type]} subtitle="Store review context for recovery.">
        <div className="cos-surface space-y-5 p-4">
          {questions.map(([key, label]) => (
            <label key={key} className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--cos-text)]">{label}</span>
              <MarkdownEditor
                value={responses[key] || ""}
                onChange={(markdown) => setResponses((prev) => ({ ...prev, [key]: markdown }))}
                placeholder="Type / for blocks..."
                minLines={3}
                mode="compact"
                hideSaveButton
                dataTestId={`review-response-${key}`}
              />
            </label>
          ))}
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={() => { addReview(type, responses); setType(null); setResponses({}); }} className="cos-btn cos-btn-primary px-5 py-2 text-sm">Save Review</button>
          <button onClick={() => setType(null)} className="cos-btn cos-btn-ghost px-3 py-2 text-sm">Cancel</button>
        </div>
      </Page>
    );
  }

  return (
    <Page title="Reviews" subtitle="Daily and weekly recovery notes.">
      <div className="grid gap-4 sm:grid-cols-3">{(["daily-startup", "daily-shutdown", "weekly"] as ReviewType[]).map((reviewType) => <button key={reviewType} onClick={() => { setType(reviewType); setResponses({}); }} className="cos-surface p-5 text-left hover:border-[var(--cos-review)]"><BookOpen className="mb-2 h-5 w-5 text-[var(--cos-review)]" /><h3 className="text-sm font-semibold text-[var(--cos-text-strong)]">{labels[reviewType]}</h3></button>)}</div>
      <section className="mt-8"><SectionTitle title="Past Reviews" count={data.reviews.length} /><div className="mt-3 space-y-2">{data.reviews.map((review) => <details key={review.id} className="cos-surface"><summary className="cursor-pointer p-3 text-sm font-medium text-[var(--cos-text)]">{labels[review.type]} <span className="ml-2 text-xs text-[var(--cos-text-subtle)]">{format(parseISO(review.date), "MMM d, yyyy h:mm a")}</span></summary><div className="space-y-3 px-3 pb-3">{Object.entries(review.responses).map(([key, value]) => <div key={key}><p className="text-xs font-medium capitalize text-[var(--cos-text-muted)]">{key}</p><SharedMarkdownPreview content={value} className="text-sm text-[var(--cos-text)]" /></div>)}</div></details>)}</div></section>
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
    data.tasks.filter((t) => !t.trashedAt && t.title.toLowerCase().includes(q)).forEach((t) => items.push({ id: t.id, type: "Task", title: t.title, subtitle: projectName(data.projects, t.projectId), onClick: () => t.projectId ? router.push(`/projects/${t.projectId}`) : router.push("/dashboard") }));
    data.notes.filter((n) => !n.trashedAt && `${n.title} ${n.content}`.toLowerCase().includes(q)).forEach((n) => items.push({ id: n.id, type: "Note", title: n.title, subtitle: n.content.slice(0, 80), onClick: () => n.projectId ? router.push(`/projects/${n.projectId}`) : router.push("/resources") }));
    data.deadlines.filter((d) => !d.trashedAt && d.title.toLowerCase().includes(q)).forEach((d) => items.push({ id: d.id, type: "Date", title: d.title, subtitle: d.date, onClick: () => router.push("/dates") }));
    data.captures.filter((c) => c.status !== "deleted" && c.text.toLowerCase().includes(q)).forEach((c) => items.push({ id: c.id, type: "Capture", title: c.text, onClick: () => router.push("/inbox") }));
    data.reviews.filter((r) => JSON.stringify(r.responses).toLowerCase().includes(q)).forEach((r) => items.push({ id: r.id, type: "Review", title: r.type, subtitle: format(parseISO(r.date), "MMM d, yyyy"), onClick: () => router.push("/reviews") }));
    return items.slice(0, 60);
  }, [data, q, router]);

  return <Page title="Search" subtitle="Find projects, tasks, captures, notes, dates, and reviews."><div className="relative"><Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--cos-text-subtle)]" /><input value={query} onChange={(event) => setQuery(event.target.value)} autoFocus placeholder="Search workspace..." className="cos-input w-full py-3 pl-10 pr-4 text-sm" /></div><div className="mt-4 space-y-1">{results.map((result) => <button key={`${result.type}-${result.id}`} onClick={result.onClick} className="flex w-full items-start gap-3 rounded-lg p-3 text-left hover:bg-[var(--cos-bg-elevated)]"><span className="cos-pill cos-pill-muted shrink-0">{result.type}</span><div className="min-w-0 flex-1"><p className="break-words text-sm text-[var(--cos-text-strong)]">{result.title}</p>{result.subtitle ? <p className="break-words text-xs text-[var(--cos-text-subtle)]">{result.subtitle}</p> : null}</div></button>)}{query && !results.length ? <EmptyState icon={Search} title={`No results for "${query}"`} /> : null}</div></Page>;
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
    ...data.deadlines.filter((item) => item.trashedAt).map((item) => ({ id: item.id, type: "Date", title: item.title, restore: () => updateDeadline(item.id, { trashedAt: null, archivedAt: null }) }))
  ];

  return (
    <Page title="Archive" subtitle="Archived records and soft-deleted trash.">
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-[var(--cos-bg-inset)] p-1">
        <button
          onClick={() => setTab("archived")}
          className={`min-h-10 rounded-md px-3 py-2 text-sm font-medium ${tab === "archived" ? "bg-[var(--cos-bg-elevated)] text-[var(--cos-text-strong)] shadow-sm" : "text-[var(--cos-text-muted)]"}`}
        >
          Archived ({archived.length})
        </button>
        <button
          onClick={() => setTab("trash")}
          className={`min-h-10 rounded-md px-3 py-2 text-sm font-medium ${tab === "trash" ? "bg-[var(--cos-bg-elevated)] text-[var(--cos-text-strong)] shadow-sm" : "text-[var(--cos-text-muted)]"}`}
        >
          Trash ({trash.length})
        </button>
      </div>

      {tab === "archived" ? (
        <div className="space-y-2">
          {archived.map((project) => (
            <div key={project.id} className="cos-surface p-4">
              <div className="flex items-start gap-3">
                <FolderKanban className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cos-text-subtle)]" />
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium text-[var(--cos-text)]">{project.name}</p>
                  <p className="text-xs text-[var(--cos-text-subtle)]">{domainName(data.domains, project.domainId)}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:ml-7 sm:flex sm:justify-end">
                <button onClick={() => router.push(`/projects/${project.id}`)} className="cos-btn cos-btn-ghost min-h-10 justify-center px-3 py-2 text-sm">
                  View
                </button>
                <button aria-label={`Restore ${project.name}`} onClick={() => updateProject(project.id, { status: "active" as any, archivedAt: null })} className="cos-btn cos-btn-ghost min-h-10 justify-center px-3 py-2 text-sm text-[var(--cos-success-text)]">
                  Restore
                </button>
              </div>
            </div>
          ))}
          {!archived.length ? <EmptyState icon={Archive} title="No archived projects" /> : null}
        </div>
      ) : (
        <div className="space-y-2">
          {trash.map((item) => (
            <div key={`${item.type}-${item.id}`} className="cos-surface p-4">
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cos-text-subtle)]" />
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm text-[var(--cos-text)]">{item.title}</p>
                  <p className="text-xs text-[var(--cos-text-subtle)]">{item.type}</p>
                </div>
              </div>
              <div className="mt-3 grid sm:ml-7 sm:flex sm:justify-end">
                <button onClick={item.restore} className="cos-btn cos-btn-ghost min-h-10 justify-center px-3 py-2 text-sm text-[var(--cos-success-text)]">
                  <RotateCcw className="h-4 w-4" /> Restore
                </button>
              </div>
            </div>
          ))}
          {!trash.length ? <EmptyState icon={Trash2} title="Trash is empty" /> : null}
        </div>
      )}
    </Page>
  );
}

export function SettingsView() {
  const { data, sync, syncNow, forceRefreshFromServer, addDomain, updateDomain, resetDemoData } = useWorkspace();
  const [newDomain, setNewDomain] = useState("");
  const canRefreshFromServer = Boolean(sync.online && !sync.refreshing && !sync.syncing && sync.pendingCount === 0);
  const refreshTitle = sync.pendingCount > 0 ? "Sync pending changes before refreshing" : sync.online ? "Refresh workspace from server" : "Refresh unavailable while offline";

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
          <button
            type="button"
            data-testid="settings-refresh-from-server"
            onClick={() => void forceRefreshFromServer()}
            disabled={!canRefreshFromServer}
            title={refreshTitle}
            className="cos-btn cos-btn-secondary px-4 py-2 text-sm disabled:opacity-50"
          >
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
