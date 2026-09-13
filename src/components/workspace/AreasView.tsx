"use client";

import { useState, type ReactNode } from "react";
import { Boxes, ChevronDown, ChevronRight, FolderKanban, Layers, Plus, Trash2 } from "lucide-react";
import { useLocalRouter as useRouter } from "@/lib/local-router";
import { useWorkspace } from "@/lib/client-store";
import type { Deadline, Domain, Project, Task } from "@/lib/types";

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

function domainColor(domains: Domain[], id: string | null | undefined) {
  const index = Math.max(0, domains.findIndex((domain) => domain.id === id));
  return domainColors[index % domainColors.length];
}

function childProjects(projects: Project[], parentId: string) {
  return projects.filter((project) => !project.trashedAt && project.status !== "archived" && project.parentProjectId === parentId);
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

function Page({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="cos-page">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--cos-text-strong)]">{title}</h1>
          {subtitle ? <p className="mt-1 max-w-2xl text-sm text-[var(--cos-text-muted)]">{subtitle}</p> : null}
        </div>
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

function AreaProjectTree({
  project,
  projects,
  tasks,
  deadlines,
  depth,
  onOpen,
  onDelete
}: {
  project: Project;
  projects: Project[];
  tasks: Task[];
  deadlines: Deadline[];
  depth: number;
  onOpen: (projectId: string) => void;
  onDelete: (projectId: string) => void;
}) {
  const children = childProjects(projects, project.id);
  const descendantIds = descendantProjectIds(projects, project.id);
  const projectIds = new Set([project.id, ...descendantIds]);
  const taskCount = activeTasks(tasks).filter((task) => task.projectId && projectIds.has(task.projectId)).length;
  const deadlineCount = deadlines.filter((deadline) => !deadline.trashedAt && deadline.projectId && projectIds.has(deadline.projectId)).length;

  return (
    <div className="space-y-1">
      <div
        className="flex min-h-10 w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-[var(--cos-bg-elevated)]"
        style={{ paddingLeft: `${0.5 + depth * 1.1}rem` }}
      >
        <Layers className="h-3.5 w-3.5 shrink-0 text-[var(--cos-text-subtle)]" />
        <button type="button" onClick={() => onOpen(project.id)} className="min-w-0 flex-1 truncate text-left text-xs font-medium text-[var(--cos-text)] hover:text-[var(--cos-primary-text)]">{project.name}</button>
        {project.nextAction ? <span className="hidden max-w-36 truncate text-[11px] text-[var(--cos-primary-text)] sm:inline">Next: {project.nextAction}</span> : null}
        {taskCount ? <span className="cos-pill cos-pill-muted">{taskCount} task{taskCount > 1 ? "s" : ""}</span> : null}
        {deadlineCount ? <span className="cos-pill cos-pill-warning">{deadlineCount} date{deadlineCount > 1 ? "s" : ""}</span> : null}
        <button type="button" onClick={() => onDelete(project.id)} aria-label={`Delete ${project.name}`} className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-[var(--cos-text-subtle)] hover:bg-[var(--cos-danger-soft)] hover:text-[var(--cos-danger-text)] sm:h-7 sm:w-7">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {children.map((child) => (
        <AreaProjectTree key={child.id} project={child} projects={projects} tasks={tasks} deadlines={deadlines} depth={depth + 1} onOpen={onOpen} onDelete={onDelete} />
      ))}
    </div>
  );
}

