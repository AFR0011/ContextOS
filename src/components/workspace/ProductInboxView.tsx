"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive, Calendar, CheckSquare, FileText, FolderKanban, Inbox, Layers, Send, Trash2, Zap } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { parseCommandPageLine } from "@/lib/command-page-commands";
import { useWorkspace, type TriageCaptureAction } from "@/lib/client-store";
import { localDateKey } from "@/lib/dates";
import { useLocalRouter as useRouter } from "@/lib/local-router";
import type { Capture, Domain, Project } from "@/lib/types";

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

function Page({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="cos-page">
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--cos-text-strong)]">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-2xl text-sm text-[var(--cos-text-muted)]">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="cos-empty px-4 py-8 text-center">
      <Inbox className="mx-auto mb-3 h-10 w-10 text-[var(--cos-text-subtle)]" />
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

function visibleProjects(projects: Project[]) {
  return projects.filter((project) => !project.trashedAt && project.status !== "archived");
}

function activeDomainOptions(domains: Domain[]) {
  return domains.filter((domain) => !domain.archived);
}

function notesDomainId(domains: Domain[]) {
  return domains.find((domain) => !domain.archived && domain.name === "Notes")?.id ?? activeDomainOptions(domains)[0]?.id ?? "";
}

function defaultProjectDomainId(domains: Domain[]) {
  return activeDomainOptions(domains).find((domain) => domain.name !== "Notes")?.id ?? "";
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
  const defaultNoteDomain = notesDomainId(domains);
  const defaultProjectDomain = defaultProjectDomainId(domains);
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
    projectDomainId: defaultProjectDomain,
    noteTitle: fallbackTitle,
    noteDomainId: defaultNoteDomain,
    noteContent: capture.text,
    attachProjectId: firstProject
  };
}

function quickTriageAction(capture: Capture, target: QuickCaptureTarget, today: string, domains: Domain[], projects: Project[]): TriageCaptureAction | null {
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
    return draft.projectDomainId ? { type: "project", name: draft.projectName, domainId: draft.projectDomainId } : null;
  }
  return draft.noteDomainId ? { type: "note", title: draft.noteTitle, content: draft.noteContent, domainId: draft.noteDomainId } : null;
}

export function ProductInboxView() {
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
    const params = new URLSearchParams(window.location.search);
    const active = params.get("review") === "1";
    if (params.get("filter") === "suggestions") setFilter("suggestions");
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
    const action = quickTriageAction(capture, target, today, data.domains, data.projects);
    if (action) triageCapture(capture.id, action);
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
        {!captures.length ? <EmptyState title="No captures here" description="Quick capture something to start." /> : null}
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
  const canQuickProject = Boolean(defaultProjectDomainId(domains));
  const canQuickResource = Boolean(notesDomainId(domains));

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
          <button aria-label="Convert to project" title={canQuickProject ? "Convert to Project" : "Review this capture to choose an Area for the Project"} disabled={!canQuickProject} onClick={() => onQuickTriage("project")} className="cos-btn cos-btn-ghost min-h-10 justify-center px-3 py-2 text-xs disabled:opacity-40 sm:w-auto"><FolderKanban className="h-4 w-4" /> Project</button>
          <button aria-label="Convert to resource note" disabled={!canQuickResource} onClick={() => onQuickTriage("note")} className="cos-btn cos-btn-ghost min-h-10 justify-center px-3 py-2 text-xs disabled:opacity-40 sm:w-auto"><FileText className="h-4 w-4" /> Resource</button>
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
        <EmptyState title="Inbox review is done" description="There are no unprocessed captures in the queue." />
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
      if (!currentDraft.projectDomainId) return;
      onTriage(currentCapture.id, {
        type: "project",
        name: currentDraft.projectName,
        domainId: currentDraft.projectDomainId,
        currentObjective: currentDraft.details === currentCapture.text ? "" : currentDraft.details
      });
      return;
    }
    if (currentDraft.mode === "note") {
      if (!currentDraft.noteDomainId) return;
      onTriage(currentCapture.id, {
        type: "note",
        title: currentDraft.noteTitle,
        content: currentDraft.noteContent,
        domainId: currentDraft.noteDomainId
      });
      return;
    }
    if (currentDraft.attachProjectId) onTriage(currentCapture.id, { type: "attach-project", projectId: currentDraft.attachProjectId });
  }

  const canSubmit =
    draft.mode === "attach-project"
      ? Boolean(draft.attachProjectId)
      : draft.mode === "project"
        ? Boolean(draft.projectName.trim() && draft.projectDomainId)
        : draft.mode === "note"
          ? Boolean(draft.noteTitle.trim() && draft.noteDomainId)
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
              <select aria-label="Project Area" value={draft.projectDomainId} onChange={(event) => update("projectDomainId", event.target.value)} className="cos-input w-full px-3 py-2 text-sm">
                <option value="">Choose an Area</option>
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
              <select aria-label="Resource Area" value={draft.noteDomainId} onChange={(event) => update("noteDomainId", event.target.value)} className="cos-input w-full px-3 py-2 text-sm">
                <option value="">Choose an Area</option>
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
              <option value="">Choose a Project</option>
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
