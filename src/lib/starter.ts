import type { Prisma, PrismaClient } from "@prisma/client";
import { addDaysToDateKey, dateKeyToUtcDate, localDateKey } from "./dates";

type Tx = PrismaClient | Prisma.TransactionClient;

function dateOnly(offsetDays = 0) {
  const dateKey = addDaysToDateKey(localDateKey(), offsetDays);
  return (dateKey && dateKeyToUtcDate(dateKey)) || new Date();
}

function idFor(userId: string, key: string) {
  return `${key}-${userId.slice(-8)}`;
}

export const defaultAreaTemplates = [
  ["research", "Research"],
  ["dev", "Engineering"],
  ["university", "University"],
  ["career", "Planning"],
  ["longterm", "Long-Term Goals"],
  ["ai", "AI Agent Context"],
  ["creative", "Creative Work"]
] as const;

export async function clearWorkspace(tx: Tx, userId: string) {
  await tx.syncMutation.deleteMany({ where: { userId } });
  await tx.dailyNote.deleteMany({ where: { userId } });
  await tx.contextDate.deleteMany({ where: { userId } });
  await tx.task.deleteMany({ where: { userId } });
  await tx.project.deleteMany({ where: { userId } });
  await tx.area.deleteMany({ where: { userId } });
}

/**
 * Production accounts intentionally start empty. Kept as an explicit hook so
 * registration/bootstrap/operator flows can state that scaffold creation is a
 * no-op rather than silently manufacturing default workspace records.
 */
export async function createWorkspaceScaffold(_tx: Tx, _userId: string) {
  return;
}

export async function createStarterWorkspace(tx: Tx, userId: string, reset = false) {
  if (reset) await clearWorkspace(tx, userId);

  const existingAreas = await tx.area.count({ where: { userId } });
  if (existingAreas > 0 && !reset) return;

  const areas = Object.fromEntries(
    defaultAreaTemplates.map(([key]) => [key, idFor(userId, `area-${key}`)])
  );

  await tx.area.createMany({
    data: defaultAreaTemplates.map(([key, name]) => ({
      id: areas[key],
      userId,
      name,
      state: "active"
    })),
    skipDuplicates: true
  });

  const contextProjectId = idFor(userId, "proj-contextos");
  const homeProjectId = idFor(userId, "proj-contextos-home");
  const offlineProjectId = idFor(userId, "proj-contextos-offline");
  const benchmarkProjectId = idFor(userId, "proj-thesis");
  const releaseProjectId = idFor(userId, "proj-career");

  await tx.project.createMany({
    data: [
      {
        id: contextProjectId,
        userId,
        name: "ContextOS Demo",
        areaId: areas.dev,
        objective: "Keep daily execution, temporal context, and project recovery coherent.",
        state: "active"
      },
      {
        id: homeProjectId,
        userId,
        name: "Home & Navigation",
        areaId: areas.dev,
        objective: "Keep Home, Search, and navigation calm and useful for daily execution.",
        state: "active"
      },
      {
        id: offlineProjectId,
        userId,
        name: "Offline Sync Trust",
        areaId: areas.dev,
        objective: "Keep offline edits durable, visible, and recoverable.",
        state: "active"
      },
      {
        id: benchmarkProjectId,
        userId,
        name: "Benchmark Evaluation",
        areaId: areas.research,
        objective: "Keep experiments and handoffs recoverable after breaks.",
        state: "active"
      },
      {
        id: releaseProjectId,
        userId,
        name: "Release Planning",
        areaId: areas.career,
        objective: "Keep release tasks ready without crowding daily execution.",
        state: "archived"
      }
    ],
    skipDuplicates: true
  });

  await tx.task.createMany({
    data: [
      {
        id: idFor(userId, "task-open-work"),
        userId,
        title: "Review today's open work",
        plannedDate: dateOnly(0),
        scheduledTime: "09:30",
        projectId: contextProjectId,
        areaId: null,
        state: "open"
      },
      {
        id: idFor(userId, "task-home-copy"),
        userId,
        title: "Refine Home and navigation copy",
        plannedDate: dateOnly(0),
        scheduledTime: "10:30",
        projectId: homeProjectId,
        areaId: null,
        state: "open"
      },
      {
        id: idFor(userId, "task-benchmark"),
        userId,
        title: "Validate benchmark regression",
        plannedDate: dateOnly(1),
        scheduledTime: null,
        projectId: benchmarkProjectId,
        areaId: null,
        state: "open"
      },
      {
        id: idFor(userId, "task-release"),
        userId,
        title: "Review release milestones and identify risk points",
        plannedDate: null,
        scheduledTime: null,
        projectId: releaseProjectId,
        areaId: null,
        state: "done"
      }
    ],
    skipDuplicates: true
  });

  await tx.contextDate.createMany({
    data: [
      {
        id: idFor(userId, "date-contextos-demo"),
        userId,
        title: "ContextOS verification pass",
        kind: "deadline",
        date: dateOnly(4),
        startTime: null,
        endTime: null,
        details: "Complete the current verification pass and record any blocking issues.",
        projectId: offlineProjectId,
        areaId: null
      },
      {
        id: idFor(userId, "date-research-session"),
        userId,
        title: "Research review session",
        kind: "event",
        date: dateOnly(1),
        startTime: "14:00",
        endTime: "15:00",
        details: "Review current benchmark results and decide the next experiment.",
        projectId: null,
        areaId: areas.research
      }
    ],
    skipDuplicates: true
  });
}
