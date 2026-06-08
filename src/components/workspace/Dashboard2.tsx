"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Circle,
  Eraser,
  FolderKanban,
  NotebookPen,
  type LucideIcon
} from "lucide-react";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { BlockMarkdownEditor } from "@/components/workspace/editor/BlockMarkdownEditor";
import { createEmptyBlock, generateId, parseMarkdownToBlocks, serializeBlocksToMarkdown } from "@/components/workspace/editor/markdownBlocks";
import type { EditorBlock } from "@/components/workspace/editor/editorTypes";
import { dateKeyToLocalDate, localDateKey, localWeekStartKey } from "@/lib/dates";
import { useWorkspace } from "@/lib/client-store";
import { formatScheduledTodoSyntax, parseScheduledTodoSyntax, scheduledTodoValidationMessage, type ScheduledTodoValue } from "@/lib/scheduled-todo";
import type { DashboardPreference, DashboardSectionId, Deadline, Project, ReviewType, Task, TaskStatus } from "@/lib/types";

const DASHBOARD_SECTION_ORDER: DashboardSectionId[] = ["notepad", "projects"];
const DONE_TASK_STATUSES: TaskStatus[] = ["done", "dropped"];
const PROJECT_STALE_DAYS = 14;

type LegacyDashboardSectionId = DashboardSectionId | "dates" | "tasks";
type EntityKey = `task:${string}` | `deadline:${string}`;

interface EntityDraft {
  text: string;
  checked: boolean;
  error?: string;
}

interface NotepadEntityBase {
  key: EntityKey;
  kind: "task" | "deadline";
  id: string;
  dateField?: "plannedDate" | "dueDate";
  dateKey: string;
  canonicalText: string;
  checked: boolean;
  done: boolean;
  overdue: boolean;
  sortTime: string;
  source: Task | Deadline;
}

interface NotepadEntity extends NotepadEntityBase {
  block: EditorBlock;
}

function isTaskOpen(task: Task) {
  return !task.trashedAt && !task.archivedAt && !DONE_TASK_STATUSES.includes(task.status);
}

function projectName(projects: Project[], projectId: string | null | undefined) {
  if (!projectId) return "";
  return projects.find((project) => project.id === projectId)?.name ?? "";
}

function formatDateKey(dateKey: string) {
  const date = dateKeyToLocalDate(dateKey);
  return date ? format(date, "MMM d, yyyy") : dateKey;
}

function sectionDefaults(preference?: DashboardPreference) {
  const valid = new Set<DashboardSectionId>(DASHBOARD_SECTION_ORDER);
  const sectionOrder = ((preference?.sectionOrder ?? []) as LegacyDashboardSectionId[]).filter((id): id is DashboardSectionId => valid.has(id as DashboardSectionId));
  const collapsedSections = ((preference?.collapsedSections ?? []) as LegacyDashboardSectionId[]).filter((id): id is DashboardSectionId => valid.has(id as DashboardSectionId));

  return {
    collapsedSections,
    dateWindowDays: preference?.dateWindowDays ?? 14,
    reviewPromptDismissals: preference?.reviewPromptDismissals ?? [],
    showCompleted: preference?.showCompleted ?? false,
    sectionOrder: sectionOrder.length ? sectionOrder : DASHBOARD_SECTION_ORDER
  };
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
        <p className="mt-1 text-sm text-[var(--cos-text-muted)]">Notes, dated work, deadlines, and active projects in one calm operating view.</p>
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

function entityKey(kind: "task" | "deadline", id: string): EntityKey {
  return `${kind}:${id}` as EntityKey;
}

function taskDateField(task: Task): "plannedDate" | "dueDate" | null {
  if (task.plannedDate) return "plannedDate";
  if (task.dueDate) return "dueDate";
  return null;
}

function taskDateKey(task: Task) {
  const field = taskDateField(task);
  return field ? task[field] : null;
}

function scratchBlocksFromMarkdown(markdown: string) {
  if (!markdown.trim()) return [createEmptyBlock("todo")];
  return parseMarkdownToBlocks(markdown);
}

function serializeScratchBlocks(blocks: EditorBlock[]) {
  if (blocks.length === 1 && (blocks[0].type === "paragraph" || blocks[0].type === "todo") && blocks[0].text.trim() === "") {
    return "";
  }
  return serializeBlocksToMarkdown(blocks);
}

function appendScratchBlock(blocks: EditorBlock[], text: string, checked = false) {
  const trimmed = text.trim();
  if (!trimmed) return blocks;
  const base = serializeScratchBlocks(blocks) ? blocks : [];
  return [...base, { id: generateId(), type: "todo" as const, text: trimmed, checked }];
}

function dateFragmentInProgress(text: string) {
  return /[()[\]]/.test(text);
}

function sortEntities(a: NotepadEntityBase, b: NotepadEntityBase) {
  if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
  const byDate = a.dateKey.localeCompare(b.dateKey);
  if (byDate !== 0) return byDate;
  const byTime = a.sortTime.localeCompare(b.sortTime);
  if (byTime !== 0) return byTime;
  return a.canonicalText.localeCompare(b.canonicalText);
}

function NotepadGroup({
  title,
  description,
  count,
  children
}: {
  title: string;
  description?: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2 px-1">
        <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--cos-text-muted)]">{title}</h3>
        {count !== undefined ? <span className="text-xs text-[var(--cos-text-subtle)]">({count})</span> : null}
        {description ? <span className="ml-auto truncate text-[11px] text-[var(--cos-text-subtle)]">{description}</span> : null}
      </div>
      {children}
    </section>
  );
}

