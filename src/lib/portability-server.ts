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
  areas: Map<string, string>;
  projects: Map<string, string>;
  tasks: Map<string, string>;
  dates: Map<string, string>;
  dailyNotes: Map<string, string>;
};

const newId = (prefix: string) => `${prefix}-${randomUUID()}`;

function mapIds(records: { id: string }[], existing: { id: string; userId: string }[], userId: string, prefix: string) {
  const owners = new Map(existing.map((record) => [record.id, record.userId]));
  return new Map(records.map((record) => [record.id, owners.get(record.id) && owners.get(record.id) !== userId ? newId(prefix) : record.id]));
}

async function buildIdMaps(tx: Tx, userId: string, workspace: PortableWorkspace): Promise<IdMaps> {
  const [areas, projects, tasks, dates, dailyNotes] = await Promise.all([
    tx.area.findMany({ where: { id: { in: workspace.areas.map((item) => item.id) } }, select: { id: true, userId: true } }),
    tx.project.findMany({ where: { id: { in: workspace.projects.map((item) => item.id) } }, select: { id: true, userId: true } }),
    tx.task.findMany({ where: { id: { in: workspace.tasks.map((item) => item.id) } }, select: { id: true, userId: true } }),
    tx.contextDate.findMany({ where: { id: { in: workspace.dates.map((item) => item.id) } }, select: { id: true, userId: true } }),
    tx.dailyNote.findMany({ where: { id: { in: workspace.dailyNotes.map((item) => item.id) } }, select: { id: true, userId: true } })
  ]);

  return {
    areas: mapIds(workspace.areas, areas, userId, "area"),
    projects: mapIds(workspace.projects, projects, userId, "proj"),
    tasks: mapIds(workspace.tasks, tasks, userId, "task"),
    dates: mapIds(workspace.dates, dates, userId, "date"),
    dailyNotes: mapIds(workspace.dailyNotes, dailyNotes, userId, "daily-note")
  };
}

function requiredMapped(map: Map<string, string>, id: string) {
  const mapped = map.get(id);
  if (!mapped) throw new Error(`Validated import is missing id mapping for ${id}.`);
  return mapped;
}

async function clearWorkspace(tx: Tx, userId: string) {
  await tx.syncMutation.deleteMany({ where: { userId } });
  await tx.dailyNote.deleteMany({ where: { userId } });
  await tx.contextDate.deleteMany({ where: { userId } });
  await tx.task.deleteMany({ where: { userId } });
  await tx.project.deleteMany({ where: { userId } });
  await tx.area.deleteMany({ where: { userId } });
}

async function writeWorkspace(tx: Tx, userId: string, workspace: PortableWorkspace, maps: IdMaps) {
  for (const item of workspace.areas) {
    const id = requiredMapped(maps.areas, item.id);
    const data = {
      userId,
      name: item.name,
      state: item.state,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt)
    };
    await tx.area.upsert({ where: { id }, create: { id, ...data }, update: data });
  }

  for (const item of workspace.projects) {
    const id = requiredMapped(maps.projects, item.id);
    const data = {
      userId,
      name: item.name,
      areaId: requiredMapped(maps.areas, item.areaId),
      objective: item.objective,
      state: item.state,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt)
    };
    await tx.project.upsert({ where: { id }, create: { id, ...data }, update: data });
  }

  for (const item of workspace.tasks) {
    const id = requiredMapped(maps.tasks, item.id);
    const projectId = item.parent.type === "project" ? requiredMapped(maps.projects, item.parent.projectId) : null;
    const areaId = item.parent.type === "area" ? requiredMapped(maps.areas, item.parent.areaId) : null;
    const data = {
      userId,
      title: item.title,
      plannedDate: item.plannedDate ? dateKeyToUtcDate(item.plannedDate) : null,
      scheduledTime: item.plannedDate ? item.scheduledTime : null,
      projectId,
      areaId,
      state: item.state,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt)
    };
    await tx.task.upsert({ where: { id }, create: { id, ...data }, update: data });
  }

  for (const item of workspace.dates) {
    const id = requiredMapped(maps.dates, item.id);
    const projectId = item.parent.type === "project" ? requiredMapped(maps.projects, item.parent.projectId) : null;
    const areaId = item.parent.type === "area" ? requiredMapped(maps.areas, item.parent.areaId) : null;
    const data = {
      userId,
      title: item.title,
      kind: item.kind,
      date: dateKeyToUtcDate(item.date)!,
      startTime: item.startTime,
      endTime: item.kind === "event" ? item.endTime : null,
      details: item.details,
      projectId,
      areaId,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt)
    };
    await tx.contextDate.upsert({ where: { id }, create: { id, ...data }, update: data });
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
    if (existing) await tx.dailyNote.update({ where: { id: existing.id }, data });
    else await tx.dailyNote.create({ data: { id: mappedId, userId, ...data } });
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
      ? "Replace removes this account's current canonical workspace, restores the imported workspace, blocks pre-restore queued mutations, and signs out other sessions."
      : "Merge keeps existing canonical records not present in the import, applies imported records over matching IDs, and adds non-matching records."
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

    if (args.mode === "replace") await clearWorkspace(tx, args.userId);

    await writeWorkspace(tx, args.userId, parsed.workspace, maps);

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
