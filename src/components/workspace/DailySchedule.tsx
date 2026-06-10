"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, CalendarClock, Check } from "lucide-react";
import { useWorkspace } from "@/lib/client-store";
import type { Task, TaskStatus } from "@/lib/types";

const DEFAULT_START_MINUTES = 6 * 60;
const DEFAULT_END_MINUTES = 22 * 60;
const SLOT_MINUTES = 30;
const DONE_STATUSES: TaskStatus[] = ["done", "dropped"];

const taskStatusLabels: Record<TaskStatus, string> = {
  todo: "Todo",
  "in-progress": "In progress",
  blocked: "Blocked",
  waiting: "Waiting",
  done: "Done",
  dropped: "Dropped"
};

export interface DailyScheduleRow {
  task: Task;
  labels?: string[];
}

interface ScheduledRow extends DailyScheduleRow {
  startMinutes: number;
  endMinutes: number;
  slotMinutes: number;
  timeLabel: string;
}

interface UnscheduledRow extends DailyScheduleRow {
  reason: string;
  tone: "warning" | "danger" | "muted";
}

export function taskTimeLabel(task: Pick<Task, "startTime" | "endTime">) {
  if (task.startTime && task.endTime) return `${task.startTime}-${task.endTime}`;
  return task.startTime ?? task.endTime ?? "";
}

function parseTime(value: string | null) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function formatMinutes(minutes: number) {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, minutes));
  const hours = Math.floor(clamped / 60).toString().padStart(2, "0");
  const mins = (clamped % 60).toString().padStart(2, "0");
  return `${hours}:${mins}`;
}

function isTaskOpen(task: Task) {
  return !task.trashedAt && !task.archivedAt && !DONE_STATUSES.includes(task.status);
}

function scheduleReason(task: Task, today: string) {
  if (task.startTime && task.endTime) {
    const start = parseTime(task.startTime);
    const end = parseTime(task.endTime);
    if (start !== null && end !== null && end <= start) {
      return { reason: "Needs attention: end time is before start time", tone: "danger" as const };
    }
  }

  if (task.dueDate && task.dueDate < today && isTaskOpen(task)) {
    return { reason: "Needs attention: overdue", tone: "danger" as const };
  }

  if (task.status === "in-progress" && !task.startTime) {
    return { reason: "In progress without a time", tone: "warning" as const };
  }

  if (!task.startTime) {
    return { reason: "Unscheduled", tone: "muted" as const };
  }

  return null;
}

function partitionRows(rows: DailyScheduleRow[], today: string) {
  const scheduled: ScheduledRow[] = [];
  const unscheduled: UnscheduledRow[] = [];

  rows.forEach((row) => {
    const reason = scheduleReason(row.task, today);
    const startMinutes = parseTime(row.task.startTime);
    if (reason || startMinutes === null) {
      unscheduled.push({ ...row, reason: reason?.reason ?? "Unscheduled", tone: reason?.tone ?? "muted" });
      return;
    }

    const parsedEnd = parseTime(row.task.endTime);
    const endMinutes = parsedEnd && parsedEnd > startMinutes ? parsedEnd : startMinutes + SLOT_MINUTES;
    scheduled.push({
      ...row,
      startMinutes,
      endMinutes,
      slotMinutes: Math.floor(startMinutes / SLOT_MINUTES) * SLOT_MINUTES,
      timeLabel: `${formatMinutes(startMinutes)}-${formatMinutes(endMinutes)}`
    });
  });

  scheduled.sort((a, b) => {
    if (a.task.status === "done" && b.task.status !== "done") return 1;
    if (a.task.status !== "done" && b.task.status === "done") return -1;
    if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
    return a.task.createdAt.localeCompare(b.task.createdAt);
  });
  unscheduled.sort((a, b) => {
    if (a.tone !== b.tone) return a.tone === "danger" ? -1 : b.tone === "danger" ? 1 : a.tone === "warning" ? -1 : 1;
    return a.task.createdAt.localeCompare(b.task.createdAt);
  });

  return { scheduled, unscheduled };
}

function slotRange(scheduled: ScheduledRow[]) {
  if (!scheduled.length) return [];
  const minSlot = Math.min(DEFAULT_START_MINUTES, ...scheduled.map((row) => row.slotMinutes));
  const maxEnd = Math.max(DEFAULT_END_MINUTES, ...scheduled.map((row) => Math.ceil(row.endMinutes / SLOT_MINUTES) * SLOT_MINUTES));
  const slots: number[] = [];
  for (let value = minSlot; value <= maxEnd; value += SLOT_MINUTES) {
    slots.push(value);
  }
  return slots;
}

