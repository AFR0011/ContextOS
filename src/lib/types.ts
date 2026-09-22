import type { Area, ContextDate, DailyNote, Project, Task } from "./canonical-domain";

export type { Area, ContextDate, DailyNote, Project, Task } from "./canonical-domain";

export interface WorkspaceData {
  areas: Area[];
  projects: Project[];
  tasks: Task[];
  dates: ContextDate[];
  dailyNotes: DailyNote[];
  serverSyncedAt: string;
}

export type CollectionName = "areas" | "projects" | "tasks" | "dates" | "dailyNotes";
export type SyncEntityType = CollectionName;

export interface SyncWarning {
  mutationId: string;
  entityType: SyncEntityType;
  entityId: string;
  reason: "stale";
  message: string;
  serverUpdatedAt: string | null;
  incomingUpdatedAt: string | null;
}

export interface QueuedMutation {
  mutationId: string;
  entityType: SyncEntityType;
  entityId: string;
  operation: "upsert";
  payload: Area | Project | Task | ContextDate | DailyNote;
  createdAt: string;
}
