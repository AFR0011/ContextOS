import "server-only";

import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { dateKeyToUtcDate } from "./dates";
import {
  portabilityCounts,
  workspaceExportBundleSchema,
  type PortableWorkspace,
  type WorkspaceExportBundle,
  type WorkspaceImportMode
} from "./portability";

type Tx = Prisma.TransactionClient;
type IdMaps = {
  domains: Map<string, string>;
  projects: Map<string, string>;
  tasks: Map<string, string>;
  captures: Map<string, string>;
  notes: Map<string, string>;
  deadlines: Map<string, string>;
  contextDates: Map<string, string>;
  reviews: Map<string, string>;
  dailyNotes: Map<string, string>;
  dashboardScratchpads: Map<string, string>;
  dashboardPreferences: Map<string, string>;
};

const newId = (prefix: string) => `${prefix}-${randomUUID()}`;
const toDate = (value: string | null) => (value ? new Date(value) : null);
const toDateOnly = (value: string | null) => (value ? dateKeyToUtcDate(value) : null);

function mapIds(records: { id: string }[], existing: { id: string; userId: string }[], userId: string, prefix: string) {
  const owners = new Map(existing.map((record) => [record.id, record.userId]));
  return new Map(records.map((record) => [record.id, owners.get(record.id) && owners.get(record.id) !== userId ? newId(prefix) : record.id]));
}

async function buildIdMaps(tx: Tx, userId: string, workspace: PortableWorkspace): Promise<IdMaps> {
  const [domains, projects, tasks, captures, notes, deadlines, contextDates, reviews, dailyNotes, scratchpads, preferences] = await Promise.all([
    tx.domain.findMany({ where: { id: { in: workspace.domains.map((item) => item.id) } }, select: { id: true, userId: true } }),
    tx.project.findMany({ where: { id: { in: workspace.projects.map((item) => item.id) } }, select: { id: true, userId: true } }),
    tx.task.findMany({ where: { id: { in: workspace.tasks.map((item) => item.id) } }, select: { id: true, userId: true } }),
    tx.capture.findMany({ where: { id: { in: workspace.captures.map((item) => item.id) } }, select: { id: true, userId: true } }),
    tx.note.findMany({ where: { id: { in: workspace.notes.map((item) => item.id) } }, select: { id: true, userId: true } }),
    tx.deadline.findMany({ where: { id: { in: workspace.deadlines.map((item) => item.id) } }, select: { id: true, userId: true } }),
    tx.contextDate.findMany({ where: { id: { in: workspace.contextDates.map((item) => item.id) } }, select: { id: true, userId: true } }),
    tx.review.findMany({ where: { id: { in: workspace.reviews.map((item) => item.id) } }, select: { id: true, userId: true } }),
    tx.dailyNote.findMany({ where: { id: { in: workspace.dailyNotes.map((item) => item.id) } }, select: { id: true, userId: true } }),
    tx.dashboardScratchpad.findMany({ where: { id: { in: workspace.dashboardScratchpads.map((item) => item.id) } }, select: { id: true, userId: true } }),
    tx.dashboardPreference.findMany({ where: { id: { in: workspace.dashboardPreferences.map((item) => item.id) } }, select: { id: true, userId: true } })
  ]);

  return {
    domains: mapIds(workspace.domains, domains, userId, "dom"),
    projects: mapIds(workspace.projects, projects, userId, "proj"),
    tasks: mapIds(workspace.tasks, tasks, userId, "task"),
    captures: mapIds(workspace.captures, captures, userId, "cap"),
    notes: mapIds(workspace.notes, notes, userId, "note"),
    deadlines: mapIds(workspace.deadlines, deadlines, userId, "deadline"),
    contextDates: mapIds(workspace.contextDates, contextDates, userId, "date"),
    reviews: mapIds(workspace.reviews, reviews, userId, "review"),
    dailyNotes: mapIds(workspace.dailyNotes, dailyNotes, userId, "daily-note"),
    dashboardScratchpads: mapIds(workspace.dashboardScratchpads, scratchpads, userId, "scratch"),
    dashboardPreferences: mapIds(workspace.dashboardPreferences, preferences, userId, "pref")
  };
}

function requiredMapped(map: Map<string, string>, id: string) {
  const mapped = map.get(id);
  if (!mapped) throw new Error(`Validated import is missing id mapping for ${id}.`);
  return mapped;
}

function mappedOrNull(map: Map<string, string>, id: string | null) {
  return id ? requiredMapped(map, id) : null;
}

