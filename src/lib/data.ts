import "server-only";

import type {
  Capture,
  Deadline,
  Domain,
  Note,
  Priority,
  Project,
  Review,
  Task,
  WorkspaceData
} from "./types";
import { prisma } from "./prisma";

const iso = (date: Date | null | undefined) => (date ? date.toISOString() : null);
const dateKey = (date: Date | null | undefined) => (date ? date.toISOString().slice(0, 10) : null);

export async function getWorkspaceData(userId: string): Promise<WorkspaceData> {
  const [domains, projects, tasks, captures, notes, deadlines, reviews, priorities] = await Promise.all([
    prisma.domain.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    prisma.project.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } }),
    prisma.task.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } }),
    prisma.capture.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.note.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } }),
    prisma.deadline.findMany({ where: { userId }, orderBy: { date: "asc" } }),
    prisma.review.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.priority.findMany({ where: { userId }, orderBy: { createdAt: "asc" } })
  ]);

  return {
    domains: domains.map((d): Domain => ({
      id: d.id,
      name: d.name,
      archived: d.archived,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString()
    })),
    projects: projects.map((p): Project => ({
      id: p.id,
      name: p.name,
      domainId: p.domainId,
      status: p.status as Project["status"],
      currentObjective: p.currentObjective,
      nextAction: p.nextAction,
      latestStatus: p.latestStatus,
      openLoops: p.openLoops,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      archivedAt: iso(p.archivedAt),
      trashedAt: iso(p.trashedAt)
    })),
    tasks: tasks.map((t): Task => ({
      id: t.id,
      title: t.title,
      plannedDate: dateKey(t.plannedDate),
      dueDate: dateKey(t.dueDate),
      projectId: t.projectId,
      domainId: t.domainId,
      status: t.status as Task["status"],
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      archivedAt: iso(t.archivedAt),
      trashedAt: iso(t.trashedAt)
    })),
    captures: captures.map((c): Capture => ({
      id: c.id,
      text: c.text,
      status: c.status as Capture["status"],
      type: c.type as Capture["type"],
      parsedData: (c.parsedData as Record<string, string> | null) ?? null,
      convertedToId: c.convertedToId,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString()
    })),
    notes: notes.map((n): Note => ({
      id: n.id,
      title: n.title,
      content: n.content,
      projectId: n.projectId,
      domainId: n.domainId,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
      archivedAt: iso(n.archivedAt),
      trashedAt: iso(n.trashedAt)
    })),
    deadlines: deadlines.map((d): Deadline => ({
      id: d.id,
      title: d.title,
      date: d.date.toISOString().slice(0, 10),
      projectId: d.projectId,
      taskIds: d.taskIds,
      notes: d.notes,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
      archivedAt: iso(d.archivedAt),
      trashedAt: iso(d.trashedAt)
    })),
    reviews: reviews.map((r): Review => ({
      id: r.id,
      type: r.type as Review["type"],
      date: r.date.toISOString(),
      responses: r.responses as Record<string, string>,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString()
    })),
    priorities: priorities.map((p): Priority => ({
      id: p.id,
      scope: p.scope as Priority["scope"],
      dateKey: p.dateKey,
      text: p.text,
      taskId: p.taskId,
      done: p.done,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString()
    })),
    serverSyncedAt: new Date().toISOString()
  };
}
