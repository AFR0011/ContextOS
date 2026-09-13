"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Calendar, CalendarClock, MapPin, Plus, Trash2 } from "lucide-react";
import { MarkdownEditor } from "@/components/workspace/MarkdownEditor";
import { useWorkspace } from "@/lib/client-store";
import { localDateKey } from "@/lib/dates";
import type { Project } from "@/lib/types";

function projectName(projects: Project[], id: string | null | undefined) {
  if (!id) return "";
  return projects.find((project) => project.id === id)?.name || "";
}

function Page({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
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

function EmptyState({ icon: Icon, title, description }: { icon: any; title: string; description?: string }) {
  return (
    <div className="cos-empty px-4 py-8 text-center">
      <Icon className="mx-auto mb-3 h-10 w-10 text-[var(--cos-text-subtle)]" />
      <p className="text-sm font-medium text-[var(--cos-text-muted)]">{title}</p>
      {description ? <p className="mt-1 text-xs text-[var(--cos-text-subtle)]">{description}</p> : null}
    </div>
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
                  <EditableField value={deadline.title} placeholder="Date title" onSave={(nextTitle) => updateDeadline(deadline.id, { title: nextTitle })} inputClassName={`font-medium ${overdue ? "text-[var(--cos-danger-text)]" : "text-[var(--cos-text-strong)]"}`} />
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
                <div className="min-w-0 lg:w-36"><EditableField value={deadline.location} placeholder="Location" onSave={(nextLocation) => updateDeadline(deadline.id, { location: nextLocation })} inputClassName="px-3 py-2 text-sm lg:px-2 lg:py-1 lg:text-xs" /></div>
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