async function clearWorkspace(tx: Tx, userId: string) {
  await Promise.all([
    tx.domain.deleteMany({ where: { userId } }),
    tx.project.deleteMany({ where: { userId } }),
    tx.task.deleteMany({ where: { userId } }),
    tx.capture.deleteMany({ where: { userId } }),
    tx.note.deleteMany({ where: { userId } }),
    tx.deadline.deleteMany({ where: { userId } }),
    tx.contextDate.deleteMany({ where: { userId } }),
    tx.review.deleteMany({ where: { userId } }),
    tx.dailyNote.deleteMany({ where: { userId } }),
    tx.dashboardScratchpad.deleteMany({ where: { userId } }),
    tx.dashboardPreference.deleteMany({ where: { userId } }),
    tx.syncMutation.deleteMany({ where: { userId } })
  ]);
}

async function writeWorkspace(tx: Tx, userId: string, workspace: PortableWorkspace, maps: IdMaps, mode: WorkspaceImportMode) {
  for (const item of workspace.domains) {
    const id = requiredMapped(maps.domains, item.id);
    const data = { userId, name: item.name, archived: item.archived, createdAt: new Date(item.createdAt), updatedAt: new Date(item.updatedAt) };
    await tx.domain.upsert({ where: { id }, create: { id, ...data }, update: data });
  }

  for (const item of workspace.projects) {
    const id = requiredMapped(maps.projects, item.id);
    const data = {
      userId,
      name: item.name,
      domainId: requiredMapped(maps.domains, item.domainId),
      parentProjectId: mappedOrNull(maps.projects, item.parentProjectId),
      status: item.status,
      currentObjective: item.currentObjective,
      nextAction: item.nextAction,
      latestStatus: item.latestStatus,
      recoveryNotes: item.recoveryNotes,
      openLoops: item.openLoops,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
      archivedAt: toDate(item.archivedAt),
      trashedAt: toDate(item.trashedAt)
    };
    await tx.project.upsert({ where: { id }, create: { id, ...data }, update: data });
  }

  for (const item of workspace.tasks) {
    const id = requiredMapped(maps.tasks, item.id);
    const data = {
      userId,
      title: item.title,
      plannedDate: toDateOnly(item.plannedDate),
      dueDate: toDateOnly(item.dueDate),
      scheduledTime: item.scheduledTime,
      projectId: mappedOrNull(maps.projects, item.projectId),
      domainId: mappedOrNull(maps.domains, item.domainId),
      status: item.status,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
      archivedAt: toDate(item.archivedAt),
      trashedAt: toDate(item.trashedAt)
    };
    await tx.task.upsert({ where: { id }, create: { id, ...data }, update: data });
  }

  const convertedTargetMap = new Map<string, string>([
    ...maps.projects,
    ...maps.tasks,
    ...maps.notes,
    ...maps.deadlines
  ]);
  for (const item of workspace.captures) {
    const id = requiredMapped(maps.captures, item.id);
    const data = {
      userId,
      text: item.text,
      status: item.status,
      type: item.type,
      parsedData: item.parsedData as Prisma.InputJsonValue,
      convertedToId: item.convertedToId ? requiredMapped(convertedTargetMap, item.convertedToId) : null,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt)
    };
    await tx.capture.upsert({ where: { id }, create: { id, ...data }, update: data });
  }

  for (const item of workspace.notes) {
    const id = requiredMapped(maps.notes, item.id);
    const data = {
      userId,
      title: item.title,
      content: item.content,
      projectId: mappedOrNull(maps.projects, item.projectId),
      domainId: requiredMapped(maps.domains, item.domainId),
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
      archivedAt: toDate(item.archivedAt),
      trashedAt: toDate(item.trashedAt)
    };
    await tx.note.upsert({ where: { id }, create: { id, ...data }, update: data });
  }

  for (const item of workspace.deadlines) {
    const id = requiredMapped(maps.deadlines, item.id);
    const data = {
      userId,
      title: item.title,
      date: toDateOnly(item.date)!,
      time: item.time,
      location: item.location,
      projectId: mappedOrNull(maps.projects, item.projectId),
      taskIds: item.taskIds.map((taskId) => requiredMapped(maps.tasks, taskId)),
      notes: item.notes,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
      archivedAt: toDate(item.archivedAt),
      trashedAt: toDate(item.trashedAt)
    };
    await tx.deadline.upsert({ where: { id }, create: { id, ...data }, update: data });
  }

  for (const item of workspace.contextDates) {
    const id = requiredMapped(maps.contextDates, item.id);
    const data = {
      userId,
      title: item.title,
      kind: item.kind,
      date: toDateOnly(item.date)!,
      startTime: item.startTime,
      endTime: item.endTime,
      details: item.details,
      projectId: mappedOrNull(maps.projects, item.projectId),
      domainId: mappedOrNull(maps.domains, item.domainId),
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt)
    };
    await tx.contextDate.upsert({ where: { id }, create: { id, ...data }, update: data });
  }

  for (const item of workspace.reviews) {
    const id = requiredMapped(maps.reviews, item.id);
    const data = {
      userId,
      type: item.type,
      date: new Date(item.date),
      responses: item.responses as Prisma.InputJsonValue,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt)
    };
    await tx.review.upsert({ where: { id }, create: { id, ...data }, update: data });
  }

  for (const item of workspace.dailyNotes) {
    const mappedId = requiredMapped(maps.dailyNotes, item.id);
    const existing = await tx.dailyNote.findUnique({
      where: { userId_localDate: { userId, localDate: item.localDate } },
      select: { id: true }
    });
    const data = {
      localDate: item.localDate,
      content: item.content,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt)
    };
    if (existing) {
      await tx.dailyNote.update({ where: { id: existing.id }, data });
    } else {
      await tx.dailyNote.create({ data: { id: mappedId, userId, ...data } });
    }
  }

  const scratchpad = workspace.dashboardScratchpads[0];
  if (scratchpad) {
    const id = requiredMapped(maps.dashboardScratchpads, scratchpad.id);
    const data = { content: scratchpad.content, createdAt: new Date(scratchpad.createdAt), updatedAt: new Date(scratchpad.updatedAt) };
    if (mode === "merge") {
      await tx.dashboardScratchpad.upsert({
        where: { userId },
        create: { id, userId, ...data },
        update: data
      });
    } else {
      await tx.dashboardScratchpad.create({ data: { id, userId, ...data } });
    }
  }

  const preference = workspace.dashboardPreferences[0];
  if (preference) {
    const id = requiredMapped(maps.dashboardPreferences, preference.id);
    const data = {
      sectionOrder: preference.sectionOrder,
      collapsedSections: preference.collapsedSections,
      reviewPromptDismissals: preference.reviewPromptDismissals,
      dateWindowDays: preference.dateWindowDays,
      showCompleted: preference.showCompleted,
      taskSortMode: preference.taskSortMode,
      createdAt: new Date(preference.createdAt),
      updatedAt: new Date(preference.updatedAt)
    };
    if (mode === "merge") {
      await tx.dashboardPreference.upsert({
        where: { userId },
        create: { id, userId, ...data },
        update: data
      });
    } else {
      await tx.dashboardPreference.create({ data: { id, userId, ...data } });
    }
  }
}