function NotepadSection() {
  const { data, sync, addTask, updateTask, addDeadline, updateDeadline, updateDashboardScratchpad } = useWorkspace();
  const scratchpad = data.dashboardScratchpads[0];
  const savedContent = scratchpad?.content ?? "";
  const today = localDateKey();
  const [scratchBlocks, setScratchBlocks] = useState<EditorBlock[]>(() => scratchBlocksFromMarkdown(savedContent));
  const [scratchValidation, setScratchValidation] = useState<Record<string, string>>({});
  const [entityDrafts, setEntityDrafts] = useState<Record<EntityKey, EntityDraft>>({});
  const [saveState, setSaveState] = useState<"idle" | "dirty" | "saved">("idle");
  const lastSavedRef = useRef(savedContent);

  const baseEntities = useMemo<NotepadEntityBase[]>(() => {
    const taskEntities: NotepadEntityBase[] = data.tasks
      .filter((task) => !task.trashedAt && !task.archivedAt && task.status !== "dropped")
      .flatMap((task) => {
        const field = taskDateField(task);
        const dateKey = taskDateKey(task);
        if (!field || !dateKey) return [];
        const done = task.status === "done";
        return [{
          key: entityKey("task", task.id),
          kind: "task" as const,
          id: task.id,
          dateField: field,
          dateKey,
          canonicalText: formatScheduledTodoSyntax({ title: task.title, dateKey, time: task.startTime, location: "" }),
          checked: done,
          done,
          overdue: dateKey < today && isTaskOpen(task),
          sortTime: task.startTime ?? "99:99",
          source: task
        }];
      });

    const deadlineEntities: NotepadEntityBase[] = data.deadlines
      .filter((deadline) => !deadline.trashedAt)
      .map((deadline) => {
        const done = Boolean(deadline.archivedAt);
        return {
          key: entityKey("deadline", deadline.id),
          kind: "deadline" as const,
          id: deadline.id,
          dateKey: deadline.date,
          canonicalText: formatScheduledTodoSyntax({ title: deadline.title, dateKey: deadline.date, time: deadline.time, location: deadline.location }),
          checked: done,
          done,
          overdue: deadline.date < today && !deadline.archivedAt,
          sortTime: deadline.time ?? "99:99",
          source: deadline
        };
      });

    return [...taskEntities, ...deadlineEntities].sort(sortEntities);
  }, [data.deadlines, data.tasks, today]);

  const entities = useMemo<NotepadEntity[]>(() => {
    return baseEntities.map((entity) => {
      const draft = entityDrafts[entity.key];
      return {
        ...entity,
        block: {
          id: entity.key,
          type: "todo",
          text: draft?.text ?? entity.canonicalText,
          checked: draft?.checked ?? entity.checked,
          entityRef: {
            kind: entity.kind,
            id: entity.id,
            dateField: entity.dateField
          }
        }
      };
    });
  }, [baseEntities, entityDrafts]);

  useEffect(() => {
    lastSavedRef.current = savedContent;
    setScratchBlocks(scratchBlocksFromMarkdown(savedContent));
    setScratchValidation({});
    setSaveState("idle");
  }, [savedContent]);

  useEffect(() => {
    const liveKeys = new Set(baseEntities.map((entity) => entity.key));
    setEntityDrafts((current) => {
      const next: Record<EntityKey, EntityDraft> = {};
      for (const [key, draft] of Object.entries(current) as [EntityKey, EntityDraft][]) {
        if (!liveKeys.has(key)) continue;
        const base = baseEntities.find((entity) => entity.key === key);
        if (base && !draft.error && draft.text === base.canonicalText && draft.checked === base.checked) continue;
        next[key] = draft;
      }
      return next;
    });
  }, [baseEntities]);

  const scratchMarkdown = useMemo(() => serializeScratchBlocks(scratchBlocks), [scratchBlocks]);

  useEffect(() => {
    if (scratchMarkdown === lastSavedRef.current) return;
    setSaveState("dirty");
    const handle = window.setTimeout(() => {
      updateDashboardScratchpad(scratchMarkdown);
      lastSavedRef.current = scratchMarkdown;
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1200);
    }, 900);
    return () => window.clearTimeout(handle);
  }, [scratchMarkdown, updateDashboardScratchpad]);

  function createScheduledEntity(value: ScheduledTodoValue, checked = false) {
    if (value.time && !value.location) {
      addTask({ title: value.title, plannedDate: value.dateKey, startTime: value.time, status: checked ? "done" : "todo" });
      return;
    }
    addDeadline({
      title: value.title,
      date: value.dateKey,
      time: value.time,
      location: value.location,
      projectId: null,
      archivedAt: checked ? new Date().toISOString() : null
    });
  }

  function setEntityDraft(key: EntityKey, draft: EntityDraft) {
    setEntityDrafts((current) => ({ ...current, [key]: draft }));
  }

  function markEntityChecked(entity: NotepadEntityBase, checked: boolean) {
    if (entity.kind === "task") {
      updateTask(entity.id, { status: checked ? "done" : "todo" });
    } else {
      updateDeadline(entity.id, { archivedAt: checked ? new Date().toISOString() : null });
    }
  }

  function trashEntity(entity: NotepadEntityBase) {
    if (entity.kind === "task") updateTask(entity.id, { trashedAt: new Date().toISOString() });
    else updateDeadline(entity.id, { trashedAt: new Date().toISOString() });
  }

  function updateEntityFromSyntax(entity: NotepadEntityBase, value: ScheduledTodoValue, checked: boolean) {
    if (entity.kind === "task") {
      if (value.location) {
        setEntityDraft(entity.key, {
          text: formatScheduledTodoSyntax(value),
          checked,
          error: "Task-backed items cannot store a location yet. Use a new location-bearing line to create a deadline."
        });
        return;
      }
      const task = entity.source as Task;
      updateTask(entity.id, {
        title: value.title,
        [entity.dateField ?? "plannedDate"]: value.dateKey,
        startTime: value.time,
        status: checked ? "done" : task.status === "done" ? "todo" : task.status
      });
      setEntityDraft(entity.key, { text: formatScheduledTodoSyntax(value), checked });
      return;
    }

    const deadline = entity.source as Deadline;
    updateDeadline(entity.id, {
      title: value.title,
      date: value.dateKey,
      time: value.time,
      location: value.location,
      archivedAt: checked ? deadline.archivedAt ?? new Date().toISOString() : null
    });
    setEntityDraft(entity.key, { text: formatScheduledTodoSyntax(value), checked });
  }

  function handleScratchBlocksChange(nextBlocks: EditorBlock[]) {
    const remaining: EditorBlock[] = [];
    const validations: Record<string, string> = {};

    for (const block of nextBlocks) {
      const eligible = block.type === "todo" || block.type === "paragraph";
      if (eligible) {
        const parsed = parseScheduledTodoSyntax(block.text);
        if (parsed.kind === "scheduled") {
          createScheduledEntity(parsed.value, Boolean(block.checked));
          continue;
        }
        if (parsed.kind === "invalid") {
          validations[block.id] = scheduledTodoValidationMessage(parsed);
        }
      }
      remaining.push(block);
    }

    setScratchValidation(validations);
    setScratchBlocks(remaining.length ? remaining : [createEmptyBlock("todo")]);
  }

  function handleEntityBlocksChange(groupEntities: NotepadEntity[], nextBlocks: EditorBlock[]) {
    const groupByKey = new Map(groupEntities.map((entity) => [entity.key, entity]));
    const seen = new Set<EntityKey>();

    for (const block of nextBlocks) {
      if (!block.entityRef) {
        if (!block.text.trim()) continue;
        const parsed = parseScheduledTodoSyntax(block.text);
        if (parsed.kind === "scheduled") createScheduledEntity(parsed.value, Boolean(block.checked));
        else setScratchBlocks((current) => appendScratchBlock(current, block.text, Boolean(block.checked)));
        continue;
      }

      const key = entityKey(block.entityRef.kind, block.entityRef.id);
      const entity = groupByKey.get(key);
      if (!entity) continue;
      seen.add(key);

      const checked = Boolean(block.checked);
      const textChanged = block.text !== entity.canonicalText;
      if (checked !== entity.checked && !textChanged) {
        markEntityChecked(entity, checked);
      }

      if (!textChanged) {
        setEntityDraft(entity.key, { text: block.text, checked });
        continue;
      }

      const parsed = parseScheduledTodoSyntax(block.text);
      if (parsed.kind === "scheduled") {
        updateEntityFromSyntax(entity, parsed.value, checked);
        continue;
      }

      if (parsed.kind === "invalid") {
        setEntityDraft(entity.key, { text: block.text, checked, error: scheduledTodoValidationMessage(parsed) });
        continue;
      }

      if (dateFragmentInProgress(block.text)) {
        setEntityDraft(entity.key, {
          text: block.text,
          checked,
          error: "Keep a valid (DDMMYY) date on scheduled items, or remove the date fully to make it scratch."
        });
        continue;
      }

      trashEntity(entity);
      if (block.text.trim()) setScratchBlocks((current) => appendScratchBlock(current, block.text, checked));
    }

    for (const entity of groupEntities) {
      if (!seen.has(entity.key)) trashEntity(entity);
    }
  }

  function clear() {
    setScratchBlocks([createEmptyBlock("todo")]);
    setScratchValidation({});
    updateDashboardScratchpad("");
    lastSavedRef.current = "";
    setSaveState("saved");
  }

  const todayItems = entities.filter((entity) => !entity.done && entity.dateKey <= today);
  const upcomingItems = entities.filter((entity) => !entity.done && entity.dateKey > today);
  const completedItems = entities.filter((entity) => entity.done);
  const scratchTodoCount = scratchBlocks.filter((block) => block.type === "todo" && block.text.trim()).length;
  const entityValidation = Object.fromEntries(entities.flatMap((entity) => {
    const message = entityDrafts[entity.key]?.error;
    return message ? [[entity.key, message]] : [];
  }));

  return (
    <div className="space-y-5">
      <NotepadGroup title="Today" count={todayItems.length} description={todayItems.length ? formatDateKey(today) : undefined}>
        {todayItems.length ? (
          <BlockMarkdownEditor
            value=""
            blocks={todayItems.map((item) => item.block)}
            onBlocksChange={(blocks) => handleEntityBlocksChange(todayItems, blocks)}
            validationMessages={entityValidation}
            dataTestId="dashboard-notepad-today"
            placeholder="Add or edit today's item..."
            minLines={Math.max(2, todayItems.length)}
            hideSaveButton
            defaultBlockType="todo"
            className="border-0 bg-[var(--cos-bg-soft)] shadow-none"
          />
        ) : (
          <p className="rounded-lg bg-[var(--cos-bg-soft)] px-3 py-3 text-sm text-[var(--cos-text-subtle)]">No dated items for today.</p>
        )}
      </NotepadGroup>

      {upcomingItems.length ? (
        <NotepadGroup title="Upcoming" count={upcomingItems.length}>
          <BlockMarkdownEditor
            value=""
            blocks={upcomingItems.map((item) => item.block)}
            onBlocksChange={(blocks) => handleEntityBlocksChange(upcomingItems, blocks)}
            validationMessages={entityValidation}
            dataTestId="dashboard-notepad-upcoming"
            placeholder="Add or edit upcoming item..."
            minLines={upcomingItems.length}
            hideSaveButton
            defaultBlockType="todo"
            className="border-0 bg-[var(--cos-bg-soft)] shadow-none"
          />
        </NotepadGroup>
      ) : null}

      {completedItems.length ? (
        <NotepadGroup title="Completed" count={completedItems.length}>
          <BlockMarkdownEditor
            value=""
            blocks={completedItems.map((item) => item.block)}
            onBlocksChange={(blocks) => handleEntityBlocksChange(completedItems, blocks)}
            validationMessages={entityValidation}
            dataTestId="dashboard-notepad-completed"
            placeholder="Completed items..."
            minLines={completedItems.length}
            hideSaveButton
            defaultBlockType="todo"
            className="border-0 bg-[var(--cos-bg-soft)] shadow-none"
          />
        </NotepadGroup>
      ) : null}

      <NotepadGroup title="Scratch" count={scratchTodoCount} description="Plain notes and todos stay here">
        <BlockMarkdownEditor
          value={savedContent}
          blocks={scratchBlocks}
          onBlocksChange={handleScratchBlocksChange}
          validationMessages={scratchValidation}
          placeholder="Type a todo or add (DDMMYY) [HHMM] {Location} to schedule it..."
          minLines={6}
          dataTestId="dashboard-scratchpad"
          hideSaveButton
          defaultBlockType="todo"
          className="min-h-44 bg-[var(--cos-bg-soft)]"
          footer={
            <>
              <span className="mr-auto text-[var(--cos-text-subtle)]">
                {saveState === "dirty" ? "Autosaving..." : saveState === "saved" ? "Saved locally" : scratchpad?.updatedAt ? `Updated ${formatDistanceToNow(parseISO(scratchpad.updatedAt), { addSuffix: true })}` : "Ready"}
              </span>
              {!sync.online ? <span className="cos-pill cos-pill-warning">Offline: queued for sync</span> : null}
              <button
                type="button"
                onClick={clear}
                disabled={!scratchMarkdown.trim()}
                className="cos-btn cos-btn-ghost min-h-9 px-3 py-2 text-xs disabled:opacity-40"
              >
                <Eraser className="h-4 w-4" />
                Clear
              </button>
            </>
          }
        />
      </NotepadGroup>
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
  const preferences = sectionDefaults(data.dashboardPreferences[0]);
  const collapsed = new Set(preferences.collapsedSections);
  const notepadCount = data.tasks.filter((task) => !task.trashedAt && !task.archivedAt && task.status !== "dropped" && (task.plannedDate || task.dueDate)).length +
    data.deadlines.filter((deadline) => !deadline.trashedAt).length;
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
      <CollapsibleSection id="notepad" title="Notepad" icon={NotebookPen} count={notepadCount} collapsed={collapsed.has("notepad")} onToggle={toggleSection}>
        <NotepadSection />
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
          <p><span className="font-semibold">Today:</span> edit scratch todos, dated tasks, and deadlines from the Notepad.</p>
        </div>
      </div>
      <ReviewPrompt preferences={preferences} />
      {preferences.sectionOrder.map((id) => (
        <Fragment key={id}>{sectionComponents[id] ?? null}</Fragment>
      ))}
    </DashboardPageShell>
  );
}
