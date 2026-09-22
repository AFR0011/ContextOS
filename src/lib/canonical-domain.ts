export type AreaState = "active" | "archived";
export type ProjectState = "active" | "archived";
export type TaskState = "open" | "done";
export type ContextDateKind = "event" | "deadline";

export interface Area {
  id: string;
  name: string;
  state: AreaState;
  createdAt: string;
  updatedAt: string;
  revision: number;
}

export interface Project {
  id: string;
  name: string;
  areaId: string;
  objective: string;
  state: ProjectState;
  createdAt: string;
  updatedAt: string;
  revision: number;
}

export type TaskParent =
  | { type: "project"; projectId: string }
  | { type: "area"; areaId: string };

export interface Task {
  id: string;
  title: string;
  parent: TaskParent;
  plannedDate: string | null;
  scheduledTime: string | null;
  state: TaskState;
  createdAt: string;
  updatedAt: string;
  revision: number;
}

export type ContextDateParent =
  | { type: "project"; projectId: string }
  | { type: "area"; areaId: string };

export interface ContextDate {
  id: string;
  title: string;
  kind: ContextDateKind;
  parent: ContextDateParent;
  date: string;
  startTime: string | null;
  endTime: string | null;
  details: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
}

export interface DailyNote {
  id: string;
  localDate: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
}

export interface InsightAction {
  id: string;
  label: string;
  intent: string;
}

export interface Insight {
  id: string;
  title: string;
  message: string;
  sourceRef: string | null;
  evidenceRefs: string[];
  actions: InsightAction[];
}

export interface CanonicalWorkspace {
  areas: Area[];
  projects: Project[];
  tasks: Task[];
  dates: ContextDate[];
  dailyNotes: DailyNote[];
  insights?: Insight[];
}
