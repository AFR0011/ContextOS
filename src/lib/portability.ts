import { z } from "zod";
import type { WorkspaceData } from "./types";

export const CONTEXTOS_EXPORT_FORMAT = "contextos-workspace" as const;
export const CONTEXTOS_EXPORT_VERSION = 1 as const;

const idSchema = z.string().min(1).max(200);
const timestampSchema = z.string().min(1).max(100).refine((value) => !Number.isNaN(Date.parse(value)), "Invalid timestamp.");
const nullableTimestampSchema = timestampSchema.nullable();
const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const domainSchema = z.object({
  id: idSchema,
  name: z.string(),
  archived: z.boolean(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
}).strict();

const projectSchema = z.object({
  id: idSchema,
  name: z.string(),
  domainId: idSchema,
  parentProjectId: idSchema.nullable(),
  status: z.enum(["active", "paused", "done", "archived"]),
  currentObjective: z.string(),
  nextAction: z.string(),
  latestStatus: z.string(),
  recoveryNotes: z.string(),
  openLoops: z.array(z.string()),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  archivedAt: nullableTimestampSchema,
  trashedAt: nullableTimestampSchema
}).strict();

const taskSchema = z.object({
  id: idSchema,
  title: z.string(),
  plannedDate: dateKeySchema.nullable(),
  dueDate: dateKeySchema.nullable(),
  scheduledTime: z.string().nullable(),
  projectId: idSchema.nullable(),
  domainId: idSchema.nullable(),
  status: z.enum(["todo", "in-progress", "blocked", "waiting", "done", "dropped"]),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  archivedAt: nullableTimestampSchema,
  trashedAt: nullableTimestampSchema
}).strict();

const captureSchema = z.object({
  id: idSchema,
  text: z.string(),
  status: z.enum(["unprocessed", "converted", "attached", "archived", "deleted"]),
  type: z.enum(["task", "note", "project", "deadline", "status"]).nullable(),
  parsedData: z.record(z.string(), z.unknown()).nullable(),
  convertedToId: idSchema.nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
}).strict();

const noteSchema = z.object({
  id: idSchema,
  title: z.string(),
  content: z.string(),
  projectId: idSchema.nullable(),
  domainId: idSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  archivedAt: nullableTimestampSchema,
  trashedAt: nullableTimestampSchema
}).strict();

const deadlineSchema = z.object({
  id: idSchema,
  title: z.string(),
  date: dateKeySchema,
  time: z.string().nullable(),
  location: z.string(),
  projectId: idSchema.nullable(),
  taskIds: z.array(idSchema),
  notes: z.string(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  archivedAt: nullableTimestampSchema,
  trashedAt: nullableTimestampSchema
}).strict();

const reviewSchema = z.object({
  id: idSchema,
  type: z.enum(["daily-startup", "daily-shutdown", "weekly"]),
  date: timestampSchema,
  responses: z.record(z.string(), z.string()),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
}).strict();

const dailyNoteSchema = z.object({
  id: idSchema,
  localDate: dateKeySchema,
  content: z.string(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
}).strict();

const dashboardScratchpadSchema = z.object({
  id: idSchema,
  content: z.string(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
}).strict();

const dashboardPreferenceSchema = z.object({
  id: idSchema,
  sectionOrder: z.array(z.enum(["notepad", "dates", "tasks", "allTasks", "projects"])),
  collapsedSections: z.array(z.enum(["notepad", "dates", "tasks", "allTasks", "projects"])),
  reviewPromptDismissals: z.array(z.string()),
  dateWindowDays: z.number().int().min(1).max(365),
  showCompleted: z.boolean(),
  taskSortMode: z.enum(["recent", "oldest", "schedule", "date"]),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
}).strict();

export const portableWorkspaceSchema = z.object({
  domains: z.array(domainSchema),
  projects: z.array(projectSchema),
  tasks: z.array(taskSchema),
  captures: z.array(captureSchema),
  notes: z.array(noteSchema),
  deadlines: z.array(deadlineSchema),
  reviews: z.array(reviewSchema),
  dailyNotes: z.array(dailyNoteSchema).default([]),
  dashboardScratchpads: z.array(dashboardScratchpadSchema).max(1),
  dashboardPreferences: z.array(dashboardPreferenceSchema).max(1)
}).strict();

export const workspaceExportBundleSchema = z.object({
  format: z.literal(CONTEXTOS_EXPORT_FORMAT),
  version: z.literal(CONTEXTOS_EXPORT_VERSION),
  exportedAt: timestampSchema,
  workspace: portableWorkspaceSchema
}).strict().superRefine((bundle, ctx) => {
  const { workspace } = bundle;
  const sets = {
    domains: new Set<string>(),
    projects: new Set<string>(),
    tasks: new Set<string>(),
    captures: new Set<string>(),
    notes: new Set<string>(),
    deadlines: new Set<string>(),
    reviews: new Set<string>(),
    dailyNotes: new Set<string>(),
    dashboardScratchpads: new Set<string>(),
    dashboardPreferences: new Set<string>()
  };

  for (const [collection, records] of Object.entries(workspace) as [keyof typeof sets, { id: string }[]][]) {
    for (const record of records) {
      if (sets[collection].has(record.id)) {
        ctx.addIssue({ code: "custom", path: ["workspace", collection], message: `Duplicate ${collection} id: ${record.id}` });
      }
      sets[collection].add(record.id);
    }
  }

  for (const project of workspace.projects) {
    if (!sets.domains.has(project.domainId)) {
      ctx.addIssue({ code: "custom", path: ["workspace", "projects"], message: `Project ${project.id} references a missing Area.` });
    }
    if (project.parentProjectId && !sets.projects.has(project.parentProjectId)) {
      ctx.addIssue({ code: "custom", path: ["workspace", "projects"], message: `Project ${project.id} references a missing parent Project.` });
    }
    if (project.parentProjectId === project.id) {
      ctx.addIssue({ code: "custom", path: ["workspace", "projects"], message: `Project ${project.id} cannot be its own parent.` });
    }
  }

  const projectById = new Map(workspace.projects.map((project) => [project.id, project]));
  for (const project of workspace.projects) {
    const seen = new Set<string>([project.id]);
    let parentId = project.parentProjectId;
    while (parentId) {
      if (seen.has(parentId)) {
        ctx.addIssue({ code: "custom", path: ["workspace", "projects"], message: `Project hierarchy contains a cycle involving ${project.id}.` });
        break;
      }
      seen.add(parentId);
      parentId = projectById.get(parentId)?.parentProjectId ?? null;
    }
  }

  for (const task of workspace.tasks) {
    if (task.projectId && !sets.projects.has(task.projectId)) {
      ctx.addIssue({ code: "custom", path: ["workspace", "tasks"], message: `Task ${task.id} references a missing Project.` });
    }
    if (task.domainId && !sets.domains.has(task.domainId)) {
      ctx.addIssue({ code: "custom", path: ["workspace", "tasks"], message: `Task ${task.id} references a missing Area.` });
    }
    if (task.projectId) {
      const project = projectById.get(task.projectId);
      if (project && task.domainId !== project.domainId) {
        ctx.addIssue({ code: "custom", path: ["workspace", "tasks"], message: `Task ${task.id} Area does not match its Project Area.` });
      }
    }
  }

  for (const note of workspace.notes) {
    if (!sets.domains.has(note.domainId)) {
      ctx.addIssue({ code: "custom", path: ["workspace", "notes"], message: `Resource ${note.id} references a missing Area.` });
    }
    if (note.projectId && !sets.projects.has(note.projectId)) {
      ctx.addIssue({ code: "custom", path: ["workspace", "notes"], message: `Resource ${note.id} references a missing Project.` });
    }
  }

  for (const deadline of workspace.deadlines) {
    if (deadline.projectId && !sets.projects.has(deadline.projectId)) {
      ctx.addIssue({ code: "custom", path: ["workspace", "deadlines"], message: `Date ${deadline.id} references a missing Project.` });
    }
    for (const taskId of deadline.taskIds) {
      if (!sets.tasks.has(taskId)) {
        ctx.addIssue({ code: "custom", path: ["workspace", "deadlines"], message: `Date ${deadline.id} references a missing Task.` });
      }
    }
  }

  const convertedTargets = new Set<string>();
  for (const collection of [workspace.projects, workspace.tasks, workspace.notes, workspace.deadlines]) {
    for (const record of collection) {
      if (convertedTargets.has(record.id)) {
        ctx.addIssue({ code: "custom", path: ["workspace"], message: `Converted-record target id ${record.id} is ambiguous across collections.` });
      }
      convertedTargets.add(record.id);
    }
  }
  for (const capture of workspace.captures) {
    if (capture.convertedToId && !convertedTargets.has(capture.convertedToId)) {
      ctx.addIssue({ code: "custom", path: ["workspace", "captures"], message: `Capture ${capture.id} references a missing converted record.` });
    }
  }
});

export type PortableWorkspace = z.infer<typeof portableWorkspaceSchema>;
export type WorkspaceExportBundle = z.infer<typeof workspaceExportBundleSchema>;
export type WorkspaceImportMode = "replace" | "merge";

export function createWorkspaceExportBundle(data: WorkspaceData, exportedAt = new Date().toISOString()): WorkspaceExportBundle {
  return workspaceExportBundleSchema.parse({
    format: CONTEXTOS_EXPORT_FORMAT,
    version: CONTEXTOS_EXPORT_VERSION,
    exportedAt,
    workspace: {
      domains: data.domains,
      projects: data.projects,
      tasks: data.tasks,
      captures: data.captures,
      notes: data.notes,
      deadlines: data.deadlines,
      reviews: data.reviews,
      dailyNotes: data.dailyNotes,
      dashboardScratchpads: data.dashboardScratchpads,
      dashboardPreferences: data.dashboardPreferences
    }
  });
}

export function portabilityCounts(workspace: PortableWorkspace) {
  return {
    areas: workspace.domains.length,
    projects: workspace.projects.length,
    tasks: workspace.tasks.length,
    captures: workspace.captures.length,
    resources: workspace.notes.length,
    dates: workspace.deadlines.length,
    reviews: workspace.reviews.length,
    dailyNotes: workspace.dailyNotes.length,
    scratchpads: workspace.dashboardScratchpads.length,
    preferences: workspace.dashboardPreferences.length
  };
}

export function workspaceExportToMarkdown(bundle: WorkspaceExportBundle) {
  const w = bundle.workspace;
  const lines: string[] = [
    "# ContextOS workspace export",
    "",
    `Exported: ${bundle.exportedAt}`,
    `Format version: ${bundle.version}`,
    ""
  ];

  lines.push("## Areas", "");
  for (const item of w.domains) lines.push(`- ${item.name}${item.archived ? " (archived)" : ""}`);

  lines.push("", "## Projects", "");
  for (const item of w.projects) {
    lines.push(`### ${item.name}`, "", `- Status: ${item.status}`, `- Area: ${w.domains.find((domain) => domain.id === item.domainId)?.name ?? item.domainId}`);
    if (item.currentObjective) lines.push(`- Objective: ${item.currentObjective}`);
    if (item.nextAction) lines.push(`- Next action: ${item.nextAction}`);
    if (item.latestStatus) lines.push(`- Latest status: ${item.latestStatus}`);
    if (item.openLoops.length) lines.push(`- Open loops: ${item.openLoops.join("; ")}`);
    if (item.recoveryNotes) lines.push("", item.recoveryNotes);
    lines.push("");
  }

  lines.push("## Tasks", "");
  for (const item of w.tasks) lines.push(`- [${item.status === "done" ? "x" : " "}] ${item.title}${item.plannedDate ? ` | planned ${item.plannedDate}` : ""}${item.dueDate ? ` | due ${item.dueDate}` : ""}${item.scheduledTime ? ` | ${item.scheduledTime}` : ""}`);

  lines.push("", "## Dates", "");
  for (const item of w.deadlines) lines.push(`- ${item.date}${item.time ? ` ${item.time}` : ""} — ${item.title}${item.location ? ` @ ${item.location}` : ""}`);

  lines.push("", "## Resources", "");
  for (const item of w.notes) lines.push(`### ${item.title}`, "", item.content, "");

  lines.push("## Inbox captures", "");
  for (const item of w.captures) lines.push(`- [${item.status}] ${item.text}`);

  lines.push("", "## Daily Notes", "");
  for (const item of [...w.dailyNotes].sort((a, b) => a.localDate.localeCompare(b.localDate))) {
    lines.push(`### ${item.localDate}`, "", item.content, "");
  }

  lines.push("", "## Reviews", "");
  for (const item of w.reviews) {
    lines.push(`### ${item.type} — ${item.date}`, "");
    for (const [question, response] of Object.entries(item.responses)) lines.push(`- ${question}: ${response}`);
    lines.push("");
  }

  lines.push("## Dashboard scratchpad", "", w.dashboardScratchpads[0]?.content ?? "", "");
  return lines.join("\n").trimEnd() + "\n";
}
