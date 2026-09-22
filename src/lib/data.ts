import "server-only";

import type { Area, ContextDate, DailyNote, Project, Task, WorkspaceData } from "./types";
import { prisma } from "./prisma";
import { utcDateToDateKey } from "./dates";

export async function getWorkspaceData(userId: string): Promise<WorkspaceData> {
  const [areas, projects, tasks, dates, dailyNotes] = await Promise.all([
    prisma.area.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    prisma.project.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } }),
    prisma.task.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } }),
    prisma.contextDate.findMany({ where: { userId }, orderBy: { date: "asc" } }),
    prisma.dailyNote.findMany({ where: { userId }, orderBy: { localDate: "desc" } })
  ]);

  return {
    areas: areas.map((area): Area => ({
      id: area.id,
      name: area.name,
      state: area.state as Area["state"],
      createdAt: area.createdAt.toISOString(),
      updatedAt: area.updatedAt.toISOString()
    })),
    projects: projects.map((project): Project => ({
      id: project.id,
      name: project.name,
      areaId: project.areaId,
      objective: project.objective,
      state: project.state as Project["state"],
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString()
    })),
    tasks: tasks.flatMap((task): Task[] => {
      const parent = task.projectId
        ? { type: "project" as const, projectId: task.projectId }
        : task.areaId
          ? { type: "area" as const, areaId: task.areaId }
          : null;
      if (!parent) return [];
      return [{
        id: task.id,
        title: task.title,
        parent,
        plannedDate: utcDateToDateKey(task.plannedDate),
        scheduledTime: task.scheduledTime,
        state: task.state as Task["state"],
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString()
      }];
    }),
    dates: dates.flatMap((date): ContextDate[] => {
      const parent = date.projectId
        ? { type: "project" as const, projectId: date.projectId }
        : date.areaId
          ? { type: "area" as const, areaId: date.areaId }
          : null;
      if (!parent) return [];
      return [{
        id: date.id,
        title: date.title,
        kind: date.kind as ContextDate["kind"],
        parent,
        date: utcDateToDateKey(date.date) ?? "",
        startTime: date.startTime,
        endTime: date.endTime,
        details: date.details,
        createdAt: date.createdAt.toISOString(),
        updatedAt: date.updatedAt.toISOString()
      }];
    }),
    dailyNotes: dailyNotes.map((note): DailyNote => ({
      id: note.id,
      localDate: note.localDate,
      content: note.content,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString()
    })),
    serverSyncedAt: new Date().toISOString()
  };
}
