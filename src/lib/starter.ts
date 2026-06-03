import type { Prisma, PrismaClient } from "@prisma/client";
import { addDaysToDateKey, dateKeyToUtcDate, localDateKey, localWeekStartKey } from "./dates";

type Tx = PrismaClient | Prisma.TransactionClient;

function dateOnly(offsetDays = 0) {
  const dateKey = addDaysToDateKey(localDateKey(), offsetDays);
  return (dateKey && dateKeyToUtcDate(dateKey)) || new Date();
}

function idFor(userId: string, key: string) {
  return `${key}-${userId.slice(-8)}`;
}

export const defaultDomainTemplates = [
  ["research", "Research"],
  ["dev", "Dev / Freelance"],
  ["university", "University"],
  ["career", "Career / PhD"],
  ["longterm", "Long-Term Goals"],
  ["ai", "AI Agent Context"],
  ["piano", "Piano / Content"],
  ["notes", "Notes"]
] as const;

export async function clearWorkspace(tx: Tx, userId: string) {
  await tx.syncMutation.deleteMany({ where: { userId } });
  await tx.priority.deleteMany({ where: { userId } });
  await tx.review.deleteMany({ where: { userId } });
  await tx.deadline.deleteMany({ where: { userId } });
  await tx.note.deleteMany({ where: { userId } });
  await tx.capture.deleteMany({ where: { userId } });
  await tx.task.deleteMany({ where: { userId } });
  await tx.project.deleteMany({ where: { userId } });
  await tx.domain.deleteMany({ where: { userId } });
}

export async function createStarterWorkspace(tx: Tx, userId: string, reset = false) {
  if (reset) {
    await clearWorkspace(tx, userId);
  }

  const existingDomains = await tx.domain.count({ where: { userId } });
  if (existingDomains > 0 && !reset) return;

  const domains = Object.fromEntries(
    defaultDomainTemplates.map(([key]) => [key, idFor(userId, `dom-${key}`)])
  );

  await tx.domain.createMany({
    data: defaultDomainTemplates.map(([key, name]) => ({
      id: domains[key],
      userId,
      name,
      archived: false
    })),
    skipDuplicates: true
  });

  const contextProjectId = idFor(userId, "proj-contextos");
  const thesisProjectId = idFor(userId, "proj-thesis");
  const careerProjectId = idFor(userId, "proj-career");

  await tx.project.createMany({
    data: [
      {
        id: contextProjectId,
        userId,
        name: "ContextOS Demo",
        domainId: domains.dev,
        status: "active",
        currentObjective: "Turn the blueprint into a daily-use system for capture, execution, and recovery.",
        nextAction: "Run one real workday through Dashboard, Inbox, Today, and project recovery.",
        latestStatus: "Next/Postgres direction chosen. Offline core views and local auth are part of v0.1.",
        openLoops: ["Verify offline sync after reconnect", "Replace demo notes with real project context"]
      },
      {
        id: thesisProjectId,
        userId,
        name: "MSc Thesis",
        domainId: domains.research,
        status: "active",
        currentObjective: "Keep experiments and handoffs recoverable after breaks.",
        nextAction: "Write the next verifiable experiment packet.",
        latestStatus: "Protocol B support audit is complete. RF baseline still needs rerun with corrected threshold logic.",
        openLoops: ["Confirm corrected threshold logic", "Decide whether calibration table belongs in appendix"]
      },
      {
        id: careerProjectId,
        userId,
        name: "Career / PhD Applications",
        domainId: domains.career,
        status: "paused",
        currentObjective: "Keep application materials ready without letting them invade daily execution.",
        nextAction: "Review one application deadline and update the checklist.",
        latestStatus: "Draft materials exist; next useful move is to identify deadline risk.",
        openLoops: []
      }
    ],
    skipDuplicates: true
  });

  await tx.task.createMany({
    data: [
      {
        id: idFor(userId, "task-inbox"),
        userId,
        title: "Process inbox captures",
        plannedDate: dateOnly(0),
        dueDate: null,
        projectId: contextProjectId,
        domainId: domains.dev,
        status: "todo"
      },
      {
        id: idFor(userId, "task-status"),
        userId,
        title: "Write one clean latest-status note",
        plannedDate: dateOnly(0),
        dueDate: dateOnly(1),
        projectId: contextProjectId,
        domainId: domains.dev,
        status: "in-progress"
      },
      {
        id: idFor(userId, "task-rf"),
        userId,
        title: "Rerun RF baseline with corrected threshold logic",
        plannedDate: dateOnly(1),
        dueDate: dateOnly(3),
        projectId: thesisProjectId,
        domainId: domains.research,
        status: "blocked"
      },
      {
        id: idFor(userId, "task-deadlines"),
        userId,
        title: "Review deadlines and identify risk points",
        plannedDate: null,
        dueDate: dateOnly(0),
        projectId: careerProjectId,
        domainId: domains.career,
        status: "todo"
      }
    ],
    skipDuplicates: true
  });

  await tx.deadline.createMany({
    data: [
      {
        id: idFor(userId, "deadline-demo"),
        userId,
        title: "ContextOS v0.1 verification pass",
        date: dateOnly(4),
        projectId: contextProjectId,
        taskIds: [],
        notes: "Run the full capture -> triage -> today -> recovery loop."
      },
      {
        id: idFor(userId, "deadline-weekly"),
        userId,
        title: "Weekly review",
        date: dateOnly(5),
        projectId: null,
        taskIds: [],
        notes: ""
      }
    ],
    skipDuplicates: true
  });

  await tx.capture.createMany({
    data: [
      {
        id: idFor(userId, "capture-task"),
        userId,
        text: "/task Clean up deployment checklist",
        status: "unprocessed",
        type: "task",
        convertedToId: null
      },
      {
        id: idFor(userId, "capture-status"),
        userId,
        text: "/status ContextOS Demo: auth and offline sync need a verification pass",
        status: "unprocessed",
        type: "status",
        convertedToId: null
      }
    ],
    skipDuplicates: true
  });

  await tx.note.createMany({
    data: [
      {
        id: idFor(userId, "note-contextos"),
        userId,
        title: "Demo handoff",
        content: "- Auth should feel real locally\n- Offline capture should not lose anything\n- Project pages should answer what to do next",
        projectId: contextProjectId,
        domainId: domains.dev
      },
      {
        id: idFor(userId, "note-thesis"),
        userId,
        title: "Experiment recovery note",
        content: "Last useful context: compare calibration tables after the RF rerun finishes.",
        projectId: thesisProjectId,
        domainId: domains.research
      }
    ],
    skipDuplicates: true
  });

  await tx.review.upsert({
    where: { id: idFor(userId, "review-startup") },
    update: {
      type: "daily-startup",
      date: new Date(),
      responses: {
        priorities: "1. Verify the ContextOS core loop\n2. Process stale captures\n3. Update one project status"
      }
    },
    create: {
      id: idFor(userId, "review-startup"),
      userId,
      type: "daily-startup",
      date: new Date(),
      responses: {
        priorities: "1. Verify the ContextOS core loop\n2. Process stale captures\n3. Update one project status"
      }
    }
  });

  await tx.priority.createMany({
    data: [
      {
        id: idFor(userId, "priority-today-1"),
        userId,
        scope: "daily",
        dateKey: localDateKey(),
        text: "Use ContextOS for today's real captures",
        done: false
      },
      {
        id: idFor(userId, "priority-week-1"),
        userId,
        scope: "weekly",
        dateKey: localWeekStartKey(),
        text: "Validate whether the demo replaces phone notes for one week",
        done: false
      }
    ],
    skipDuplicates: true
  });
}
