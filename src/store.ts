import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ViewType, Domain, Project, Task, Capture, Note, Deadline, Review,
  PriorityItem, CaptureType, CaptureStatus, ReviewType, TaskStatus, ProjectStatus
} from './types';
import { uid, now, getTodayStr } from './utils/helpers';

function parseCaptureType(text: string): CaptureType {
  const t = text.trim().toLowerCase();
  if (t.startsWith('/task')) return 'task';
  if (t.startsWith('/note')) return 'note';
  if (t.startsWith('/project')) return 'project';
  if (t.startsWith('/deadline')) return 'deadline';
  if (t.startsWith('/status')) return 'status';
  return null;
}

function extractContent(text: string, command: string): string {
  return text.replace(new RegExp(`^\\/${command}\\s+`, 'i'), '').trim();
}

const DEFAULT_DOMAINS: Domain[] = [
  { id: 'dom-research', name: 'Research', archived: false, createdAt: now() },
  { id: 'dom-dev', name: 'Dev / Freelance', archived: false, createdAt: now() },
  { id: 'dom-university', name: 'University', archived: false, createdAt: now() },
  { id: 'dom-career', name: 'Career / PhD', archived: false, createdAt: now() },
  { id: 'dom-longterm', name: 'Long-Term Goals', archived: false, createdAt: now() },
  { id: 'dom-ai', name: 'AI Agent Context', archived: false, createdAt: now() },
  { id: 'dom-piano', name: 'Piano / Content', archived: false, createdAt: now() },
  { id: 'dom-notes', name: 'Notes', archived: false, createdAt: now() },
];

interface AppStore {
  currentView: ViewType;
  selectedProjectId: string | null;
  sidebarOpen: boolean;
  domains: Domain[];
  projects: Project[];
  tasks: Task[];
  captures: Capture[];
  notes: Note[];
  deadlines: Deadline[];
  reviews: Review[];
  dailyPriorities: Record<string, PriorityItem[]>;
  weeklyPriorities: Record<string, PriorityItem[]>;

  navigate: (view: ViewType, projectId?: string | null) => void;
  toggleSidebar: () => void;

  addDomain: (name: string) => void;
  updateDomain: (id: string, updates: Partial<Domain>) => void;
  archiveDomain: (id: string) => void;

  addProject: (data: { name: string; domainId: string; currentObjective?: string; nextAction?: string }) => string;
  updateProject: (id: string, updates: Partial<Project>) => void;
  archiveProject: (id: string) => void;
  trashProject: (id: string) => void;
  restoreProject: (id: string) => void;

  addTask: (data: { title: string; plannedDate?: string; dueDate?: string; projectId?: string; domainId?: string; status?: TaskStatus }) => string;
  updateTask: (id: string, updates: Partial<Task>) => void;
  trashTask: (id: string) => void;
  restoreTask: (id: string) => void;

  addCapture: (text: string) => void;
  convertCaptureToTask: (captureId: string) => string;
  convertCaptureToProject: (captureId: string) => string;
  convertCaptureToNote: (captureId: string) => string;
  convertCaptureToDeadline: (captureId: string) => string;
  archiveCapture: (id: string) => void;
  deleteCapture: (id: string) => void;

  addNote: (data: { title: string; content: string; projectId?: string; domainId: string }) => string;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;

  addDeadline: (data: { title: string; date: string; projectId?: string; notes?: string }) => string;
  updateDeadline: (id: string, updates: Partial<Deadline>) => void;
  deleteDeadline: (id: string) => void;

  addReview: (type: ReviewType, responses: Record<string, string>) => void;

