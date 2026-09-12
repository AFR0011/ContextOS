"use client";

import { useState } from "react";
import { Archive as ArchiveIcon, BookOpen, CalendarDays, FolderKanban, Inbox, RotateCcw, Trash2 } from "lucide-react";
import { useWorkspace } from "@/lib/client-store";

interface RecoverableRow {
  key: string;
  type: string;
  title: string;
  restore: () => void;
}

function RecoveryList({ rows, empty }: { rows: RecoverableRow[]; empty: string }) {
  if (!rows.length) {
    return <p className="rounded-lg border border-dashed border-[var(--cos-border)] px-4 py-5 text-sm text-[var(--cos-text-subtle)]">{empty}</p>;
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.key} className="flex flex-col gap-2 rounded-lg border border-[var(--cos-border-soft)] bg-[var(--cos-bg-elevated)] px-3 py-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--cos-text-subtle)]">{row.type}</span>
            <p className="truncate text-sm font-semibold text-[var(--cos-text-strong)]">{row.title}</p>
          </div>
          <button type="button" aria-label={`Restore ${row.title}`} onClick={row.restore} className="cos-btn cos-btn-secondary min-h-10 shrink-0 px-3 py-2 text-xs">
            <RotateCcw className="h-4 w-4" /> Restore
          </button>
        </div>
      ))}
    </div>
  );
}