export function previewWorkspaceImport(bundle: WorkspaceExportBundle, mode: WorkspaceImportMode) {
  const parsed = workspaceExportBundleSchema.parse(bundle);
  return {
    format: parsed.format,
    version: parsed.version,
    exportedAt: parsed.exportedAt,
    mode,
    counts: portabilityCounts(parsed.workspace),
    semantics: mode === "replace"
      ? "Replace removes this account's current workspace, restores the imported workspace, blocks pre-restore queued mutations, and signs out other sessions."
      : "Merge keeps existing records not present in the import, applies imported records over matching IDs, adds non-matching records, and lets imported dashboard scratchpad/preferences win when present."
  };
}

export async function restoreWorkspaceFromBundle(args: {
  userId: string;
  currentSessionId: string;
  bundle: WorkspaceExportBundle;
  mode: WorkspaceImportMode;
}) {
  const parsed = workspaceExportBundleSchema.parse(args.bundle);
  const restoreAt = new Date();

  await prisma.$transaction(async (tx) => {
    const maps = await buildIdMaps(tx, args.userId, parsed.workspace);

    if (args.mode === "replace") {
      await clearWorkspace(tx, args.userId);
    }

    await writeWorkspace(tx, args.userId, parsed.workspace, maps, args.mode);

    if (args.mode === "replace") {
      await tx.syncMutation.create({
        data: {
          mutationId: `restore-barrier-${randomUUID()}`,
          userId: args.userId,
          entityType: "workspaceRestore",
          entityId: args.userId,
          operation: "barrier",
          payload: { format: parsed.format, version: parsed.version, restoredAt: restoreAt.toISOString() },
          createdAt: restoreAt,
          appliedAt: restoreAt
        }
      });
      await tx.session.deleteMany({ where: { userId: args.userId, id: { not: args.currentSessionId } } });
    }
  });

  return {
    ok: true as const,
    mode: args.mode,
    restoredAt: restoreAt.toISOString(),
    counts: portabilityCounts(parsed.workspace)
  };
}
