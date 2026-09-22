import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import type { QueuedMutation, SyncWarning } from "./types";
import { dateKeyToUtcDate } from "./dates";

const toDate = (value: string | null | undefined) => (value ? new Date(value) : null);
const toDateOnly = (value: string | null | undefined) => (value ? dateKeyToUtcDate(value) : null);
type Tx = Prisma.TransactionClient;
type OwnedModel = "area" | "project" | "task" | "contextDate" | "dailyNote";

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

type OwnedRecord = {
  id: string;
  userId: string;
  updatedAt: Date | null;
  revision: number;
};

function revisionKey(mutation: QueuedMutation) {
  return `${mutation.entityType}:${mutation.entityId}`;
}

function warnRevisionConflict(
  existing: OwnedRecord | null,
  mutation: QueuedMutation,
  warnings: SyncWarning[],
  message: string
) {
  warnings.push({
    mutationId: mutation.mutationId,
    entityType: mutation.entityType,
    entityId: mutation.entityId,
    reason: "stale",
    message,
    serverUpdatedAt: existing?.updatedAt ? existing.updatedAt.toISOString() : null,
    incomingUpdatedAt:
      typeof (mutation.payload as { updatedAt?: unknown })?.updatedAt === "string"
        ? (mutation.payload as { updatedAt: string }).updatedAt
        : null,
    serverRevision: existing?.revision ?? null,
    baseRevision: mutation.baseRevision ?? null
  });
}

function shouldApplyRevision(
  existing: OwnedRecord | null,
  mutation: QueuedMutation,
  warnings: SyncWarning[],
  conflictedEntities: Set<string>
) {
  const key = revisionKey(mutation);

  if (conflictedEntities.has(key)) {
    warnRevisionConflict(
      existing,
      mutation,
      warnings,
      `Skipped dependent offline change for ${mutation.entityType} because an earlier queued change for this record conflicted.`
    );
    return false;
  }

  if (!existing) {
    if (mutation.baseRevision === null || mutation.baseRevision === undefined) return true;
    conflictedEntities.add(key);
    warnRevisionConflict(
      null,
      mutation,
      warnings,
      `Skipped offline change for ${mutation.entityType} because the client expected an existing server revision but the record does not exist.`
    );
    return false;
  }

  if (mutation.baseRevision === existing.revision) return true;

  conflictedEntities.add(key);
  warnRevisionConflict(
    existing,
    mutation,
    warnings,
    `Skipped offline change for ${mutation.entityType} because the server record revision changed since this client last observed it.`
  );
  return false;
}

async function revisionConflictAfterFailedCas(
  tx: Tx,
  model: OwnedModel,
  id: string,
  userId: string,
  mutation: QueuedMutation,
  warnings: SyncWarning[],
  conflictedEntities: Set<string>
) {
  const latest = await ownedRecord(tx, model, id, userId);
  conflictedEntities.add(revisionKey(mutation));
  warnRevisionConflict(
    latest,
    mutation,
    warnings,
    `Skipped offline change for ${mutation.entityType} because another write advanced the server record revision first.`
  );
}

function requireDateKey(value: unknown, field: string) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new SyncPayloadError(`Sync payload has invalid ${field}.`);
  }
  const date = dateKeyToUtcDate(value);
  if (!date) throw new SyncPayloadError(`Sync payload has invalid ${field}.`);
  return value;
}

function optionalDateKey(value: unknown, field: string) {
  if (value === null || value === undefined || value === "") return null;
  return requireDateKey(value, field);
}

function optionalTimeKey(value: unknown, field: string) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new SyncPayloadError(`Sync payload has invalid ${field}.`);
  }
  return value;
}

function requirePayloadId(payload: any) {
  if (typeof payload?.id !== "string" || !payload.id.trim()) {
    throw new SyncPayloadError("Sync payload is missing an id.");
  }
  return payload.id;
}

function requireState(value: unknown, allowed: readonly string[], field = "state") {
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new SyncPayloadError(`Sync payload has invalid ${field}.`);
  }
  return value;
}

async function ownedRecord(tx: Tx, model: OwnedModel, id: string, userId: string) {
  const record = await (tx[model] as any).findUnique({
    where: { id },
    select: { id: true, userId: true, updatedAt: true, revision: true }
  });
  if (record && record.userId !== userId) throw new SyncOwnershipError();
  return record as OwnedRecord | null;
}

