"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { DateRow, Dayline, EmptyState, EntityRow, InsightCard, PageHeader, Section } from "@/components/workspace/ProductPrimitives";
import { adaptLegacyWorkspace } from "@/lib/canonical-adapters";
import { getContextsForToday, getTodayTasks } from "@/lib/canonical-selectors";
import { useWorkspace } from "@/lib/client-store";
import { dateKeyToLocalDate, localDateKey } from "@/lib/dates";
import { noOpInsightProvider } from "@/lib/insights";
import { useLocalRouter } from "@/lib/local-router";
import type { Task as CanonicalTask } from "@/lib/canonical-domain";

function useCurrentLocalDateKey() {
  const [today, setToday] = useState(() => localDateKey());

  useEffect(() => {
    const handle = window.setInterval(() => {
      const next = localDateKey();
      setToday((current) => (current === next ? current : next));
    }, 30_000);
    return () => window.clearInterval(handle);
  }, []);

  return today;
}

function DailyNoteEditor({
  value,
  onSave
}: {
  value: string;
  onSave: (content: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [saveState, setSaveState] = useState<"idle" | "dirty" | "saved">("idle");
  const lastSavedRef = useRef(value);
  const latestDraftRef = useRef(value);
  const onSaveRef = useRef(onSave);
  const dirtyRef = useRef(false);

  onSaveRef.current = onSave;

  useEffect(() => {
    if (dirtyRef.current) return;
    if (value === lastSavedRef.current && value === latestDraftRef.current) return;
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
    }, 700);
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
    <div
      data-testid="home-daily-note"
      className="min-h-[22rem] rounded-2xl border border-[var(--cos-border-soft)] bg-[var(--cos-bg-elevated)]/65 p-1"
    >
      <textarea
        aria-label="Daily Notes"
        value={draft}
        onChange={(event) => {
          const next = event.target.value;
          latestDraftRef.current = next;
          dirtyRef.current = next !== lastSavedRef.current;
          setDraft(next);
        }}
        placeholder="Write what you need to hold onto today…"
        className="min-h-[19rem] w-full resize-none bg-transparent px-4 py-4 text-[15px] leading-7 text-[var(--cos-text-strong)] outline-none placeholder:text-[var(--cos-text-subtle)]"
      />
      <div className="flex min-h-8 items-center justify-end px-4 pb-2 text-[11px] text-[var(--cos-text-subtle)]">
        {saveState === "dirty" ? "Saving…" : saveState === "saved" ? "Saved" : "Local-first"}
      </div>
    </div>
  );
}

function taskContext(task: CanonicalTask, projects: { id: string; name: string }[], areas: { id: string; name: string }[]) {
  if (task.parent.type === "project") {
    return projects.find((project) => project.id === task.parent.projectId)?.name ?? "";
  }
  return areas.find((area) => area.id === task.parent.areaId)?.name ?? "";
}

export function HomeView() {
  const router = useLocalRouter();
  const { data, updateTask, updateDailyNote } = useWorkspace();
  const today = useCurrentLocalDateKey();
  const canonical = useMemo(() => adaptLegacyWorkspace(data).workspace, [data]);

  const todayTasks = useMemo(
    () => getTodayTasks(canonical, today),
    [canonical, today]
  );
  const timedTasks = useMemo(
    () =>
      todayTasks
        .filter((task) => Boolean(task.scheduledTime))
        .sort(
          (a, b) =>
            (a.scheduledTime ?? "").localeCompare(b.scheduledTime ?? "") ||
            a.title.localeCompare(b.title)
        ),
    [todayTasks]
  );
  const anytimeTasks = useMemo(
    () =>
      todayTasks
        .filter((task) => !task.scheduledTime)
        .sort((a, b) => a.title.localeCompare(b.title)),
    [todayTasks]
  );
  const baseContexts = useMemo(
    () => getContextsForToday(canonical, today),
    [canonical, today]
  );
  const legacyTodayProjectIds = useMemo(
    () =>
      new Set(
        data.deadlines
          .filter((item) => !item.archivedAt && !item.trashedAt && item.date === today && item.projectId)
          .map((item) => item.projectId as string)
      ),
    [data.deadlines, today]
  );
  const contexts = useMemo(() => {
    const projects = canonical.projects.filter(
      (project) => baseContexts.projects.some((item) => item.id === project.id) || legacyTodayProjectIds.has(project.id)
    );
    const areaIds = new Set(baseContexts.areas.map((area) => area.id));
    for (const project of projects) areaIds.add(project.areaId);
    return {
      projects,
      areas: canonical.areas.filter((area) => areaIds.has(area.id))
    };
  }, [baseContexts, canonical.areas, canonical.projects, legacyTodayProjectIds]);
  const insights = useMemo(
    () => noOpInsightProvider.getInsights(canonical, today).slice(0, 3),
    [canonical, today]
  );
  const upcoming = useMemo(
    () =>
      data.deadlines
        .filter((item) => !item.archivedAt && !item.trashedAt && item.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "99:99").localeCompare(b.time ?? "99:99") || a.title.localeCompare(b.title))
        .slice(0, 6),
    [data.deadlines, today]
  );
  const dailyNote = canonical.dailyNotes.find((note) => note.localDate === today);
  const date = dateKeyToLocalDate(today);
  const humanDate = date ? format(date, "EEEE, MMMM d") : today;

  const daylineItems = timedTasks.map((task) => ({
    id: task.id,
    type: "task" as const,
    time: task.scheduledTime,
    title: task.title,
    done: task.state === "done",
    meta: taskContext(task, canonical.projects, canonical.areas),
    onToggle: () => updateTask(task.id, { status: task.state === "open" ? "done" : "todo" })
  }));

  return (
    <div data-testid="home-view" className="cos-page">
      <PageHeader
        eyebrow="ContextOS"
        title="Home"
        description={humanDate}
      />

      <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1.05fr)_minmax(15rem,0.9fr)] xl:gap-10">
        <Section
          title="Today"
          description="What you planned to do today. Completed work stays in place."
          className="md:col-span-2 xl:col-span-1"
        >
          <div data-testid="home-dayline" className="min-h-[18rem]">
            {timedTasks.length ? (
              <Dayline items={daylineItems} />
            ) : (
              <EmptyState
                title="No timed work planned"
                description="Planned tasks without a time will appear under Anytime."
              />
            )}

            {anytimeTasks.length ? (
              <div data-testid="home-anytime" className="mt-7 border-t border-[var(--cos-border-soft)] pt-5">
                <p className="cos-section-heading mb-2">Anytime</p>
                <div className="space-y-1">
                  {anytimeTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`flex min-h-11 items-center gap-3 rounded-lg px-1 py-2 ${task.state === "done" ? "opacity-55" : ""}`}
                    >
                      <button
                        type="button"
                        onClick={() => updateTask(task.id, { status: task.state === "open" ? "done" : "todo" })}
                        aria-label={task.state === "done" ? `Reopen ${task.title}` : `Complete ${task.title}`}
                        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[11px] ${
                          task.state === "done"
                            ? "border-[var(--cos-text-subtle)] bg-[var(--cos-text-subtle)] text-[var(--cos-bg)]"
                            : "border-[var(--cos-border-strong)] bg-[var(--cos-bg-elevated)] hover:border-[var(--cos-primary)]"
                        }`}
                      >
                        {task.state === "done" ? "✓" : ""}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-medium text-[var(--cos-text-strong)] ${task.state === "done" ? "line-through" : ""}`}>
                          {task.title}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-[var(--cos-text-subtle)]">
                          {taskContext(task, canonical.projects, canonical.areas)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </Section>

        <div className="space-y-8">
          <Section
            title="Daily Notes"
            description="One unstructured note for today. No filing required."
          >
            <DailyNoteEditor
              key={today}
              value={dailyNote?.content ?? ""}
              onSave={(content) => updateDailyNote(today, content)}
            />
          </Section>

          <Section
            title="Insights"
            description="Relevant, explainable suggestions from ContextOS intelligence."
          >
            <div data-testid="home-insights" className="space-y-3">
              {insights.length ? (
                insights.map((insight) => (
                  <InsightCard
                    key={insight.id}
                    title={insight.title}
                    message={insight.message}
                    source={insight.sourceRef ?? undefined}
                  />
                ))
              ) : (
                <EmptyState
                  title="Nothing to surface"
                  description="Insights stay quiet until there is something timely and explainable to show."
                />
              )}
            </div>
          </Section>
        </div>

        <div className="space-y-8">
          <Section
            title="In Context Today"
            description="Projects and Areas referenced by today’s planned work and dates."
          >
            <div data-testid="home-contexts">
              {contexts.projects.length || contexts.areas.length ? (
                <div>
                  {contexts.projects.length ? (
                    <div>
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--cos-text-subtle)]">Projects</p>
                      {contexts.projects.map((project) => (
                        <EntityRow
                          key={project.id}
                          title={project.name}
                          meta={canonical.areas.find((area) => area.id === project.areaId)?.name ?? "Project"}
                          onOpen={() => router.push(`/projects/${encodeURIComponent(project.id)}`)}
                        />
                      ))}
                    </div>
                  ) : null}

                  {contexts.areas.length ? (
                    <div className={contexts.projects.length ? "mt-6" : ""}>
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--cos-text-subtle)]">Areas</p>
                      {contexts.areas.map((area) => (
                        <EntityRow
                          key={area.id}
                          title={area.name}
                          meta="Area"
                          onOpen={() => router.push("/areas")}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <EmptyState
                  title="No context yet"
                  description="Projects and Areas will appear here when today’s Tasks or Dates reference them."
                />
              )}
            </div>
          </Section>

          <Section
            title="Upcoming"
            description="The next dates and deadlines that are about to matter."
          >
            <div data-testid="home-upcoming">
              {upcoming.length ? (
                <div>
                  {upcoming.map((item) => (
                    <DateRow
                      key={item.id}
                      title={item.title}
                      kind="deadline"
                      time={item.time}
                      meta={item.date === today ? "Today" : item.date}
                      onOpen={() => router.push("/dates")}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Nothing upcoming"
                  description="Near-term Dates and deadlines will appear here."
                />
              )}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
