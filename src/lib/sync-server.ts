import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import type { QueuedMutation, SyncWarning } from "./types";
import { dateKeyToUtcDate, localDateKey } from "./dates";

const toDate = (value: string | null | undefined) => (value ? new Date(value) : null);
const toDateOnly = (value: string | null | undefined) => (value ? dateKeyToUtcDate(value) : null);
const defaultDateOnly = () => dateKeyToUtcDate(localDateKey()) ?? new Date();
type Tx = Prisma.TransactionClient;
type OwnedModel = "domain" | "project" | "task" | "capture" | "note" | "deadline" | "review" | "dashboardScratchpad" | "dashboardPreference";

export class SyncOwnershipError extends Error {
  constructor(message = "Sync payload references a record outside this workspace.") {
    super(message);
    this.name = "SyncOwnershipError";
  }
}

export class SyncPayloadError extends Error {
  constructor(message = "Invalid sync payload.") {
    super(message);
    this.name = "SyncPayloadError";
  }
}

function shouldApply(existingUpdatedAt: Date | null | undefined, incomingUpdatedAt: string | undefined) {
  if (!existingUpdatedAt || !incomingUpdatedAt) return true;
  return new Date(incomingUpdatedAt).getTime() >= existingUpdatedAt.getTime();
}

function shouldApplyOrWarn(
  existingUpdatedAt: Date | null | undefined,
  incomingUpdatedAt: string | undefined,
  mutation: QueuedMutation,
  warnings: SyncWarning[]
) {
  if (shouldApply(existingUpdatedAt, incomingUpdatedAt)) return true;
  warnings.push({
    mutationId: mutation.mutationId,
    entityType: mutation.entityType,
    entityId: mutation.entityId,
    reason: "stale",
    message: `Skipped older offline change for ${mutation.entityType} because the server has a newer update.`,
    serverUpdatedAt: existingUpdatedAt ? existingUpdatedAt.toISOString() : null,
    incomingUpdatedAt: incomingUpdatedAt ?? null
  });
  return false;
}

function importedProjectNoteBlock(payload: any) {
  const title = String(payload.title || "Untitled note").trim() || "Untitled note";
  const content = String(payload.content || "").trim();
  return [
    `<!-- imported-project-note:${payload.id} -->`,
    `### ${title}`,
    content,
    `<!-- /imported-project-note:${payload.id} -->`
  ].filter(Boolean).join("\n\n");
}

function mergeImportedProjectNote(recoveryNotes: string, payload: any) {
  const block = importedProjectNoteBlock(payload);
  const startMarker = `<!-- imported-project-note:${payload.id} -->`;
  const endMarker = `<!-- /imported-project-note:${payload.id} -->`;
  const start = recoveryNotes.indexOf(startMarker);
  const end = recoveryNotes.indexOf(endMarker);

  if (start >= 0 && end >= start) {
    return `${recoveryNotes.slice(0, start).trimEnd()}\n\n${block}${recoveryNotes.slice(end + endMarker.length)}`.trim();
  }

  const heading = recoveryNotes.includes("## Imported project notes") ? "" : "## Imported project notes\n\n";
  return `${recoveryNotes.trim()}${recoveryNotes.trim() ? "\n\n" : ""}${heading}${block}`.trim();
}

function requirePayloadId(payload: any) {
  if (typeof payload?.id !== "string" || !payload.id.trim()) {
    throw new SyncPayloadError("Sync payload is missing an id.");
  }
  return payload.id;
}

async function ownedRecord(tx: Tx, model: OwnedModel, id: string, userId: string) {
  const record = await (tx[model] as any).findUnique({
    where: { id },
    select: { id: true, userId: true, updatedAt: true }
  });
  if (record && record.userId !== userId) {
    throw new SyncOwnershipError();
  }
  return record as { id: string; userId: string; updatedAt?: Date | null } | null;
}

async function optionalOwnedReference(tx: Tx, model: OwnedModel, id: unknown, userId: string, field: string) {
  if (id === null || id === undefined || id === "") return null;
  if (typeof id !== "string") throw new SyncPayloadError(`Invalid ${field}.`);
  const record = await (tx[model] as any).findUnique({
    where: { id },
    select: { id: true, userId: true }
  });
  if (!record) return null;
  if (record.userId !== userId) {
    throw new SyncOwnershipError(`Sync payload references an unavailable ${field}.`);
  }
  return id;
}

async function requireOwnedReference(tx: Tx, model: OwnedModel, id: unknown, userId: string, field: string) {
  const ownedId = await optionalOwnedReference(tx, model, id, userId, field);
  if (!ownedId) throw new SyncPayloadError(`Sync payload is missing ${field}.`);
  return ownedId;
}

async function requireOwnedReferences(tx: Tx, model: OwnedModel, ids: unknown, userId: string, field: string) {
  if (!Array.isArray(ids)) return [];
  const owned: string[] = [];
  for (const id of ids) {
    const ownedId = await optionalOwnedReference(tx, model, id, userId, field);
    if (ownedId) owned.push(ownedId);
  }
  return owned;
}

