"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useWorkspace } from "@/lib/client-store";
import { useLocalLocation, useLocalRouter } from "@/lib/local-router";

const MAX_RESULTS = 80;

type SearchKind = "project" | "task" | "resource" | "date" | "capture" | "review" | "area" | "scratchpad";

type SearchResult = {
  key: string;
  kind: SearchKind;
  id: string;
  typeLabel: string;
  title: string;
  subtitle: string;
  searchText: string;
  contextHref: string;
  contextLabel: string;
};

function normalize(value: unknown) {
  return String(value ?? "").toLowerCase();
}

function selectedKey(kind: SearchKind, id: string) {
  return `${kind}:${id}`;
}

function detailRow(label: string, value: unknown) {
  const text = Array.isArray(value) ? value.filter(Boolean).join(" · ") : String(value ?? "").trim();
  if (!text) return null;
  return (
    <div key={label} className="grid gap-1 border-t border-[var(--cos-border-soft)] py-3 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--cos-text-subtle)]">{label}</dt>
      <dd className="whitespace-pre-wrap break-words text-sm leading-6 text-[var(--cos-text)]">{text}</dd>
    </div>
  );
}

export function ProductSearchView() {
  const router = useLocalRouter();
  const { search } = useLocalLocation();
  const { data } = useWorkspace();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const initialQuery = params.get("q") ?? "";
  const [query, setQuery] = useState(initialQuery);
  const selected = params.get("selected") ?? "";
  const q = query.trim().toLowerCase();

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const areaName = useMemo(() => new Map(data.domains.map((area) => [area.id, area.name])), [data.domains]);
  const projectName = useMemo(() => new Map(data.projects.map((project) => [project.id, project.name])), [data.projects]);

  const allResults = useMemo<SearchResult[]>(() => {
    const items: SearchResult[] = [];

    for (const project of data.projects) {
      if (project.trashedAt) continue;
      const area = areaName.get(project.domainId) ?? "";
      const parent = project.parentProjectId ? projectName.get(project.parentProjectId) ?? "" : "";
      const recovery = [project.currentObjective, project.nextAction, project.latestStatus, project.recoveryNotes, ...project.openLoops].filter(Boolean).join(" ");
      items.push({
        key: selectedKey("project", project.id), kind: "project", id: project.id, typeLabel: "Project", title: project.name,
        subtitle: [area, parent ? `Subcontext of ${parent}` : "", project.status === "archived" ? "Archived" : ""].filter(Boolean).join(" · "),
        searchText: [project.name, area, parent, project.status, recovery].join(" "),
        contextHref: `/projects/${encodeURIComponent(project.id)}`, contextLabel: "Open project"
      });
    }

    for (const task of data.tasks) {
      if (task.trashedAt) continue;
      const project = task.projectId ? projectName.get(task.projectId) ?? "" : "";
      const area = task.domainId ? areaName.get(task.domainId) ?? "" : "";
      items.push({
        key: selectedKey("task", task.id), kind: "task", id: task.id, typeLabel: "Task", title: task.title,
        subtitle: [project, area, task.status, task.dueDate ? `Due ${task.dueDate}` : ""].filter(Boolean).join(" · "),
        searchText: [task.title, task.status, task.plannedDate, task.dueDate, task.scheduledTime, project, area].join(" "),
        contextHref: task.projectId ? `/projects/${encodeURIComponent(task.projectId)}` : "/dashboard", contextLabel: task.projectId ? "Open project context" : "Open Dashboard"
      });
    }

    for (const note of data.notes) {
      if (note.trashedAt) continue;
      const project = note.projectId ? projectName.get(note.projectId) ?? "" : "";
      const area = areaName.get(note.domainId) ?? "";
      items.push({
        key: selectedKey("resource", note.id), kind: "resource", id: note.id, typeLabel: note.projectId ? "Project note" : "Resource", title: note.title,
        subtitle: [project, area, note.archivedAt ? "Archived" : ""].filter(Boolean).join(" · "),
        searchText: [note.title, note.content, project, area].join(" "),
        contextHref: note.projectId ? `/projects/${encodeURIComponent(note.projectId)}` : "/resources", contextLabel: note.projectId ? "Open project context" : "Open Resources"
      });
    }

    for (const deadline of data.deadlines) {
      if (deadline.trashedAt) continue;
      const project = deadline.projectId ? projectName.get(deadline.projectId) ?? "" : "";
      items.push({
        key: selectedKey("date", deadline.id), kind: "date", id: deadline.id, typeLabel: "Date", title: deadline.title,
        subtitle: [deadline.date, deadline.time, deadline.location, project, deadline.archivedAt ? "Archived" : ""].filter(Boolean).join(" · "),
        searchText: [deadline.title, deadline.date, deadline.time, deadline.location, deadline.notes, project].join(" "),
        contextHref: deadline.projectId ? `/projects/${encodeURIComponent(deadline.projectId)}` : "/dates", contextLabel: deadline.projectId ? "Open project context" : "Open Dates"
      });
    }

    for (const capture of data.captures) {
      if (capture.status === "deleted") continue;
      items.push({
        key: selectedKey("capture", capture.id), kind: "capture", id: capture.id, typeLabel: "Capture", title: capture.text,
        subtitle: [capture.type, capture.status].filter(Boolean).join(" · "),
        searchText: [capture.text, capture.type, capture.status, JSON.stringify(capture.parsedData ?? {})].join(" "),
        contextHref: "/inbox", contextLabel: "Open Inbox"
      });
    }

    for (const review of data.reviews) {
      const responseText = Object.entries(review.responses).flatMap(([key, value]) => [key, value]).join(" ");
      items.push({
        key: selectedKey("review", review.id), kind: "review", id: review.id, typeLabel: "Review", title: review.type.replaceAll("-", " "),
        subtitle: format(parseISO(review.date), "MMM d, yyyy h:mm a"),
        searchText: [review.type, review.date, responseText].join(" "),
        contextHref: "/reviews", contextLabel: "Open Reviews"
      });
    }

    for (const area of data.domains) {
      items.push({
        key: selectedKey("area", area.id), kind: "area", id: area.id, typeLabel: "Area", title: area.name,
        subtitle: area.archived ? "Archived" : "Active",
        searchText: [area.name, area.archived ? "archived" : "active"].join(" "),
        contextHref: "/areas", contextLabel: "Open Areas"
      });
    }

    const scratchpad = data.dashboardScratchpads[0];
    if (scratchpad?.content.trim()) {
      items.push({
        key: selectedKey("scratchpad", scratchpad.id), kind: "scratchpad", id: scratchpad.id, typeLabel: "Dashboard note", title: "Dashboard scratchpad",
        subtitle: scratchpad.content.slice(0, 100), searchText: scratchpad.content,
        contextHref: "/dashboard", contextLabel: "Open Dashboard"
      });
    }

    return items;
  }, [areaName, data.captures, data.dashboardScratchpads, data.deadlines, data.domains, data.notes, data.projects, data.reviews, data.tasks, projectName]);

  const results = useMemo(() => {
    if (!q) return [];
    return allResults
      .filter((result) => normalize(`${result.title} ${result.subtitle} ${result.searchText}`).includes(q))
      .sort((a, b) => {
        const aTitle = normalize(a.title);
        const bTitle = normalize(b.title);
        const aScore = aTitle === q ? 0 : aTitle.startsWith(q) ? 1 : aTitle.includes(q) ? 2 : 3;
        const bScore = bTitle === q ? 0 : bTitle.startsWith(q) ? 1 : bTitle.includes(q) ? 2 : 3;
        return aScore - bScore || a.title.localeCompare(b.title);
      })
      .slice(0, MAX_RESULTS);
  }, [allResults, q]);

  const selectedResult = allResults.find((result) => result.key === selected) ?? null;

  const selectedDetails = useMemo(() => {
    if (!selectedResult) return [] as Array<React.ReactNode>;
    switch (selectedResult.kind) {
      case "project": {
        const project = data.projects.find((item) => item.id === selectedResult.id);
        if (!project) return [];
        return [
          detailRow("Area", areaName.get(project.domainId)), detailRow("Status", project.status), detailRow("Objective", project.currentObjective),
          detailRow("Next action", project.nextAction), detailRow("Latest status", project.latestStatus), detailRow("Recovery notes", project.recoveryNotes), detailRow("Open loops", project.openLoops)
        ];
      }
      case "task": {
        const task = data.tasks.find((item) => item.id === selectedResult.id);
        if (!task) return [];
        return [detailRow("Status", task.status), detailRow("Project", task.projectId ? projectName.get(task.projectId) : "Standalone"), detailRow("Area", task.domainId ? areaName.get(task.domainId) : ""), detailRow("Planned", task.plannedDate), detailRow("Due", task.dueDate), detailRow("Time", task.scheduledTime)];
      }
      case "resource": {
        const note = data.notes.find((item) => item.id === selectedResult.id);
        if (!note) return [];
        return [detailRow("Project", note.projectId ? projectName.get(note.projectId) : "Standalone Resource"), detailRow("Area", areaName.get(note.domainId)), detailRow("Content", note.content)];
      }
      case "date": {
        const deadline = data.deadlines.find((item) => item.id === selectedResult.id);
        if (!deadline) return [];
        return [detailRow("Date", deadline.date), detailRow("Time", deadline.time), detailRow("Location", deadline.location), detailRow("Project", deadline.projectId ? projectName.get(deadline.projectId) : ""), detailRow("Notes", deadline.notes)];
      }
      case "capture": {
        const capture = data.captures.find((item) => item.id === selectedResult.id);
        if (!capture) return [];
        return [detailRow("Status", capture.status), detailRow("Type", capture.type), detailRow("Parsed data", capture.parsedData ? JSON.stringify(capture.parsedData, null, 2) : "")];
      }
      case "review": {
        const review = data.reviews.find((item) => item.id === selectedResult.id);
        if (!review) return [];
        return [detailRow("Date", format(parseISO(review.date), "MMM d, yyyy h:mm a")), ...Object.entries(review.responses).map(([key, value]) => detailRow(key, value))];
      }
      case "area": {
        const area = data.domains.find((item) => item.id === selectedResult.id);
        return area ? [detailRow("State", area.archived ? "Archived" : "Active")] : [];
      }
      case "scratchpad": {
        const scratchpad = data.dashboardScratchpads.find((item) => item.id === selectedResult.id);
        return scratchpad ? [detailRow("Content", scratchpad.content)] : [];
      }
    }
  }, [areaName, data.captures, data.dashboardScratchpads, data.deadlines, data.domains, data.notes, data.projects, data.reviews, data.tasks, projectName, selectedResult]);

  function selectResult(result: SearchResult) {
    const next = new URLSearchParams();
    if (query.trim()) next.set("q", query.trim());
    next.set("selected", result.key);
    router.push(`/search?${next.toString()}`);
  }

  return (
    <div className="cos-page" data-testid="product-search-view">
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--cos-text-strong)]">Search</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--cos-text-muted)]">Find exact records across active workspace context, including Project recovery notes, open loops, Date notes/location, Resources, Reviews, Inbox captures, and the Dashboard scratchpad.</p>
      </div>

      <label className="cos-input flex items-center gap-2 px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-[var(--cos-text-subtle)]" />
        <span className="sr-only">Search workspace</span>
        <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search workspace..." className="min-h-8 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--cos-text-subtle)]" />
      </label>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.9fr)]">
        <section className="cos-surface overflow-hidden" aria-label="Search results">
          {!q ? <p className="p-5 text-sm text-[var(--cos-text-muted)]">Type a word or phrase to search stored workspace context.</p> : null}
          {q && !results.length ? <p className="p-5 text-sm text-[var(--cos-text-muted)]">No matching records.</p> : null}
          {results.map((result) => (
            <button key={result.key} type="button" onClick={() => selectResult(result)} data-testid={`search-result-${result.kind}-${result.id}`} className={`flex w-full items-start gap-3 border-b border-[var(--cos-border-soft)] p-4 text-left last:border-b-0 hover:bg-[var(--cos-bg-soft)] ${selected === result.key ? "bg-[var(--cos-primary-soft)]" : ""}`}>
              <span className="cos-pill cos-pill-muted shrink-0">{result.typeLabel}</span>
              <span className="min-w-0 flex-1">
                <span className="block break-words text-sm font-semibold text-[var(--cos-text-strong)]">{result.title}</span>
                {result.subtitle ? <span className="mt-1 block break-words text-xs text-[var(--cos-text-muted)]">{result.subtitle}</span> : null}
              </span>
            </button>
          ))}
        </section>

        <aside className="cos-surface p-4" data-testid="search-selected-record">
          {!selectedResult ? <p className="text-sm text-[var(--cos-text-muted)]">Select a result to inspect the exact stored record before opening its workspace context.</p> : (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <span className="cos-pill cos-pill-primary">{selectedResult.typeLabel}</span>
                  <h2 className="mt-2 break-words text-lg font-semibold text-[var(--cos-text-strong)]">{selectedResult.title}</h2>
                  {selectedResult.subtitle ? <p className="mt-1 break-words text-sm text-[var(--cos-text-muted)]">{selectedResult.subtitle}</p> : null}
                </div>
                <button type="button" onClick={() => router.push(selectedResult.contextHref)} className="cos-btn cos-btn-primary min-h-10 shrink-0 px-3 py-2 text-sm">
                  {selectedResult.contextLabel} <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              <dl className="mt-4">{selectedDetails}</dl>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