function TaskToggle({ task }: { task: Task }) {
  const { updateTask } = useWorkspace();
  const done = task.status === "done";
  return (
    <button
      type="button"
      onClick={() => updateTask(task.id, { status: done ? "todo" : "done" })}
      aria-label={done ? `Mark ${task.title} todo` : `Mark ${task.title} done`}
      className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 ${
        done ? "border-[var(--cos-success)] bg-[var(--cos-success)] text-white" : "border-[var(--cos-border-strong)] bg-[var(--cos-bg-elevated)] text-transparent hover:border-[var(--cos-primary)]"
      }`}
    >
      <Check className="h-3.5 w-3.5" />
    </button>
  );
}

function EditableTaskTitle({ task }: { task: Task }) {
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

function TaskCard({ row, children }: { row: DailyScheduleRow; children?: ReactNode }) {
  const { updateTask } = useWorkspace();
  const done = row.task.status === "done";
  const labels = Array.from(new Set([taskStatusLabels[row.task.status], ...(row.labels ?? [])].filter(Boolean)));
  return (
    <div className="rounded-lg border border-[var(--cos-border-soft)] bg-[var(--cos-bg-elevated)] px-3 py-2 shadow-sm">
      <div className="flex items-start gap-3">
        <TaskToggle task={row.task} />
        <div className="min-w-0 flex-1">
          <div className={done ? "line-through opacity-50" : ""}>
            <EditableTaskTitle task={row.task} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {labels.map((label) => (
              <span key={label} className={`cos-pill ${label === "Overdue" || label.includes("attention") ? "cos-pill-danger" : label.includes("Due") || label.includes("In progress") ? "cos-pill-warning" : label.includes("Planned") ? "cos-pill-primary" : "cos-pill-muted"}`}>
                {label}
              </span>
            ))}
            {children}
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <input
              aria-label={`${row.task.title} start time`}
              type="time"
              value={row.task.startTime ?? ""}
              onChange={(event) => updateTask(row.task.id, { startTime: event.target.value || null })}
              className="cos-input bg-[var(--cos-bg-soft)] px-2 py-1 text-xs"
            />
            <input
              aria-label={`${row.task.title} end time`}
              type="time"
              value={row.task.endTime ?? ""}
              onChange={(event) => updateTask(row.task.id, { endTime: event.target.value || null })}
              className="cos-input bg-[var(--cos-bg-soft)] px-2 py-1 text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function DailySchedule({ rows, today, emptyTitle = "No timeline items", emptyDescription = "Add one small block for today." }: { rows: DailyScheduleRow[]; today: string; emptyTitle?: string; emptyDescription?: string }) {
  const { scheduled, unscheduled } = useMemo(() => partitionRows(rows, today), [rows, today]);
  const slots = useMemo(() => slotRange(scheduled), [scheduled]);

  if (!rows.length) {
    return (
      <div className="cos-empty px-4 py-8 text-center" data-testid="daily-schedule-empty">
        <CalendarClock className="mx-auto mb-3 h-10 w-10 text-[var(--cos-text-subtle)]" />
        <p className="text-sm font-medium text-[var(--cos-text-muted)]">{emptyTitle}</p>
        <p className="mt-1 text-xs text-[var(--cos-text-subtle)]">{emptyDescription}</p>
      </div>
    );
  }

  const bySlot = new Map<number, ScheduledRow[]>();
  scheduled.forEach((row) => {
    const current = bySlot.get(row.slotMinutes) ?? [];
    bySlot.set(row.slotMinutes, [...current, row]);
  });

  return (
    <div className="space-y-4" data-testid="daily-schedule">
      <div className="overflow-hidden rounded-lg border border-[var(--cos-border-soft)] bg-[var(--cos-bg-soft)]" data-testid="daily-schedule-grid">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--cos-border-soft)] px-3 py-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--cos-text-muted)]">
            <CalendarClock className="h-4 w-4 text-[var(--cos-primary)]" />
            Schedule
          </div>
          <span className="text-xs text-[var(--cos-text-subtle)]">{scheduled.length} timed</span>
        </div>
        {scheduled.length ? (
          <div className="max-h-[520px] overflow-auto">
            {slots.map((slot) => {
              const slotRows = bySlot.get(slot) ?? [];
              return (
                <div key={slot} data-testid={`schedule-slot-${formatMinutes(slot)}`} className="grid min-h-11 grid-cols-[4.5rem_1fr] border-b border-[var(--cos-border-soft)] last:border-b-0">
                  <div className="border-r border-[var(--cos-border-soft)] px-2 py-2 text-right text-[11px] font-semibold tabular-nums text-[var(--cos-text-subtle)]">{formatMinutes(slot)}</div>
                  <div className="space-y-2 px-2 py-2">
                    {slotRows.map((row) => (
                      <TaskCard key={row.task.id} row={row}>
                        <span className="cos-pill cos-pill-primary"><CalendarClock className="h-3 w-3" />{row.timeLabel}</span>
                      </TaskCard>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-3 py-6 text-center text-sm text-[var(--cos-text-muted)]">No timed items yet.</div>
        )}
      </div>

      {unscheduled.length ? (
        <div className="rounded-lg border border-[var(--cos-warning-border)] bg-[var(--cos-warning-soft)] p-3" data-testid="daily-schedule-unscheduled">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--cos-warning-text)]">
              <AlertTriangle className="h-4 w-4" />
              Unscheduled / needs attention
            </div>
            <span className="text-xs text-[var(--cos-warning-text)]">{unscheduled.length}</span>
          </div>
          <div className="space-y-2">
            {unscheduled.map((row) => (
              <TaskCard key={row.task.id} row={{ task: row.task, labels: [row.reason, ...(row.labels ?? [])] }}>
                {taskTimeLabel(row.task) ? <span className={`cos-pill ${row.tone === "danger" ? "cos-pill-danger" : "cos-pill-primary"}`}>{taskTimeLabel(row.task)}</span> : null}
              </TaskCard>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
