"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive as ArchiveIcon, BookOpen, Trash2 } from "lucide-react";
import { MarkdownEditor } from "@/components/workspace/MarkdownEditor";
import { MarkdownPreview } from "@/components/workspace/editor/MarkdownPreview";
import { useWorkspace } from "@/lib/client-store";
import type { Domain, Note } from "@/lib/types";

function domainName(domains: Domain[], domainId: string) {
  return domains.find((domain) => domain.id === domainId)?.name ?? "Unknown area";
}

function isPracticeScheduleNote(note: Note, domains: Domain[]) {
  const domain = domains.find((item) => item.id === note.domainId);
  return note.title.toLowerCase().includes("piano schedule") || note.title.toLowerCase().includes("practice schedule") || domain?.name === "Creative Work";
}

function splitTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function firstMarkdownTable(content: string) {
  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length - 1; index += 1) {
    if (!lines[index].includes("|") || !lines[index + 1].includes("|")) continue;
    const headers = splitTableRow(lines[index]);
    const separator = splitTableRow(lines[index + 1]);
    if (headers.length < 2 || separator.length !== headers.length) continue;
    if (!separator.every((cell) => /^:?-{3,}:?$/.test(cell))) continue;

    const rows: string[][] = [];
    for (let rowIndex = index + 2; rowIndex < lines.length; rowIndex += 1) {
      const line = lines[rowIndex];
      if (!line.trim() || !line.includes("|")) break;
      const cells = splitTableRow(line);
      rows.push(headers.map((_, column) => cells[column] ?? ""));
    }
    return { headers, rows };
  }
  return null;
}

function MarkdownTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="my-3 overflow-x-auto rounded-lg border border-[var(--cos-border-soft)]">
      <table className="min-w-full border-collapse text-left text-xs">
        <thead className="bg-[var(--cos-bg-soft)] text-[var(--cos-text-strong)]">
          <tr>{headers.map((header, index) => <th key={`${header}-${index}`} className="border-b border-[var(--cos-border-soft)] px-3 py-2 font-semibold">{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-[var(--cos-border-soft)] last:border-b-0">
              {headers.map((_, column) => <td key={column} className="px-3 py-2 align-top text-[var(--cos-text)]">{row[column] ?? ""}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResourcePreview({ note, domains }: { note: Note; domains: Domain[] }) {
  if (!note.content) return <p className="mt-2 text-xs text-[var(--cos-text-subtle)]">Empty note</p>;
  if (isPracticeScheduleNote(note, domains)) {
    const table = firstMarkdownTable(note.content);
    if (table) {
      return (
        <div data-testid="practice-schedule-table" className="mt-2">
          <MarkdownTable headers={table.headers} rows={table.rows} />
        </div>
      );
    }
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
  const [titleDraft, setTitleDraft] = useState(note.title);

  useEffect(() => {
    setTitleDraft(note.title);
  }, [note.title]);

  function commitTitle() {
    const nextTitle = titleDraft.trim();
    if (!nextTitle) {
      setTitleDraft(note.title);
      return;
    }
    if (nextTitle !== note.title) onUpdate({ title: nextTitle });
  }

  if (editing) {
    return (
      <section className="cos-surface space-y-3 p-4" data-testid={`resource-${note.id}`}>
        <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
          <label className="space-y-1 text-xs font-semibold text-[var(--cos-text-muted)]">
            <span>Title</span>
            <input
              value={titleDraft}
              placeholder="Note title"
              onChange={(event) => setTitleDraft(event.target.value)}
              onBlur={commitTitle}
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
          <button type="button" onClick={() => { commitTitle(); onDone(); }} className="cos-btn cos-btn-primary min-h-10 px-4 py-2 text-sm">Done</button>
          <button type="button" aria-label={`Archive ${note.title}`} onClick={() => { commitTitle(); onArchive(); }} className="cos-btn cos-btn-secondary min-h-10 px-3 py-2 text-sm">
            <ArchiveIcon className="h-4 w-4" /> Archive
          </button>
          <button type="button" aria-label={`Move ${note.title} to trash`} onClick={() => { commitTitle(); onTrash(); }} className="cos-btn cos-btn-ghost min-h-10 px-3 py-2 text-sm text-[var(--cos-danger-text)]">
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

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-5">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-[var(--cos-primary)]" />
          <h1 className="text-2xl font-bold tracking-tight text-[var(--cos-text-strong)]">Resources</h1>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--cos-text-muted)]">Reference material and standalone notes. Archive keeps a resource recoverable without cluttering the active library; Trash is recoverable from Archive.</p>
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
    </div>
  );
}
