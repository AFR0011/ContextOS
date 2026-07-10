"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import { CalendarClock, CalendarMinus, CalendarPlus, Check, Clock3, GripVertical, MoreHorizontal, Trash2 } from "lucide-react";
import { useWorkspace } from "@/lib/client-store";
import type { Deadline, Task } from "@/lib/types";

export type DailyScheduleRow =
  | {
      type?: "task";
      task: Task;
      labels?: string[];
    }
  | {
      type: "deadline";
      deadline: Deadline;
      labels?: string[];
    };

type TaskScheduleRow = Extract<DailyScheduleRow, { task: Task }>;
type DeadlineScheduleRow = Extract<DailyScheduleRow, { type: "deadline" }>;
type DailyScheduleOrder = "schedule" | "preserve";
type TaskPlacementAction = "add" | "remove";

function isTaskRow(row: DailyScheduleRow): row is TaskScheduleRow {
  return "task" in row;
}

function rowTime(row: DailyScheduleRow) {
  return isTaskRow(row) ? row.task.scheduledTime : row.deadline.time;
}

function rowCreatedAt(row: DailyScheduleRow) {
  return isTaskRow(row) ? row.task.createdAt : row.deadline.createdAt;
}

function rowKey(row: DailyScheduleRow) {
  return isTaskRow(row) ? `task-${row.task.id}` : `deadline-${row.deadline.id}`;
}

function taskIdFromDrop(event: DragEvent) {
  return event.dataTransfer.getData("application/x-contextos-task-id") || event.dataTransfer.getData("text/plain");
}

function placementLabel(action: TaskPlacementAction) {
  return action === "add" ? "Add to timeline" : "Remove from timeline";
}

function placementIcon(action: TaskPlacementAction) {
  return action === "add" ? CalendarPlus : CalendarMinus;
}

function TaskPlacementMenu({
  task,
  action,
  open,
  onOpenChange,
  onAction
}: {
  task: Task;
  action?: TaskPlacementAction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAction?: (task: Task) => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(event: MouseEvent) {
      if (menuRef.current?.contains(event.target as Node)) return;
      onOpenChange(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [onOpenChange, open]);

  if (!action || !onAction) return null;

  const label = placementLabel(action);
  const Icon = placementIcon(action);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-label={`${label} ${task.title}`}
        title={label}
        onClick={(event) => {
          event.stopPropagation();
          onOpenChange(!open);
        }}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-[var(--cos-text-subtle)] opacity-80 hover:bg-[var(--cos-bg-inset)] hover:text-[var(--cos-text)] group-hover:opacity-100 sm:h-7 sm:w-7"
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 top-8 z-20 w-44 rounded-lg border border-[var(--cos-border)] bg-[var(--cos-bg-elevated)] p-1 shadow-md">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onAction(task);
              onOpenChange(false);
            }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs font-semibold text-[var(--cos-text)] hover:bg-[var(--cos-bg-soft)]"
          >
            <Icon className="h-3.5 w-3.5 text-[var(--cos-primary)]" />
            {label}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function TaskTitle({ task }: { task: Task }) {
  const { updateTask } = useWorkspace();
  const [title, setTitle] = useState(task.title);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => setTitle(task.title), [task.title]);
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [title]);

  function commit() {
    const next = title.trim();
    if (!next) {
      setTitle(task.title);
      return;
    }
    if (next !== task.title) updateTask(task.id, { title: next });
  }

  return (
    <textarea
      ref={textareaRef}
      aria-label={`Task title ${task.title}`}
      value={title}
      onChange={(event) => setTitle(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
        if (event.key === "Escape") {
          setTitle(task.title);
          event.currentTarget.blur();
        }
      }}
      rows={1}
      className={`min-w-0 w-full resize-none overflow-hidden bg-transparent text-sm leading-5 outline-none ${task.status === "done" ? "text-[var(--cos-text-subtle)] line-through" : "font-medium text-[var(--cos-text-strong)]"}`}
    />
  );
}

