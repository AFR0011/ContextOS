"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive, ArrowLeft, Check, Circle, Plus, RotateCcw } from "lucide-react";
import { EmptyState, PageHeader, Section, TaskRow } from "@/components/workspace/ProductPrimitives";
import { useWorkspace } from "@/lib/client-store";
import { adaptLegacyWorkspace } from "@/lib/canonical-adapters";
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
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") commit();
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
        if (event.key === "Enter") {
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
  const { data, addTask, updateProject, updateTask } = useWorkspace();
  const canonical = useMemo(() => adaptLegacyWorkspace(data).workspace, [data]);
  const project = canonical.projects.find((item) => item.id === projectId);
  const legacyProject = data.projects.find((item) => item.id === projectId);
  const [showCompleted, setShowCompleted] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [plannedDate, setPlannedDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  if (!project || !legacyProject) {
    return (
      <div className="cos-page">
        <PageHeader title="Project not found" description="This Project is unavailable in the canonical workspace." />
        <EmptyState title="Nothing to open here" action={<button type="button" onClick={() => router.push("/projects")} className="cos-btn cos-btn-secondary px-4 py-2 text-sm">Back to Projects</button>} />
      </div>
    );
  }

  const currentArea = data.domains.find((domain) => domain.id === project.areaId);
  const areaChoices = data.domains.filter((domain) => !domain.archived || domain.id === project.areaId);
  const projectTasks = canonical.tasks.filter(
    (task) => task.parent.type === "project" && task.parent.projectId === project.id
  );
  const openTasks = projectTasks.filter((task) => task.state === "open");
  const doneTasks = projectTasks.filter((task) => task.state === "done").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  function addProjectTask() {
    const title = taskTitle.trim();
    if (!title) return;
    addTask({
      title,
      projectId: project.id,
      domainId: null,
      plannedDate: plannedDate || null,
      scheduledTime: plannedDate ? scheduledTime || null : null
    });
    setTaskTitle("");
    setPlannedDate("");
    setScheduledTime("");
  }

  function archive() {
    updateProject(project.id, { status: "archived", archivedAt: new Date().toISOString() });
  }

  function restore() {
    updateProject(project.id, { status: "active", archivedAt: null });
  }

  return (
    <div className="cos-page">
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
            <EditableText value={legacyProject.name} placeholder="Project name" onSave={(name) => name && updateProject(project.id, { name })} />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-[var(--cos-text-muted)]">Area</span>
            <select
              value={legacyProject.domainId}
              onChange={(event) => updateProject(project.id, { domainId: event.target.value })}
              className="cos-input w-full px-3 py-2 text-sm"
            >
              {areaChoices.map((area) => (
                <option key={area.id} value={area.id}>{area.name}{area.archived ? " (archived)" : ""}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 lg:col-span-2">
            <span className="text-xs font-semibold text-[var(--cos-text-muted)]">Objective</span>
            <EditableText
              value={legacyProject.currentObjective}
              multiline
              placeholder="What outcome is this Project trying to reach?"
              onSave={(currentObjective) => updateProject(project.id, { currentObjective })}
            />
          </label>
        </div>
      </Section>

      <Section
        title="Tasks"
        description="Concrete actions belonging to this Project."
        className="mt-8"
        action={doneTasks.length ? (
          <button type="button" onClick={() => setShowCompleted((value) => !value)} className="cos-btn cos-btn-ghost px-3 py-1.5 text-xs">
            {showCompleted ? "Hide completed" : `Show completed (${doneTasks.length})`}
          </button>
        ) : null}
      >
        <div className="cos-surface p-3">
          <div className="space-y-1">
            {openTasks.map((task) => (
              <TaskRow
                key={task.id}
                title={task.title}
                done={false}
                meta={[task.plannedDate ? `Planned ${task.plannedDate}` : "", task.scheduledTime ?? ""].filter(Boolean).join(" · ") || "Unscheduled"}
                onToggle={() => updateTask(task.id, { status: "done" })}
              />
            ))}
            {!openTasks.length ? <p className="px-3 py-4 text-sm text-[var(--cos-text-subtle)]">No open tasks.</p> : null}
          </div>

          {showCompleted && doneTasks.length ? (
            <div className="mt-3 border-t border-[var(--cos-border-soft)] pt-3">
              {doneTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  title={task.title}
                  done
                  meta={task.plannedDate ? `Planned ${task.plannedDate}` : "Completed"}
                  onToggle={() => updateTask(task.id, { status: "todo" })}
                />
              ))}
            </div>
          ) : null}

          {project.state === "active" ? (
            <div className="mt-4 grid gap-2 border-t border-[var(--cos-border-soft)] pt-4 lg:grid-cols-[minmax(0,1fr)_10rem_8rem_auto]">
              <input
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && addProjectTask()}
                placeholder="Add a task..."
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

      <Section title="Linked Knowledge" description="Durable project knowledge belongs in Canon; ContextOS only exposes the link." className="mt-8">
        <EmptyState
          title="No linked knowledge"
          description="Canon linking is not connected yet. This section is intentionally empty rather than inventing a document relationship."
        />
      </Section>
    </div>
  );
}
