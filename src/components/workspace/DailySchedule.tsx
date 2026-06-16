"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Clock3, Trash2 } from "lucide-react";
import { useWorkspace } from "@/lib/client-store";
import type { Task } from "@/lib/types";

export interface DailyScheduleRow {
  task: Task;
  labels?: string[];
}

type DailyScheduleOrder = "schedule" | "preserve";

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

function TimelineTaskRow({ row }: { row: DailyScheduleRow }) {
  const { updateTask } = useWorkspace();
  const done = row.task.status === "done";

  return (
    <div className="group flex items-start gap-2 border-b border-[var(--cos-border-soft)] px-1 py-2 last:border-b-0">
      <button
        type="button"
        aria-label={done ? `Reopen ${row.task.title}` : `Mark ${row.task.title} done`}
        onClick={() => updateTask(row.task.id, { status: done ? "todo" : "done" })}
        className={`mt-1 grid h-5 w-5 shrink-0 place-items-center rounded border ${done ? "border-[var(--cos-success)] bg-[var(--cos-success)] text-white" : "border-[var(--cos-border-strong)] text-transparent hover:border-[var(--cos-primary)]"}`}
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

      <label className="flex shrink-0 items-center gap-1 text-[var(--cos-text-subtle)]">
        <Clock3 className="h-3.5 w-3.5" />
        <input
          aria-label={`${row.task.title} scheduled time`}
          type="time"
          value={row.task.scheduledTime ?? ""}
          onChange={(event) => updateTask(row.task.id, { scheduledTime: event.target.value || null })}
          className="w-[5.2rem] bg-transparent text-xs font-medium text-[var(--cos-text-muted)] outline-none"
        />
      </label>

      <button
        type="button"
        aria-label={`Delete ${row.task.title}`}
        onClick={() => updateTask(row.task.id, { trashedAt: new Date().toISOString() })}
        className="grid h-7 w-7 shrink-0 place-items-center rounded text-[var(--cos-text-subtle)] opacity-60 hover:bg-[var(--cos-danger-soft)] hover:text-[var(--cos-danger-text)] group-hover:opacity-100"
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
  order = "schedule"
}: {
  rows: DailyScheduleRow[];
  today: string;
  emptyTitle?: string;
  emptyDescription?: string;
  order?: DailyScheduleOrder;
}) {
  const ordered = useMemo(() => {
    if (order === "preserve") return rows;
    return [...rows].sort((a, b) => {
      const aTime = a.task.scheduledTime ?? "99:99";
      const bTime = b.task.scheduledTime ?? "99:99";
      if (aTime !== bTime) return aTime.localeCompare(bTime);
      return a.task.createdAt.localeCompare(b.task.createdAt);
    });
  }, [order, rows]);

  if (!ordered.length) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--cos-border)] px-4 py-6 text-center">
        <p className="text-sm font-medium text-[var(--cos-text-muted)]">{emptyTitle}</p>
        <p className="mt-1 text-xs text-[var(--cos-text-subtle)]">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div data-testid="daily-timeline-list" className="rounded-lg border border-[var(--cos-border-soft)] bg-[var(--cos-bg-elevated)] px-2">
      {ordered.map((row) => <TimelineTaskRow key={row.task.id} row={row} />)}
    </div>
  );
}
