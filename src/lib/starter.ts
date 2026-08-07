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
  ["product", "Product Development"],
  ["research", "Research"],
  ["operations", "Operations"],
  ["learning", "Learning"],
  ["planning", "Planning"],
  ["personal", "Personal"],
  ["archive", "Reference"],
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

  const launchProjectId = idFor(userId, "proj-launch");
  const dashboardProjectId = idFor(userId, "proj-dashboard");
  const offlineProjectId = idFor(userId, "proj-offline");
  const researchProjectId = idFor(userId, "proj-research");
  const planningProjectId = idFor(userId, "proj-planning");

  await tx.project.createMany({
    data: [
      {
        id: launchProjectId,
        userId,
        name: "Product Launch Demo",
        domainId: domains.product,
        parentProjectId: null,
        status: "active",
        currentObjective: "Prepare a small product release while keeping decisions, tasks, and open loops recoverable.",
        nextAction: "Triage the latest captures and confirm this week's release checklist.",
        latestStatus: "Core workflow is ready for a final verification pass.",
        recoveryNotes: "## Working notes\n- Keep capture fast.\n- Keep project recovery concise.\n\n## Release handoff\n- Verify the critical path\n- Keep offline edits durable\n- Record decisions where they can be recovered later",
        openLoops: ["Verify offline sync after reconnect", "Confirm the release checklist"]
      },
      {
        id: dashboardProjectId,
        userId,
        name: "Dashboard Workflow",
        domainId: domains.product,
        parentProjectId: launchProjectId,
        status: "active",
        currentObjective: "Make the dashboard a fast command page for daily execution.",
        nextAction: "Run one complete capture-to-completion workflow.",
        latestStatus: "The dashboard editor and live task/date blocks are ready for review.",
        recoveryNotes: "",
        openLoops: ["Confirm the dashboard remains useful at mobile width"]
      },
      {
        id: offlineProjectId,
        userId,
        name: "Offline Sync Reliability",
        domainId: domains.operations,
        parentProjectId: launchProjectId,
        status: "active",
        currentObjective: "Keep offline edits durable, visible, and recoverable.",
        nextAction: "Make one offline edit and confirm the pending mutation clears after reconnect.",
        latestStatus: "Queued mutations and stale-write warnings are visible to the user.",
        recoveryNotes: "",
        openLoops: ["Run a production-build offline smoke test"]
      },
      {
        id: researchProjectId,
        userId,
        name: "User Research Sprint",
        domainId: domains.research,
        parentProjectId: null,
        status: "active",
        currentObjective: "Collect and summarize feedback from a small usability study.",
        nextAction: "Review the latest session notes and extract recurring friction points.",
        latestStatus: "Initial sessions are complete; synthesis is the next step.",
        recoveryNotes: "## Research note\nCompare repeated navigation issues before changing the information architecture.",
        openLoops: ["Group feedback by workflow stage", "Decide which issue is release-blocking"]
      },
      {
        id: planningProjectId,
        userId,
        name: "Quarterly Planning",
        domainId: domains.planning,
        parentProjectId: null,
        status: "paused",
        currentObjective: "Keep upcoming milestones visible without crowding daily execution.",
        nextAction: "Review one milestone and update its next action.",
        latestStatus: "Planning notes are captured; no immediate action is required.",
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
        projectId: launchProjectId,
        domainId: domains.product,
        status: "todo"
      },
      {
        id: idFor(userId, "task-status"),
        userId,
        title: "Write one concise project status update",
        plannedDate: dateOnly(0),
        dueDate: dateOnly(1),
        scheduledTime: "10:30",
        projectId: dashboardProjectId,
        domainId: domains.product,
        status: "in-progress"
      },
      {
        id: idFor(userId, "task-offline"),
        userId,
        title: "Verify an offline edit after reconnect",
        plannedDate: dateOnly(1),
        dueDate: dateOnly(3),
        scheduledTime: null,
        projectId: offlineProjectId,
        domainId: domains.operations,
        status: "blocked"
      },
      {
        id: idFor(userId, "task-milestones"),
        userId,
        title: "Review upcoming milestones and flag risks",
        plannedDate: null,
        dueDate: dateOnly(0),
        scheduledTime: "15:00",
        projectId: planningProjectId,
        domainId: domains.planning,
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
        title: "Release verification pass",
        date: dateOnly(4),
        time: null,
        location: "",
        projectId: offlineProjectId,
        taskIds: [],
        notes: "Run the full capture -> triage -> execution -> recovery loop."
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
        text: "/task Clean up the release checklist",
        status: "unprocessed",
        type: "task",
        convertedToId: null
      },
      {
        id: idFor(userId, "capture-status"),
        userId,
        text: "/status Product Launch Demo: auth and offline sync need a verification pass",
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
        content: "## Notepad\n- Capture loose thoughts here.\n- Keep executable work in the live task and date blocks.\n\n## Dates\n- Add one meaningful milestone\n\n## Goals\n- [ ] Complete the demo workflow without losing context",
        projectId: null,
        domainId: domains.notes
      },
      {
        id: idFor(userId, "note-release-checklist"),
        userId,
        title: "Release Checklist",
        content: [
          "| Item | Today? | Status |",
          "| --- | --- | --- |",
          "| Verify critical workflow | Yes | In progress |",
          "| Review mobile layout | Yes | Ready |",
          "| Update release notes | No | Planned |",
          "",
          "## Status options",
          "- Planned",
          "- Ready",
          "- In progress",
          "- Done"
        ].join("\n"),
        projectId: null,
        domainId: domains.notes
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
          focus: "Verify the core workflow, process stale captures, and update one project status."
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
        sectionOrder: ["tasks", "dates", "projects", "notepad"],
        collapsedSections: [],
        reviewPromptDismissals: [],
        dateWindowDays: 14,
        showCompleted: false,
        taskSortMode: "recent"
      }
    ],
    skipDuplicates: true
  });
}