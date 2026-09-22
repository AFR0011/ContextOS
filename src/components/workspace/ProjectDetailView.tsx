"use client";

import { useEffect, useState } from "react";
import { Archive, ArrowLeft, Plus, RotateCcw } from "lucide-react";
import { DateRow, EmptyState, PageHeader, Section, TaskRow } from "@/components/workspace/ProductPrimitives";
import { useWorkspace } from "@/lib/client-store";
import { localDateKey } from "@/lib/dates";
import { useLocalRouter as useRouter } from "@/lib/local-router";

function EditableText({
  value,
  placeholder,
  multiline = false,
  onSave
}: {
  value: string;
  placeholder: string;
  multiline?: boolean;
  onSave: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  function commit() {
    if (draft !== value) onSave(draft.trim());
  }

  const classes = "cos-input w-full px-3 py-2 text-sm";

  return multiline ? (
    <textarea
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !event.nativeEvent.isComposing) commit();
        if (event.key === "Escape") setDraft(value);
      }}
      rows={4}
      placeholder={placeholder}
      className={`${classes} resize-y`}
    />
  ) : (
    <input
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !event.nativeEvent.isComposing) {
          commit();
          event.currentTarget.blur();
        }
        if (event.key === "Escape") setDraft(value);
      }}
      placeholder={placeholder}
      className={classes}
    />
  );
}

