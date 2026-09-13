"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, FolderKanban, Plus } from "lucide-react";
import { useLocalRouter as useRouter } from "@/lib/local-router";
import { useWorkspace } from "@/lib/client-store";
import type { Domain, Project, Task } from "@/lib/types";

const projectStatus = {
  active: { label: "Active", color: "cos-pill-success" },
  paused: { label: "Paused", color: "cos-pill-warning" },
  done: { label: "Done", color: "cos-pill-primary" },
  archived: { label: "Archived", color: "cos-pill-muted" }
};

const domainColors = [
  "border border-[var(--cos-primary-border)] bg-[var(--cos-primary-soft)] text-[var(--cos-primary-text)]",
  "border border-[var(--cos-border-soft)] bg-[var(--cos-bg-inset)] text-[var(--cos-text-muted)]",
  "border border-[var(--cos-border-soft)] bg-[var(--cos-project-soft)] text-[var(--cos-project)]",
  "border border-[var(--cos-border-soft)] bg-[var(--cos-date-soft)] text-[var(--cos-date)]",
  "border border-[var(--cos-border-soft)] bg-[var(--cos-review-soft)] text-[var(--cos-review)]",
  "border border-[var(--cos-border-soft)] bg-[var(--cos-bg-inset)] text-[var(--cos-text-muted)]",
  "border border-[var(--cos-border-soft)] bg-[var(--cos-bg-inset)] text-[var(--cos-text-muted)]",
  "border border-[var(--cos-border-soft)] bg-[var(--cos-bg-inset)] text-[var(--cos-text-muted)]"
];

function domainName(domains: Domain[], id: string | null | undefined) {
  if (!id) return "";
  return domains.find((domain) => domain.id === id)?.name || "Unknown";
}

function domainColor(domains: Domain[], id: string | null | undefined) {
  const index = Math.max(0, domains.findIndex((domain) => domain.id === id));
  return domainColors[index % domainColors.length];
}

function visibleProjects(projects: Project[]) {
  return projects.filter((project) => !project.trashedAt && project.status !== "archived");
}

function rootProjects(projects: Project[]) {
  const visibleIds = new Set(visibleProjects(projects).map((project) => project.id));
  return visibleProjects(projects).filter((project) => !project.parentProjectId || !visibleIds.has(project.parentProjectId));
}

function childProjects(projects: Project[], parentId: string) {
  return visibleProjects(projects).filter((project) => project.parentProjectId === parentId);
}

function descendantProjectIds(projects: Project[], projectId: string) {
  const ids = new Set<string>();
  const queue = childProjects(projects, projectId).map((project) => project.id);
  while (queue.length) {
    const id = queue.shift();
    if (!id || ids.has(id) || id === projectId) continue;
    ids.add(id);
    queue.push(...childProjects(projects, id).map((project) => project.id));
  }
  return ids;
}

function activeTasks(tasks: Task[]) {
  return tasks.filter((task) => !task.trashedAt && !task.archivedAt && task.status !== "done" && task.status !== "dropped");
}

function Page({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="cos-page">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--cos-text-strong)]">{title}</h1>
          {subtitle ? <p className="mt-1 max-w-2xl text-sm text-[var(--cos-text-muted)]">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: any; title: string; description?: string }) {
  return (
    <div className="cos-empty px-4 py-8 text-center">
      <Icon className="mx-auto mb-3 h-10 w-10 text-[var(--cos-text-subtle)]" />
      <p className="text-sm font-medium text-[var(--cos-text-muted)]">{title}</p>
      {description ? <p className="mt-1 text-xs text-[var(--cos-text-subtle)]">{description}</p> : null}
    </div>
  );
}

