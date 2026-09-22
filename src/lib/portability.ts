import { z } from "zod";
import type { WorkspaceData } from "./types";
import { dateKeyToUtcDate } from "./dates";

export const CONTEXTOS_EXPORT_FORMAT = "contextos-workspace" as const;
export const CONTEXTOS_EXPORT_VERSION = 2 as const;

const idSchema = z.string().min(1).max(200);
const timestampSchema = z.string().min(1).max(100).refine((value) => !Number.isNaN(Date.parse(value)), "Invalid timestamp.");
const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => Boolean(dateKeyToUtcDate(value)), "Invalid calendar date.");
const timeKeySchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);

const areaSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(500),
  state: z.enum(["active", "archived"]),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
}).strict();

const projectSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(500),
  areaId: idSchema,
  objective: z.string(),
  state: z.enum(["active", "archived"]),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
}).strict();

const taskParentSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("project"), projectId: idSchema }).strict(),
  z.object({ type: z.literal("area"), areaId: idSchema }).strict()
]);

const taskSchema = z.object({
  id: idSchema,
  title: z.string().trim().min(1).max(500),
  parent: taskParentSchema,
  plannedDate: dateKeySchema.nullable(),
  scheduledTime: timeKeySchema.nullable(),
  state: z.enum(["open", "done"]),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
}).strict().superRefine((task, ctx) => {
  if (!task.plannedDate && task.scheduledTime) {
    ctx.addIssue({ code: "custom", path: ["scheduledTime"], message: "scheduledTime requires plannedDate." });
  }
});

const dateParentSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("project"), projectId: idSchema }).strict(),
  z.object({ type: z.literal("area"), areaId: idSchema }).strict()
]);