function TimelineTaskRow({
  row,
  draggableTasks,
  taskPlacementAction,
  onTaskPlacementAction
}: {
  row: TaskScheduleRow;
  draggableTasks: boolean;
  taskPlacementAction?: TaskPlacementAction;
  onTaskPlacementAction?: (task: Task) => void;
}) {
  const { updateTask } = useWorkspace();
  const done = row.task.status === "done";
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      data-testid="daily-schedule-task-row"
      draggable={draggableTasks}
      onDragStart={(event) => {
        if (!draggableTasks) return;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("application/x-contextos-task-id", row.task.id);
        event.dataTransfer.setData("text/plain", row.task.id);
      }}
      onContextMenu={(event) => {
        if (!taskPlacementAction || !onTaskPlacementAction) return;
        event.preventDefault();
        setMenuOpen(true);
      }}
      className="group flex items-start gap-2 border-b border-[var(--cos-border-soft)] px-1 py-2 last:border-b-0"
    >
      {draggableTasks ? (
        <div className="mt-1 grid h-5 w-4 shrink-0 place-items-center text-[var(--cos-text-subtle)]" aria-hidden="true">
          <GripVertical className="h-4 w-4" />
        </div>
      ) : null}
      <button
        type="button"
        aria-label={done ? `Reopen ${row.task.title}` : `Mark ${row.task.title} done`}
        onClick={() => updateTask(row.task.id, { status: done ? "todo" : "done" })}
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-md border sm:mt-1 sm:h-7 sm:w-7 ${done ? "border-[var(--cos-success)] bg-[var(--cos-success)] text-white" : "border-[var(--cos-border-strong)] text-transparent hover:border-[var(--cos-primary)]"}`}
      >
        <Check className="h-3 w-3" />
      </button>

      <div className="min-w-0 flex-1">
        <TaskTitle task={row.task} />
        {row.labels?.length ? (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {row.labels.map((label) => <span key={label} className="cos-pill cos-pill-muted">{label}</span>)}
          </div>
        ) : null}
      </div>

      <label className="hidden shrink-0 items-center gap-1 text-[var(--cos-text-subtle)] sm:flex">
        <Clock3 className="h-3.5 w-3.5" />
        <input
          aria-label={`${row.task.title} scheduled time`}
          type="time"
          value={row.task.scheduledTime ?? ""}
          onChange={(event) => updateTask(row.task.id, { scheduledTime: event.target.value || null })}
          className="w-[5.2rem] bg-transparent text-xs font-medium text-[var(--cos-text-muted)] outline-none"
        />
      </label>

      <TaskPlacementMenu
        task={row.task}
        action={taskPlacementAction}
        open={menuOpen}
        onOpenChange={setMenuOpen}
        onAction={onTaskPlacementAction}
      />

      <button
        type="button"
        aria-label={`Delete ${row.task.title}`}
        onClick={() => updateTask(row.task.id, { trashedAt: new Date().toISOString() })}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-[var(--cos-text-subtle)] opacity-80 hover:bg-[var(--cos-danger-soft)] hover:text-[var(--cos-danger-text)] group-hover:opacity-100 sm:h-8 sm:w-8"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function DeadlineTimelineRow({ row }: { row: DeadlineScheduleRow }) {
  const { updateDeadline } = useWorkspace();
  const archived = Boolean(row.deadline.archivedAt);

  return (
    <div data-testid="daily-schedule-date-row" className={`group flex items-start gap-2 border-b border-[var(--cos-border-soft)] px-1 py-2 last:border-b-0 ${archived ? "opacity-60" : ""}`}>
      <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[var(--cos-date-soft)] text-[var(--cos-date)]">
        <CalendarClock className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-5 text-[var(--cos-text-strong)]">{row.deadline.title}</p>
        {row.labels?.length ? (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {row.labels.map((label) => <span key={label} className="cos-pill cos-pill-muted">{label}</span>)}
          </div>
        ) : null}
      </div>

      <label className="hidden shrink-0 items-center gap-1 text-[var(--cos-text-subtle)] sm:flex">
        <Clock3 className="h-3.5 w-3.5" />
        <input
          aria-label={`${row.deadline.title} date time`}
          type="time"
          value={row.deadline.time ?? ""}
          onChange={(event) => updateDeadline(row.deadline.id, { time: event.target.value || null })}
          className="w-[5.2rem] bg-transparent text-xs font-medium text-[var(--cos-text-muted)] outline-none"
        />
      </label>

      <button
        type="button"
        aria-label={archived ? `Restore ${row.deadline.title}` : `Archive ${row.deadline.title}`}
        onClick={() => updateDeadline(row.deadline.id, { archivedAt: archived ? null : new Date().toISOString() })}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-[var(--cos-text-subtle)] opacity-80 hover:bg-[var(--cos-bg-inset)] hover:text-[var(--cos-text)] group-hover:opacity-100 sm:h-7 sm:w-7"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function DailySchedule({
  rows,
  today: _today,
  emptyTitle = "No timeline items",
  emptyDescription = "Add one task for today.",
  order = "schedule",
  draggableTasks = false,
  taskPlacementAction,
  onTaskPlacementAction,
  onTaskDrop
}: {
  rows: DailyScheduleRow[];
  today: string;
  emptyTitle?: string;
  emptyDescription?: string;
  order?: DailyScheduleOrder;
  draggableTasks?: boolean;
  taskPlacementAction?: TaskPlacementAction;
  onTaskPlacementAction?: (task: Task) => void;
  onTaskDrop?: (taskId: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const ordered = useMemo(() => {
    if (order === "preserve") return rows;
    return [...rows].sort((a, b) => {
      const aTime = rowTime(a) ?? "99:99";
      const bTime = rowTime(b) ?? "99:99";
      if (aTime !== bTime) return aTime.localeCompare(bTime);
      return rowCreatedAt(a).localeCompare(rowCreatedAt(b));
    });
  }, [order, rows]);

  const dropHandlers = onTaskDrop ? {
    onDragOver: (event: DragEvent<HTMLDivElement>) => {
      if (!taskIdFromDrop(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setDragOver(true);
    },
    onDragLeave: () => setDragOver(false),
    onDrop: (event: DragEvent<HTMLDivElement>) => {
      const taskId = taskIdFromDrop(event);
      setDragOver(false);
      if (!taskId) return;
      event.preventDefault();
      onTaskDrop(taskId);
    }
  } : {};

  if (!ordered.length) {
    return (
      <div
        data-testid="daily-schedule-drop-zone"
        {...dropHandlers}
        className={`rounded-lg border border-dashed px-4 py-6 text-center ${dragOver ? "border-[var(--cos-primary)] bg-[var(--cos-primary-soft)]" : "border-[var(--cos-border)]"}`}
      >
        <p className="text-sm font-medium text-[var(--cos-text-muted)]">{emptyTitle}</p>
        <p className="mt-1 text-xs text-[var(--cos-text-subtle)]">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div
      data-testid="daily-schedule-drop-zone"
      {...dropHandlers}
      className={`rounded-lg border bg-[var(--cos-bg-elevated)] px-2 ${dragOver ? "border-[var(--cos-primary)] ring-2 ring-[var(--cos-focus)]" : "border-[var(--cos-border-soft)]"}`}
    >
      <div data-testid="daily-timeline-list">
        {ordered.map((row) => isTaskRow(row)
          ? (
              <TimelineTaskRow
                key={rowKey(row)}
                row={row}
                draggableTasks={draggableTasks}
                taskPlacementAction={taskPlacementAction}
                onTaskPlacementAction={onTaskPlacementAction}
              />
            )
          : <DeadlineTimelineRow key={rowKey(row)} row={row} />)}
      </div>
    </div>
  );
}
