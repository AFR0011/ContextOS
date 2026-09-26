"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowRight, ChevronRight, Search } from "lucide-react";
import { PageHeader } from "@/components/workspace/ProductPrimitives";
import { buildCanonicalSearchResults, searchCanonicalResults, type CanonicalSearchResult } from "@/lib/canonical-search";
import { useWorkspace } from "@/lib/client-store";
import { localDateKey } from "@/lib/dates";
import { useLocalLocation, useLocalRouter } from "@/lib/local-router";

function detailRow(label: string, value: unknown) {
  const text = Array.isArray(value) ? value.filter(Boolean).join(" · ") : String(value ?? "").trim();
  if (!text) return null;
  return (
    <div key={label} className="grid min-w-0 gap-1 border-t border-[var(--cos-border-soft)] py-3 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--cos-text-subtle)]">{label}</dt>
      <dd className="min-w-0 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--cos-text)] [overflow-wrap:anywhere]">{text}</dd>
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
  const today = localDateKey();
  const canonical = data;
  const allResults = useMemo(() => buildCanonicalSearchResults(canonical, today), [canonical, today]);
  const results = useMemo(() => searchCanonicalResults(allResults, query), [allResults, query]);
  const selectedResult = allResults.find((result) => result.key === selected) ?? null;

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  function selectResult(result: CanonicalSearchResult) {
    const next = new URLSearchParams();
    if (query.trim()) next.set("q", query.trim());
    next.set("selected", result.key);
    router.push(`/search?${next.toString()}`);
  }

  const selectedDetails = useMemo(() => {
    if (!selectedResult) return [] as ReactNode[];

    switch (selectedResult.kind) {
      case "project": {
        const project = canonical.projects.find((item) => item.id === selectedResult.id);
        if (!project) return [];
        const area = canonical.areas.find((item) => item.id === project.areaId);
        return [
          detailRow("Area", area ? `${area.name}${area.state === "archived" ? " (archived)" : ""}` : ""),
          detailRow("State", project.state === "archived" ? "Archived" : "Active"),
          detailRow("Objective", project.objective)
        ];
      }
      case "area": {
        const area = canonical.areas.find((item) => item.id === selectedResult.id);
        return area ? [detailRow("State", area.state === "archived" ? "Archived" : "Active")] : [];
      }
      case "task": {
        const task = canonical.tasks.find((item) => item.id === selectedResult.id);
        if (!task) return [];
        let context = "";
        const parent = task.parent;
        if (parent.type === "project") {
          const project = canonical.projects.find((item) => item.id === parent.projectId);
          context = project ? `${project.name}${project.state === "archived" ? " (archived)" : ""}` : "";
        } else {
          const area = canonical.areas.find((item) => item.id === parent.areaId);
          context = area ? `${area.name}${area.state === "archived" ? " (archived)" : ""}` : "";
        }
        return [
          detailRow("State", task.state === "done" ? "Done" : "Open"),
          detailRow("Context", context),
          detailRow("Planned", task.plannedDate),
          detailRow("Time", task.scheduledTime)
        ];
      }
      case "date": {
        const date = canonical.dates.find((item) => item.id === selectedResult.id);
        if (!date) return [];
        let context = "";
        const parent = date.parent;
        if (parent.type === "project") {
          const project = canonical.projects.find((item) => item.id === parent.projectId);
          context = project ? `${project.name}${project.state === "archived" ? " (archived)" : ""}` : "";
        } else {
          const area = canonical.areas.find((item) => item.id === parent.areaId);
          context = area ? `${area.name}${area.state === "archived" ? " (archived)" : ""}` : "";
        }
        return [
          detailRow("Kind", date.kind === "event" ? "Event" : "Deadline"),
          detailRow("Context", context),
          detailRow("Date", date.date),
          detailRow("Start", date.startTime),
          detailRow("End", date.endTime),
          detailRow("Details", date.details)
        ];
      }
      case "daily-note": {
        const note = canonical.dailyNotes.find((item) => item.id === selectedResult.id);
        if (!note) return [];
        return [
          detailRow("Date", note.localDate),
          detailRow("Note", note.content)
        ];
      }
    }
  }, [canonical, selectedResult]);

  return (
    <div className="cos-page" data-testid="product-search-view">
      <div className="w-full">
        <PageHeader eyebrow="ContextOS" title="Search" />

        <label className="cos-input flex items-center gap-2 px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-[var(--cos-text-subtle)]" />
        <span className="sr-only">Search workspace</span>
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search workspace..."
          className="min-h-8 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--cos-text-subtle)]"
        />
      </label>

      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {query.trim() ? `${results.length} search result${results.length === 1 ? "" : "s"}.` : "Enter a search query."}
      </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_23rem] xl:grid-cols-[minmax(0,1fr)_25rem]">
        <section className="cos-surface min-w-0 overflow-hidden" aria-label="Search results">
          {!query.trim() ? (
            <p className="p-5 text-sm text-[var(--cos-text-muted)]">
              Type a word or phrase to search operational context and history.
            </p>
          ) : null}
          {query.trim() && !results.length ? (
            <p className="p-5 text-sm text-[var(--cos-text-muted)]">No matching ContextOS records.</p>
          ) : null}

          {results.map((result) => (
            <button
              key={result.key}
              type="button"
              data-testid={`search-result-${result.kind}-${result.id}`}
              onClick={() => selectResult(result)}
              aria-pressed={selected === result.key}
              className={`flex min-h-16 w-full items-start gap-3 border-b border-[var(--cos-border-soft)] p-4 text-left last:border-b-0 hover:bg-[var(--cos-bg-soft)] ${
                selected === result.key ? "bg-[var(--cos-primary-soft)]" : ""
              }`}
            >
              <span className="cos-pill cos-pill-muted shrink-0">{result.typeLabel}</span>
              <span className="min-w-0 flex-1">
                <span className="block break-words text-sm font-semibold text-[var(--cos-text-strong)] [overflow-wrap:anywhere]">{result.title}</span>
                {result.subtitle ? (
                  <span className="mt-1 block break-words text-xs text-[var(--cos-text-muted)] [overflow-wrap:anywhere]">{result.subtitle}</span>
                ) : null}
              </span>
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cos-text-subtle)]" aria-hidden="true" />
            </button>
          ))}
        </section>

        <aside className="cos-surface min-w-0 self-start p-4" data-testid="search-selected-record" aria-label="Selected search result details">
          {!selectedResult ? (
            <p className="text-sm text-[var(--cos-text-muted)]">Select a result.</p>
          ) : (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <span className="cos-pill cos-pill-primary">{selectedResult.typeLabel}</span>
                  <h2 className="mt-2 break-words text-lg font-semibold text-[var(--cos-text-strong)] [overflow-wrap:anywhere]">{selectedResult.title}</h2>
                  {selectedResult.subtitle ? (
                    <p className="mt-1 break-words text-sm text-[var(--cos-text-muted)] [overflow-wrap:anywhere]">{selectedResult.subtitle}</p>
                  ) : null}
                </div>
                {selectedResult.contextHref && selectedResult.contextLabel ? (
                  <button
                    type="button"
                    onClick={() => router.push(selectedResult.contextHref!)}
                    className="cos-btn cos-btn-primary min-h-10 shrink-0 px-3 py-2 text-sm"
                  >
                    {selectedResult.contextLabel} <ArrowRight className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              <dl className="mt-4">{selectedDetails}</dl>
            </>
          )}
        </aside>
        </div>
      </div>
    </div>
  );
}
