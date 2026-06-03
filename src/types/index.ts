export type ViewType =
  | 'dashboard'
  | 'inbox'
  | 'today'
  | 'this-week'
  | 'projects'
  | 'project-detail'
  | 'deadlines'
  | 'archive'
  | 'search'
  | 'settings'
  | 'reviews';

export type ProjectStatus = 'active' | 'paused' | 'done' | 'archived';
export type TaskStatus = 'todo' | 'in-progress' | 'blocked' | 'waiting' | 'done' | 'dropped';
export type CaptureStatus = 'unprocessed' | 'converted' | 'attached' | 'archived' | 'deleted';
export type CaptureType = 'task' | 'note' | 'project' | 'deadline' | 'status' | null;
export type ReviewType = 'daily-startup' | 'daily-shutdown' | 'weekly';

export interface Domain {
  id: string;
  name: string;
  archived: boolean;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  domainId: string;
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
  archivedAt: string | null;
  trashedAt: string | null;
}

export interface Review {
  id: string;
  type: ReviewType;
  date: string;
  responses: Record<string, string>;
  createdAt: string;
}

export interface PriorityItem {
  id: string;
  text: string;
  taskId?: string;
  done: boolean;
}
