"use client";

import { useMemo, useState } from "react";
import {
  Archive as ArchiveIcon,
  BookOpen,
  CalendarDays,
  FolderKanban,
  History,
  Inbox,
  RotateCcw,
  Trash2
} from "lucide-react";
import { MarkdownEditor } from "@/components/workspace/MarkdownEditor";
import { MarkdownPreview } from "@/components/workspace/editor/MarkdownPreview";
import { ProjectDetailView, ProjectsView, ReviewsView } from "@/components/workspace/Views";
import { useWorkspace } from "@/lib/client-store";
import { useLocalRouter } from "@/lib/local-router";
import type { Domain, Note, Project } from "@/lib/types";

function pageShell(children: React.ReactNode) {
  return <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>;
}

function domainName(domains: Domain[], domainId: string) {
  return domains.find((domain) => domain.id === domainId)?.name ?? "Unknown area";
}

function isPracticeScheduleNote(note: Note, domains: Domain[]) {
  const domain = domains.find((item) => item.id === note.domainId);
  return note.title.toLowerCase().includes("piano schedule") || note.title.toLowerCase().includes("practice schedule") || domain?.name === "Creative Work";
}

function ResourcePreview({ note, domains }: { note: Note; domains: Domain[] }) {
  if (!note.content) return <p className="mt-2 text-xs text-[var(--cos-text-subtle)]">Empty note</p>;
  if (isPracticeScheduleNote(note, domains)) {
    return (
      <div data-testid="practice-schedule-table" className="mt-2">
        <MarkdownPreview content={note.content} />
      </div>
    );
  }
  return <MarkdownPreview content={note.content} />;
}

function ResourceCard({
  note,
  domains,
  editing,
  onEdit,
  onDone,
  onUpdate,
  onArchive,
  onTrash
}: {
  note: Note;
  domains: Domain[];
  editing: boolean;
  onEdit: () => void;
  onDone: () => void;
  onUpdate: (updates: Partial<Note>) => void;
  onArchive: () => void;
  onTrash: () => void;
}) {
  const activeDomains = domains.filter((domain) => !domain.archived || domain.id === note.domainId);

  if (editing) {
    return (
      <section className="cos-surface space-y-3 p-4" data-testid={`resource-${note.id}`}>
        <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
          <label className="space-y-1 text-xs font-semibold text-[var(--cos-text-muted)]">
            <span>Title</span>
            <input
              value={note.title}
              placeholder="Note title"
              onChange={(event) => onUpdate({ title: event.target.value })}
              className="cos-input w-full px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1 text-xs font-semibold text-[var(--cos-text-muted)]">
            <span>Area</span>
            <select
              aria-label={`Area for ${note.title}`}
              value={note.domainId}
              onChange={(event) => onUpdate({ domainId: event.target.value })}
              className="cos-input w-full px-3 py-2 text-sm"
            >
              {activeDomains.map((domain) => <option key={domain.id} value={domain.id}>{domain.name}</option>)}
            </select>
          </label>
        </div>
        <MarkdownEditor
          value={note.content}
          placeholder="Type / for blocks..."
          minLines={5}
          dataTestId={`note-editor-${note.id}`}
          onSave={(content) => onUpdate({ content })}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onDone} className="cos-btn cos-btn-primary min-h-10 px-4 py-2 text-sm">Done</button>
          <button type="button" aria-label={`Archive ${note.title}`} onClick={onArchive} className="cos-btn cos-btn-secondary min-h-10 px-3 py-2 text-sm">
            <ArchiveIcon className="h-4 w-4" /> Archive
          </button>
          <button type="button" aria-label={`Move ${note.title} to trash`} onClick={onTrash} className="cos-btn cos-btn-ghost min-h-10 px-3 py-2 text-sm text-[var(--cos-danger-text)]">
            <Trash2 className="h-4 w-4" /> Trash
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="cos-surface p-4" data-testid={`resource-${note.id}`}>
      <button type="button" onClick={onEdit} className="w-full text-left">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-[var(--cos-text-strong)]">{note.title}</h2>
            <p className="mt-1 text-xs text-[var(--cos-text-subtle)]">{domainName(domains, note.domainId)}</p>
          </div>
          <span className="text-xs font-semibold text-[var(--cos-primary-text)]">Edit</span>
        </div>
        <ResourcePreview note={note} domains={domains} />
      </button>
      <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--cos-border-soft)] pt-3">
        <button type="button" aria-label={`Archive ${note.title}`} onClick={onArchive} className="cos-btn cos-btn-ghost min-h-10 px-3 py-2 text-xs">
          <ArchiveIcon className="h-4 w-4" /> Archive
        </button>
        <button type="button" aria-label={`Move ${note.title} to trash`} onClick={onTrash} className="cos-btn cos-btn-ghost min-h-10 px-3 py-2 text-xs text-[var(--cos-danger-text)]">
          <Trash2 className="h-4 w-4" /> Trash
        </button>
      </div>
    </section>
  );
}

