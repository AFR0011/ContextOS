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
  await tx.dashboardPreference.deleteMany({ where: { userId } });
  await tx.dashboardScratchpad.deleteMany({ where: { userId } });
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
  const contextDashboardProjectId = idFor(userId, "proj-contextos-dashboard");
  const contextOfflineProjectId = idFor(userId, "proj-contextos-offline");
  const thesisProjectId = idFor(userId, "proj-thesis");
  const careerProjectId = idFor(userId, "proj-career");

  await tx.project.createMany({
    data: [
      {
        id: contextProjectId,
        userId,
        name: "ContextOS Demo",
        domainId: domains.dev,
        parentProjectId: null,
        status: "active",
        currentObjective: "Turn the blueprint into a daily-use system for capture, execution, and recovery.",
        nextAction: "Run one real workday through Dashboard, Inbox, Today, and project recovery.",
        latestStatus: "Next/Postgres direction chosen. Offline core views and local auth are part of v0.1.",
        recoveryNotes: "## Working notes\n- Keep dashboard capture fast.\n- Keep project recovery structured but editable.\n\n## Demo handoff\n- Auth should feel real locally\n- Offline capture should not lose anything\n- Project pages should answer what to do next",
        openLoops: ["Verify offline sync after reconnect", "Replace demo notes with real project context"]
      },
      {
        id: contextDashboardProjectId,
        userId,
        name: "Dashboard 2.0 Foundation",
        domainId: domains.dev,
        parentProjectId: contextProjectId,
        status: "active",
        currentObjective: "Make the dashboard feel like a daily command page with a markdown canvas plus fixed widgets.",
        nextAction: "Use the dashboard canvas during the next real work session.",
        latestStatus: "Dashboard canvas is being validated as the Notion-style layer for v0.1.x.",
        recoveryNotes: "",
        openLoops: ["Confirm canvas is useful without replacing Today widgets"]
      },
      {
        id: contextOfflineProjectId,
        userId,
        name: "Offline Sync Trust",
        domainId: domains.dev,
        parentProjectId: contextProjectId,
        status: "active",
        currentObjective: "Keep offline edits durable, visible, and recoverable.",
        nextAction: "Run an offline edit and confirm pending sync clears.",
        latestStatus: "Draft-save warnings and stale mutation warnings are visible in v0.1.4.",
        recoveryNotes: "",
        openLoops: ["Production offline hydration still needs a production-build smoke"]
      },
      {
        id: thesisProjectId,
        userId,
        name: "MSc Thesis",
        domainId: domains.research,
        parentProjectId: null,
        status: "active",
        currentObjective: "Keep experiments and handoffs recoverable after breaks.",
        nextAction: "Write the next verifiable experiment packet.",
        latestStatus: "Protocol B support audit is complete. RF baseline still needs rerun with corrected threshold logic.",
        recoveryNotes: "## Experiment recovery note\nLast useful context: compare calibration tables after the RF rerun finishes.",
        openLoops: ["Confirm corrected threshold logic", "Decide whether calibration table belongs in appendix"]
      },
      {
        id: careerProjectId,
        userId,
        name: "Career / PhD Applications",
        domainId: domains.career,
        parentProjectId: null,
        status: "paused",
        currentObjective: "Keep application materials ready without letting them invade daily execution.",
        nextAction: "Review one application date and update the checklist.",
        latestStatus: "Draft materials exist; next useful move is to identify date risk.",
        recoveryNotes: "",
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
        scheduledTime: "09:30",
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
        scheduledTime: "10:30",
        projectId: contextDashboardProjectId,
        domainId: domains.dev,
        status: "in-progress"
      },
      {
        id: idFor(userId, "task-rf"),
        userId,
        title: "Rerun RF baseline with corrected threshold logic",
        plannedDate: dateOnly(1),
        dueDate: dateOnly(3),
        scheduledTime: null,
        projectId: thesisProjectId,
        domainId: domains.research,
        status: "blocked"
      },
      {
        id: idFor(userId, "task-deadlines"),
        userId,
        title: "Review important dates and identify risk points",
        plannedDate: null,
        dueDate: dateOnly(0),
        scheduledTime: "15:00",
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
        time: null,
        location: "",
        projectId: contextOfflineProjectId,
        taskIds: [],
        notes: "Run the full capture -> triage -> today -> recovery loop."
      },
      {
        id: idFor(userId, "deadline-weekly"),
        userId,
        title: "Weekly review",
        date: dateOnly(5),
        time: null,
        location: "",
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
        id: idFor(userId, "note-dashboard-canvas"),
        userId,
        title: "Dashboard Canvas",
        content: "## Notepad\n- Try using this as the Dashboard 2.0 scratch layer.\n- Keep widgets for execution; keep loose thoughts here.\n\n## Dates\n- Add one real exam, flight, event, or final milestone\n\n## Goals\n- [ ] Decide whether this canvas reduces Notion dashboard use",
        projectId: null,
        domainId: domains.notes
      },
      {
        id: idFor(userId, "note-piano-schedule"),
        userId,
        title: "Piano Schedule",
        content: [
          "| Index | Song | Today? | Status |",
          "| --- | --- | --- | --- |",
          "| 1 | Current warmup piece | Yes | Refine |",
          "| 2 | Harder variation study | Yes | Learn Harder Variation |",
          "| 3 | Repertoire maintenance | No | Perfect |",
          "",
          "## Status options",
          "- New",
          "- Learn Harder Variation",
          "- Refine",
          "- Perfect"
        ].join("\n"),
        projectId: null,
        domainId: domains.piano
      }
    ],
    skipDuplicates: true
  });

  await tx.review.createMany({
    data: [
      {
        id: idFor(userId, "review-startup"),
        userId,
        type: "daily-startup",
        date: new Date(),
        responses: {
          focus: "Verify the ContextOS core loop, process stale captures, and update one project status."
        }
      }
    ],
    skipDuplicates: true
  });

  await tx.dashboardScratchpad.createMany({
    data: [
      {
        id: idFor(userId, "dashboard-scratchpad"),
        userId,
        content: ""
      }
    ],
    skipDuplicates: true
  });

  await tx.dashboardPreference.createMany({
    data: [
      {
        id: idFor(userId, "dashboard-preferences"),
        userId,
        sectionOrder: ["notepad", "dates", "tasks", "allTasks", "projects"],
        collapsedSections: [],
        reviewPromptDismissals: [],
        dateWindowDays: 14,
        showCompleted: false
      }
    ],
    skipDuplicates: true
  });

}
