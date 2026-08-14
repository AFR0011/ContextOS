"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type {
  Capture,
  CaptureType,
  CollectionName,
  DashboardPreference,
  DashboardScratchpad,
  Deadline,
  Domain,
  Note,
  Project,
  ProjectStatus,
  QueuedMutation,
  Review,
  ReviewType,
  SyncWarning,
  Task,
  TaskStatus,
  WorkspaceData
} from "./types";
import { localDateKey } from "./dates";
import { readJsonResponse, responseErrorMessage } from "./http-client";
import type { LifeOsHandoffV1 } from "./lifeos-handoff";
import {
  commitLocalMutationBatch,
  readLocalOutbox,
  readLocalWorkspace,
  rememberLocalUser,
  writeLocalOutbox,
  writeLocalWorkspace,
  type LocalVerifiedUser
} from "./local-db";

export const emptyWorkspace = (): WorkspaceData => ({
  domains: [],
  projects: [],
  tasks: [],
  captures: [],
  notes: [],
  deadlines: [],
  reviews: [],
  dashboardScratchpads: [],
  dashboardPreferences: [],
  serverSyncedAt: ""
});

function now() {
  return new Date().toISOString();
}

function normalizeWorkspace(value: Partial<WorkspaceData> | null | undefined): WorkspaceData {
  const projects = (value?.projects ?? []).map((project) => ({
    ...project,
    recoveryNotes: project.recoveryNotes ?? ""
  }));
  const deadlines = (value?.deadlines ?? []).map((deadline) => ({
    ...deadline,
    time: deadline.time ?? null,
    location: deadline.location ?? ""
  }));
  const tasks = (value?.tasks ?? []).map((task) => {
    const legacy = task as Task & { startTime?: string | null; endTime?: string | null };
    return {
      ...task,
      scheduledTime: task.scheduledTime ?? legacy.startTime ?? legacy.endTime ?? null
    };
  });
  const dashboardPreferences = (value?.dashboardPreferences ?? []).map((preference) => ({
    ...preference,
    reviewPromptDismissals: preference.reviewPromptDismissals ?? [],
    taskSortMode: preference.taskSortMode ?? "recent"
  }));

  return {
    domains: value?.domains ?? [],
    projects,
    tasks,
    captures: value?.captures ?? [],
    notes: value?.notes ?? [],
    deadlines,
    reviews: value?.reviews ?? [],
    dashboardScratchpads: value?.dashboardScratchpads ?? [],
    dashboardPreferences,
    serverSyncedAt: value?.serverSyncedAt ?? ""
  };
}

function newId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

function parseCaptureType(text: string): CaptureType {
  const t = text.trim().toLowerCase();
  if (t.startsWith("/task")) return "task";
  if (t.startsWith("/note")) return "note";
  if (t.startsWith("/project")) return "project";
  if (t.startsWith("/date") || t.startsWith("/deadline")) return "deadline";
  if (t.startsWith("/status")) return "status";
  return null;
}

function stripCommand(text: string, command: string) {
  return text.replace(new RegExp(`^\\/${command}\\s+`, "i"), "").trim();
}

function captureTitle(capture: Capture) {
  if (capture.type === "deadline") {
    return capture.text.replace(/^\/(?:date|deadline)\s+/i, "").trim() || capture.text;
  }
  if (capture.type) return stripCommand(capture.text, capture.type) || capture.text;
  return capture.text;
}

function appendInboxContext(recoveryNotes: string, capture: Capture) {
  const section = "## Inbox context";
  const line = `- ${capture.createdAt.slice(0, 10)}: ${capture.text.trim()}`;
  const trimmed = recoveryNotes.trim();
  if (!trimmed) return `${section}\n${line}`;
  if (trimmed.includes(section)) return trimmed.replace(section, `${section}\n${line}`);
  return `${trimmed}\n\n${section}\n${line}`;
}