export function ResourcesLifecycleView() {
  const { data, addNote, updateNote } = useWorkspace();
  const activeDomains = data.domains.filter((domain) => !domain.archived);
  const [domainId, setDomainId] = useState("all");
  const [newTitle, setNewTitle] = useState("");
  const [newDomainId, setNewDomainId] = useState("");
  const [editingNote, setEditingNote] = useState<string | null>(null);

  const resources = useMemo(
    () => data.notes
      .filter((note) => !note.projectId && !note.trashedAt && !note.archivedAt)
      .filter((note) => domainId === "all" || note.domainId === domainId)
      .sort((a, b) => a.title.localeCompare(b.title)),
    [data.notes, domainId]
  );

  function createResource() {
    const title = newTitle.trim();
    const chosenDomain = newDomainId || activeDomains[0]?.id;
    if (!title || !chosenDomain) return;
    const id = addNote({ title, content: "", projectId: null, domainId: chosenDomain });
    setNewTitle("");
    setNewDomainId(chosenDomain);
    setEditingNote(id);
  }

  return pageShell(
    <>
      <header className="mb-5">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-[var(--cos-primary)]" />
          <h1 className="text-2xl font-bold tracking-tight text-[var(--cos-text-strong)]">Resources</h1>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--cos-text-muted)]">Reference material and standalone notes. Archive keeps a resource recoverable without cluttering the active library; Trash is also recoverable from Archive.</p>
      </header>

      <section className="cos-surface mb-5 grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_14rem_auto]">
        <input
          value={newTitle}
          placeholder="Resource title..."
          onChange={(event) => setNewTitle(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") createResource(); }}
          className="cos-input min-h-10 px-3 py-2 text-sm"
        />
        <select
          aria-label="Resource area"
          value={newDomainId || activeDomains[0]?.id || ""}
          onChange={(event) => setNewDomainId(event.target.value)}
          className="cos-input min-h-10 px-3 py-2 text-sm"
          disabled={!activeDomains.length}
        >
          {activeDomains.map((domain) => <option key={domain.id} value={domain.id}>{domain.name}</option>)}
        </select>
        <button type="button" onClick={createResource} disabled={!activeDomains.length || !newTitle.trim()} className="cos-btn cos-btn-primary min-h-10 px-4 py-2 text-sm">Add</button>
      </section>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-xs font-semibold text-[var(--cos-text-muted)]" htmlFor="resource-area-filter">Filter by area</label>
        <select id="resource-area-filter" value={domainId} onChange={(event) => setDomainId(event.target.value)} className="cos-input min-h-10 px-3 py-2 text-sm">
          <option value="all">All areas</option>
          {activeDomains.map((domain) => <option key={domain.id} value={domain.id}>{domain.name}</option>)}
        </select>
      </div>

      {!activeDomains.length ? (
        <section className="cos-surface p-5">
          <h2 className="font-semibold text-[var(--cos-text-strong)]">No active areas</h2>
          <p className="mt-1 text-sm text-[var(--cos-text-muted)]">Create an Area before adding standalone resources.</p>
        </section>
      ) : resources.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {resources.map((note) => (
            <ResourceCard
              key={note.id}
              note={note}
              domains={data.domains}
              editing={editingNote === note.id}
              onEdit={() => setEditingNote(note.id)}
              onDone={() => setEditingNote(null)}
              onUpdate={(updates) => updateNote(note.id, updates)}
              onArchive={() => {
                updateNote(note.id, { archivedAt: new Date().toISOString() });
                if (editingNote === note.id) setEditingNote(null);
              }}
              onTrash={() => {
                updateNote(note.id, { trashedAt: new Date().toISOString() });
                if (editingNote === note.id) setEditingNote(null);
              }}
            />
          ))}
        </div>
      ) : (
        <section className="cos-surface p-5">
          <h2 className="font-semibold text-[var(--cos-text-strong)]">No active resources</h2>
          <p className="mt-1 text-sm text-[var(--cos-text-muted)]">Archived and trashed resources are kept out of the active library and can be restored from Archive.</p>
        </section>
      )}
    </>
  );
}

