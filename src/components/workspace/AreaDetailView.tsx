"use client";

import { useState } from "react";
import { Archive, ArrowLeft, Plus, RotateCcw } from "lucide-react";
import { DateRow, EmptyState, PageHeader, Section, TaskRow } from "@/components/workspace/ProductPrimitives";
import { TaskEditSheet } from "@/components/workspace/TaskEditSheet";
import { useWorkspace } from "@/lib/client-store";
import { areaArchiveBlockReason, projectArchiveBlockReason, taskReopenBlockReason } from "@/lib/archive-policy";
import { localDateKey } from "@/lib/dates";
import { useLocalRouter as useRouter } from "@/lib/local-router";

export function AreaDetailView({ areaId }: { areaId: string }) {
  const router = useRouter();
  const { data, addProject, addTask, addDate, updateArea, updateProject, updateTask } = useWorkspace();
  const area = data.areas.find((item) => item.id === areaId);
  const [projectName, setProjectName] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
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

  const currentArea = area;

  const activeProjects = data.projects.filter((project) => project.areaId === currentArea.id && project.state === "active");
  const archivedProjects = data.projects.filter((project) => project.areaId === currentArea.id && project.state === "archived");
  const directTasks = data.tasks.filter((task) => task.parent.type === "area" && task.parent.areaId === currentArea.id);
  const openTasks = directTasks.filter((task) => task.state === "open");
  const doneTasks = directTasks.filter((task) => task.state === "done");
  const editingTask = data.tasks.find((task) => task.id === editingTaskId) ?? null;
  const archiveBlockedReason = areaArchiveBlockReason(data, currentArea.id);
  const directDates = data.dates
    .filter((item) => item.parent.type === "area" && item.parent.areaId === currentArea.id)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.startTime ?? "99:99").localeCompare(b.startTime ?? "99:99"));

  function createProject() {
    const name = projectName.trim();
    if (!name || currentArea.state === "archived") return;
    const id = addProject({ name, areaId: currentArea.id, objective: projectObjective.trim() });
    setProjectName("");
    setProjectObjective("");
    router.push(`/projects/${id}`);
  }

  function createTask() {
    const title = taskTitle.trim();
    if (!title || currentArea.state === "archived") return;
    addTask({
      title,
      parent: { type: "area", areaId: currentArea.id },
      plannedDate: plannedDate || null,
      scheduledTime: plannedDate ? scheduledTime || null : null
    });
    setTaskTitle("");
    setPlannedDate("");
    setScheduledTime("");
  }

  function createDate() {
    const title = dateTitle.trim();
    if (!title || !dateValue || currentArea.state === "archived") return;
    addDate({
      title,
      kind: dateKind,
      date: dateValue,
      startTime: dateStartTime || null,
      endTime: dateKind === "event" ? dateEndTime || null : null,
      details: dateDetails.trim(),
      parent: { type: "area", areaId: currentArea.id }
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
        title={currentArea.name}
        description={currentArea.state === "archived" ? "Archived responsibility domain" : "Active responsibility domain"}
        action={
          currentArea.state === "archived" ? (
            <button type="button" onClick={() => updateArea(currentArea.id, { state: "active" })} className="cos-btn cos-btn-secondary px-3 py-2 text-sm">
              <RotateCcw className="h-4 w-4" /> Restore
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (areaArchiveBlockReason(data, currentArea.id)) return;
                updateArea(currentArea.id, { state: "archived" });
              }}
              disabled={Boolean(archiveBlockedReason)}
              title={archiveBlockedReason ?? undefined}
              aria-describedby={archiveBlockedReason ? "area-archive-blocked" : undefined}
              className="cos-btn cos-btn-secondary px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Archive className="h-4 w-4" /> Archive
            </button>
          )
        }
      />

      {currentArea.state === "active" && archiveBlockedReason ? (
        <p id="area-archive-blocked" className="-mt-4 mb-6 text-sm text-[var(--cos-warning-text)]">
          {archiveBlockedReason}
        </p>
      ) : null}

      <Section title="Area" description="The stable responsibility name used across Projects, Tasks, Dates, and Search.">
        <div className="cos-surface p-4">
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-[var(--cos-text-muted)]">Name</span>
            <input
              key={`${currentArea.id}:${currentArea.updatedAt}`}
              defaultValue={currentArea.name}
              onBlur={(event) => {
                const name = event.currentTarget.value.trim();
                if (!name) {
                  event.currentTarget.value = currentArea.name;
                  return;
                }
                if (name !== currentArea.name) updateArea(currentArea.id, { name });
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                  event.currentTarget.blur();
                }
                if (event.key === "Escape") {
                  event.currentTarget.value = currentArea.name;
                  event.currentTarget.blur();
                }
              }}
              aria-label="Area name"
              className="cos-input w-full px-3 py-2 text-sm"
            />
          </label>
        </div>
      </Section>

      <Section title="Active Projects" className="mt-8">
        {activeProjects.length ? (
          <div className="space-y-2">
            {activeProjects.map((project) => {
              const projectBlockReason = projectArchiveBlockReason(data, project.id);
              return (
                <div key={project.id} className="cos-entity-row">
                  <button type="button" onClick={() => router.push(`/projects/${project.id}`)} className="min-w-0 flex-1 text-left">
                    <span className="block break-words text-sm font-semibold text-[var(--cos-text-strong)] [overflow-wrap:anywhere]">{project.name}</span>
                    <span className="mt-1 block line-clamp-2 break-words text-xs text-[var(--cos-text-muted)] [overflow-wrap:anywhere]">{project.objective || "No objective yet."}</span>
                    {projectBlockReason ? (
                      <span className="mt-1 block text-[11px] text-[var(--cos-warning-text)]">{projectBlockReason}</span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (projectBlockReason) return;
                      updateProject(project.id, { state: "archived" });
                    }}
                    disabled={Boolean(projectBlockReason)}
                    title={projectBlockReason ?? undefined}
                    aria-label={`Archive ${project.name}`}
                    className="cos-btn cos-btn-ghost min-h-10 shrink-0 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Archive className="h-3.5 w-3.5" /> Archive
                  </button>
                </div>
              );
            })}
          </div>
        ) : <p className="text-sm text-[var(--cos-text-subtle)]">No active Projects in this Area.</p>}

        {currentArea.state === "active" ? (
          <div className="cos-surface mt-4 grid gap-2 p-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto]">
            <input value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="New Project name" aria-label="Project name" className="cos-input px-3 py-2 text-sm" />
            <input value={projectObjective} onChange={(event) => setProjectObjective(event.target.value)} onKeyDown={(event) => event.key === "Enter" && !event.nativeEvent.isComposing && createProject()} placeholder="Objective (optional)" aria-label="Project objective" className="cos-input px-3 py-2 text-sm" />
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
              onToggle={() => updateTask(task.id, { state: "done" })}
              onOpen={() => setEditingTaskId(task.id)}
            />
          ))}
          {!openTasks.length ? <p className="px-3 py-4 text-sm text-[var(--cos-text-subtle)]">No direct open tasks.</p> : null}

          {doneTasks.length ? (
            <details className="mt-3 border-t border-[var(--cos-border-soft)] pt-3">
              <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-[var(--cos-text-muted)]">Completed ({doneTasks.length})</summary>
              {doneTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  title={task.title}
                  done
                  meta="Completed"
                  onToggle={() => {
                    if (taskReopenBlockReason(data, task)) return;
                    updateTask(task.id, { state: "open" });
                  }}
                  onOpen={() => setEditingTaskId(task.id)}
                  toggleDisabledReason={taskReopenBlockReason(data, task)}
                />
              ))}
            </details>
          ) : null}

          {currentArea.state === "active" ? (
            <div className="mt-4 grid gap-2 border-t border-[var(--cos-border-soft)] pt-4 lg:grid-cols-[minmax(0,1fr)_10rem_8rem_auto]">
              <input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} onKeyDown={(event) => event.key === "Enter" && !event.nativeEvent.isComposing && createTask()} placeholder="Add a direct task..." aria-label="Task title" className="cos-input px-3 py-2 text-sm" />
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

          {currentArea.state === "active" ? (
            <div className="mt-4 grid gap-2 border-t border-[var(--cos-border-soft)] pt-4 md:grid-cols-2 xl:grid-cols-[7rem_minmax(0,1fr)_10rem_8rem_8rem_auto]">
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
              <input value={dateTitle} onChange={(event) => setDateTitle(event.target.value)} placeholder="Add a direct Date..." aria-label="Date title" className="cos-input px-3 py-2 text-sm" />
              <input type="date" value={dateValue} onChange={(event) => setDateValue(event.target.value)} aria-label="Date" className="cos-input px-3 py-2 text-sm" />
              <input type="time" value={dateStartTime} onChange={(event) => setDateStartTime(event.target.value)} aria-label="Date start time" className="cos-input px-3 py-2 text-sm" />
              <input type="time" value={dateEndTime} onChange={(event) => setDateEndTime(event.target.value)} aria-label="Date end time" disabled={dateKind === "deadline"} className="cos-input px-3 py-2 text-sm disabled:opacity-45" />
              <button type="button" onClick={createDate} disabled={!dateTitle.trim() || !dateValue} className="cos-btn cos-btn-primary px-3 py-2 text-sm disabled:opacity-50"><Plus className="h-4 w-4" /> Add</button>
              <textarea value={dateDetails} onChange={(event) => setDateDetails(event.target.value)} placeholder="Details (optional)" aria-label="Date details" rows={2} className="cos-input resize-y px-3 py-2 text-sm md:col-span-2 xl:col-span-6" />
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
                  <span className="block break-words text-sm font-semibold text-[var(--cos-text-strong)] [overflow-wrap:anywhere]">{project.name}</span>
                  <span className="mt-1 block line-clamp-2 break-words text-xs text-[var(--cos-text-muted)] [overflow-wrap:anywhere]">{project.objective || "No objective yet."}</span>
                </button>
                <button type="button" onClick={() => updateProject(project.id, { state: "active" })} aria-label={`Restore ${project.name}`} className="cos-btn cos-btn-ghost min-h-10 shrink-0 px-3 py-2 text-xs">
                  <RotateCcw className="h-3.5 w-3.5" /> Restore
                </button>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-[var(--cos-text-subtle)]">No archived Projects in this Area.</p>}
      </Section>
      <TaskEditSheet
        task={editingTask}
        projects={data.projects}
        areas={data.areas}
        onClose={() => setEditingTaskId(null)}
        onSave={(taskId, updates) => updateTask(taskId, updates)}
      />
    </div>
  );
}
