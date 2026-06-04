import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import type { QueuedMutation, SyncWarning } from "./types";
import { dateKeyToUtcDate, localDateKey } from "./dates";

const toDate = (value: string | null | undefined) => (value ? new Date(value) : null);
const toDateOnly = (value: string | null | undefined) => (value ? dateKeyToUtcDate(value) : null);
const defaultDateOnly = () => dateKeyToUtcDate(localDateKey()) ?? new Date();

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

export async function applySyncMutations(userId: string, mutations: QueuedMutation[]) {
  const applied: string[] = [];
  const warnings: SyncWarning[] = [];

  for (const mutation of mutations) {
    await prisma.$transaction(async (tx) => {
      const existingMutation = await tx.syncMutation.findUnique({
        where: { mutationId: mutation.mutationId }
      });
      if (existingMutation) {
        applied.push(mutation.mutationId);
        return;
      }

      if (mutation.operation === "delete") {
        if (mutation.entityType === "priorities") {
          await tx.priority.deleteMany({ where: { id: mutation.entityId, userId } });
        }
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
        applied.push(mutation.mutationId);
        return;
      }

      const payload = mutation.payload as any;
      const updatedAt = payload.updatedAt || new Date().toISOString();

      switch (mutation.entityType) {
        case "domains": {
          const existing = await tx.domain.findFirst({ where: { id: payload.id, userId } });
          if (shouldApplyOrWarn(existing?.updatedAt, updatedAt, mutation, warnings)) {
            await tx.domain.upsert({
              where: { id: payload.id },
              update: {
                name: payload.name,
                archived: Boolean(payload.archived),
                updatedAt: toDate(updatedAt) ?? new Date()
              },
              create: {
                id: payload.id,
                userId,
                name: payload.name,
                archived: Boolean(payload.archived),
                createdAt: toDate(payload.createdAt) ?? new Date(),
                updatedAt: toDate(updatedAt) ?? new Date()
              }
            });
          }
          break;
        }
        case "projects": {
          const existing = await tx.project.findFirst({ where: { id: payload.id, userId } });
          if (shouldApplyOrWarn(existing?.updatedAt, updatedAt, mutation, warnings)) {
            await tx.project.upsert({
              where: { id: payload.id },
              update: {
                name: payload.name,
                domainId: payload.domainId,
                parentProjectId: payload.parentProjectId ?? null,
                status: payload.status,
                currentObjective: payload.currentObjective ?? "",
                nextAction: payload.nextAction ?? "",
                latestStatus: payload.latestStatus ?? "",
                openLoops: payload.openLoops ?? [],
                archivedAt: toDate(payload.archivedAt),
                trashedAt: toDate(payload.trashedAt),
                updatedAt: toDate(updatedAt) ?? new Date()
              },
              create: {
                id: payload.id,
                userId,
                name: payload.name,
                domainId: payload.domainId,
                parentProjectId: payload.parentProjectId ?? null,
                status: payload.status ?? "active",
                currentObjective: payload.currentObjective ?? "",
                nextAction: payload.nextAction ?? "",
                latestStatus: payload.latestStatus ?? "",
                openLoops: payload.openLoops ?? [],
                createdAt: toDate(payload.createdAt) ?? new Date(),
                updatedAt: toDate(updatedAt) ?? new Date(),
                archivedAt: toDate(payload.archivedAt),
                trashedAt: toDate(payload.trashedAt)
              }
            });
          }
          break;
        }
        case "tasks": {
          const existing = await tx.task.findFirst({ where: { id: payload.id, userId } });
          if (shouldApplyOrWarn(existing?.updatedAt, updatedAt, mutation, warnings)) {
            await tx.task.upsert({
              where: { id: payload.id },
              update: {
                title: payload.title,
                plannedDate: toDateOnly(payload.plannedDate),
                dueDate: toDateOnly(payload.dueDate),
                projectId: payload.projectId,
                domainId: payload.domainId,
                status: payload.status,
                archivedAt: toDate(payload.archivedAt),
                trashedAt: toDate(payload.trashedAt),
                updatedAt: toDate(updatedAt) ?? new Date()
              },
              create: {
                id: payload.id,
                userId,
                title: payload.title,
                plannedDate: toDateOnly(payload.plannedDate),
                dueDate: toDateOnly(payload.dueDate),
                projectId: payload.projectId,
                domainId: payload.domainId,
                status: payload.status ?? "todo",
                createdAt: toDate(payload.createdAt) ?? new Date(),
                updatedAt: toDate(updatedAt) ?? new Date(),
                archivedAt: toDate(payload.archivedAt),
                trashedAt: toDate(payload.trashedAt)
              }
            });
          }
          break;
        }
        case "captures": {
          const existing = await tx.capture.findFirst({ where: { id: payload.id, userId } });
          if (shouldApplyOrWarn(existing?.updatedAt, updatedAt, mutation, warnings)) {
            await tx.capture.upsert({
              where: { id: payload.id },
              update: {
                text: payload.text,
                status: payload.status,
                type: payload.type,
                parsedData: payload.parsedData as Prisma.InputJsonValue,
                convertedToId: payload.convertedToId,
                updatedAt: toDate(updatedAt) ?? new Date()
              },
              create: {
                id: payload.id,
                userId,
                text: payload.text,
                status: payload.status ?? "unprocessed",
                type: payload.type,
                parsedData: payload.parsedData as Prisma.InputJsonValue,
                convertedToId: payload.convertedToId,
                createdAt: toDate(payload.createdAt) ?? new Date(),
                updatedAt: toDate(updatedAt) ?? new Date()
              }
            });
          }
          break;
        }
        case "notes": {
          const existing = await tx.note.findFirst({ where: { id: payload.id, userId } });
          if (shouldApplyOrWarn(existing?.updatedAt, updatedAt, mutation, warnings)) {
            await tx.note.upsert({
              where: { id: payload.id },
              update: {
                title: payload.title,
                content: payload.content ?? "",
                projectId: payload.projectId,
                domainId: payload.domainId,
                archivedAt: toDate(payload.archivedAt),
                trashedAt: toDate(payload.trashedAt),
                updatedAt: toDate(updatedAt) ?? new Date()
              },
              create: {
                id: payload.id,
                userId,
                title: payload.title,
                content: payload.content ?? "",
                projectId: payload.projectId,
                domainId: payload.domainId,
                createdAt: toDate(payload.createdAt) ?? new Date(),
                updatedAt: toDate(updatedAt) ?? new Date(),
                archivedAt: toDate(payload.archivedAt),
                trashedAt: toDate(payload.trashedAt)
              }
            });
          }
          break;
        }
        case "deadlines": {
          const existing = await tx.deadline.findFirst({ where: { id: payload.id, userId } });
          if (shouldApplyOrWarn(existing?.updatedAt, updatedAt, mutation, warnings)) {
            await tx.deadline.upsert({
              where: { id: payload.id },
              update: {
                title: payload.title,
                date: toDateOnly(payload.date) ?? defaultDateOnly(),
                projectId: payload.projectId,
                taskIds: payload.taskIds ?? [],
                notes: payload.notes ?? "",
                archivedAt: toDate(payload.archivedAt),
                trashedAt: toDate(payload.trashedAt),
                updatedAt: toDate(updatedAt) ?? new Date()
              },
              create: {
                id: payload.id,
                userId,
                title: payload.title,
                date: toDateOnly(payload.date) ?? defaultDateOnly(),
                projectId: payload.projectId,
                taskIds: payload.taskIds ?? [],
                notes: payload.notes ?? "",
                createdAt: toDate(payload.createdAt) ?? new Date(),
                updatedAt: toDate(updatedAt) ?? new Date(),
                archivedAt: toDate(payload.archivedAt),
                trashedAt: toDate(payload.trashedAt)
              }
            });
          }
          break;
        }
        case "reviews": {
          const existing = await tx.review.findFirst({ where: { id: payload.id, userId } });
          if (shouldApplyOrWarn(existing?.updatedAt, updatedAt, mutation, warnings)) {
            await tx.review.upsert({
              where: { id: payload.id },
              update: {
                type: payload.type,
                date: toDate(payload.date) ?? new Date(),
                responses: payload.responses as Prisma.InputJsonValue,
                updatedAt: toDate(updatedAt) ?? new Date()
              },
              create: {
                id: payload.id,
                userId,
                type: payload.type,
                date: toDate(payload.date) ?? new Date(),
                responses: payload.responses as Prisma.InputJsonValue,
                createdAt: toDate(payload.createdAt) ?? new Date(),
                updatedAt: toDate(updatedAt) ?? new Date()
              }
            });
          }
          break;
        }
        case "priorities": {
          const existing = await tx.priority.findFirst({ where: { id: payload.id, userId } });
          if (shouldApplyOrWarn(existing?.updatedAt, updatedAt, mutation, warnings)) {
            await tx.priority.upsert({
              where: { id: payload.id },
              update: {
                scope: payload.scope,
                dateKey: payload.dateKey,
                text: payload.text,
                taskId: payload.taskId,
                done: Boolean(payload.done),
                updatedAt: toDate(updatedAt) ?? new Date()
              },
              create: {
                id: payload.id,
                userId,
                scope: payload.scope,
                dateKey: payload.dateKey,
                text: payload.text,
                taskId: payload.taskId,
                done: Boolean(payload.done),
                createdAt: toDate(payload.createdAt) ?? new Date(),
                updatedAt: toDate(updatedAt) ?? new Date()
              }
            });
          }
          break;
        }
      }

      await tx.syncMutation.create({
        data: {
          mutationId: mutation.mutationId,
          userId,
          entityType: mutation.entityType,
          entityId: mutation.entityId,
          operation: mutation.operation,
          payload: mutation.payload as unknown as Prisma.InputJsonValue,
          createdAt: toDate(mutation.createdAt) ?? new Date(),
          appliedAt: new Date()
        }
      });
      applied.push(mutation.mutationId);
    });
  }

  return { appliedMutationIds: applied, warnings };
}