function ProjectIndexRow({
  project,
  projects,
  taskCount,
  deadlineCount,
  expanded,
  onToggle,
  onOpen,
  domains,
  depth = 0
}: {
  project: Project;
  projects: Project[];
  taskCount?: number;
  deadlineCount?: number;
  expanded: Set<string>;
  onToggle: (projectId: string) => void;
  onOpen: (projectId: string) => void;
  domains: Domain[];
  depth?: number;
}) {
  const children = childProjects(projects, project.id);
  const isOpen = expanded.has(project.id);
  return (
    <section className={`${depth === 0 ? "cos-surface" : "rounded-lg border border-[var(--cos-border-soft)] bg-[var(--cos-bg-soft)]"} overflow-hidden`}>
      <div className="flex items-start gap-2 p-3">
        <button
          type="button"
          onClick={() => children.length ? onToggle(project.id) : onOpen(project.id)}
          aria-label={children.length ? (isOpen ? `Collapse ${project.name}` : `Expand ${project.name}`) : `Open ${project.name}`}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-[var(--cos-text-subtle)] hover:bg-[var(--cos-bg-elevated)] hover:text-[var(--cos-primary-text)] sm:mt-0.5 sm:h-8 sm:w-8"
        >
          {children.length ? (isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />) : <FolderKanban className="h-4 w-4" />}
        </button>
        <button type="button" onClick={() => onOpen(project.id)} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-[var(--cos-text-strong)]">{project.name}</h3>
            <span className={`cos-pill ${projectStatus[project.status].color}`}>{projectStatus[project.status].label}</span>
            {depth === 0 ? <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${domainColor(domains, project.domainId)}`}>{domainName(domains, project.domainId)}</span> : null}
          </div>
          <p className={`mt-1 truncate text-xs font-medium ${project.nextAction ? "text-[var(--cos-primary-text)]" : "text-[var(--cos-danger-text)]"}`}>Next: {project.nextAction || "Missing next action"}</p>
          <p className={`mt-1 line-clamp-2 text-xs ${project.latestStatus ? "text-[var(--cos-text-muted)]" : "font-medium text-[var(--cos-warning-text)]"}`}>Status: {project.latestStatus || "No latest status"}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[var(--cos-text-subtle)]">
            {children.length ? <span>{children.length} subcontext{children.length > 1 ? "s" : ""}</span> : null}
            {taskCount ? <span>{taskCount} open task{taskCount > 1 ? "s" : ""}</span> : null}
            {deadlineCount ? <span>{deadlineCount} date{deadlineCount > 1 ? "s" : ""}</span> : null}
          </div>
        </button>
      </div>
      {isOpen && children.length ? (
        <div className="space-y-2 border-t border-[var(--cos-border-soft)] p-3 pl-6">
          {children.map((child) => (
            <ProjectIndexRow key={child.id} project={child} projects={projects} expanded={expanded} onToggle={onToggle} onOpen={onOpen} domains={domains} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function ProjectsView() {
  const router = useRouter();
  const { data, addProject } = useWorkspace();
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [domainId, setDomainId] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const activeDomains = data.domains.filter((domain) => !domain.archived);
  const projects = rootProjects(data.projects);

  function create() {
    const chosenDomain = domainId || activeDomains[0]?.id;
    if (!name.trim() || !chosenDomain) return;
    const id = addProject({ name: name.trim(), domainId: chosenDomain });
    setName("");
    setShowNew(false);
    router.push(`/projects/${id}`);
  }

  function toggle(projectId: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  }

  return (
    <Page title="Projects" subtitle="Track outcomes, next actions, and recovery context." action={<button onClick={() => setShowNew(true)} className="cos-btn cos-btn-primary px-4 py-2 text-sm"><Plus className="h-4 w-4" /> New Project</button>}>
      {showNew ? (
        <div className="cos-surface mb-4 p-4">
          <input value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && create()} autoFocus placeholder="Project name..." className="cos-input w-full px-3 py-2 text-sm" />
          <div className="mt-3 grid gap-3 sm:flex sm:flex-wrap sm:items-center">
            <select value={domainId} onChange={(event) => setDomainId(event.target.value)} className="cos-input w-full px-3 py-2 text-sm sm:w-auto">
              {activeDomains.map((domain) => <option key={domain.id} value={domain.id}>{domain.name}</option>)}
            </select>
            <button onClick={create} className="cos-btn cos-btn-primary px-4 py-2 text-sm">Create</button>
            <button onClick={() => setShowNew(false)} className="cos-btn cos-btn-ghost px-4 py-2 text-sm">Cancel</button>
          </div>
        </div>
      ) : null}
      <div className="space-y-3">
        {projects.map((project) => {
          const descendantIds = descendantProjectIds(data.projects, project.id);
          const projectIds = new Set([project.id, ...descendantIds]);
          const count = activeTasks(data.tasks).filter((task) => task.projectId && projectIds.has(task.projectId)).length;
          const deadlineCount = data.deadlines.filter((deadline) => !deadline.trashedAt && deadline.projectId && projectIds.has(deadline.projectId)).length;
          return (
            <ProjectIndexRow
              key={project.id}
              project={project}
              projects={data.projects}
              taskCount={count}
              deadlineCount={deadlineCount}
              expanded={expanded}
              onToggle={toggle}
              onOpen={(id) => router.push(`/projects/${id}`)}
              domains={data.domains}
            />
          );
        })}
      </div>
      {!projects.length ? <EmptyState icon={FolderKanban} title="No projects yet" description="Create an outcome or subcontext to start." /> : null}
    </Page>
  );
}