function ProjectLifecycleRows({ projects, compact = false }: { projects: Project[]; compact?: boolean }) {
  const { data, updateProject } = useWorkspace();
  const rows = projects.filter((project) => !project.trashedAt && project.status !== "archived");

  if (!rows.length) return <p className="text-sm text-[var(--cos-text-subtle)]">No visible projects need lifecycle actions.</p>;

  return (
    <div className="space-y-2">
      {rows.map((project) => (
        <div key={project.id} className="flex flex-col gap-2 rounded-lg border border-[var(--cos-border-soft)] px-3 py-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--cos-text-strong)]">{project.name}</p>
            {!compact ? <p className="mt-0.5 text-xs text-[var(--cos-text-subtle)]">{domainName(data.domains, project.domainId)}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-label={`Archive project ${project.name}`}
              onClick={() => updateProject(project.id, { status: "archived", archivedAt: new Date().toISOString() })}
              className="cos-btn cos-btn-ghost min-h-10 px-3 py-2 text-xs"
            >
              <ArchiveIcon className="h-4 w-4" /> Archive
            </button>
            <button
              type="button"
              aria-label={`Move project ${project.name} to trash`}
              onClick={() => updateProject(project.id, { trashedAt: new Date().toISOString() })}
              className="cos-btn cos-btn-ghost min-h-10 px-3 py-2 text-xs text-[var(--cos-danger-text)]"
            >
              <Trash2 className="h-4 w-4" /> Trash
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProjectsLifecycleView() {
  const { data } = useWorkspace();
  return (
    <>
      <ProjectsView />
      <section className="mx-auto mb-8 w-full max-w-6xl px-4 sm:px-6 lg:px-8" data-testid="project-lifecycle-panel">
        <div className="cos-surface p-4">
          <div className="mb-3 flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-[var(--cos-primary)]" />
            <h2 className="font-semibold text-[var(--cos-text-strong)]">Project lifecycle</h2>
          </div>
          <p className="mb-4 text-sm leading-6 text-[var(--cos-text-muted)]">Archive or trash a project without cascading the action into subcontexts. Active subcontexts remain available and appear as top-level projects until their parent is restored.</p>
          <ProjectLifecycleRows projects={data.projects} />
        </div>
      </section>
    </>
  );
}

export function ProjectDetailLifecycleView({ projectId }: { projectId: string }) {
  const { data, updateProject } = useWorkspace();
  const router = useLocalRouter();
  const project = data.projects.find((item) => item.id === projectId);

  return (
    <>
      <ProjectDetailView projectId={projectId} />
      {project && !project.trashedAt ? (
        <section className="mx-auto mb-8 w-full max-w-6xl px-4 sm:px-6 lg:px-8" data-testid="project-detail-lifecycle">
          <div className="cos-surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-[var(--cos-text-strong)]">Project lifecycle</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--cos-text-muted)]">Moving this project to Trash does not trash its subcontexts. They remain active and are temporarily promoted to top-level visibility.</p>
            </div>
            <button
              type="button"
              aria-label={`Move project ${project.name} to trash`}
              onClick={() => {
                updateProject(project.id, { trashedAt: new Date().toISOString() });
                router.push("/projects");
              }}
              className="cos-btn cos-btn-ghost min-h-10 shrink-0 px-3 py-2 text-sm text-[var(--cos-danger-text)]"
            >
              <Trash2 className="h-4 w-4" /> Move to trash
            </button>
          </div>
        </section>
      ) : null}
    </>
  );
}

interface RecoverableRow {
  key: string;
  type: string;
  title: string;
  restore: () => void;
}

function RecoveryList({ rows, empty }: { rows: RecoverableRow[]; empty: string }) {
  if (!rows.length) return <p className="rounded-lg border border-dashed border-[var(--cos-border)] px-4 py-5 text-sm text-[var(--cos-text-subtle)]">{empty}</p>;
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
    .map((item) => ({ key: `project-${item.id}`, type: "Project", title: item.name, restore: () => updateProject(item.id, { status: "active", archivedAt: null }) }));
  const archivedResources: RecoverableRow[] = data.notes
    .filter((item) => !item.projectId && !item.trashedAt && Boolean(item.archivedAt))
    .map((item) => ({ key: `resource-${item.id}`, type: "Resource", title: item.title, restore: () => updateNote(item.id, { archivedAt: null }) }));
  const archivedDates: RecoverableRow[] = data.deadlines
    .filter((item) => !item.trashedAt && Boolean(item.archivedAt))
    .map((item) => ({ key: `date-${item.id}`, type: "Date", title: item.title, restore: () => updateDeadline(item.id, { archivedAt: null }) }));
  const archivedTasks: RecoverableRow[] = data.tasks
    .filter((item) => !item.trashedAt && Boolean(item.archivedAt))
    .map((item) => ({ key: `task-${item.id}`, type: "Task", title: item.title, restore: () => updateTask(item.id, { archivedAt: null }) }));
  const archivedCaptures: RecoverableRow[] = data.captures
    .filter((item) => item.status === "archived")
    .map((item) => ({ key: `capture-${item.id}`, type: "Inbox capture", title: item.text, restore: () => updateCapture(item.id, { status: "unprocessed" }) }));

  const trash: RecoverableRow[] = [
    ...data.projects.filter((item) => item.trashedAt).map((item) => ({ key: `project-${item.id}`, type: "Project", title: item.name, restore: () => updateProject(item.id, { trashedAt: null, status: "active" as const, archivedAt: null }) })),
    ...data.tasks.filter((item) => item.trashedAt).map((item) => ({ key: `task-${item.id}`, type: "Task", title: item.title, restore: () => updateTask(item.id, { trashedAt: null, archivedAt: null }) })),
    ...data.notes.filter((item) => item.trashedAt).map((item) => ({ key: `note-${item.id}`, type: item.projectId ? "Project note" : "Resource", title: item.title, restore: () => updateNote(item.id, { trashedAt: null, archivedAt: null }) })),
    ...data.deadlines.filter((item) => item.trashedAt).map((item) => ({ key: `date-${item.id}`, type: "Date", title: item.title, restore: () => updateDeadline(item.id, { trashedAt: null, archivedAt: null }) })),
    ...data.captures.filter((item) => item.status === "deleted").map((item) => ({ key: `capture-${item.id}`, type: "Inbox capture", title: item.text, restore: () => updateCapture(item.id, { status: "unprocessed" }) }))
  ];

  return pageShell(
    <>
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--cos-text-strong)]">Archive</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--cos-text-muted)]">Archive and Trash are both recoverable lifecycle states. Inbox Archive/Delete actions also land here, so nothing disappears into an invisible product dead end.</p>
      </header>
      <div className="mb-5 flex gap-2" role="tablist" aria-label="Archive sections">
        <button type="button" role="tab" aria-selected={tab === "archived"} onClick={() => setTab("archived")} className={`cos-btn min-h-10 px-4 py-2 text-sm ${tab === "archived" ? "cos-btn-primary" : "cos-btn-secondary"}`}>
          <ArchiveIcon className="h-4 w-4" /> Archived
        </button>
        <button type="button" role="tab" aria-selected={tab === "trash"} onClick={() => setTab("trash")} className={`cos-btn min-h-10 px-4 py-2 text-sm ${tab === "trash" ? "cos-btn-primary" : "cos-btn-secondary"}`}>
          <Trash2 className="h-4 w-4" /> Trash
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
          <p className="mb-4 text-sm leading-6 text-[var(--cos-text-muted)]">Restoring a deleted Inbox capture returns it to Unprocessed so it can be reviewed again. Project restore does not alter child projects.</p>
          <RecoveryList rows={trash} empty="Trash is empty" />
        </section>
      )}
    </>
  );
}

export function ReviewsLifecycleView() {
  return (
    <>
      <ReviewsView />
      <section className="mx-auto mb-8 w-full max-w-6xl px-4 sm:px-6 lg:px-8" data-testid="review-lifecycle-note">
        <div className="cos-surface flex gap-3 p-4">
          <History className="mt-0.5 h-5 w-5 shrink-0 text-[var(--cos-primary)]" />
          <div>
            <h2 className="font-semibold text-[var(--cos-text-strong)]">Reviews are historical snapshots</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--cos-text-muted)]">Saved reviews are intentionally append-only in ContextOS 1.0. They represent what you recorded at that moment; create a new review to correct or supersede an earlier snapshot rather than rewriting history.</p>
          </div>
        </div>
      </section>
    </>
  );
}
