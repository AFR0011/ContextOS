export type ViewType =
  | "dashboard"
  | "inbox"
  | "today"
  | "this-week"
  | "projects"
  | "project-detail"
  | "areas"
  | "resources"
  | "deadlines"
  | "archive"
  | "search"
  | "settings"
  | "reviews";

export type ProjectStatus = "active" | "paused" | "done" | "archived";
export type TaskStatus = "todo" | "in-progress" | "blocked" | "waiting" | "done" | "dropped";
export type CaptureStatus = "unprocessed" | "converted" | "attached" | "archived" | "deleted";
export type CaptureType = "task" | "note" | "project" | "deadline" | "status" | null;
export type ReviewType = "daily-startup" | "daily-shutdown" | "weekly";
export type PriorityScope = "daily" | "weekly";
export type DashboardSectionId = "notepad" | "dates" | "tasks" | "projects";

export interface Domain {
  id: string;
  name: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  domainId: string;
  parentProjectId: string | null;
  status: ProjectStatus;
  currentObjective: string;
  nextAction: string;
  latestStatus: string;
  openLoops: string[];
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  trashedAt: string | null;
}

export interface Task {
  id: string;
  title: string;
  plannedDate: string | null;
  dueDate: string | null;
  projectId: string | null;
  domainId: string | null;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  trashedAt: string | null;
}

export interface Capture {
  id: string;
  text: string;
  status: CaptureStatus;
  type: CaptureType;
  parsedData: Record<string, string> | null;
  convertedToId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  projectId: string | null;
  domainId: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  trashedAt: string | null;
}

export interface Deadline {
  id: string;
  title: string;
  date: string;
  projectId: string | null;
  taskIds: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  trashedAt: string | null;
}

export interface Review {
  id: string;
  type: ReviewType;
  date: string;
  responses: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardScratchpad {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardPreference {
  id: string;
  sectionOrder: DashboardSectionId[];
  collapsedSections: DashboardSectionId[];
  dateWindowDays: number;
  showCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Priority {
  id: string;
  scope: PriorityScope;
  dateKey: string;
  text: string;
  taskId: string | null;
  done: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceData {
  domains: Domain[];
  projects: Project[];
  tasks: Task[];
  captures: Capture[];
  notes: Note[];
  deadlines: Deadline[];
  reviews: Review[];
  priorities: Priority[];
  dashboardScratchpads: DashboardScratchpad[];
  dashboardPreferences: DashboardPreference[];
  serverSyncedAt: string;
}

export type CollectionName = keyof Omit<WorkspaceData, "serverSyncedAt">;

export interface SyncWarning {
  mutationId: string;
  entityType: CollectionName;
  entityId: string;
  reason: "stale";
  message: string;
  serverUpdatedAt: string | null;
  incomingUpdatedAt: string | null;
}

export interface QueuedMutation {
  mutationId: string;
  entityType: CollectionName;
  entityId: string;
  operation: "upsert" | "delete";
  payload: Domain | Project | Task | Capture | Note | Deadline | Review | Priority | DashboardScratchpad | DashboardPreference | null;
  createdAt: string;
}
