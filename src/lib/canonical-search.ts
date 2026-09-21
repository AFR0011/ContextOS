import type { CanonicalWorkspace, ContextDate, DailyNote, Task } from "./canonical-domain";

export type CanonicalSearchKind = "project" | "area" | "task" | "date" | "daily-note";

export interface CanonicalSearchResult {
  key: string;
  kind: CanonicalSearchKind;
  id: string;
  typeLabel: string;
  title: string;
  subtitle: string;
  searchText: string;
  contextHref: string | null;
  contextLabel: string | null;
}

function normalize(value: unknown) {
  return String(value ?? "").toLowerCase();
}

function resultKey(kind: CanonicalSearchKind, id: string) {
  return `${kind}:${id}`;
}

function taskContext(task: Task, workspace: CanonicalWorkspace) {
  if (task.parent.type === "project") {
    const project = workspace.projects.find((item) => item.id === task.parent.projectId);
    const area = project ? workspace.areas.find((item) => item.id === project.areaId) : null;
    return {
      label: [project?.name, area?.name].filter(Boolean).join(" · "),
      href: project ? `/projects/${encodeURIComponent(project.id)}` : null,
      action: project ? "Open project" : null
    };
  }
  const area = workspace.areas.find((item) => item.id === task.parent.areaId);
  return {
    label: area?.name ?? "",
    href: area ? `/areas/${encodeURIComponent(area.id)}` : null,
    action: area ? "Open area" : null
  };
}

function dateContext(date: ContextDate, workspace: CanonicalWorkspace) {
  if (date.parent.type === "project") {
    const project = workspace.projects.find((item) => item.id === date.parent.projectId);
    const area = project ? workspace.areas.find((item) => item.id === project.areaId) : null;
    return {
      label: [project?.name, area?.name].filter(Boolean).join(" · "),
      href: project ? `/projects/${encodeURIComponent(project.id)}` : null,
      action: project ? "Open project" : null
    };
  }
  const area = workspace.areas.find((item) => item.id === date.parent.areaId);
  return {
    label: area?.name ?? "",
    href: area ? `/areas/${encodeURIComponent(area.id)}` : null,
    action: area ? "Open area" : null
  };
}

function dailyNoteTitle(note: DailyNote) {
  return `Daily Note · ${note.localDate}`;
}

export function buildCanonicalSearchResults(workspace: CanonicalWorkspace, today?: string): CanonicalSearchResult[] {
  const items: CanonicalSearchResult[] = [];

  for (const project of workspace.projects) {
    const area = workspace.areas.find((item) => item.id === project.areaId);
    items.push({
      key: resultKey("project", project.id),
      kind: "project",
      id: project.id,
      typeLabel: "Project",
      title: project.name,
      subtitle: [area?.name, project.state === "archived" ? "Archived" : "Active"].filter(Boolean).join(" · "),
      searchText: [project.name, project.objective, area?.name, project.state].join(" "),
      contextHref: `/projects/${encodeURIComponent(project.id)}`,
      contextLabel: "Open project"
    });
  }

  for (const area of workspace.areas) {
    items.push({
      key: resultKey("area", area.id),
      kind: "area",
      id: area.id,
      typeLabel: "Area",
      title: area.name,
      subtitle: area.state === "archived" ? "Archived" : "Active",
      searchText: [area.name, area.state].join(" "),
      contextHref: `/areas/${encodeURIComponent(area.id)}`,
      contextLabel: "Open area"
    });
  }

  for (const task of workspace.tasks) {
    const context = taskContext(task, workspace);
    items.push({
      key: resultKey("task", task.id),
      kind: "task",
      id: task.id,
      typeLabel: "Task",
      title: task.title,
      subtitle: [context.label, task.state === "done" ? "Done" : "Open", task.plannedDate ? `Planned ${task.plannedDate}` : ""].filter(Boolean).join(" · "),
      searchText: [task.title, task.state, task.plannedDate, task.scheduledTime, context.label].join(" "),
      contextHref: context.href,
      contextLabel: context.action
    });
  }

  for (const date of workspace.dates) {
    const context = dateContext(date, workspace);
    items.push({
      key: resultKey("date", date.id),
      kind: "date",
      id: date.id,
      typeLabel: date.kind === "event" ? "Event" : "Deadline",
      title: date.title,
      subtitle: [date.date, date.startTime, context.label].filter(Boolean).join(" · "),
      searchText: [date.title, date.kind, date.date, date.startTime, date.endTime, date.details, context.label].join(" "),
      contextHref: context.href,
      contextLabel: context.action
    });
  }

  for (const note of workspace.dailyNotes) {
    const isToday = Boolean(today && note.localDate === today);
    const excerpt = note.content.trim().replace(/\s+/g, " ").slice(0, 120);
    items.push({
      key: resultKey("daily-note", note.id),
      kind: "daily-note",
      id: note.id,
      typeLabel: "Daily Note",
      title: dailyNoteTitle(note),
      subtitle: [note.localDate, isToday ? "Today" : "", excerpt].filter(Boolean).join(" · "),
      searchText: [note.localDate, note.content].join(" "),
      contextHref: isToday ? "/dashboard" : null,
      contextLabel: isToday ? "Open Today" : null
    });
  }

  return items;
}

export function searchCanonicalResults(
  items: CanonicalSearchResult[],
  query: string,
  limit = 80
): CanonicalSearchResult[] {
  const q = normalize(query).trim();
  if (!q) return [];

  return items
    .filter((result) => normalize(`${result.title} ${result.subtitle} ${result.searchText}`).includes(q))
    .sort((a, b) => {
      const aTitle = normalize(a.title);
      const bTitle = normalize(b.title);
      const aScore = aTitle === q ? 0 : aTitle.startsWith(q) ? 1 : aTitle.includes(q) ? 2 : 3;
      const bScore = bTitle === q ? 0 : bTitle.startsWith(q) ? 1 : bTitle.includes(q) ? 2 : 3;
      return aScore - bScore || a.title.localeCompare(b.title);
    })
    .slice(0, limit);
}
