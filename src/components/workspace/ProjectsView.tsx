"use client";

import { useRef, useState } from "react";
import { Archive, FolderKanban, Plus, RotateCcw } from "lucide-react";
import { EmptyState, PageHeader, Section } from "@/components/workspace/ProductPrimitives";
import { useWorkspace } from "@/lib/client-store";
import { projectArchiveBlockReason } from "@/lib/archive-policy";
import { useLocalRouter as useRouter } from "@/lib/local-router";
import type { Area } from "@/lib/types";

function areaName(areas: Area[], areaId: string) {
  const area = areas.find((item) => item.id === areaId);
  return area ? `${area.name}${area.state === "archived" ? " (archived)" : ""}` : "Unknown area";
}

function ProjectRow({
  name,
  area,
  objective,
  taskCount,
  archived,
  archiveAttemptMessage,
  onOpen,
  onArchive,
  onRestore
}: {
  name: string;
  area: string;
  objective: string;
  taskCount: number;
  archived?: boolean;
  archiveAttemptMessage?: string | null;
  onOpen: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
}) {
  return (
    <div className={`cos-entity-row ${archived ? "opacity-70" : ""}`}>
      <div className="min-w-0 flex-1">
        <button type="button" onClick={onOpen} className="w-full min-w-0 text-left">
          <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
            <span className="min-w-0 max-w-full break-words text-sm font-semibold text-[var(--cos-text-strong)] [overflow-wrap:anywhere]">{name}</span>
            <span className="cos-pill cos-pill-muted min-w-0 max-w-full whitespace-normal break-words [overflow-wrap:anywhere]">{area}</span>
          </div>
          <p className="mt-1 line-clamp-2 break-words text-xs leading-5 text-[var(--cos-text-muted)] [overflow-wrap:anywhere]">
            {objective || "No objective yet."}
          </p>
          {!archived ? (
            <p className="mt-1 text-[11px] text-[var(--cos-text-subtle)]">
              {taskCount ? `${taskCount} open task${taskCount === 1 ? "" : "s"}` : "No open tasks"}
            </p>
          ) : null}
        </button>
        {archiveAttemptMessage ? (
          <p role="alert" className="mt-1 text-[11px] text-[var(--cos-warning-text)]">{archiveAttemptMessage}</p>
        ) : null}
      </div>
      {onArchive ? (
        <button
          type="button"
          onClick={onArchive}
          aria-label={`Archive ${name}`}
          className="cos-btn cos-btn-ghost min-h-10 shrink-0 px-3 py-2 text-xs"
        >
          <Archive className="h-3.5 w-3.5" /> Archive
        </button>
      ) : null}
      {onRestore ? (
        <button
          type="button"
          onClick={onRestore}
          aria-label={`Restore ${name}`}
          className="cos-btn cos-btn-ghost min-h-10 shrink-0 px-3 py-2 text-xs"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Restore
        </button>
      ) : null}
    </div>
  );
}

