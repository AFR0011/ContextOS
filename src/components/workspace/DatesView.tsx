"use client";

import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { DateRow, EmptyState, PageHeader, Section } from "@/components/workspace/ProductPrimitives";
import type { ContextDate as CanonicalDate, ContextDateKind } from "@/lib/canonical-domain";
import { useWorkspace } from "@/lib/client-store";
import { localDateKey } from "@/lib/dates";
import { useLocalRouter as useRouter } from "@/lib/local-router";

type Filter = "all" | ContextDateKind;

function parentValue(date: CanonicalDate) {
  return date.parent.type === "project" ? `project:${date.parent.projectId}` : `area:${date.parent.areaId}`;
}

function contextLabel(
  date: CanonicalDate,
  projects: { id: string; name: string; state: "active" | "archived" }[],
  areas: { id: string; name: string; state: "active" | "archived" }[]
) {
  const parent = date.parent;
  if (parent.type === "project") {
    const project = projects.find((item) => item.id === parent.projectId);
    return project ? `${project.name}${project.state === "archived" ? " (archived)" : ""}` : "Project";
  }
  const area = areas.find((item) => item.id === parent.areaId);
  return area ? `${area.name}${area.state === "archived" ? " (archived)" : ""}` : "Area";
}

function DateEditor({
  date,
  projects,
  areas,
  onUpdate
}: {
  date: CanonicalDate;
  projects: { id: string; name: string; state: "active" | "archived" }[];
  areas: { id: string; name: string; state: "active" | "archived" }[];
  onUpdate: (updates: Partial<CanonicalDate>) => void;
}) {
  return (
    <details className="cos-surface group">
      <summary className="list-none cursor-pointer">
        <DateRow
          title={date.title}
          kind={date.kind}
          time={date.startTime}
          meta={`${date.date} · ${contextLabel(date, projects, areas)}`}
        />
      </summary>
      <div className="grid gap-3 border-t border-[var(--cos-border-soft)] p-4 lg:grid-cols-2">
        <label className="space-y-1 lg:col-span-2">
          <span className="text-xs font-semibold text-[var(--cos-text-muted)]">Title</span>
          <input
            defaultValue={date.title}
            onBlur={(event) => {
              const title = event.target.value.trim();
              if (title && title !== date.title) onUpdate({ title });
              else if (!title) event.target.value = date.title;
            }}
            className="cos-input w-full px-3 py-2 text-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold text-[var(--cos-text-muted)]">Kind</span>
          <select
            value={date.kind}
            onChange={(event) => {
              const kind = event.target.value as ContextDateKind;
              onUpdate({ kind, endTime: kind === "deadline" ? null : date.endTime });
            }}
            className="cos-input w-full px-3 py-2 text-sm"
          >
            <option value="event">Event</option>
            <option value="deadline">Deadline</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold text-[var(--cos-text-muted)]">Context</span>
          <select
            value={parentValue(date)}
            onChange={(event) => {
              const [type, id] = event.target.value.split(":");
              onUpdate({
                parent: type === "project"
                  ? { type: "project", projectId: id }
                  : { type: "area", areaId: id }
              });
            }}
            className="cos-input w-full px-3 py-2 text-sm"
          >
            <optgroup label="Projects">
              {projects.map((project) => <option key={project.id} value={`project:${project.id}`}>{project.name}{project.state === "archived" ? " (archived)" : ""}</option>)}
            </optgroup>
            <optgroup label="Areas">
              {areas.map((area) => <option key={area.id} value={`area:${area.id}`}>{area.name}{area.state === "archived" ? " (archived)" : ""}</option>)}
            </optgroup>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold text-[var(--cos-text-muted)]">Date</span>
          <input type="date" value={date.date} onChange={(event) => event.target.value && onUpdate({ date: event.target.value })} className="cos-input w-full px-3 py-2 text-sm" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="text-xs font-semibold text-[var(--cos-text-muted)]">{date.kind === "event" ? "Start" : "Time"}</span>
            <input type="time" value={date.startTime ?? ""} onChange={(event) => onUpdate({ startTime: event.target.value || null })} className="cos-input w-full px-3 py-2 text-sm" />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-[var(--cos-text-muted)]">End</span>
            <input type="time" value={date.endTime ?? ""} onChange={(event) => onUpdate({ endTime: event.target.value || null })} disabled={date.kind === "deadline"} className="cos-input w-full px-3 py-2 text-sm disabled:opacity-45" />
          </label>
        </div>
        <label className="space-y-1 lg:col-span-2">
          <span className="text-xs font-semibold text-[var(--cos-text-muted)]">Details</span>
          <textarea
            defaultValue={date.details}
            onBlur={(event) => {
              if (event.target.value !== date.details) onUpdate({ details: event.target.value });
            }}
            rows={3}
            className="cos-input w-full resize-y px-3 py-2 text-sm"
          />
        </label>
      </div>
    </details>
  );
}

