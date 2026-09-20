"use client";

import { useMemo, useState } from "react";
import { Archive, ArrowLeft, Plus, RotateCcw } from "lucide-react";
import { DateRow, EmptyState, PageHeader, Section, TaskRow } from "@/components/workspace/ProductPrimitives";
import { useWorkspace } from "@/lib/client-store";
import { adaptLegacyWorkspace } from "@/lib/canonical-adapters";
import { localDateKey } from "@/lib/dates";
import { useLocalRouter as useRouter } from "@/lib/local-router";

export function AreaDetailView({ areaId }: { areaId: string }) {
  const router = useRouter();
  const { data, addProject, addTask, addContextDate, updateDomain, updateProject, updateTask } = useWorkspace();
  const canonical = useMemo(() => adaptLegacyWorkspace(data).workspace, [data]);
  const area = canonical.areas.find((item) => item.id === areaId);
  const [projectName, setProjectName] = useState("");
  const [projectObjective, setProjectObjective] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [plannedDate, setPlannedDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [dateTitle, setDateTitle] = useState("");
  const [dateKind, setDateKind] = useState<"event" | "deadline">("event");
  const [dateValue, setDateValue] = useState(localDateKey());
  const [dateStartTime, setDateStartTime] = useState("");
  const [dateEndTime, setDateEndTime] = useState("");
  const [dateDetails, setDateDetails] = useState("");

  if (!area) {
    return (
      <div className="cos-page">
        <PageHeader title="Area not found" />
        <EmptyState title="Nothing to open here" action={<button type="button" onClick={() => router.push("/areas")} className="cos-btn cos-btn-secondary px-4 py-2 text-sm">Back to Areas</button>} />
      </div>
    );
  }

  const activeProjects = canonical.projects.filter((project) => project.areaId === area.id && project.state === "active");
  const archivedProjects = canonical.projects.filter((project) => project.areaId === area.id && project.state === "archived");
  const directTasks = canonical.tasks.filter((task) => task.parent.type === "area" && task.parent.areaId === area.id);
  const openTasks = directTasks.filter((task) => task.state === "open");
  const doneTasks = directTasks.filter((task) => task.state === "done");
  const directDates = canonical.dates
    .filter((item) => item.parent.type === "area" && item.parent.areaId === area.id)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.startTime ?? "99:99").localeCompare(b.startTime ?? "99:99"));

  function createProject() {
    const name = projectName.trim();
    if (!name || area.state === "archived") return;
    const id = addProject({ name, domainId: area.id, currentObjective: projectObjective.trim() });
    setProjectName("");
    setProjectObjective("");
    router.push(`/projects/${id}`);
  }

  function createTask() {
    const title = taskTitle.trim();
    if (!title || area.state === "archived") return;
    addTask({
      title,
      projectId: null,
      domainId: area.id,
      plannedDate: plannedDate || null,
      scheduledTime: plannedDate ? scheduledTime || null : null
    });
    setTaskTitle("");
    setPlannedDate("");
    setScheduledTime("");
  }

  function createDate() {
    const title = dateTitle.trim();
    if (!title || !dateValue || area.state === "archived") return;
    addContextDate({
      title,
      kind: dateKind,
      date: dateValue,
      startTime: dateStartTime || null,
      endTime: dateKind === "event" ? dateEndTime || null : null,
      details: dateDetails.trim(),
      projectId: null,
      domainId: area.id
    });
    setDateTitle("");
    setDateStartTime("");
    setDateEndTime("");
    setDateDetails("");
  }

  return (
    <div className="cos-page" data-testid="area-detail">
      <button type="button" onClick={() => router.push("/areas")} className="cos-btn cos-btn-ghost mb-4 px-2 py-1.5 text-xs">
        <ArrowLeft className="h-3.5 w-3.5" /> Areas
      </button>

      <PageHeader
        eyebrow="Area"
        title={area.name}
        description={area.state === "archived" ? "Archived responsibility domain" : "Active responsibility domain"}
        action={
          area.state === "archived" ? (
            <button type="button" onClick={() => updateDomain(area.id, { archived: false })} className="cos-btn cos-btn-secondary px-3 py-2 text-sm">
              <RotateCcw className="h-4 w-4" /> Restore
            </button>
          ) : (
            <button type="button" onClick={() => updateDomain(area.id, { archived: true })} className="cos-btn cos-btn-secondary px-3 py-2 text-sm">
              <Archive className="h-4 w-4" /> Archive
            </button>
          )
        }
      />

      <Section title="Active Projects">
        {activeProjects.length ? (
          <div className="space-y-2">
            {activeProjects.map((project) => (
              <div key={project.id} className="cos-entity-row">
                <button type="button" onClick={() => router.push(`/projects/${project.id}`)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-semibold text-[var(--cos-text-strong)]">{project.name}</span>
                  <span className="mt-1 block line-clamp-2 text-xs text-[var(--cos-text-muted)]">{project.objective || "No objective yet."}</span>
                </button>
                <button type="button" onClick={() => updateProject(project.id, { status: "archived", archivedAt: new Date().toISOString() })} className="cos-btn cos-btn-ghost min-h-9 px-3 py-2 text-xs">
                  <Archive className="h-3.5 w-3.5" /> Archive
                </button>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-[var(--cos-text-subtle)]">No active Projects in this Area.</p>}

        {area.state === "active" ? (
          <div className="cos-surface mt-4 grid gap-2 p-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto]">
            <input value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="New Project name" className="cos-input px-3 py-2 text-sm" />
            <input value={projectObjective} onChange={(event) => setProjectObjective(event.target.value)} onKeyDown={(event) => event.key === "Enter" && createProject()} placeholder="Objective (optional)" className="cos-input px-3 py-2 text-sm" />
            <button type="button" onClick={createProject} disabled={!projectName.trim()} className="cos-btn cos-btn-primary px-3 py-2 text-sm disabled:opacity-50">
              <Plus className="h-4 w-4" /> Add Project
            </button>
          </div>
        ) : null}
      </Section>

      <Section title="Direct Tasks" description="Tasks attached to the Area itself rather than to a Project." className="mt-8">
        <div className="cos-surface p-3">
          {openTasks.map((task) => (
            <TaskRow
              key={task.id}
              title={task.title}
              meta={[task.plannedDate ? `Planned ${task.plannedDate}` : "", task.scheduledTime ?? ""].filter(Boolean).join(" · ") || "Unscheduled"}
              onToggle={() => updateTask(task.id, { status: "done" })}
            />
          ))}
          {!openTasks.length ? <p className="px-3 py-4 text-sm text-[var(--cos-text-subtle)]">No direct open tasks.</p> : null}

          {doneTasks.length ? (
            <details className="mt-3 border-t border-[var(--cos-border-soft)] pt-3">
              <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-[var(--cos-text-muted)]">Completed ({doneTasks.length})</summary>
              {doneTasks.map((task) => (
                <TaskRow key={task.id} title={task.title} done meta="Completed" onToggle={() => updateTask(task.id, { status: "todo" })} />
              ))}
            </details>
          ) : null}

          {area.state === "active" ? (
            <div className="mt-4 grid gap-2 border-t border-[var(--cos-border-soft)] pt-4 lg:grid-cols-[minmax(0,1fr)_10rem_8rem_auto]">
              <input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} onKeyDown={(event) => event.key === "Enter" && createTask()} placeholder="Add a direct task..." className="cos-input px-3 py-2 text-sm" />
              <input type="date" value={plannedDate} onChange={(event) => { setPlannedDate(event.target.value); if (!event.target.value) setScheduledTime(""); }} aria-label="Planned day" className="cos-input px-3 py-2 text-sm" />
              <input type="time" value={scheduledTime} onChange={(event) => setScheduledTime(event.target.value)} disabled={!plannedDate} aria-label="Scheduled time" className="cos-input px-3 py-2 text-sm disabled:opacity-50" />
              <button type="button" onClick={createTask} disabled={!taskTitle.trim()} className="cos-btn cos-btn-primary px-3 py-2 text-sm disabled:opacity-50"><Plus className="h-4 w-4" /> Add</button>
            </div>
          ) : null}
        </div>
      </Section>

      <Section title="Direct Dates" description="Events and external deadlines attached directly to this Area." className="mt-8">
        <div className="cos-surface p-3" data-testid="area-dates">
          <div className="space-y-1">
            {directDates.map((item) => (
              <DateRow
                key={item.id}
                title={item.title}
                kind={item.kind}
                time={item.startTime}
                meta={item.date}
                onOpen={() => router.push("/dates")}
              />
            ))}
            {!directDates.length ? <p className="px-3 py-4 text-sm text-[var(--cos-text-subtle)]">No direct Dates in this Area.</p> : null}
          </div>

          {area.state === "active" ? (
            <div className="mt-4 grid gap-2 border-t border-[var(--cos-border-soft)] pt-4 lg:grid-cols-[7rem_minmax(0,1fr)_10rem_8rem_8rem_auto]">
              <select
                value={dateKind}
                onChange={(event) => {
                  const next = event.target.value as "event" | "deadline";
                  setDateKind(next);
                  if (next === "deadline") setDateEndTime("");
                }}
                aria-label="Date kind"
                className="cos-input px-3 py-2 text-sm"
              >
                <option value="event">Event</option>
                <option value="deadline">Deadline</option>
              </select>
              <input value={dateTitle} onChange={(event) => setDateTitle(event.target.value)} placeholder="Add a direct Date..." className="cos-input px-3 py-2 text-sm" />
              <input type="date" value={dateValue} onChange={(event) => setDateValue(event.target.value)} aria-label="Date" className="cos-input px-3 py-2 text-sm" />
              <input type="time" value={dateStartTime} onChange={(event) => setDateStartTime(event.target.value)} aria-label="Date start time" className="cos-input px-3 py-2 text-sm" />
              <input type="time" value={dateEndTime} onChange={(event) => setDateEndTime(event.target.value)} aria-label="Date end time" disabled={dateKind === "deadline"} className="cos-input px-3 py-2 text-sm disabled:opacity-45" />
              <button type="button" onClick={createDate} disabled={!dateTitle.trim() || !dateValue} className="cos-btn cos-btn-primary px-3 py-2 text-sm disabled:opacity-50"><Plus className="h-4 w-4" /> Add</button>
              <textarea value={dateDetails} onChange={(event) => setDateDetails(event.target.value)} placeholder="Details (optional)" rows={2} className="cos-input resize-y px-3 py-2 text-sm lg:col-span-6" />
            </div>
          ) : null}
        </div>
      </Section>

      <Section title="Archived Projects" className="mt-8">
        {archivedProjects.length ? (
          <div className="space-y-2">
            {archivedProjects.map((project) => (
              <div key={project.id} className="cos-entity-row opacity-70">
                <button type="button" onClick={() => router.push(`/projects/${project.id}`)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-semibold text-[var(--cos-text-strong)]">{project.name}</span>
                  <span className="mt-1 block line-clamp-2 text-xs text-[var(--cos-text-muted)]">{project.objective || "No objective yet."}</span>
                </button>
                <button type="button" onClick={() => updateProject(project.id, { status: "active", archivedAt: null })} className="cos-btn cos-btn-ghost min-h-9 px-3 py-2 text-xs">
                  <RotateCcw className="h-3.5 w-3.5" /> Restore
                </button>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-[var(--cos-text-subtle)]">No archived Projects in this Area.</p>}
      </Section>
    </div>
  );
}
