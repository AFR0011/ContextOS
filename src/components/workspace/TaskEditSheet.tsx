"use client";

import { useEffect, useMemo, useState } from "react";
import { DetailSheet } from "@/components/workspace/ProductPrimitives";
import type { Area, Project, Task, TaskParent } from "@/lib/canonical-domain";

function parentValue(parent: TaskParent) {
  return parent.type === "project" ? `project:${parent.projectId}` : `area:${parent.areaId}`;
}

function parseParent(value: string): TaskParent | null {
  const [type, id] = value.split(":");
  if (!id) return null;
  return type === "project"
    ? { type: "project", projectId: id }
    : type === "area"
      ? { type: "area", areaId: id }
      : null;
}

export function TaskEditSheet({
  task,
  projects,
  areas,
  onClose,
  onSave
}: {
  task: Task | null;
  projects: Project[];
  areas: Area[];
  onClose: () => void;
  onSave: (taskId: string, updates: Partial<Task>) => void;
}) {
  const [title, setTitle] = useState("");
  const [parent, setParent] = useState("");
  const [plannedDate, setPlannedDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setParent(parentValue(task.parent));
    setPlannedDate(task.plannedDate ?? "");
    setScheduledTime(task.scheduledTime ?? "");
  }, [task]);

  const projectChoices = useMemo(
    () => projects.filter((project) =>
      project.state === "active" ||
      (task?.parent.type === "project" && project.id === task.parent.projectId)
    ),
    [projects, task]
  );
  const areaChoices = useMemo(
    () => areas.filter((area) =>
      area.state === "active" ||
      (task?.parent.type === "area" && area.id === task.parent.areaId)
    ),
    [areas, task]
  );

  function save() {
    if (!task) return;
    const trimmedTitle = title.trim();
    const nextParent = parseParent(parent);
    if (!trimmedTitle || !nextParent) return;

    onSave(task.id, {
      title: trimmedTitle,
      parent: nextParent,
      plannedDate: plannedDate || null,
      scheduledTime: plannedDate ? scheduledTime || null : null
    });
    onClose();
  }

  return (
    <DetailSheet
      open={Boolean(task)}
      title="Edit Task"
      description="Change the Task itself without changing its Open / Done state."
      onClose={onClose}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className="cos-btn cos-btn-ghost px-4 py-2 text-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!title.trim() || !parseParent(parent)}
            className="cos-btn cos-btn-primary px-4 py-2 text-sm disabled:opacity-50"
          >
            Save Task
          </button>
        </div>
      }
    >
      <div data-testid="task-edit-sheet" className="space-y-4">
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-[var(--cos-text-muted)]">Title</span>
          <input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && !event.nativeEvent.isComposing) save();
            }}
            aria-label="Task title"
            className="cos-input w-full px-3 py-2 text-sm"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-semibold text-[var(--cos-text-muted)]">Context</span>
          <select
            value={parent}
            onChange={(event) => setParent(event.target.value)}
            aria-label="Task context"
            className="cos-input w-full px-3 py-2 text-sm"
          >
            {projectChoices.length ? (
              <optgroup label="Projects">
                {projectChoices.map((project) => (
                  <option key={project.id} value={`project:${project.id}`}>
                    {project.name}{project.state === "archived" ? " (archived)" : ""}
                  </option>
                ))}
              </optgroup>
            ) : null}
            {areaChoices.length ? (
              <optgroup label="Areas">
                {areaChoices.map((area) => (
                  <option key={area.id} value={`area:${area.id}`}>
                    {area.name}{area.state === "archived" ? " (archived)" : ""}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </select>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-[var(--cos-text-muted)]">Planned day</span>
            <input
              type="date"
              value={plannedDate}
              onChange={(event) => {
                setPlannedDate(event.target.value);
                if (!event.target.value) setScheduledTime("");
              }}
              aria-label="Task planned day"
              className="cos-input w-full px-3 py-2 text-sm"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-[var(--cos-text-muted)]">Scheduled time</span>
            <input
              type="time"
              value={scheduledTime}
              onChange={(event) => setScheduledTime(event.target.value)}
              disabled={!plannedDate}
              aria-label="Task scheduled time"
              className="cos-input w-full px-3 py-2 text-sm disabled:opacity-45"
            />
          </label>
        </div>
      </div>
    </DetailSheet>
  );
}