async function requireOwnedReference(tx: Tx, model: OwnedModel, id: unknown, userId: string, field: string) {
  if (typeof id !== "string" || !id) throw new SyncPayloadError(`Sync payload is missing ${field}.`);
  const record = await (tx[model] as any).findUnique({
    where: { id },
    select: { id: true, userId: true }
  });
  if (!record) throw new SyncPayloadError(`Sync payload references a missing ${field}.`);
  if (record.userId !== userId) throw new SyncOwnershipError(`Sync payload references an unavailable ${field}.`);
  return id;
}

async function recordMutation(tx: Tx, userId: string, mutation: QueuedMutation) {
  await tx.syncMutation.create({
    data: {
      mutationId: mutation.mutationId,
      userId,
      entityType: mutation.entityType,
      entityId: mutation.entityId,
      operation: mutation.operation,
      payload: mutation.payload as Prisma.InputJsonValue,
      createdAt: toDate(mutation.createdAt) ?? new Date(),
      appliedAt: new Date()
    }
  });
}

export async function applySyncMutations(userId: string, mutations: QueuedMutation[]) {
  const appliedMutationIds: string[] = [];
  const warnings: SyncWarning[] = [];
  const conflictedEntities = new Set<string>();

  for (const mutation of mutations) {
    await prisma.$transaction(async (tx) => {
      const existingMutation = await tx.syncMutation.findUnique({
        where: { userId_mutationId: { userId, mutationId: mutation.mutationId } }
      });
      if (existingMutation) {
        appliedMutationIds.push(mutation.mutationId);
        return;
      }

      const payload = mutation.payload as any;
      const id = requirePayloadId(payload);

      switch (mutation.entityType) {
        case "areas": {
          const existing = await ownedRecord(tx, "area", id, userId);
          const name = typeof payload.name === "string" ? payload.name.trim() : "";
          if (!name) throw new SyncPayloadError("Area name is required.");
          const state = requireState(payload.state, ["active", "archived"]) as "active" | "archived";
          if (shouldApplyRevision(existing, mutation, warnings, conflictedEntities)) {
            const updatedAt = new Date();
            if (existing) {
              const result = await tx.area.updateMany({
                where: { id, userId, revision: mutation.baseRevision! },
                data: { name, state, updatedAt, revision: { increment: 1 } }
              });
              if (result.count === 0) {
                await revisionConflictAfterFailedCas(tx, "area", id, userId, mutation, warnings, conflictedEntities);
              }
            } else {
              await tx.area.create({
                data: { id, userId, name, state, createdAt: toDate(payload.createdAt) ?? updatedAt, updatedAt, revision: 1 }
              });
            }
          }
          break;
        }

        case "projects": {
          const existing = await ownedRecord(tx, "project", id, userId);
          const areaId = await requireOwnedReference(tx, "area", payload.areaId, userId, "areaId");
          const name = typeof payload.name === "string" ? payload.name.trim() : "";
          if (!name) throw new SyncPayloadError("Project name is required.");
          const state = requireState(payload.state, ["active", "archived"]) as "active" | "archived";
          if (shouldApplyRevision(existing, mutation, warnings, conflictedEntities)) {
            const updatedAt = new Date();
            const data = {
              name,
              areaId,
              objective: typeof payload.objective === "string" ? payload.objective : "",
              state,
              updatedAt
            };
            if (existing) {
              const result = await tx.project.updateMany({
                where: { id, userId, revision: mutation.baseRevision! },
                data: { ...data, revision: { increment: 1 } }
              });
              if (result.count === 0) {
                await revisionConflictAfterFailedCas(tx, "project", id, userId, mutation, warnings, conflictedEntities);
              }
            } else {
              await tx.project.create({
                data: { id, userId, ...data, createdAt: toDate(payload.createdAt) ?? updatedAt, revision: 1 }
              });
            }
          }
          break;
        }

        case "tasks": {
          const existing = await ownedRecord(tx, "task", id, userId);
          const parent = payload.parent;
          if (!parent || (parent.type !== "project" && parent.type !== "area")) {
            throw new SyncPayloadError("Task must belong to exactly one Project or Area.");
          }
          const projectId = parent.type === "project"
            ? await requireOwnedReference(tx, "project", parent.projectId, userId, "projectId")
            : null;
          const areaId = parent.type === "area"
            ? await requireOwnedReference(tx, "area", parent.areaId, userId, "areaId")
            : null;
          const title = typeof payload.title === "string" ? payload.title.trim() : "";
          if (!title) throw new SyncPayloadError("Task title is required.");
          const state = requireState(payload.state, ["open", "done"]) as "open" | "done";
          const plannedDateKey = optionalDateKey(payload.plannedDate, "plannedDate");
          const scheduledTime = plannedDateKey ? optionalTimeKey(payload.scheduledTime, "scheduledTime") : null;
          if (shouldApplyRevision(existing, mutation, warnings, conflictedEntities)) {
            const updatedAt = new Date();
            const data = {
              title,
              plannedDate: toDateOnly(plannedDateKey),
              scheduledTime,
              projectId,
              areaId,
              state,
              updatedAt
            };
            if (existing) {
              const result = await tx.task.updateMany({
                where: { id, userId, revision: mutation.baseRevision! },
                data: { ...data, revision: { increment: 1 } }
              });
              if (result.count === 0) {
                await revisionConflictAfterFailedCas(tx, "task", id, userId, mutation, warnings, conflictedEntities);
              }
            } else {
              await tx.task.create({
                data: { id, userId, ...data, createdAt: toDate(payload.createdAt) ?? updatedAt, revision: 1 }
              });
            }
          }
          break;
        }

        case "dates": {
          const existing = await ownedRecord(tx, "contextDate", id, userId);
          const kind = payload.kind;
          if (kind !== "event" && kind !== "deadline") throw new SyncPayloadError("Date kind must be event or deadline.");
          const parent = payload.parent;
          if (!parent || (parent.type !== "project" && parent.type !== "area")) {
            throw new SyncPayloadError("Date must belong to exactly one Project or Area.");
          }
          const projectId = parent.type === "project"
            ? await requireOwnedReference(tx, "project", parent.projectId, userId, "projectId")
            : null;
          const areaId = parent.type === "area"
            ? await requireOwnedReference(tx, "area", parent.areaId, userId, "areaId")
            : null;
          const dateKey = requireDateKey(payload.date, "date");
          const startTime = optionalTimeKey(payload.startTime, "startTime");
          const endTime = optionalTimeKey(payload.endTime, "endTime");
          if (kind === "deadline" && endTime !== null) throw new SyncPayloadError("Deadline endTime must be null.");
          const title = typeof payload.title === "string" ? payload.title.trim() : "";
          if (!title) throw new SyncPayloadError("Date title is required.");

          if (shouldApplyRevision(existing, mutation, warnings, conflictedEntities)) {
            const updatedAt = new Date();
            const data = {
              title,
              kind,
              date: dateKeyToUtcDate(dateKey)!,
              startTime,
              endTime: kind === "event" ? endTime : null,
              details: typeof payload.details === "string" ? payload.details : "",
              projectId,
              areaId,
              updatedAt
            };
            if (existing) {
              const result = await tx.contextDate.updateMany({
                where: { id, userId, revision: mutation.baseRevision! },
                data: { ...data, revision: { increment: 1 } }
              });
              if (result.count === 0) {
                await revisionConflictAfterFailedCas(tx, "contextDate", id, userId, mutation, warnings, conflictedEntities);
              }
            } else {
              await tx.contextDate.create({
                data: { id, userId, ...data, createdAt: toDate(payload.createdAt) ?? updatedAt, revision: 1 }
              });
            }
          }
          break;
        }

        case "dailyNotes": {
          const localDate = requireDateKey(payload.localDate, "localDate");
          const byId = await tx.dailyNote.findUnique({
            where: { id },
            select: { id: true, userId: true, localDate: true, updatedAt: true, revision: true }
          });
          if (byId && byId.userId !== userId) throw new SyncOwnershipError();
          if (byId && byId.localDate !== localDate) throw new SyncPayloadError("Daily Note localDate cannot change.");

          const byDate = await tx.dailyNote.findUnique({
            where: { userId_localDate: { userId, localDate } },
            select: { id: true, userId: true, localDate: true, updatedAt: true, revision: true }
          });
          const existing = (byId ?? byDate) as OwnedRecord & { localDate: string } | null;
          if (shouldApplyRevision(existing, mutation, warnings, conflictedEntities)) {
            const updatedAt = new Date();
            const data = {
              localDate,
              content: typeof payload.content === "string" ? payload.content : "",
              updatedAt
            };
            if (existing) {
              const result = await tx.dailyNote.updateMany({
                where: { id: existing.id, userId, revision: mutation.baseRevision! },
                data: { ...data, revision: { increment: 1 } }
              });
              if (result.count === 0) {
                await revisionConflictAfterFailedCas(tx, "dailyNote", existing.id, userId, mutation, warnings, conflictedEntities);
              }
            } else {
              await tx.dailyNote.create({
                data: { id, userId, ...data, createdAt: toDate(payload.createdAt) ?? updatedAt, revision: 1 }
              });
            }
          }
          break;
        }
      }

      await recordMutation(tx, userId, mutation);
      appliedMutationIds.push(mutation.mutationId);
    });
  }

  return { appliedMutationIds, warnings };
}
