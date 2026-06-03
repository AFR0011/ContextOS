import type { Domain, Project, Task, TaskStatus, ProjectStatus } from '../types';

export const uid = (): string =>
  Math.random().toString(36).slice(2, 11) + Date.now().toString(36);

export const now = (): string => new Date().toISOString();

export const getDomainName = (domainId: string, domains: Domain[]): string => {
  return domains.find(d => d.id === domainId)?.name || 'Unknown';
};

export const getProjectName = (projectId: string | null, projects: Project[]): string => {
  if (!projectId) return '';
  return projects.find(p => p.id === projectId)?.name || '';
};

export const DOMAIN_COLORS: Record<string, string> = {
  'dom-research': 'bg-blue-100 text-blue-800',
  'dom-dev': 'bg-emerald-100 text-emerald-800',
  'dom-university': 'bg-purple-100 text-purple-800',
  'dom-career': 'bg-amber-100 text-amber-800',
  'dom-longterm': 'bg-rose-100 text-rose-800',
  'dom-ai': 'bg-cyan-100 text-cyan-800',
  'dom-piano': 'bg-orange-100 text-orange-800',
  'dom-notes': 'bg-gray-100 text-gray-800',
};

export const getDomainColor = (domainId: string, domains: Domain[]): string => {
  if (DOMAIN_COLORS[domainId]) return DOMAIN_COLORS[domainId];
  const colors = Object.values(DOMAIN_COLORS);
  const index = domains.findIndex(d => d.id === domainId);
  return colors[(index >= 0 ? index : 0) % colors.length];
};

export const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; color: string }> = {
  'todo': { label: 'Todo', color: 'bg-gray-100 text-gray-700' },
  'in-progress': { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  'blocked': { label: 'Blocked', color: 'bg-red-100 text-red-700' },
  'waiting': { label: 'Waiting', color: 'bg-purple-100 text-purple-700' },
  'done': { label: 'Done', color: 'bg-emerald-100 text-emerald-700' },
  'dropped': { label: 'Dropped', color: 'bg-gray-100 text-gray-500 line-through' },
};

export const PROJECT_STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string }> = {
  'active': { label: 'Active', color: 'bg-emerald-100 text-emerald-700' },
  'paused': { label: 'Paused', color: 'bg-amber-100 text-amber-700' },
  'done': { label: 'Done', color: 'bg-blue-100 text-blue-700' },
  'archived': { label: 'Archived', color: 'bg-gray-100 text-gray-500' },
};

export const CAPTURE_TYPE_LABELS: Record<string, string> = {
  'task': 'Task',
  'note': 'Note',
  'project': 'Project',
  'deadline': 'Deadline',
  'status': 'Status',
};

export function isOverdue(task: Task): boolean {
  if (!task.dueDate) return false;
  if (task.status === 'done' || task.status === 'dropped') return false;
  const dueDate = new Date(task.dueDate + 'T23:59:59');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate < today;
}

export function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function getWeekKey(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

export function isThisWeekDate(dateStr: string): boolean {
  const date = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(diff);
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  return date >= startOfWeek && date <= endOfWeek;
}

export function isTodayDate(dateStr: string): boolean {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

export function getOverdueDays(dateStr: string): number {
  const dueDate = new Date(dateStr + 'T23:59:59');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
}

export function exportToMarkdown(title: string, content: string): void {
  const md = content;
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}
