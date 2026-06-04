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
  Priority,
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

const DB_NAME = "contextos-offline-v1";
const DB_VERSION = 1;
const WORKSPACE_KEY = "workspace";
const OUTBOX_KEY = "outbox";

export const emptyWorkspace = (): WorkspaceData => ({
  domains: [],
  projects: [],
  tasks: [],
  captures: [],
  notes: [],
  deadlines: [],
  reviews: [],
  priorities: [],
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
  const dashboardPreferences = (value?.dashboardPreferences ?? []).map((preference) => ({
    ...preference,
    reviewPromptDismissals: preference.reviewPromptDismissals ?? []
  }));

  return {
    ...emptyWorkspace(),
    ...(value ?? {}),
    domains: value?.domains ?? [],
    projects,
    tasks: value?.tasks ?? [],
    captures: value?.captures ?? [],
    notes: value?.notes ?? [],
    deadlines,
    reviews: value?.reviews ?? [],
    priorities: value?.priorities ?? [],
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
  if (t.startsWith("/deadline")) return "deadline";
  if (t.startsWith("/status")) return "status";
  return null;
}

function stripCommand(text: string, command: string) {
  return text.replace(new RegExp(`^\\/${command}\\s+`, "i"), "").trim();
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("kv", "readonly");
    const request = tx.objectStore("kv").get(key);
    let result: T | null = null;
    request.onsuccess = () => {
      result = (request.result as T | undefined) ?? null;
    };
    tx.oncomplete = () => {
      db.close();
      resolve(result);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? request.error);
    };
  });
}

async function idbSet<T>(key: string, value: T) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("kv", "readwrite");
    tx.objectStore("kv").put(value, key);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

async function idbDelete(key: string) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("kv", "readwrite");
    tx.objectStore("kv").delete(key);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

function replaceIn<T extends { id: string }>(items: T[], record: T) {
  const exists = items.some((item) => item.id === record.id);
  return exists ? items.map((item) => (item.id === record.id ? record : item)) : [record, ...items];
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
  updateCapture: (id: string, updates: Partial<Capture>) => void;
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
  addPriority: (scope: "daily" | "weekly", dateKey: string, text: string) => void;
  updatePriority: (id: string, updates: Partial<Priority>) => void;
  removePriority: (id: string) => void;
  addDomain: (name: string) => void;
  updateDomain: (id: string, updates: Partial<Domain>) => void;
  updateDashboardScratchpad: (content: string) => void;
  updateDashboardPreferences: (updates: Partial<DashboardPreference>) => void;
}