  setDailyPriorities: (date: string, priorities: PriorityItem[]) => void;
  toggleDailyPriority: (date: string, priorityId: string) => void;
  addDailyPriority: (date: string, text: string) => void;
  removeDailyPriority: (date: string, priorityId: string) => void;
  setWeeklyPriorities: (weekKey: string, priorities: PriorityItem[]) => void;
  toggleWeeklyPriority: (weekKey: string, priorityId: string) => void;
  addWeeklyPriority: (weekKey: string, text: string) => void;
  removeWeeklyPriority: (weekKey: string, priorityId: string) => void;
}

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      currentView: 'dashboard' as ViewType,
      selectedProjectId: null as string | null,
      sidebarOpen: false,
      domains: DEFAULT_DOMAINS,
      projects: [],
      tasks: [],
      captures: [],
      notes: [],
      deadlines: [],
      reviews: [],
      dailyPriorities: {},
      weeklyPriorities: {},

      navigate: (view, projectId = null) => set({ currentView: view, selectedProjectId: projectId }),
      toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),

      addDomain: (name) => set(s => ({
        domains: [...s.domains, { id: uid(), name, archived: false, createdAt: now() }]
      })),
      updateDomain: (id, updates) => set(s => ({
        domains: s.domains.map(d => d.id === id ? { ...d, ...updates } : d)
      })),
      archiveDomain: (id) => set(s => ({
        domains: s.domains.map(d => d.id === id ? { ...d, archived: !d.archived } : d)
      })),

      addProject: (data) => {
        const id = uid();
        set(s => ({
          projects: [{
            id, name: data.name, domainId: data.domainId,
            status: 'active' as ProjectStatus,
            currentObjective: data.currentObjective || '',
            nextAction: data.nextAction || '',
            latestStatus: '', openLoops: [],
            createdAt: now(), updatedAt: now(),
            archivedAt: null, trashedAt: null,
          }, ...s.projects]
        }));
        return id;
      },
      updateProject: (id, updates) => set(s => ({
        projects: s.projects.map(p => p.id === id ? { ...p, ...updates, updatedAt: now() } : p)
      })),
      archiveProject: (id) => set(s => ({
        projects: s.projects.map(p =>
          p.id === id
            ? p.status === 'archived'
              ? { ...p, status: 'active' as ProjectStatus, archivedAt: null, updatedAt: now() }
              : { ...p, status: 'archived' as ProjectStatus, archivedAt: now(), updatedAt: now() }
            : p)
      })),
      trashProject: (id) => set(s => ({
        projects: s.projects.map(p => p.id === id ? { ...p, trashedAt: now() } : p)
      })),
      restoreProject: (id) => set(s => ({
        projects: s.projects.map(p => p.id === id ? { ...p, trashedAt: null, archivedAt: null, status: 'active' as ProjectStatus, updatedAt: now() } : p)
      })),

      addTask: (data) => {
        const id = uid();
        set(s => ({
          tasks: [{
            id, title: data.title,
            plannedDate: data.plannedDate || null,
            dueDate: data.dueDate || null,
            projectId: data.projectId || null,
            domainId: data.domainId || null,
            status: data.status || 'todo' as TaskStatus,
            createdAt: now(), updatedAt: now(),
            archivedAt: null, trashedAt: null,
          }, ...s.tasks]
        }));
        return id;
      },
      updateTask: (id, updates) => set(s => ({
        tasks: s.tasks.map(t => t.id === id ? { ...t, ...updates, updatedAt: now() } : t)
      })),
      trashTask: (id) => set(s => ({
        tasks: s.tasks.map(t => t.id === id ? { ...t, trashedAt: now() } : t)
      })),
      restoreTask: (id) => set(s => ({
        tasks: s.tasks.map(t => t.id === id ? { ...t, trashedAt: null, archivedAt: null } : t)
      })),

      addCapture: (text) => set(s => ({
        captures: [{
          id: uid(), text,
          status: 'unprocessed' as CaptureStatus,
          type: parseCaptureType(text),
          parsedData: null, convertedToId: null,
          createdAt: now(),
        }, ...s.captures]
      })),
      convertCaptureToTask: (captureId) => {
        const capture = get().captures.find(c => c.id === captureId);
        if (!capture) return '';
        const title = capture.type === 'task' ? extractContent(capture.text, 'task') : capture.text;
        const taskId = uid();
        set(s => ({
          tasks: [{ id: taskId, title, plannedDate: null, dueDate: null, projectId: null, domainId: null, status: 'todo' as TaskStatus, createdAt: now(), updatedAt: now(), archivedAt: null, trashedAt: null }, ...s.tasks],
          captures: s.captures.map(c => c.id === captureId ? { ...c, status: 'converted' as CaptureStatus, convertedToId: taskId } : c),
        }));
        return taskId;
      },
      convertCaptureToProject: (captureId) => {
        const capture = get().captures.find(c => c.id === captureId);
        if (!capture) return '';
        const name = capture.type === 'project' ? extractContent(capture.text, 'project') : capture.text;
        const projectId = uid();
        set(s => ({
          projects: [{ id: projectId, name, domainId: 'dom-notes', status: 'active' as ProjectStatus, currentObjective: '', nextAction: '', latestStatus: '', openLoops: [], createdAt: now(), updatedAt: now(), archivedAt: null, trashedAt: null }, ...s.projects],
          captures: s.captures.map(c => c.id === captureId ? { ...c, status: 'converted' as CaptureStatus, convertedToId: projectId } : c),
        }));
        return projectId;
      },
      convertCaptureToNote: (captureId) => {
        const capture = get().captures.find(c => c.id === captureId);
        if (!capture) return '';
        const title = capture.type === 'note' ? extractContent(capture.text, 'note') : capture.text;
        const noteId = uid();
        set(s => ({
          notes: [{ id: noteId, title, content: '', projectId: null, domainId: 'dom-notes', createdAt: now(), updatedAt: now(), archivedAt: null, trashedAt: null }, ...s.notes],
          captures: s.captures.map(c => c.id === captureId ? { ...c, status: 'converted' as CaptureStatus, convertedToId: noteId } : c),
        }));
        return noteId;
      },
      convertCaptureToDeadline: (captureId) => {
        const capture = get().captures.find(c => c.id === captureId);
        if (!capture) return '';
        const title = capture.type === 'deadline' ? extractContent(capture.text, 'deadline') : capture.text;
        const deadlineId = uid();
        set(s => ({
          deadlines: [{ id: deadlineId, title, date: getTodayStr(), projectId: null, taskIds: [], notes: '', createdAt: now(), archivedAt: null, trashedAt: null }, ...s.deadlines],
          captures: s.captures.map(c => c.id === captureId ? { ...c, status: 'converted' as CaptureStatus, convertedToId: deadlineId } : c),
        }));
        return deadlineId;
      },
      archiveCapture: (id) => set(s => ({
        captures: s.captures.map(c => c.id === id ? { ...c, status: 'archived' as CaptureStatus } : c)
      })),
      deleteCapture: (id) => set(s => ({
        captures: s.captures.map(c => c.id === id ? { ...c, status: 'deleted' as CaptureStatus } : c)
      })),

      addNote: (data) => {
        const id = uid();
        set(s => ({
          notes: [{ id, title: data.title, content: data.content, projectId: data.projectId || null, domainId: data.domainId, createdAt: now(), updatedAt: now(), archivedAt: null, trashedAt: null }, ...s.notes]
        }));
        return id;
      },
      updateNote: (id, updates) => set(s => ({
        notes: s.notes.map(n => n.id === id ? { ...n, ...updates, updatedAt: now() } : n)
      })),
      deleteNote: (id) => set(s => ({
        notes: s.notes.filter(n => n.id !== id)
      })),

      addDeadline: (data) => {
        const id = uid();
        set(s => ({
          deadlines: [{ id, title: data.title, date: data.date, projectId: data.projectId || null, taskIds: [], notes: data.notes || '', createdAt: now(), archivedAt: null, trashedAt: null }, ...s.deadlines]
        }));
        return id;
      },
      updateDeadline: (id, updates) => set(s => ({
        deadlines: s.deadlines.map(d => d.id === id ? { ...d, ...updates } : d)
      })),
      deleteDeadline: (id) => set(s => ({
        deadlines: s.deadlines.filter(d => d.id !== id)
      })),

      addReview: (type, responses) => set(s => ({
        reviews: [{ id: uid(), type, date: now(), responses, createdAt: now() }, ...s.reviews]
      })),

      setDailyPriorities: (date, priorities) => set(s => ({
        dailyPriorities: { ...s.dailyPriorities, [date]: priorities }
      })),
      toggleDailyPriority: (date, priorityId) => set(s => {
        const priorities = s.dailyPriorities[date] || [];
        return { dailyPriorities: { ...s.dailyPriorities, [date]: priorities.map(p => p.id === priorityId ? { ...p, done: !p.done } : p) } };
      }),
      addDailyPriority: (date, text) => set(s => {
        const priorities = s.dailyPriorities[date] || [];
        return { dailyPriorities: { ...s.dailyPriorities, [date]: [...priorities, { id: uid(), text, done: false }] } };
      }),
      removeDailyPriority: (date, priorityId) => set(s => {
        const priorities = s.dailyPriorities[date] || [];
        return { dailyPriorities: { ...s.dailyPriorities, [date]: priorities.filter(p => p.id !== priorityId) } };
      }),
      setWeeklyPriorities: (weekKey, priorities) => set(s => ({
        weeklyPriorities: { ...s.weeklyPriorities, [weekKey]: priorities }
      })),
      toggleWeeklyPriority: (weekKey, priorityId) => set(s => {
        const priorities = s.weeklyPriorities[weekKey] || [];
        return { weeklyPriorities: { ...s.weeklyPriorities, [weekKey]: priorities.map(p => p.id === priorityId ? { ...p, done: !p.done } : p) } };
      }),
      addWeeklyPriority: (weekKey, text) => set(s => {
        const priorities = s.weeklyPriorities[weekKey] || [];
        return { weeklyPriorities: { ...s.weeklyPriorities, [weekKey]: [...priorities, { id: uid(), text, done: false }] } };
      }),
      removeWeeklyPriority: (weekKey, priorityId) => set(s => {
        const priorities = s.weeklyPriorities[weekKey] || [];
        return { weeklyPriorities: { ...s.weeklyPriorities, [weekKey]: priorities.filter(p => p.id !== priorityId) } };
      }),
    }),
    { name: 'contextos-store' }
  )
);