export function ProjectsView() {
  const router = useRouter();
  const { data, addProject, updateProject } = useWorkspace();
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [areaId, setAreaId] = useState("");
  const [objective, setObjective] = useState("");
  const [archiveAttemptProjectId, setArchiveAttemptProjectId] = useState<string | null>(null);
  const newProjectTriggerRef = useRef<HTMLButtonElement | null>(null);

  const activeAreas = data.areas.filter((area) => area.state === "active");
  const activeProjects = data.projects.filter((project) => project.state === "active");
  const archivedProjects = data.projects.filter((project) => project.state === "archived");

  function openTaskCount(projectId: string) {
    return data.tasks.filter(
      (task) => task.state === "open" && task.parent.type === "project" && task.parent.projectId === projectId
    ).length;
  }

  function createProject() {
    const chosenArea = areaId || activeAreas[0]?.id;
    const trimmedName = name.trim();
    if (!trimmedName || !chosenArea) return;
    const id = addProject({
      name: trimmedName,
      areaId: chosenArea,
      objective: objective.trim()
    });
    setName("");
    setObjective("");
    setAreaId(chosenArea);
    setShowNew(false);
    router.push(`/projects/${id}`);
  }

  function cancelProjectCreation() {
    setShowNew(false);
    window.requestAnimationFrame(() => newProjectTriggerRef.current?.focus());
  }

  function archiveProject(projectId: string) {
    if (projectArchiveBlockReason(data, projectId)) {
      setArchiveAttemptProjectId(projectId);
      return;
    }
    setArchiveAttemptProjectId(null);
    updateProject(projectId, { state: "archived" });
  }

  function restoreProject(projectId: string) {
    updateProject(projectId, { state: "active" });
  }

  return (
    <div className="cos-page">
      <PageHeader
        eyebrow="Work"
        title="Projects"
        action={
          <button
            ref={newProjectTriggerRef}
            type="button"
            onClick={() => setShowNew(true)}
            disabled={!activeAreas.length}
            aria-expanded={showNew}
            aria-controls="project-create-form"
            className="cos-btn cos-btn-primary px-4 py-2 text-sm disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> New Project
          </button>
        }
      />

      {showNew ? (
        <section id="project-create-form" className="cos-surface mb-6 p-4" data-testid="project-create-form">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_14rem]">
            <label className="space-y-1">
              <span className="text-xs font-semibold text-[var(--cos-text-muted)]">Name</span>
              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Project name"
                className="cos-input w-full px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-[var(--cos-text-muted)]">Area</span>
              <select
                value={areaId || activeAreas[0]?.id || ""}
                onChange={(event) => setAreaId(event.target.value)}
                className="cos-input w-full px-3 py-2 text-sm"
              >
                {activeAreas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
              </select>
            </label>
          </div>
          <label className="mt-3 block space-y-1">
            <span className="text-xs font-semibold text-[var(--cos-text-muted)]">Objective</span>
            <textarea
              value={objective}
              onChange={(event) => setObjective(event.target.value)}
              placeholder="What outcome is this project trying to reach?"
              rows={3}
              className="cos-input w-full resize-y px-3 py-2 text-sm"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={createProject} disabled={!name.trim()} className="cos-btn cos-btn-primary px-4 py-2 text-sm disabled:opacity-50">
              Create Project
            </button>
            <button type="button" onClick={cancelProjectCreation} className="cos-btn cos-btn-ghost px-4 py-2 text-sm">
              Cancel
            </button>
          </div>
        </section>
      ) : null}

      {!activeAreas.length ? (
        <div className="mb-6">
          <EmptyState
            title="No active Areas"
            description="Projects can remain visible when their Area is archived, but creating a new Project requires an active Area."
            action={<button type="button" onClick={() => router.push("/areas")} className="cos-btn cos-btn-secondary px-4 py-2 text-sm">Manage Areas</button>}
          />
        </div>
      ) : null}

      <Section title="Active">
        {activeProjects.length ? (
          <div className="space-y-2">
            {activeProjects.map((project) => (
              <ProjectRow
                key={project.id}
                name={project.name}
                area={areaName(data.areas, project.areaId)}
                objective={project.objective}
                taskCount={openTaskCount(project.id)}
                archiveAttemptMessage={archiveAttemptProjectId === project.id ? projectArchiveBlockReason(data, project.id) : null}
                onOpen={() => router.push(`/projects/${project.id}`)}
                onArchive={() => archiveProject(project.id)}
              />
            ))}
          </div>
        ) : (
          <EmptyState variant={archivedProjects.length ? "compact" : "full"} title="No active projects" description={archivedProjects.length ? undefined : "Create a Project when a piece of work has a clear outcome."} />
        )}
      </Section>

      {archivedProjects.length ? (
        <Section title="Archived" className="mt-8">
          <div className="space-y-2">
            {archivedProjects.map((project) => (
              <ProjectRow
                key={project.id}
                name={project.name}
                area={areaName(data.areas, project.areaId)}
                objective={project.objective}
                taskCount={openTaskCount(project.id)}
                archived
                onOpen={() => router.push(`/projects/${project.id}`)}
                onRestore={() => restoreProject(project.id)}
              />
            ))}
          </div>
        </Section>
      ) : null}
    </div>
  );
}