export type TriageCaptureAction =
  | { type: "task"; title: string; plannedDate?: string | null; dueDate?: string | null; scheduledTime?: string | null; projectId?: string | null; domainId?: string | null }
  | { type: "date"; title: string; date: string; time?: string | null; projectId?: string | null; notes?: string }
  | { type: "project"; name: string; domainId?: string | null; currentObjective?: string; nextAction?: string }
  | { type: "note"; title: string; content?: string; domainId?: string | null; projectId?: string | null }
  | { type: "attach-project"; projectId: string }
  | { type: "archive" }
  | { type: "delete" };

type WorkspaceRecord = Domain | Project | Task | Capture | Note | Deadline | Review | DashboardScratchpad | DashboardPreference;

interface LocalRecordChange {
  collection: CollectionName;
  record: WorkspaceRecord;
}

function replaceIn<T extends { id: string }>(items: T[], record: T) {
  const exists = items.some((item) => item.id === record.id);
  return exists ? items.map((item) => (item.id === record.id ? record : item)) : [record, ...items];
}

function overlayPendingMutations(workspace: WorkspaceData, mutations: QueuedMutation[]) {
  return mutations.reduce((current, mutation) => {
    if (mutation.entityType === "priorities" || !(mutation.entityType in current)) return current;
    const collection = mutation.entityType as CollectionName;
    const records = current[collection] as { id: string }[];
    if (mutation.operation === "delete") {
      return { ...current, [collection]: records.filter((record) => record.id !== mutation.entityId) } as WorkspaceData;
    }
    const payload = mutation.payload as { id?: string } | null;
    if (!payload?.id) return current;
    return { ...current, [collection]: replaceIn(records, payload as { id: string }) } as WorkspaceData;
  }, workspace);
}

function byId<T extends { id: string }>(items: T[], id: string) {
  return items.find((item) => item.id === id);
}

function warningSummary(warnings: SyncWarning[]) {
  if (warnings.length === 1) return warnings[0].message;
  return `${warnings.length} older offline changes were skipped because the server had newer updates.`;
}

interface SyncState {
  online: boolean;
  pendingCount: number;
  syncing: boolean;
  refreshing: boolean;
  lastSyncedAt: string | null;
  lastRefreshAt: string | null;
  error: string | null;
  lastErrorAt: string | null;
  lastWarning: string | null;
  lastWarningAt: string | null;
  staleMutationCount: number;
}

interface StoreApi {
  data: WorkspaceData;
  loading: boolean;
  sync: SyncState;
  syncNow: () => Promise<void>;
  forceRefreshFromServer: () => Promise<void>;
  resetDemoData: () => Promise<void>;
  addCapture: (text: string) => void;
  addHandoffCapture: (handoff: LifeOsHandoffV1) => "created" | "existing";
  updateCapture: (id: string, updates: Partial<Capture>) => void;
  triageCapture: (id: string, action: TriageCaptureAction) => void;
  convertCapture: (id: string, target: "task" | "project" | "note" | "deadline") => void;
  addTask: (data: Partial<Task> & { title: string }) => string;
  updateTask: (id: string, updates: Partial<Task>) => void;
  addProject: (data: { name: string; domainId: string; parentProjectId?: string | null; currentObjective?: string; nextAction?: string }) => string;
  updateProject: (id: string, updates: Partial<Project>) => void;
  addDeadline: (data: { title: string; date: string; time?: string | null; location?: string; projectId?: string | null; notes?: string }) => string;
  updateDeadline: (id: string, updates: Partial<Deadline>) => void;
  addNote: (data: { title: string; content?: string; projectId?: string | null; domainId: string }) => string;
  updateNote: (id: string, updates: Partial<Note>) => void;
  addReview: (type: ReviewType, responses: Record<string, string>) => void;
  addDomain: (name: string) => void;
  updateDomain: (id: string, updates: Partial<Domain>) => void;
  updateDashboardScratchpad: (content: string) => void;
  updateDashboardPreferences: (updates: Partial<DashboardPreference>) => void;
}

