"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CalendarClock, CalendarDays, Check, Clock3, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { MarkdownEditor } from "@/components/workspace/MarkdownEditor";
import { dateKeyToLocalDate } from "@/lib/dates";
import { useWorkspace } from "@/lib/client-store";
import type { CaptureLineResult } from "@/components/workspace/editor/editorTypes";
import type { Deadline, Task, TaskStatus } from "@/lib/types";

export interface CommandTaskRow {
  task: Task;
  labels: string[];
}

export interface CommandTaskGroup {
  id: string;
  title: string;
  rows: CommandTaskRow[];
}

export interface CommandDateGroup {
  id: string;
  title: string;
  rows: Deadline[];
}

function formatDateKey(dateKey: string) {
  const date = dateKeyToLocalDate(dateKey);
  return date ? format(date, "MMM d, yyyy") : dateKey;
}

function autosaveLabel(state: "idle" | "dirty" | "saved") {
  if (state === "dirty") return "Autosaving...";
  if (state === "saved") return "Saved";
  return "Ready";
}

export function LiveBlock({
  title,
  count,
  action,
  children,
  testId
}: {
  title: string;
  count?: number;
  action?: ReactNode;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <section data-testid={testId} className="command-live-block border-t border-[var(--cos-border)] py-5">
      <div className="mb-3 flex min-h-9 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <h2 className="text-sm font-bold text-[var(--cos-text-strong)]">{title}</h2>
          {count !== undefined ? <span className="cos-pill cos-pill-muted">{count}</span> : null}
        </div>
        {action ? <div className="w-full sm:ml-auto sm:w-auto">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function CommandPageEditor({
  value,
  onSave,
  onCommandLine,
  placeholder,
  dataTestId,
  minLines = 7
}: {
  value: string;
  onSave: (value: string) => void;
  onCommandLine: (line: string) => CaptureLineResult;
  placeholder: string;
  dataTestId: string;
  minLines?: number;
}) {
  const [draft, setDraft] = useState(value);
  const [saveState, setSaveState] = useState<"idle" | "dirty" | "saved">("idle");
  const lastSavedRef = useRef(value);
  const latestDraftRef = useRef(value);
  const onSaveRef = useRef(onSave);
  const dirtyRef = useRef(false);

  onSaveRef.current = onSave;

  function updateDraft(next: string) {
    latestDraftRef.current = next;
    dirtyRef.current = next !== lastSavedRef.current;
    setDraft(next);
  }

  useEffect(() => {
    if (dirtyRef.current) return;
    lastSavedRef.current = value;
    latestDraftRef.current = value;
    setDraft(value);
    setSaveState("idle");
  }, [value]);

  useEffect(() => {
    if (draft === lastSavedRef.current) return;
    setSaveState("dirty");
    const handle = window.setTimeout(() => {
      onSaveRef.current(draft);
      lastSavedRef.current = draft;
      latestDraftRef.current = draft;
      dirtyRef.current = false;
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1200);
    }, 900);
    return () => window.clearTimeout(handle);
  }, [draft]);

  useEffect(() => {
    return () => {
      const pending = latestDraftRef.current;
      if (pending === lastSavedRef.current) return;
      onSaveRef.current(pending);
      lastSavedRef.current = pending;
      dirtyRef.current = false;
    };
  }, []);

  return (
    <MarkdownEditor
      value={draft}
      onChange={updateDraft}
      onCaptureLine={onCommandLine}
      allowedCaptureCommands={["task", "date"]}
      placeholder={placeholder}
      dataTestId={dataTestId}
      minLines={minLines}
      mode="page"
      hideSaveButton
      footer={
        <>
          <span className="w-full text-[var(--cos-text-subtle)] sm:mr-auto sm:w-auto">{autosaveLabel(saveState)}</span>
          <span className="w-full text-[var(--cos-text-subtle)] sm:w-auto sm:text-right">Hint: /task or /date with [2026-07-10] (09:30)</span>
        </>
      }
    />
  );
}

function EditableTaskTitle({ task }: { task: Task }) {
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
      value={title}
      onChange={(event) => setTitle(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          setTitle(task.title);
          event.currentTarget.blur();
        }
      }}
      aria-label={`Task title ${task.title}`}
      rows={1}
      className={`w-full resize-none overflow-hidden bg-transparent text-sm font-medium leading-5 outline-none ${task.status === "done" ? "text-[var(--cos-text-subtle)] line-through" : "text-[var(--cos-text-strong)]"}`}
    />
  );
}