export function AreasView() {
  const router = useRouter();
  const { data, loading, addProject, updateProject } = useWorkspace();
  const [openAreaId, setOpenAreaId] = useState<string | null>(null);
  const [newProjectByArea, setNewProjectByArea] = useState<Record<string, string>>({});
  const activeDomains = data.domains.filter((domain) => !domain.archived);

  function createAreaProject(domainId: string) {
    const name = (newProjectByArea[domainId] ?? "").trim();
    if (!name) return;
    addProject({ name, domainId });
    setNewProjectByArea((current) => ({ ...current, [domainId]: "" }));
  }

  return (
    <Page title="Areas" subtitle="Ongoing responsibilities, systems, and domains that hold projects and resources.">
      {loading ? <EmptyState icon={Boxes} title="Loading areas" description="Workspace data is hydrating from cache or server." /> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {activeDomains.map((domain) => {
          const domainProjects = data.projects.filter((project) => project.domainId === domain.id && !project.trashedAt && project.status !== "archived");
          const projectIds = new Set(domainProjects.map((project) => project.id));
          const openTaskCount = activeTasks(data.tasks).filter((task) => task.domainId === domain.id || (task.projectId && projectIds.has(task.projectId))).length;
          const resourceCount = data.notes.filter((note) => note.domainId === domain.id && !note.projectId && !note.trashedAt).length;
          const deadlineCount = data.deadlines.filter((deadline) => !deadline.trashedAt && deadline.projectId && projectIds.has(deadline.projectId)).length;
          const roots = domainProjects.filter((project) => !project.parentProjectId || !projectIds.has(project.parentProjectId));
          const open = openAreaId === domain.id;
          return (
            <section key={domain.id} className="cos-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium ${domainColor(data.domains, domain.id)}`}>Area</span>
                  <h2 className="mt-2 text-base font-semibold text-[var(--cos-text-strong)]">{domain.name}</h2>
                </div>
                <button
                  type="button"
                  aria-label={open ? `Close ${domain.name}` : `Open ${domain.name}`}
                  onClick={() => setOpenAreaId(open ? null : domain.id)}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-[var(--cos-text-subtle)] hover:bg-[var(--cos-bg-soft)] hover:text-[var(--cos-primary-text)]"
                >
                  {open ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                </button>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-[var(--cos-bg-soft)] p-2"><p className="text-sm font-semibold text-[var(--cos-text-strong)]">{domainProjects.length}</p><p className="text-[10px] uppercase tracking-[0.14em] text-[var(--cos-text-subtle)]">Projects</p></div>
                <div className="rounded-lg bg-[var(--cos-bg-soft)] p-2"><p className="text-sm font-semibold text-[var(--cos-text-strong)]">{openTaskCount}</p><p className="text-[10px] uppercase tracking-[0.14em] text-[var(--cos-text-subtle)]">Tasks</p></div>
                <div className="rounded-lg bg-[var(--cos-bg-soft)] p-2"><p className="text-sm font-semibold text-[var(--cos-text-strong)]">{resourceCount}</p><p className="text-[10px] uppercase tracking-[0.14em] text-[var(--cos-text-subtle)]">Resources</p></div>
              </div>
              <div className="mt-4 space-y-2">
                {(!open ? roots.slice(0, 3) : []).map((project) => (
                  <button key={project.id} onClick={() => router.push(`/projects/${project.id}`)} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-[var(--cos-bg-soft)]">
                    <FolderKanban className="h-3.5 w-3.5 text-[var(--cos-text-subtle)]" />
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-[var(--cos-text)]">{project.name}</span>
                    {childProjects(data.projects, project.id).length ? <span className="text-[10px] text-[var(--cos-text-subtle)]">{childProjects(data.projects, project.id).length} sub</span> : null}
                  </button>
                ))}
                {!roots.length ? <p className="text-xs italic text-[var(--cos-text-subtle)]">No active projects in this area.</p> : null}
              </div>
              {open && roots.length ? (
                <div className="mt-4 rounded-lg border border-[var(--cos-border-soft)] bg-[var(--cos-bg-soft)] p-2">
                  {roots.map((project) => (
                    <AreaProjectTree
                      key={project.id}
                      project={project}
                      projects={data.projects}
                      tasks={data.tasks}
                      deadlines={data.deadlines}
                      depth={0}
                      onOpen={(id) => router.push(`/projects/${id}`)}
                      onDelete={(id) => updateProject(id, { trashedAt: new Date().toISOString() })}
                    />
                  ))}
                </div>
              ) : null}
              {open ? (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-[var(--cos-border-soft)] bg-[var(--cos-bg-soft)] p-2">
                  <Plus className="h-4 w-4 shrink-0 text-[var(--cos-primary)]" />
                  <input
                    value={newProjectByArea[domain.id] ?? ""}
                    onChange={(event) => setNewProjectByArea((current) => ({ ...current, [domain.id]: event.target.value }))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") createAreaProject(domain.id);
                      if (event.key === "Escape") setNewProjectByArea((current) => ({ ...current, [domain.id]: "" }));
                    }}
                    placeholder={`New project in ${domain.name}...`}
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--cos-text-subtle)]"
                  />
                  <button type="button" onClick={() => createAreaProject(domain.id)} disabled={!newProjectByArea[domain.id]?.trim()} className="cos-btn cos-btn-primary min-h-10 px-3 py-1.5 text-xs disabled:bg-[var(--cos-border)]">Add</button>
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-[var(--cos-text-subtle)]">
                {deadlineCount ? <span>{deadlineCount} date{deadlineCount > 1 ? "s" : ""}</span> : null}
                {domain.archived ? <span>Archived</span> : null}
              </div>
            </section>
          );
        })}
      </div>
      {!loading && !activeDomains.length ? <EmptyState icon={Boxes} title="No active areas" description="Add domains in Settings to create areas." /> : null}
    </Page>
  );
}