const StoreContext = createContext<StoreApi | null>(null);

export function WorkspaceProvider({ children, user }: { children: ReactNode; user: LocalVerifiedUser }) {
  const [data, setData] = useState<WorkspaceData>(emptyWorkspace);
  const dataRef = useRef(data);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastErrorAt, setLastErrorAt] = useState<string | null>(null);
  const [lastWarning, setLastWarning] = useState<string | null>(null);
  const [lastWarningAt, setLastWarningAt] = useState<string | null>(null);
  const [staleMutationCount, setStaleMutationCount] = useState(0);
  const syncInFlight = useRef(false);
  const localWrite = useRef<Promise<void>>(Promise.resolve());
  const localMutationVersion = useRef(0);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const saveWorkspace = useCallback(async (next: WorkspaceData) => {
    const normalized = normalizeWorkspace(next);
    dataRef.current = normalized;
    setData(normalized);
    await writeLocalWorkspace(user, normalized);
  }, [user]);

  const refreshPendingCount = useCallback(async () => {
    const outbox = await readLocalOutbox(user);
    setPendingCount(outbox.length);
  }, [user]);

  const syncNow = useCallback(async () => {
    if (syncInFlight.current || typeof window === "undefined") return;
    if (!navigator.onLine) {
      setOnline(false);
      setError("Offline. Changes are queued until you reconnect.");
      setLastErrorAt(now());
      return;
    }
    setOnline(true);
    syncInFlight.current = true;
    setSyncing(true);
    setError(null);
    try {
      await localWrite.current;
      const outbox = await readLocalOutbox(user);
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mutations: outbox })
      });
      const result = await readJsonResponse<{ data: WorkspaceData; appliedMutationIds: string[]; warnings?: SyncWarning[] }>(response);
      if (!response.ok || !result?.data) {
        throw new Error(response.status === 401 ? "Sign in again to sync." : responseErrorMessage(response, result, "Sync failed"));
      }
      const applied = new Set(result.appliedMutationIds);
      const reconcile = localWrite.current.then(async () => {
        const latestOutbox = await readLocalOutbox(user);
        const remaining = latestOutbox.filter((mutation) => !applied.has(mutation.mutationId));
        await writeLocalOutbox(user, remaining);
        return remaining;
      });
      localWrite.current = reconcile.then(() => undefined, () => undefined);
      const remaining = await reconcile;
      await saveWorkspace(remaining.length ? overlayPendingMutations(result.data, remaining) : result.data);
      setPendingCount(remaining.length);
      setLastSyncedAt(result.data.serverSyncedAt);
      if (remaining.length) window.setTimeout(() => void syncNow(), 80);
      const warnings = result.warnings ?? [];
      if (warnings.length) {
        setLastWarning(warningSummary(warnings));
        setLastWarningAt(now());
        setStaleMutationCount((count) => count + warnings.length);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed.");
      setLastErrorAt(now());
    } finally {
      setSyncing(false);
      syncInFlight.current = false;
    }
  }, [saveWorkspace, user]);

  const forceRefreshFromServer = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!navigator.onLine) {
      setOnline(false);
      setError("Cannot refresh from server while offline.");
      setLastErrorAt(now());
      return;
    }
    setOnline(true);

    await localWrite.current;
    const outbox = await readLocalOutbox(user);
    if (outbox.length > 0) {
      setError("Sync pending changes before refreshing from server.");
      setLastErrorAt(now());
      return;
    }

    const refreshMutationVersion = localMutationVersion.current;
    setRefreshing(true);
    setError(null);
    try {
      const response = await fetch("/api/bootstrap", { cache: "no-store" });
      const result = await readJsonResponse<{ data: WorkspaceData }>(response);
      if (!response.ok || !result?.data) {
        throw new Error(response.status === 401 ? "Sign in again to refresh." : responseErrorMessage(response, result, "Refresh failed"));
      }
      await localWrite.current;
      if (localMutationVersion.current !== refreshMutationVersion) {
        const latestOutbox = await readLocalOutbox(user);
        setPendingCount(latestOutbox.length);
        setError("Server refresh was skipped because local changes were made while it was in progress. Sync pending changes first.");
        setLastErrorAt(now());
        return;
      }
      await saveWorkspace(result.data);
      setLastSyncedAt(result.data.serverSyncedAt);
      setLastRefreshAt(now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refresh failed.");
      setLastErrorAt(now());
    } finally {
      setRefreshing(false);
    }
  }, [saveWorkspace, user]);

  const mutateBatch = useCallback(
    (changes: LocalRecordChange[]) => {
      if (changes.length === 0) return;
      localMutationVersion.current += 1;

      const committedAt = now();
      let next = dataRef.current;
      const mutations: QueuedMutation[] = [];

      for (const change of changes) {
        const touched = { ...change.record, updatedAt: committedAt } as WorkspaceRecord;
        next = {
          ...next,
          [change.collection]: replaceIn(next[change.collection] as WorkspaceRecord[], touched)
        } as WorkspaceData;
        mutations.push({
          mutationId: newId("mut"),
          entityType: change.collection,
          entityId: touched.id,
          operation: "upsert",
          payload: touched,
          createdAt: committedAt
        });
      }

      const normalized = normalizeWorkspace(next);
      dataRef.current = normalized;
      setData(normalized);

      const write = localWrite.current.then(async () => {
        const committed = await commitLocalMutationBatch(user, normalized, mutations);
        setPendingCount(committed.outbox.length);
      });
      localWrite.current = write.catch(() => undefined);

      void write
        .then(() => {
          window.setTimeout(() => void syncNow(), 80);
        })
        .catch((reason) => {
          setError(reason instanceof Error ? reason.message : "Could not persist local workspace change.");
          setLastErrorAt(now());
        });
    },
    [syncNow, user]
  );

  const mutate = useCallback(
    <T extends WorkspaceRecord>(collection: CollectionName, record: T) => {
      mutateBatch([{ collection, record }]);
    },
    [mutateBatch]
  );

  useEffect(() => {
    setOnline(typeof navigator === "undefined" ? true : navigator.onLine);

    async function boot() {
      await rememberLocalUser(user);
      const cached = await readLocalWorkspace(user);
      if (cached) {
        const normalized = normalizeWorkspace(cached);
        setData(normalized);
        dataRef.current = normalized;
        setLastSyncedAt(normalized.serverSyncedAt || null);
        setLoading(false);
      }
      const outbox = await readLocalOutbox(user);
      setPendingCount(outbox.length);

      if (navigator.onLine) {
        try {
          if (outbox.length > 0) {
            await syncNow();
          } else {
            const bootMutationVersion = localMutationVersion.current;
            const response = await fetch("/api/bootstrap");
            const result = await readJsonResponse<{ data?: WorkspaceData; error?: string }>(response);
            if (response.ok && result?.data) {
              await localWrite.current;
              if (localMutationVersion.current === bootMutationVersion) {
                await saveWorkspace(result.data);
                setLastSyncedAt(result.data.serverSyncedAt);
              } else {
                const latestOutbox = await readLocalOutbox(user);
                setPendingCount(latestOutbox.length);
              }
            } else if (!response.ok) {
              throw new Error(response.status === 401 ? "Sign in again to load workspace." : responseErrorMessage(response, result, "Server refresh unavailable"));
            }
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : "Server refresh is unavailable.";
          setError(cached ? `Loaded cached data. ${message}` : message);
          setLastErrorAt(now());
        }
      }
      setLoading(false);
    }

    void boot();

    const handleOnline = () => {
      setOnline(true);
      void syncNow();
    };
    const handleOffline = () => {
      setOnline(false);
      setError("Offline. Changes are queued until you reconnect.");
      setLastErrorAt(now());
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refreshPendingCount, saveWorkspace, syncNow, user]);

  const api = useMemo<StoreApi>(() => {
    const defaultDomainId = () => dataRef.current.domains.find((domain) => !domain.archived)?.id || "";
    const notesDomainId = () => dataRef.current.domains.find((domain) => domain.name === "Notes")?.id || defaultDomainId();
    const projectDomainId = (projectId: string | null | undefined) => {
      if (!projectId) return null;
      return byId(dataRef.current.projects, projectId)?.domainId ?? null;
    };
    const triageCapture = (id: string, action: TriageCaptureAction) => {
      const capture = byId(dataRef.current.captures, id);
      if (!capture) return;

      if (action.type === "archive") {
        mutate("captures", { ...capture, status: "archived" });
        return;
      }
      if (action.type === "delete") {
        mutate("captures", { ...capture, status: "deleted" });
        return;
      }
      if (action.type === "attach-project") {
        const project = byId(dataRef.current.projects, action.projectId);
        if (!project) return;
        mutateBatch([
          { collection: "projects", record: { ...project, recoveryNotes: appendInboxContext(project.recoveryNotes, capture) } },
          { collection: "captures", record: { ...capture, status: "attached", convertedToId: project.id } }
        ]);
        return;
      }

      const ts = now();
      const fallbackTitle = captureTitle(capture);
      let convertedToId = "";
      const changes: LocalRecordChange[] = [];

      if (action.type === "task") {
        convertedToId = newId("task");
        const projectId = action.projectId || null;
        changes.push({
          collection: "tasks",
          record: {
            id: convertedToId,
            title: action.title.trim() || fallbackTitle,
            plannedDate: action.plannedDate || null,
            dueDate: action.dueDate || null,
            scheduledTime: action.scheduledTime || null,
            projectId,
            domainId: action.domainId ?? projectDomainId(projectId),
            status: "todo",
            createdAt: ts,
            updatedAt: ts,
            archivedAt: null,
            trashedAt: null
          } satisfies Task
        });
      }

      if (action.type === "date") {
        convertedToId = newId("deadline");
        changes.push({
          collection: "deadlines",
          record: {
            id: convertedToId,
            title: action.title.trim() || fallbackTitle,
            date: action.date,
            time: action.time || null,
            location: "",
            projectId: action.projectId || null,
            taskIds: [],
            notes: action.notes ?? "",
            createdAt: ts,
            updatedAt: ts,
            archivedAt: null,
            trashedAt: null
          } satisfies Deadline
        });
      }

      if (action.type === "project") {
        convertedToId = newId("proj");
        changes.push({
          collection: "projects",
          record: {
            id: convertedToId,
            name: action.name.trim() || fallbackTitle,
            domainId: action.domainId || notesDomainId(),
            parentProjectId: null,
            status: "active",
            currentObjective: action.currentObjective ?? "",
            nextAction: action.nextAction ?? "",
            latestStatus: "",
            recoveryNotes: "",
            openLoops: [],
            createdAt: ts,
            updatedAt: ts,
            archivedAt: null,
            trashedAt: null
          } satisfies Project
        });
      }

      if (action.type === "note") {
        convertedToId = newId("note");
        changes.push({
          collection: "notes",
          record: {
            id: convertedToId,
            title: action.title.trim() || fallbackTitle,
            content: action.content ?? capture.text,
            projectId: action.projectId || null,
            domainId: action.domainId || notesDomainId(),
            createdAt: ts,
            updatedAt: ts,
            archivedAt: null,
            trashedAt: null
          } satisfies Note
        });
      }

      if (convertedToId) {
        changes.push({ collection: "captures", record: { ...capture, status: "converted", convertedToId } });
        mutateBatch(changes);
      }
    };

    return {
      data,
      loading,
      sync: {
        online,
        pendingCount,
        syncing,
        refreshing,
        lastSyncedAt,
        lastRefreshAt,
        error,
        lastErrorAt,
        lastWarning,
        lastWarningAt,
        staleMutationCount
      },
      syncNow,
      forceRefreshFromServer,
      resetDemoData: async () => {
        const response = await fetch("/api/reset-demo", { method: "POST" });
        const result = await readJsonResponse<{ data?: WorkspaceData; error?: string }>(response);
        if (response.ok) {
          if (result?.data) {
            await saveWorkspace(result.data);
            setLastSyncedAt(result.data.serverSyncedAt);
            setLastRefreshAt(now());
            setError(null);
            setLastWarning(null);
            setLastWarningAt(null);
            setStaleMutationCount(0);
          }
        } else {
          setError(responseErrorMessage(response, result, "Could not reset demo data"));
          setLastErrorAt(now());
        }
        await writeLocalOutbox(user, []);
        await refreshPendingCount();
      },
      addCapture: (text) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        const ts = now();
        mutate("captures", {
          id: newId("cap"),
          text: trimmed,
          status: "unprocessed",
          type: parseCaptureType(trimmed),
          parsedData: null,
          convertedToId: null,
          createdAt: ts,
          updatedAt: ts
        } satisfies Capture);
      },
      addHandoffCapture: (handoff) => {
        const existing = dataRef.current.captures.find((capture) => capture.parsedData?.handoffId === handoff.id);
        if (existing) return "existing";
        const ts = now();
        const type: CaptureType = handoff.kind === "next-action" || handoff.kind === "follow-up"
          ? "task"
          : handoff.kind === "project-update"
            ? "status"
            : "note";
        mutate("captures", {
          id: `cap-handoff-${handoff.id}`,
          text: `${handoff.title.trim()}\n\n${handoff.body.trim()}`,
          status: "unprocessed",
          type,
          parsedData: {
            handoffId: handoff.id,
            sourceSystem: handoff.source,
            handoffKind: handoff.kind,
            sourceEntryId: handoff.sourceRef.entryId ?? "",
            sourceEntryType: handoff.sourceRef.entryType ?? "",
            sourceDate: handoff.sourceRef.date ?? "",
            sourceLifeOsPath: handoff.sourceRef.lifeosPath ?? "",
            area: handoff.area ?? ""
          },
          convertedToId: null,
          createdAt: ts,
          updatedAt: ts
        } satisfies Capture);
        return "created";
      },
      updateCapture: (id, updates) => {
        const capture = byId(dataRef.current.captures, id);
        if (capture) mutate("captures", { ...capture, ...updates });
      },
      triageCapture,
      convertCapture: (id, target) => {
        const capture = byId(dataRef.current.captures, id);
        if (!capture) return;
        const title = captureTitle(capture);
        if (target === "task") triageCapture(id, { type: "task", title });
        if (target === "project") triageCapture(id, { type: "project", name: title, domainId: notesDomainId() });
        if (target === "note") triageCapture(id, { type: "note", title, content: capture.text, domainId: notesDomainId() });
        if (target === "deadline") triageCapture(id, { type: "date", title, date: localDateKey() });
      },
      addTask: (input) => {
        const ts = now();
        const task: Task = {
          id: newId("task"),
          title: input.title,
          plannedDate: input.plannedDate ?? null,
          dueDate: input.dueDate ?? null,
          scheduledTime: input.scheduledTime ?? null,
          projectId: input.projectId ?? null,
          domainId: input.domainId ?? null,
          status: (input.status as TaskStatus) ?? "todo",
          createdAt: ts,
          updatedAt: ts,
          archivedAt: null,
          trashedAt: null
        };
        mutate("tasks", task);
        return task.id;
      },
      updateTask: (id, updates) => {
        const task = byId(dataRef.current.tasks, id);
        if (task) mutate("tasks", { ...task, ...updates });
      },
      addProject: (input) => {
        const ts = now();
        const project: Project = {
          id: newId("proj"),
          name: input.name,
          domainId: input.domainId,
          parentProjectId: input.parentProjectId ?? null,
          status: "active",
          currentObjective: input.currentObjective ?? "",
          nextAction: input.nextAction ?? "",
          latestStatus: "",
          recoveryNotes: "",
          openLoops: [],
          createdAt: ts,
          updatedAt: ts,
          archivedAt: null,
          trashedAt: null
        };
        mutate("projects", project);
        return project.id;
      },
      updateProject: (id, updates) => {
        const project = byId(dataRef.current.projects, id);
        if (project) mutate("projects", { ...project, ...updates, status: (updates.status as ProjectStatus) ?? project.status });
      },
      addDeadline: (input) => {
        const ts = now();
        const deadline: Deadline = {
          id: newId("deadline"),
          title: input.title,
          date: input.date,
          time: input.time ?? null,
          location: input.location ?? "",
          projectId: input.projectId ?? null,
          taskIds: [],
          notes: input.notes ?? "",
          createdAt: ts,
          updatedAt: ts,
          archivedAt: null,
          trashedAt: null
        };
        mutate("deadlines", deadline);
        return deadline.id;
      },
      updateDeadline: (id, updates) => {
        const deadline = byId(dataRef.current.deadlines, id);
        if (deadline) mutate("deadlines", { ...deadline, ...updates });
      },
      addNote: (input) => {
        const ts = now();
        const note: Note = {
          id: newId("note"),
          title: input.title,
          content: input.content ?? "",
          projectId: input.projectId ?? null,
          domainId: input.domainId,
          createdAt: ts,
          updatedAt: ts,
          archivedAt: null,
          trashedAt: null
        };
        mutate("notes", note);
        return note.id;
      },
      updateNote: (id, updates) => {
        const note = byId(dataRef.current.notes, id);
        if (note) mutate("notes", { ...note, ...updates });
      },
      addReview: (type, responses) => {
        const ts = now();
        mutate("reviews", {
          id: newId("review"),
          type,
          date: ts,
          responses,
          createdAt: ts,
          updatedAt: ts
        } satisfies Review);
      },
      addDomain: (name) => {
        const ts = now();
        mutate("domains", {
          id: newId("dom"),
          name,
          archived: false,
          createdAt: ts,
          updatedAt: ts
        } satisfies Domain);
      },
      updateDomain: (id, updates) => {
        const domain = byId(dataRef.current.domains, id);
        if (domain) mutate("domains", { ...domain, ...updates });
      },
      updateDashboardScratchpad: (content) => {
        const ts = now();
        const existing = dataRef.current.dashboardScratchpads[0];
        const scratchpad: DashboardScratchpad = existing
          ? { ...existing, content }
          : {
              id: newId("dash-scratch"),
              content,
              createdAt: ts,
              updatedAt: ts
            };
        mutate("dashboardScratchpads", scratchpad);
      },
      updateDashboardPreferences: (updates) => {
        const ts = now();
        const existing = dataRef.current.dashboardPreferences[0];
        const preferences: DashboardPreference = existing
          ? { ...existing, ...updates }
          : {
              id: newId("dash-prefs"),
              sectionOrder: [],
              collapsedSections: [],
              reviewPromptDismissals: [],
              dateWindowDays: 14,
              showCompleted: false,
              taskSortMode: "recent",
              createdAt: ts,
              updatedAt: ts,
              ...updates
            };
        mutate("dashboardPreferences", preferences);
      },
    };
  }, [
    data,
    error,
    forceRefreshFromServer,
    lastErrorAt,
    lastRefreshAt,
    lastSyncedAt,
    lastWarning,
    lastWarningAt,
    loading,
    mutate,
    mutateBatch,
    online,
    pendingCount,
    refreshing,
    refreshPendingCount,
    saveWorkspace,
    staleMutationCount,
    syncNow,
    syncing,
    user
  ]);

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useWorkspace() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return store;
}
