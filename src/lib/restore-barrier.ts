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
    const baseline = mutation.baseServerSyncedAt ? new Date(mutation.baseServerSyncedAt) : null;
    if (!baseline || Number.isNaN(baseline.getTime())) return true;
    return baseline.getTime() <= barrier.createdAt.getTime();
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
        payload: (mutation.payload ?? {}) as unknown as Prisma.InputJsonValue,
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
    message: "Skipped a queued change based on a workspace snapshot from before the most recent restore.",
    serverUpdatedAt: barrier.createdAt.toISOString(),
    incomingUpdatedAt: mutation.baseServerSyncedAt ?? null
  }));

  return { allowed, blockedMutationIds: blocked.map((mutation) => mutation.mutationId), warnings };
}