export function ArchiveLifecycleView() {
  const { data, updateProject, updateTask, updateNote, updateDeadline, updateCapture } = useWorkspace();
  const [tab, setTab] = useState<"archived" | "trash">("archived");

  const archivedProjects: RecoverableRow[] = data.projects
    .filter((item) => !item.trashedAt && (item.status === "archived" || Boolean(item.archivedAt)))
    .map((item) => ({
      key: `project-${item.id}`,
      type: "Project",
      title: item.name,
      restore: () => updateProject(item.id, { status: "active", archivedAt: null })
    }));
  const archivedResources: RecoverableRow[] = data.notes
    .filter((item) => !item.projectId && !item.trashedAt && Boolean(item.archivedAt))
    .map((item) => ({
      key: `resource-${item.id}`,
      type: "Resource",
      title: item.title,
      restore: () => updateNote(item.id, { archivedAt: null })
    }));
  const archivedDates: RecoverableRow[] = data.deadlines
    .filter((item) => !item.trashedAt && Boolean(item.archivedAt))
    .map((item) => ({
      key: `date-${item.id}`,
      type: "Date",
      title: item.title,
      restore: () => updateDeadline(item.id, { archivedAt: null })
    }));
  const archivedTasks: RecoverableRow[] = data.tasks
    .filter((item) => !item.trashedAt && Boolean(item.archivedAt))
    .map((item) => ({
      key: `task-${item.id}`,
      type: "Task",
      title: item.title,
      restore: () => updateTask(item.id, { archivedAt: null })
    }));
  const archivedCaptures: RecoverableRow[] = data.captures
    .filter((item) => item.status === "archived")
    .map((item) => ({
      key: `capture-${item.id}`,
      type: "Inbox capture",
      title: item.text,
      restore: () => updateCapture(item.id, { status: "unprocessed" })
    }));

  const archived = [
    ...archivedProjects,
    ...archivedResources,
    ...archivedDates,
    ...archivedTasks,
    ...archivedCaptures
  ];

  const trash: RecoverableRow[] = [
    ...data.projects.filter((item) => item.trashedAt).map((item) => ({
      key: `project-${item.id}`,
      type: "Project",
      title: item.name,
      restore: () => updateProject(item.id, { trashedAt: null, status: "active" as const, archivedAt: null })
    })),
    ...data.tasks.filter((item) => item.trashedAt).map((item) => ({
      key: `task-${item.id}`,
      type: "Task",
      title: item.title,
      restore: () => updateTask(item.id, { trashedAt: null, archivedAt: null })
    })),
    ...data.notes.filter((item) => item.trashedAt).map((item) => ({
      key: `note-${item.id}`,
      type: item.projectId ? "Project note" : "Resource",
      title: item.title,
      restore: () => updateNote(item.id, { trashedAt: null, archivedAt: null })
    })),
    ...data.deadlines.filter((item) => item.trashedAt).map((item) => ({
      key: `date-${item.id}`,
      type: "Date",
      title: item.title,
      restore: () => updateDeadline(item.id, { trashedAt: null, archivedAt: null })
    })),
    ...data.captures.filter((item) => item.status === "deleted").map((item) => ({
      key: `capture-${item.id}`,
      type: "Inbox capture",
      title: item.text,
      restore: () => updateCapture(item.id, { status: "unprocessed" })
    }))
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--cos-text-strong)]">Archive</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--cos-text-muted)]">Archive and Trash are recoverable lifecycle states. Inbox Archive/Delete actions also land here, so work never disappears into an invisible dead end.</p>
      </header>

      <div className="mb-5 flex gap-2 rounded-lg bg-[var(--cos-bg-soft)] p-1" aria-label="Archive sections">
        <button
          type="button"
          aria-pressed={tab === "archived"}
          onClick={() => setTab("archived")}
          className={`min-h-10 rounded-md px-3 py-2 text-sm font-medium ${tab === "archived" ? "bg-[var(--cos-bg-elevated)] text-[var(--cos-text-strong)] shadow-sm" : "text-[var(--cos-text-muted)]"}`}
        >
          <ArchiveIcon className="mr-1 inline h-4 w-4" /> Archived ({archived.length})
        </button>
        <button
          type="button"
          aria-pressed={tab === "trash"}
          onClick={() => setTab("trash")}
          className={`min-h-10 rounded-md px-3 py-2 text-sm font-medium ${tab === "trash" ? "bg-[var(--cos-bg-elevated)] text-[var(--cos-text-strong)] shadow-sm" : "text-[var(--cos-text-muted)]"}`}
        >
          <Trash2 className="mr-1 inline h-4 w-4" /> Trash ({trash.length})
        </button>
      </div>

      {tab === "archived" ? (
        <div className="space-y-5">
          <section>
            <div className="mb-2 flex items-center gap-2"><FolderKanban className="h-4 w-4 text-[var(--cos-primary)]" /><h2 className="font-semibold text-[var(--cos-text-strong)]">Projects</h2></div>
            <RecoveryList rows={archivedProjects} empty="No archived projects" />
          </section>
          <section>
            <div className="mb-2 flex items-center gap-2"><BookOpen className="h-4 w-4 text-[var(--cos-primary)]" /><h2 className="font-semibold text-[var(--cos-text-strong)]">Resources</h2></div>
            <RecoveryList rows={archivedResources} empty="No archived resources" />
          </section>
          <section>
            <div className="mb-2 flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[var(--cos-primary)]" /><h2 className="font-semibold text-[var(--cos-text-strong)]">Dates and Tasks</h2></div>
            <RecoveryList rows={[...archivedDates, ...archivedTasks]} empty="No other archived work" />
          </section>
          <section>
            <div className="mb-2 flex items-center gap-2"><Inbox className="h-4 w-4 text-[var(--cos-primary)]" /><h2 className="font-semibold text-[var(--cos-text-strong)]">Inbox captures</h2></div>
            <RecoveryList rows={archivedCaptures} empty="No archived Inbox captures" />
          </section>
        </div>
      ) : (
        <section>
          <div className="mb-3 flex items-center gap-2"><Trash2 className="h-4 w-4 text-[var(--cos-danger-text)]" /><h2 className="font-semibold text-[var(--cos-text-strong)]">Recoverable Trash</h2></div>
          <p className="mb-4 text-sm leading-6 text-[var(--cos-text-muted)]">Restoring a deleted Inbox capture returns it to Unprocessed so it can be reviewed again. Restoring a Project does not mutate its child projects.</p>
          <RecoveryList rows={trash} empty="Trash is empty" />
        </section>
      )}
    </div>
  );
}