async function recordMutation(tx: Tx, userId: string, mutation: QueuedMutation) {
  await tx.syncMutation.create({
    data: {
      mutationId: mutation.mutationId,
      userId,
      entityType: mutation.entityType,
      entityId: mutation.entityId,
      operation: mutation.operation,
      payload: (mutation.payload ?? {}) as Prisma.InputJsonValue,
      createdAt: toDate(mutation.createdAt) ?? new Date(),
      appliedAt: new Date()
    }
  });
}

export async function applySyncMutations(userId: string, mutations: QueuedMutation[]) {
  const applied: string[] = [];
  const warnings: SyncWarning[] = [];

  for (const mutation of mutations) {
    await prisma.$transaction(async (tx) => {
      const existingMutation = await tx.syncMutation.findUnique({
        where: { userId_mutationId: { userId, mutationId: mutation.mutationId } }
      });
      if (existingMutation) {
        applied.push(mutation.mutationId);
        return;
      }

      if (mutation.operation === "delete") {
        await recordMutation(tx, userId, mutation);
        applied.push(mutation.mutationId);
        return;
      }

      const payload = mutation.payload as any;
      const id = requirePayloadId(payload);
      const updatedAt = payload.updatedAt || new Date().toISOString();

      switch (mutation.entityType) {
        case "domains": {
          const existing = await ownedRecord(tx, "domain", id, userId);
          if (shouldApplyOrWarn(existing?.updatedAt, updatedAt, mutation, warnings)) {
            const data = {
              name: payload.name,
              archived: Boolean(payload.archived),
              updatedAt: toDate(updatedAt) ?? new Date()
            };
            if (existing) {
              await tx.domain.update({ where: { id }, data });
            } else {
              await tx.domain.create({ data: { id, userId, ...data, createdAt: toDate(payload.createdAt) ?? new Date() } });
            }
          }
          break;
        }
        case "projects": {
          const existing = await ownedRecord(tx, "project", id, userId);
          const domainId = await requireOwnedReference(tx, "domain", payload.domainId, userId, "domainId");
          const parentProjectId = await optionalOwnedReference(tx, "project", payload.parentProjectId, userId, "parentProjectId");
          if (shouldApplyOrWarn(existing?.updatedAt, updatedAt, mutation, warnings)) {
            const data = {
              name: payload.name,
              domainId,
              parentProjectId,
              status: payload.status ?? "active",
              currentObjective: payload.currentObjective ?? "",
              nextAction: payload.nextAction ?? "",
              latestStatus: payload.latestStatus ?? "",
              recoveryNotes: payload.recoveryNotes ?? "",
              openLoops: payload.openLoops ?? [],
              archivedAt: toDate(payload.archivedAt),
              trashedAt: toDate(payload.trashedAt),
              updatedAt: toDate(updatedAt) ?? new Date()
            };
            if (existing) {
              await tx.project.update({ where: { id }, data });
            } else {
              await tx.project.create({ data: { id, userId, ...data, createdAt: toDate(payload.createdAt) ?? new Date() } });
            }
          }
          break;
        }
        case "tasks": {
          const existing = await ownedRecord(tx, "task", id, userId);
          const projectId = await optionalOwnedReference(tx, "project", payload.projectId, userId, "projectId");
          const domainId = await optionalOwnedReference(tx, "domain", payload.domainId, userId, "domainId");
          if (shouldApplyOrWarn(existing?.updatedAt, updatedAt, mutation, warnings)) {
            const data = {
              title: payload.title,
              plannedDate: toDateOnly(payload.plannedDate),
              dueDate: toDateOnly(payload.dueDate),
              scheduledTime: payload.scheduledTime ?? payload.startTime ?? payload.endTime ?? null,
              projectId,
              domainId,
              status: payload.status ?? "todo",
              archivedAt: toDate(payload.archivedAt),
              trashedAt: toDate(payload.trashedAt),
              updatedAt: toDate(updatedAt) ?? new Date()
            };
            if (existing) {
              await tx.task.update({ where: { id }, data });
            } else {
              await tx.task.create({ data: { id, userId, ...data, createdAt: toDate(payload.createdAt) ?? new Date() } });
            }
          }
          break;
        }
        case "captures": {
          const existing = await ownedRecord(tx, "capture", id, userId);
          if (shouldApplyOrWarn(existing?.updatedAt, updatedAt, mutation, warnings)) {
            const data = {
              text: payload.text,
              status: payload.status ?? "unprocessed",
              type: payload.type,
              parsedData: payload.parsedData as Prisma.InputJsonValue,
              convertedToId: payload.convertedToId,
              updatedAt: toDate(updatedAt) ?? new Date()
            };
            if (existing) {
              await tx.capture.update({ where: { id }, data });
            } else {
              await tx.capture.create({ data: { id, userId, ...data, createdAt: toDate(payload.createdAt) ?? new Date() } });
            }
          }
          break;
        }
        case "notes": {
          await ownedRecord(tx, "note", id, userId);
          if (payload.projectId) {
            const projectRecord = typeof payload.projectId === "string" ? await ownedRecord(tx, "project", payload.projectId, userId) : null;
            const project = projectRecord ? await tx.project.findUnique({ where: { id: projectRecord.id } }) : null;
            if (project && !payload.trashedAt) {
              await tx.project.update({
                where: { id: project.id },
                data: {
                  recoveryNotes: mergeImportedProjectNote(project.recoveryNotes, payload)
                }
              });
            }
            break;
          }
          const existing = await ownedRecord(tx, "note", id, userId);
          const domainId = await requireOwnedReference(tx, "domain", payload.domainId, userId, "domainId");
          if (!domainId) throw new SyncPayloadError("Note sync payload is missing domainId.");
          if (shouldApplyOrWarn(existing?.updatedAt, updatedAt, mutation, warnings)) {
            const data = {
              title: payload.title,
              content: payload.content ?? "",
              projectId: null,
              domainId,
              archivedAt: toDate(payload.archivedAt),
              trashedAt: toDate(payload.trashedAt),
              updatedAt: toDate(updatedAt) ?? new Date()
            };
            if (existing) {
              await tx.note.update({ where: { id }, data });
            } else {
              await tx.note.create({ data: { id, userId, ...data, createdAt: toDate(payload.createdAt) ?? new Date() } });
            }
          }
          break;
        }
        case "deadlines": {
          const existing = await ownedRecord(tx, "deadline", id, userId);
          const projectId = await optionalOwnedReference(tx, "project", payload.projectId, userId, "projectId");
          const taskIds = await requireOwnedReferences(tx, "task", payload.taskIds, userId, "taskIds");
          if (shouldApplyOrWarn(existing?.updatedAt, updatedAt, mutation, warnings)) {
            const data = {
              title: payload.title,
              date: toDateOnly(payload.date) ?? defaultDateOnly(),
              time: payload.time ?? null,
              location: payload.location ?? "",
              projectId,
              taskIds,
              notes: payload.notes ?? "",
              archivedAt: toDate(payload.archivedAt),
              trashedAt: toDate(payload.trashedAt),
              updatedAt: toDate(updatedAt) ?? new Date()
            };
            if (existing) {
              await tx.deadline.update({ where: { id }, data });
            } else {
              await tx.deadline.create({ data: { id, userId, ...data, createdAt: toDate(payload.createdAt) ?? new Date() } });
            }
          }
          break;
        }

        case "dashboardScratchpads": {
          await ownedRecord(tx, "dashboardScratchpad", id, userId);
          const existing = await tx.dashboardScratchpad.findFirst({ where: { userId } });
          if (shouldApplyOrWarn(existing?.updatedAt, updatedAt, mutation, warnings)) {
            const data = { content: payload.content ?? "", updatedAt: toDate(updatedAt) ?? new Date() };
            if (existing) {
              await tx.dashboardScratchpad.update({ where: { userId }, data });
            } else {
              await tx.dashboardScratchpad.create({ data: { id, userId, ...data, createdAt: toDate(payload.createdAt) ?? new Date() } });
            }
          }
          break;
        }
        case "dashboardPreferences": {
          await ownedRecord(tx, "dashboardPreference", id, userId);
          const existing = await tx.dashboardPreference.findFirst({ where: { userId } });
          if (shouldApplyOrWarn(existing?.updatedAt, updatedAt, mutation, warnings)) {
            const data = {
              sectionOrder: payload.sectionOrder ?? [],
              collapsedSections: payload.collapsedSections ?? [],
              reviewPromptDismissals: payload.reviewPromptDismissals ?? [],
              dateWindowDays: Number(payload.dateWindowDays ?? 14),
              showCompleted: Boolean(payload.showCompleted),
              updatedAt: toDate(updatedAt) ?? new Date()
            };
            if (existing) {
              await tx.dashboardPreference.update({ where: { userId }, data });
            } else {
              await tx.dashboardPreference.create({ data: { id, userId, ...data, createdAt: toDate(payload.createdAt) ?? new Date() } });
            }
          }
          break;
        }
        case "reviews": {
          const existing = await ownedRecord(tx, "review", id, userId);
          if (shouldApplyOrWarn(existing?.updatedAt, updatedAt, mutation, warnings)) {
            const data = {
              type: payload.type,
              date: toDate(payload.date) ?? new Date(),
              responses: payload.responses as Prisma.InputJsonValue,
              updatedAt: toDate(updatedAt) ?? new Date()
            };
            if (existing) {
              await tx.review.update({ where: { id }, data });
            } else {
              await tx.review.create({ data: { id, userId, ...data, createdAt: toDate(payload.createdAt) ?? new Date() } });
            }
          }
          break;
        }
        case "priorities": {
          // Compatibility no-op: old clients may still have Priority mutations queued.
          break;
        }
      }

      await recordMutation(tx, userId, mutation);
      applied.push(mutation.mutationId);
    });
  }

  return { appliedMutationIds: applied, warnings };
}