const StoreContext = createContext<StoreApi | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
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

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const saveWorkspace = useCallback(async (next: WorkspaceData) => {
    const normalized = normalizeWorkspace(next);
    dataRef.current = normalized;
    setData(normalized);
    await idbSet(WORKSPACE_KEY, normalized);
  }, []);

  const refreshPendingCount = useCallback(async () => {
    const outbox = (await idbGet<QueuedMutation[]>(OUTBOX_KEY)) ?? [];
    setPendingCount(outbox.length);
  }, []);

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
      const outbox = (await idbGet<QueuedMutation[]>(OUTBOX_KEY)) ?? [];
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
      const remaining = outbox.filter((mutation) => !applied.has(mutation.mutationId));
      await idbSet(OUTBOX_KEY, remaining);
      await saveWorkspace(result.data);
      setPendingCount(remaining.length);
      setLastSyncedAt(result.data.serverSyncedAt);
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
  }, [saveWorkspace]);

  const forceRefreshFromServer = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!navigator.onLine) {
      setOnline(false);
      setError("Cannot refresh from server while offline.");
      setLastErrorAt(now());
      return;
    }
    setOnline(true);

    const outbox = (await idbGet<QueuedMutation[]>(OUTBOX_KEY)) ?? [];
    if (outbox.length > 0) {
      setError("Sync pending changes before refreshing from server.");
      setLastErrorAt(now());
      return;
    }

    setRefreshing(true);
    setError(null);
    try {
      const response = await fetch("/api/bootstrap", { cache: "no-store" });
      const result = await readJsonResponse<{ data: WorkspaceData }>(response);
      if (!response.ok || !result?.data) {
        throw new Error(response.status === 401 ? "Sign in again to refresh." : responseErrorMessage(response, result, "Refresh failed"));
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
  }, [saveWorkspace]);

  const queueMutation = useCallback(
    async (mutation: Omit<QueuedMutation, "mutationId" | "createdAt">) => {
      const queued: QueuedMutation = {
        ...mutation,
        mutationId: newId("mut"),
        createdAt: now()
      };
      const outbox = (await idbGet<QueuedMutation[]>(OUTBOX_KEY)) ?? [];
      await idbSet(OUTBOX_KEY, [...outbox, queued]);
      setPendingCount(outbox.length + 1);
      window.setTimeout(() => void syncNow(), 80);
    },
    [syncNow]
  );

  const mutate = useCallback(
    <T extends { id: string }>(collection: CollectionName, record: T) => {
      const touched = { ...record, updatedAt: now() } as T;
      const next = {
        ...dataRef.current,
        [collection]: replaceIn(dataRef.current[collection] as any[], touched)
      } as WorkspaceData;
      void (async () => {
        await saveWorkspace(next);
        await queueMutation({
          entityType: collection,
          entityId: touched.id,
          operation: "upsert",
          payload: touched as any
        });
      })();
    },
    [queueMutation, saveWorkspace]
  );

  useEffect(() => {
    setOnline(typeof navigator === "undefined" ? true : navigator.onLine);

    async function boot() {
      const cached = await idbGet<WorkspaceData>(WORKSPACE_KEY);
      if (cached) {
        const normalized = normalizeWorkspace(cached);
        setData(normalized);
        dataRef.current = normalized;
        setLastSyncedAt(normalized.serverSyncedAt || null);
        setLoading(false);
      }
      const outbox = (await idbGet<QueuedMutation[]>(OUTBOX_KEY)) ?? [];
      setPendingCount(outbox.length);

      if (navigator.onLine) {
        try {
          if (outbox.length > 0) {
            await syncNow();
          } else {
            const response = await fetch("/api/bootstrap");
            if (response.ok) {
              const result = await readJsonResponse<{ data: WorkspaceData }>(response);
              if (result?.data) {
                await saveWorkspace(result.data);
                setLastSyncedAt(result.data.serverSyncedAt);
              }
            }
          }
        } catch {
          setError("Loaded cached data. Server refresh is unavailable.");
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
  }, [refreshPendingCount, saveWorkspace, syncNow]);

  const api = useMemo<StoreApi>(() => {
    const defaultDomainId = () => dataRef.current.domains.find((domain) => !domain.archived)?.id || "";
    const notesDomainId = () => dataRef.current.domains.find((domain) => domain.name === "Notes")?.id || defaultDomainId();

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
        if (response.ok) {
          const result = await readJsonResponse<{ data: WorkspaceData }>(response);
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
          setError("Could not reset demo data while offline.");
          setLastErrorAt(now());
        }
        await idbSet(OUTBOX_KEY, []);
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
      updateCapture: (id, updates) => {
        const capture = byId(dataRef.current.captures, id);
        if (capture) mutate("captures", { ...capture, ...updates });
      },
      convertCapture: (id, target) => {
        const capture = byId(dataRef.current.captures, id);
        if (!capture) return;
        const ts = now();
        const rawTitle = capture.type ? stripCommand(capture.text, capture.type) : capture.text;
        const title = rawTitle || capture.text;
        let convertedToId = "";
        if (target === "task") {
          convertedToId = newId("task");
          mutate("tasks", {
            id: convertedToId,
            title,
            plannedDate: null,
            dueDate: null,
            projectId: null,
            domainId: null,
            status: "todo",
            createdAt: ts,
            updatedAt: ts,
            archivedAt: null,
            trashedAt: null
          } satisfies Task);
        }
        if (target === "project") {
          convertedToId = newId("proj");
          mutate("projects", {
            id: convertedToId,
            name: title,
            domainId: notesDomainId(),
            parentProjectId: null,
            status: "active",
            currentObjective: "",
            nextAction: "",
            latestStatus: "",
            recoveryNotes: "",
            openLoops: [],
            createdAt: ts,
            updatedAt: ts,
            archivedAt: null,
            trashedAt: null
          } satisfies Project);
        }
        if (target === "note") {
          convertedToId = newId("note");
          mutate("notes", {
            id: convertedToId,
            title,
            content: "",
            projectId: null,
            domainId: notesDomainId(),
            createdAt: ts,
            updatedAt: ts,
            archivedAt: null,
            trashedAt: null
          } satisfies Note);
        }
        if (target === "deadline") {
          convertedToId = newId("deadline");
          mutate("deadlines", {
            id: convertedToId,
            title,
            date: localDateKey(),
            time: null,
            location: "",
            projectId: null,
            taskIds: [],
            notes: "",
            createdAt: ts,
            updatedAt: ts,
            archivedAt: null,
            trashedAt: null
          } satisfies Deadline);
        }
        mutate("captures", { ...capture, status: "converted", convertedToId });
      },
      addTask: (input) => {
        const ts = now();
        const task: Task = {
          id: newId("task"),
          title: input.title,
          plannedDate: input.plannedDate ?? null,
          dueDate: input.dueDate ?? null,
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
      addPriority: (scope, dateKeyValue, text) => {
        const ts = now();
        mutate("priorities", {
          id: newId("priority"),
          scope,
          dateKey: dateKeyValue,
          text,
          taskId: null,
          done: false,
          createdAt: ts,
          updatedAt: ts
        } satisfies Priority);
      },
      updatePriority: (id, updates) => {
        const priority = byId(dataRef.current.priorities, id);
        if (priority) mutate("priorities", { ...priority, ...updates });
      },
      removePriority: (id) => {
        const next = {
          ...dataRef.current,
          priorities: dataRef.current.priorities.filter((priority) => priority.id !== id)
        };
        void (async () => {
          await saveWorkspace(next);
          await queueMutation({
            entityType: "priorities",
            entityId: id,
            operation: "delete",
            payload: null
          });
        })();
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
    online,
    pendingCount,
    queueMutation,
    refreshing,
    saveWorkspace,
    staleMutationCount,
    syncNow,
    syncing
  ]);

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useWorkspace() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return store;
}