export function DatesView() {
  const router = useRouter();
  const { data, addDate, updateDate } = useWorkspace();
  const canonical = data;
  const today = localDateKey();
  const [filter, setFilter] = useState<Filter>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<ContextDateKind>("event");
  const [date, setDate] = useState(today);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [details, setDetails] = useState("");
  const [parent, setParent] = useState("");
  const addDateTriggerRef = useRef<HTMLButtonElement | null>(null);

  const projects = canonical.projects;
  const areas = canonical.areas;
  const activeProjects = projects.filter((project) => project.state === "active");
  const activeAreas = areas.filter((area) => area.state === "active");
  const filtered = canonical.dates.filter((item) => filter === "all" || item.kind === filter);
  const todayDates = filtered.filter((item) => item.date === today).sort((a, b) => (a.startTime ?? "99:99").localeCompare(b.startTime ?? "99:99") || a.title.localeCompare(b.title));
  const upcoming = filtered.filter((item) => item.date > today).sort((a, b) => a.date.localeCompare(b.date) || (a.startTime ?? "99:99").localeCompare(b.startTime ?? "99:99"));
  const past = filtered.filter((item) => item.date < today).sort((a, b) => b.date.localeCompare(a.date) || (b.startTime ?? "").localeCompare(a.startTime ?? ""));

  function createDate() {
    const trimmed = title.trim();
    if (!trimmed || !parent || !date) return;
    const [type, id] = parent.split(":");
    addDate({
      title: trimmed,
      kind,
      date,
      startTime: startTime || null,
      endTime: kind === "event" ? endTime || null : null,
      details: details.trim(),
      parent: type === "project" ? { type: "project", projectId: id } : { type: "area", areaId: id }
    });
    setTitle("");
    setStartTime("");
    setEndTime("");
    setDetails("");
    setShowAdd(false);
    window.requestAnimationFrame(() => addDateTriggerRef.current?.focus());
  }

  function cancelDateCreation() {
    setShowAdd(false);
    window.requestAnimationFrame(() => addDateTriggerRef.current?.focus());
  }

  const renderGroup = (items: CanonicalDate[], empty: string) =>
    items.length ? (
      <div className="space-y-2">
        {items.map((item) => (
          <DateEditor
            key={item.id}
            date={item}
            projects={projects}
            areas={areas}
            onUpdate={(updates) => updateDate(item.id, updates)}
          />
        ))}
      </div>
    ) : <p className="text-sm text-[var(--cos-text-subtle)]">{empty}</p>;

  return (
    <div className="cos-page" data-testid="dates-view">
      <div className="w-full max-w-6xl">
        <PageHeader
          eyebrow="Time"
          title="Dates"
          action={
          <button
            ref={addDateTriggerRef}
            type="button"
            onClick={() => setShowAdd(true)}
            aria-expanded={showAdd}
            aria-controls="context-date-create"
            className="cos-btn cos-btn-primary px-4 py-2 text-sm"
          >
            <Plus className="h-4 w-4" /> Add Date
          </button>
        }
        />

        <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Date filters">
        {(["all", "event", "deadline"] as const).map((value) => (
          <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`cos-btn px-3 py-1.5 text-xs ${filter === value ? "cos-btn-primary" : "cos-btn-secondary"}`}>
            {value === "all" ? "All" : value === "event" ? "Events" : "Deadlines"}
          </button>
        ))}
        </div>

        {showAdd ? (
        <section id="context-date-create" className="cos-surface mb-8 p-4" data-testid="context-date-create">
          <div className="grid gap-3 lg:grid-cols-2">
            <label className="space-y-1 lg:col-span-2">
              <span className="text-xs font-semibold text-[var(--cos-text-muted)]">Title</span>
              <input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Date title" className="cos-input w-full px-3 py-2 text-sm" />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-[var(--cos-text-muted)]">Kind</span>
              <select value={kind} onChange={(event) => { const next = event.target.value as ContextDateKind; setKind(next); if (next === "deadline") setEndTime(""); }} className="cos-input w-full px-3 py-2 text-sm">
                <option value="event">Event</option>
                <option value="deadline">Deadline</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-[var(--cos-text-muted)]">Context</span>
              <select value={parent} onChange={(event) => setParent(event.target.value)} className="cos-input w-full px-3 py-2 text-sm">
                <option value="">Choose Project or Area…</option>
                {activeProjects.length ? <optgroup label="Projects">{activeProjects.map((project) => <option key={project.id} value={`project:${project.id}`}>{project.name}</option>)}</optgroup> : null}
                {activeAreas.length ? <optgroup label="Areas">{activeAreas.map((area) => <option key={area.id} value={`area:${area.id}`}>{area.name}</option>)}</optgroup> : null}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-[var(--cos-text-muted)]">Date</span>
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="cos-input w-full px-3 py-2 text-sm" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="text-xs font-semibold text-[var(--cos-text-muted)]">{kind === "event" ? "Start" : "Time"}</span>
                <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="cos-input w-full px-3 py-2 text-sm" />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-[var(--cos-text-muted)]">End</span>
                <input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} disabled={kind === "deadline"} className="cos-input w-full px-3 py-2 text-sm disabled:opacity-45" />
              </label>
            </div>
            <label className="space-y-1 lg:col-span-2">
              <span className="text-xs font-semibold text-[var(--cos-text-muted)]">Details</span>
              <textarea value={details} onChange={(event) => setDetails(event.target.value)} rows={3} className="cos-input w-full resize-y px-3 py-2 text-sm" />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={createDate} disabled={!title.trim() || !parent || !date} className="cos-btn cos-btn-primary px-4 py-2 text-sm disabled:opacity-50">Add Date</button>
            <button type="button" onClick={cancelDateCreation} className="cos-btn cos-btn-ghost px-4 py-2 text-sm">Cancel</button>
          </div>
        </section>
        ) : null}

        {!projects.length && !areas.length ? (
        <EmptyState title="Create an Area first" description="Every Date must belong to a Project or Area." action={<button type="button" onClick={() => router.push("/areas")} className="cos-btn cos-btn-secondary px-4 py-2 text-sm">Open Areas</button>} />
      ) : (
        <>
          <Section title="Today">{renderGroup(todayDates, "No dates today.")}</Section>
          <Section title="Upcoming" className="mt-7">{renderGroup(upcoming, "No upcoming dates.")}</Section>
          <Section title="Past" className="mt-7">{renderGroup(past, "No past dates.")}</Section>
        </>
        )}
      </div>
    </div>
  );
}