export function ProjectDetailView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { data, addTask, addDate, updateProject, updateTask } = useWorkspace();
  const project = data.projects.find((item) => item.id === projectId);
  const [showCompleted, setShowCompleted] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [plannedDate, setPlannedDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [dateTitle, setDateTitle] = useState("");
  const [dateKind, setDateKind] = useState<"event" | "deadline">("deadline");
  const [dateValue, setDateValue] = useState(localDateKey());
  const [dateStartTime, setDateStartTime] = useState("");
  const [dateEndTime, setDateEndTime] = useState("");
  const [dateDetails, setDateDetails] = useState("");

  if (!project) {
    return (
      <div className="cos-page">
        <PageHeader title="Project not found" description="This Project is unavailable in the canonical workspace." />
        <EmptyState title="Nothing to open here" action={<button type="button" onClick={() => router.push("/projects")} className="cos-btn cos-btn-secondary px-4 py-2 text-sm">Back to Projects</button>} />
      </div>
    );
  }

  const currentArea = data.areas.find((area) => area.id === project.areaId);
  const areaChoices = data.areas.filter((area) => area.state === "active" || area.id === project.areaId);
  const projectTasks = data.tasks.filter(
    (task) => task.parent.type === "project" && task.parent.projectId === project.id
  );
  const openTasks = projectTasks.filter((task) => task.state === "open");
  const doneTasks = projectTasks.filter((task) => task.state === "done").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const projectDates = data.dates
    .filter((item) => item.parent.type === "project" && item.parent.projectId === project.id)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.startTime ?? "99:99").localeCompare(b.startTime ?? "99:99"));

  function addProjectTask() {
    const title = taskTitle.trim();
    if (!title) return;
    addTask({
      title,
      parent: { type: "project", projectId: project.id },
      plannedDate: plannedDate || null,
      scheduledTime: plannedDate ? scheduledTime || null : null
    });
    setTaskTitle("");
    setPlannedDate("");
    setScheduledTime("");
  }

  function addProjectDate() {
    const title = dateTitle.trim();
    if (!title || !dateValue) return;
    addDate({
      title,
      kind: dateKind,
      date: dateValue,
      startTime: dateStartTime || null,
      endTime: dateKind === "event" ? dateEndTime || null : null,
      details: dateDetails.trim(),
      parent: { type: "project", projectId: project.id }
    });
    setDateTitle("");
    setDateStartTime("");
    setDateEndTime("");
    setDateDetails("");
  }

  function archive() {
    updateProject(project.id, { state: "archived" });
  }

  function restore() {
    updateProject(project.id, { state: "active" });
  }

  return (
    <div className="cos-page" data-testid="project-command-page">
      <button type="button" onClick={() => router.push("/projects")} className="cos-btn cos-btn-ghost mb-4 px-2 py-1.5 text-xs">
        <ArrowLeft className="h-3.5 w-3.5" /> Projects
      </button>

      <PageHeader
        eyebrow={currentArea?.name ?? "Project"}
        title={project.name}
        description={project.state === "archived" ? "Archived Project" : "Active Project"}
        action={
          project.state === "archived" ? (
            <button type="button" onClick={restore} className="cos-btn cos-btn-secondary px-3 py-2 text-sm">
              <RotateCcw className="h-4 w-4" /> Restore
            </button>
          ) : (
            <button type="button" onClick={archive} className="cos-btn cos-btn-secondary px-3 py-2 text-sm">
              <Archive className="h-4 w-4" /> Archive
            </button>
          )
        }
      />

      <Section title="Project" description="The small amount of canonical information needed to resume the work.">
        <div className="cos-surface grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_14rem]">
          <label className="space-y-1">
            <span className="text-xs font-semibold text-[var(--cos-text-muted)]">Name</span>
            <EditableText value={project.name} placeholder="Project name" onSave={(name) => name && updateProject(project.id, { name })} />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-[var(--cos-text-muted)]">Area</span>
            <select
              value={project.areaId}
              onChange={(event) => updateProject(project.id, { areaId: event.target.value })}
              className="cos-input w-full px-3 py-2 text-sm"
            >
              {areaChoices.map((area) => (
                <option key={area.id} value={area.id}>{area.name}{area.state === "archived" ? " (archived)" : ""}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 lg:col-span-2">
            <span className="text-xs font-semibold text-[var(--cos-text-muted)]">Objective</span>
            <EditableText
              value={project.objective}
              multiline
              placeholder="What outcome is this Project trying to reach?"
              onSave={(objective) => updateProject(project.id, { objective })}
            />
          </label>
        </div>
      </Section>

      <Section
        title="Tasks"
        description="Concrete actions belonging to this Project."
        className="mt-8"
        action={doneTasks.length ? (
          <button type="button" onClick={() => setShowCompleted((value) => !value)} aria-expanded={showCompleted} aria-controls="project-completed-tasks" className="cos-btn cos-btn-ghost px-3 py-1.5 text-xs">
            {showCompleted ? "Hide completed" : `Show completed (${doneTasks.length})`}
          </button>
        ) : null}
      >
        <div className="cos-surface p-3" data-testid="project-live-tasks">
          <div className="space-y-1">
            {openTasks.map((task) => (
              <TaskRow
                key={task.id}
                title={task.title}
                done={false}
                meta={[task.plannedDate ? `Planned ${task.plannedDate}` : "", task.scheduledTime ?? ""].filter(Boolean).join(" · ") || "Unscheduled"}
                onToggle={() => updateTask(task.id, { state: "done" })}
              />
            ))}
            {!openTasks.length ? <p className="px-3 py-4 text-sm text-[var(--cos-text-subtle)]">No open tasks.</p> : null}
          </div>

          {showCompleted && doneTasks.length ? (
            <div id="project-completed-tasks" className="mt-3 border-t border-[var(--cos-border-soft)] pt-3">
              {doneTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  title={task.title}
                  done
                  meta={task.plannedDate ? `Planned ${task.plannedDate}` : "Completed"}
                  onToggle={() => updateTask(task.id, { state: "open" })}
                />
              ))}
            </div>
          ) : null}

          {project.state === "active" ? (
            <div className="mt-4 grid gap-2 border-t border-[var(--cos-border-soft)] pt-4 lg:grid-cols-[minmax(0,1fr)_10rem_8rem_auto]">
              <input
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && !event.nativeEvent.isComposing && addProjectTask()}
                placeholder="Add a task..."
                aria-label="Task title"
                className="cos-input px-3 py-2 text-sm"
              />
              <input
                type="date"
                value={plannedDate}
                onChange={(event) => {
                  setPlannedDate(event.target.value);
                  if (!event.target.value) setScheduledTime("");
                }}
                aria-label="Planned day"
                className="cos-input px-3 py-2 text-sm"
              />
              <input
                type="time"
                value={scheduledTime}
                onChange={(event) => setScheduledTime(event.target.value)}
                disabled={!plannedDate}
                aria-label="Scheduled time"
                className="cos-input px-3 py-2 text-sm disabled:opacity-50"
              />
              <button type="button" onClick={addProjectTask} disabled={!taskTitle.trim()} className="cos-btn cos-btn-primary px-3 py-2 text-sm disabled:opacity-50">
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
          ) : null}
        </div>
      </Section>

      <Section title="Dates" description="Events and external deadlines tied to this Project." className="mt-8">
        <div className="cos-surface p-3" data-testid="project-dates">
          <div className="space-y-1">
            {projectDates.map((item) => (
              <DateRow
                key={item.id}
                title={item.title}
                kind={item.kind}
                time={item.startTime}
                meta={item.date}
                onOpen={() => router.push("/dates")}
              />
            ))}
            {!projectDates.length ? <p className="px-3 py-4 text-sm text-[var(--cos-text-subtle)]">No Dates for this Project.</p> : null}
          </div>

          {project.state === "active" ? (
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
              <input value={dateTitle} onChange={(event) => setDateTitle(event.target.value)} placeholder="Add a Date..." aria-label="Date title" className="cos-input px-3 py-2 text-sm" />
              <input type="date" value={dateValue} onChange={(event) => setDateValue(event.target.value)} aria-label="Date" className="cos-input px-3 py-2 text-sm" />
              <input type="time" value={dateStartTime} onChange={(event) => setDateStartTime(event.target.value)} aria-label="Date start time" className="cos-input px-3 py-2 text-sm" />
              <input type="time" value={dateEndTime} onChange={(event) => setDateEndTime(event.target.value)} aria-label="Date end time" disabled={dateKind === "deadline"} className="cos-input px-3 py-2 text-sm disabled:opacity-45" />
              <button type="button" onClick={addProjectDate} disabled={!dateTitle.trim() || !dateValue} className="cos-btn cos-btn-primary px-3 py-2 text-sm disabled:opacity-50"><Plus className="h-4 w-4" /> Add</button>
              <textarea value={dateDetails} onChange={(event) => setDateDetails(event.target.value)} placeholder="Details (optional)" aria-label="Date details" rows={2} className="cos-input resize-y px-3 py-2 text-sm md:col-span-2 xl:col-span-6" />
            </div>
          ) : null}
        </div>
      </Section>

      <Section title="Linked Knowledge" description="Durable project knowledge belongs in Canon; ContextOS only exposes the link." className="mt-8">
        <EmptyState
          title="No linked knowledge"
          description="Canon linking is not connected yet. This section is intentionally empty rather than inventing a document relationship."
        />
      </Section>
    </div>
  );
}
