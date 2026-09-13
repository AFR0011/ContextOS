import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import type { QueuedMutation, SyncWarning } from "./types";

export async function enforceWorkspaceRestoreBarrier(userId: string, mutations: QueuedMutation[]) {
  const barrier = await prisma.syncMutation.findFirst({
    where: { userId, entityType: "workspaceRestore", operation: "barrier" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true }
  });

  if (!barrier) {
    return { allowed: mutations, blockedMutationIds: [] as string[], warnings: [] as SyncWarning[] };
  }

  const blocked = mutations.filter((mutation) => {
    const createdAt = new Date(mutation.createdAt);
    return !Number.isNaN(createdAt.getTime()) && createdAt.getTime() <= barrier.createdAt.getTime();
  });
  const blockedIds = new Set(blocked.map((mutation) => mutation.mutationId));
  const allowed = mutations.filter((mutation) => !blockedIds.has(mutation.mutationId));

  if (blocked.length) {
    await prisma.syncMutation.createMany({
      data: blocked.map((mutation) => ({
        mutationId: mutation.mutationId,
        userId,
        entityType: mutation.entityType,
        entityId: mutation.entityId,
        operation: mutation.operation,
        payload: (mutation.payload ?? {}) as Prisma.InputJsonValue,
        createdAt: new Date(mutation.createdAt),
        appliedAt: new Date()
      })),
      skipDuplicates: true
    });
  }

  const warnings: SyncWarning[] = blocked.map((mutation) => ({
    mutationId: mutation.mutationId,
    entityType: mutation.entityType,
    entityId: mutation.entityId,
    reason: "stale",
    message: "Skipped a queued change created before the most recent workspace restore.",
    serverUpdatedAt: barrier.createdAt.toISOString(),
    incomingUpdatedAt: mutation.createdAt
  }));

  return { allowed, blockedMutationIds: blocked.map((mutation) => mutation.mutationId), warnings };
}