function CommandTaskItem({ row }: { row: CommandTaskRow }) {
  const { updateTask } = useWorkspace();
  const done = row.task.status === "done";
  return (
    <div data-testid="command-task-row" className="group flex items-start gap-2 border-b border-[var(--cos-border-soft)] py-2 last:border-b-0">
      <button
        type="button"
        aria-label={done ? `Reopen ${row.task.title}` : `Mark ${row.task.title} done`}
        onClick={() => updateTask(row.task.id, { status: done ? "todo" : "done" })}
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-md border sm:h-8 sm:w-8 ${done ? "border-[var(--cos-success)] bg-[var(--cos-success)] text-white" : "border-[var(--cos-border-strong)] text-transparent hover:border-[var(--cos-primary)]"}`}
      >
        <Check className="h-3 w-3" />
      </button>
      <div className="min-w-0 flex-1">
        <EditableTaskTitle task={row.task} />
        <div className="mt-1 flex flex-wrap gap-1.5">
          {row.labels.map((label) => (
            <span key={label} className={`cos-pill ${label === "Overdue" ? "cos-pill-danger" : label === "Done today" ? "cos-pill-success" : label.includes("Today") ? "cos-pill-primary" : label === "In progress" ? "cos-pill-primary" : "cos-pill-muted"}`}>
              {label}
            </span>
          ))}
        </div>
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
      <select
        aria-label={`${row.task.title} status`}
        value={row.task.status}
        onChange={(event) => updateTask(row.task.id, { status: event.target.value as TaskStatus })}
        className="hidden rounded-md bg-transparent px-1 py-1 text-xs font-semibold text-[var(--cos-text-muted)] outline-none hover:bg-[var(--cos-bg-inset)] sm:block"
      >
        <option value="todo">Todo</option>
        <option value="in-progress">In progress</option>
        <option value="blocked">Blocked</option>
        <option value="waiting">Waiting</option>
        <option value="done">Done</option>
        <option value="dropped">Dropped</option>
      </select>
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

export function CommandTaskRows({ groups, emptyTitle = "No tasks here" }: { groups: CommandTaskGroup[]; emptyTitle?: string }) {
  const occupied = groups.filter((group) => group.rows.length);
  if (!occupied.length) {
    return <div className="rounded-lg border border-dashed border-[var(--cos-border)] px-4 py-6 text-center text-sm text-[var(--cos-text-muted)]">{emptyTitle}</div>;
  }

  return (
    <div className="space-y-4">
      {occupied.map((group) => (
        <div key={group.id} data-testid={`command-task-group-${group.id}`}>
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-[var(--cos-text-muted)]">
            <span>{group.title}</span>
            <span className="text-[var(--cos-text-subtle)]">{group.rows.length}</span>
          </div>
          <div className="rounded-lg border border-[var(--cos-border-soft)] bg-[var(--cos-bg-elevated)] px-3">
            {group.rows.map((row) => <CommandTaskItem key={row.task.id} row={row} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function EditableDateTitle({ deadline }: { deadline: Deadline }) {
  const { updateDeadline } = useWorkspace();
  const [title, setTitle] = useState(deadline.title);

  useEffect(() => setTitle(deadline.title), [deadline.title]);

  function commit() {
    const next = title.trim();
    if (!next) {
      setTitle(deadline.title);
      return;
    }
    if (next !== deadline.title) updateDeadline(deadline.id, { title: next });
  }

  return (
    <input
      value={title}
      onChange={(event) => setTitle(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          setTitle(deadline.title);
          event.currentTarget.blur();
        }
      }}
      aria-label={`Date title ${deadline.title}`}
      className="w-full bg-transparent text-sm font-semibold text-[var(--cos-text-strong)] outline-none"
    />
  );
}

function CommandDateItem({ deadline }: { deadline: Deadline }) {
  const { updateDeadline } = useWorkspace();
  return (
    <div data-testid="command-date-row" className="group flex items-start gap-2 border-b border-[var(--cos-border-soft)] py-2 last:border-b-0">
      <div className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-md bg-[var(--cos-date-soft)] text-[var(--cos-date)]">
        <CalendarClock className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <EditableDateTitle deadline={deadline} />
        <div className="mt-1 flex flex-wrap gap-1.5">
          <span className="cos-pill cos-pill-muted">{formatDateKey(deadline.date)}</span>
          {deadline.time ? <span className="cos-pill cos-pill-primary">{deadline.time}</span> : null}
          {deadline.location ? <span className="cos-pill cos-pill-muted">{deadline.location}</span> : null}
        </div>
      </div>
      <input
        aria-label={`${deadline.title} date`}
        type="date"
        value={deadline.date}
        onChange={(event) => updateDeadline(deadline.id, { date: event.target.value })}
        className="hidden bg-transparent text-xs font-semibold text-[var(--cos-text-muted)] outline-none sm:block"
      />
      <input
        aria-label={`${deadline.title} date time`}
        type="time"
        value={deadline.time ?? ""}
        onChange={(event) => updateDeadline(deadline.id, { time: event.target.value || null })}
        className="hidden w-[5.2rem] bg-transparent text-xs font-semibold text-[var(--cos-text-muted)] outline-none sm:block"
      />
      <button
        type="button"
        aria-label={deadline.archivedAt ? `Restore ${deadline.title}` : `Archive ${deadline.title}`}
        onClick={() => updateDeadline(deadline.id, { archivedAt: deadline.archivedAt ? null : new Date().toISOString() })}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-[var(--cos-text-subtle)] opacity-80 hover:bg-[var(--cos-bg-inset)] hover:text-[var(--cos-text)] group-hover:opacity-100 sm:h-8 sm:w-8"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function CommandDateRows({ groups, emptyTitle = "No dates here" }: { groups: CommandDateGroup[]; emptyTitle?: string }) {
  const occupied = groups.filter((group) => group.rows.length);
  if (!occupied.length) {
    return <div className="rounded-lg border border-dashed border-[var(--cos-border)] px-4 py-6 text-center text-sm text-[var(--cos-text-muted)]">{emptyTitle}</div>;
  }

  return (
    <div className="space-y-4">
      {occupied.map((group) => (
        <div key={group.id} data-testid={`command-date-group-${group.id}`}>
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-[var(--cos-text-muted)]">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>{group.title}</span>
            <span className="text-[var(--cos-text-subtle)]">{group.rows.length}</span>
          </div>
          <div className="rounded-lg border border-[var(--cos-border-soft)] bg-[var(--cos-bg-elevated)] px-3">
            {group.rows.map((deadline) => <CommandDateItem key={deadline.id} deadline={deadline} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