const contextDateSchema = z.object({
  id: idSchema,
  title: z.string().trim().min(1).max(500),
  kind: z.enum(["event", "deadline"]),
  parent: dateParentSchema,
  date: dateKeySchema,
  startTime: timeKeySchema.nullable(),
  endTime: timeKeySchema.nullable(),
  details: z.string(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
}).strict().superRefine((date, ctx) => {
  if (date.kind === "deadline" && date.endTime !== null) {
    ctx.addIssue({ code: "custom", path: ["endTime"], message: "Deadline endTime must be null." });
  }
});

const dailyNoteSchema = z.object({
  id: idSchema,
  localDate: dateKeySchema,
  content: z.string(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
}).strict();

export const portableWorkspaceSchema = z.object({
  areas: z.array(areaSchema),
  projects: z.array(projectSchema),
  tasks: z.array(taskSchema),
  dates: z.array(contextDateSchema),
  dailyNotes: z.array(dailyNoteSchema)
}).strict();

export const workspaceExportBundleSchema = z.object({
  format: z.literal(CONTEXTOS_EXPORT_FORMAT),
  version: z.literal(CONTEXTOS_EXPORT_VERSION),
  exportedAt: timestampSchema,
  workspace: portableWorkspaceSchema
}).strict().superRefine((bundle, ctx) => {
  const { workspace } = bundle;
  const sets = {
    areas: new Set<string>(),
    projects: new Set<string>(),
    tasks: new Set<string>(),
    dates: new Set<string>(),
    dailyNotes: new Set<string>()
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
    if (!sets.areas.has(project.areaId)) {
      ctx.addIssue({ code: "custom", path: ["workspace", "projects"], message: `Project ${project.id} references a missing Area.` });
    }
  }

  for (const task of workspace.tasks) {
    if (task.parent.type === "project" && !sets.projects.has(task.parent.projectId)) {
      ctx.addIssue({ code: "custom", path: ["workspace", "tasks"], message: `Task ${task.id} references a missing Project.` });
    }
    if (task.parent.type === "area" && !sets.areas.has(task.parent.areaId)) {
      ctx.addIssue({ code: "custom", path: ["workspace", "tasks"], message: `Task ${task.id} references a missing Area.` });
    }
  }

  for (const date of workspace.dates) {
    if (date.parent.type === "project" && !sets.projects.has(date.parent.projectId)) {
      ctx.addIssue({ code: "custom", path: ["workspace", "dates"], message: `Date ${date.id} references a missing Project.` });
    }
    if (date.parent.type === "area" && !sets.areas.has(date.parent.areaId)) {
      ctx.addIssue({ code: "custom", path: ["workspace", "dates"], message: `Date ${date.id} references a missing Area.` });
    }
  }

  const localDates = new Set<string>();
  for (const note of workspace.dailyNotes) {
    if (localDates.has(note.localDate)) {
      ctx.addIssue({ code: "custom", path: ["workspace", "dailyNotes"], message: `Duplicate Daily Note date: ${note.localDate}` });
    }
    localDates.add(note.localDate);
  }
});

export type PortableWorkspace = z.infer<typeof portableWorkspaceSchema>;
export type WorkspaceExportBundle = z.infer<typeof workspaceExportBundleSchema>;
export type WorkspaceImportMode = "replace" | "merge";

function stripRevision<T extends { revision: number }>(record: T) {
  const { revision: _revision, ...portable } = record;
  return portable;
}

export function createWorkspaceExportBundle(data: WorkspaceData, exportedAt = new Date().toISOString()): WorkspaceExportBundle {
  return workspaceExportBundleSchema.parse({
    format: CONTEXTOS_EXPORT_FORMAT,
    version: CONTEXTOS_EXPORT_VERSION,
    exportedAt,
    workspace: {
      areas: data.areas.map(stripRevision),
      projects: data.projects.map(stripRevision),
      tasks: data.tasks.map(stripRevision),
      dates: data.dates.map(stripRevision),
      dailyNotes: data.dailyNotes.map(stripRevision)
    }
  });
}

export function portabilityCounts(workspace: PortableWorkspace) {
  return {
    areas: workspace.areas.length,
    projects: workspace.projects.length,
    tasks: workspace.tasks.length,
    dates: workspace.dates.length,
    dailyNotes: workspace.dailyNotes.length
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
  for (const item of w.areas) {
    lines.push(`- ${item.name}${item.state === "archived" ? " (archived)" : ""}`);
  }

  lines.push("", "## Projects", "");
  for (const item of w.projects) {
    const area = w.areas.find((candidate) => candidate.id === item.areaId);
    lines.push(
      `### ${item.name}`,
      "",
      `- State: ${item.state}`,
      `- Area: ${area?.name ?? item.areaId}`
    );
    if (item.objective) lines.push(`- Objective: ${item.objective}`);
    lines.push("");
  }

  lines.push("## Tasks", "");
  for (const item of w.tasks) {
    const parentRef = item.parent;
    const parent = parentRef.type === "project"
      ? w.projects.find((project) => project.id === parentRef.projectId)?.name ?? parentRef.projectId
      : w.areas.find((area) => area.id === parentRef.areaId)?.name ?? parentRef.areaId;
    lines.push(
      `- [${item.state === "done" ? "x" : " "}] ${item.title} | ${parent}${item.plannedDate ? ` | planned ${item.plannedDate}` : ""}${item.scheduledTime ? ` | ${item.scheduledTime}` : ""}`
    );
  }

  lines.push("", "## Dates", "");
  for (const item of w.dates) {
    const parentRef = item.parent;
    const parent = parentRef.type === "project"
      ? w.projects.find((project) => project.id === parentRef.projectId)?.name ?? parentRef.projectId
      : w.areas.find((area) => area.id === parentRef.areaId)?.name ?? parentRef.areaId;
    lines.push(`- ${item.date}${item.startTime ? ` ${item.startTime}` : ""} — [${item.kind}] ${item.title} | ${parent}`);
    if (item.details) lines.push(`  ${item.details}`);
  }

  lines.push("", "## Daily Notes", "");
  for (const item of [...w.dailyNotes].sort((a, b) => a.localDate.localeCompare(b.localDate))) {
    lines.push(`### ${item.localDate}`, "", item.content, "");
  }

  return lines.join("\n").trimEnd() + "\n";
}
