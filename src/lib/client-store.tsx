"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type {
  Capture,
  CaptureType,
  CollectionName,
  Deadline,
  Domain,
  Note,
  Priority,
  Project,
  ProjectStatus,
  QueuedMutation,
  Review,
  ReviewType,
  Task,
  TaskStatus,
  WorkspaceData
} from "./types";
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
  serverSyncedAt: ""
});

function now() {
  return new Date().toISOString();
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
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
    request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
}

async function idbSet<T>(key: string, value: T) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("kv", "readwrite");
    tx.objectStore("kv").put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDelete(key: string) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("kv", "readwrite");
    tx.objectStore("kv").delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function replaceIn<T extends { id: string }>(items: T[], record: T) {
  const exists = items.some((item) => item.id === record.id);
  return exists ? items.map((item) => (item.id === record.id ? record : item)) : [record, ...items];
}

function byId<T extends { id: string }>(items: T[], id: string) {
  return items.find((item) => item.id === id);
}

interface SyncState {
  online: boolean;
  pendingCount: number;
  syncing: boolean;
  lastSyncedAt: string | null;
  error: string | null;
}

interface StoreApi {
  data: WorkspaceData;
  loading: boolean;
  sync: SyncState;
  syncNow: () => Promise<void>;
  resetDemoData: () => Promise<void>;
  addCapture: (text: string) => void;
  updateCapture: (id: string, updates: Partial<Capture>) => void;
  convertCapture: (id: string, target: "task" | "project" | "note" | "deadline") => void;
  addTask: (data: Partial<Task> & { title: string }) => string;
  updateTask: (id: string, updates: Partial<Task>) => void;
  addProject: (data: { name: string; domainId: string; currentObjective?: string; nextAction?: string }) => string;
  updateProject: (id: string, updates: Partial<Project>) => void;
  addDeadline: (data: { title: string; date: string; projectId?: string | null; notes?: string }) => string;
  updateDeadline: (id: string, updates: Partial<Deadline>) => void;
  addNote: (data: { title: string; content?: string; projectId?: string | null; domainId: string }) => string;
  updateNote: (id: string, updates: Partial<Note>) => void;
  addReview: (type: ReviewType, responses: Record<string, string>) => void;
  addPriority: (scope: "daily" | "weekly", dateKey: string, text: string) => void;
  updatePriority: (id: string, updates: Partial<Priority>) => void;
  removePriority: (id: string) => void;
  addDomain: (name: string) => void;
  updateDomain: (id: string, updates: Partial<Domain>) => void;
}

const StoreContext = createContext<StoreApi | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<WorkspaceData>(emptyWorkspace);
  const dataRef = useRef(data);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const syncInFlight = useRef(false);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const saveWorkspace = useCallback(async (next: WorkspaceData) => {
    dataRef.current = next;
    setData(next);
    await idbSet(WORKSPACE_KEY, next);
  }, []);

  const refreshPendingCount = useCallback(async () => {
    const outbox = (await idbGet<QueuedMutation[]>(OUTBOX_KEY)) ?? [];
    setPendingCount(outbox.length);
  }, []);

  const syncNow = useCallback(async () => {
    if (syncInFlight.current || typeof window === "undefined" || !navigator.onLine) return;
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
      const result = await readJsonResponse<{ data: WorkspaceData; appliedMutationIds: string[] }>(response);
      if (!response.ok || !result?.data) {
        throw new Error(response.status === 401 ? "Sign in again to sync." : responseErrorMessage(response, result, "Sync failed"));
      }
      const applied = new Set(result.appliedMutationIds);
      const remaining = outbox.filter((mutation) => !applied.has(mutation.mutationId));
      await idbSet(OUTBOX_KEY, remaining);
      await saveWorkspace(result.data);
      setPendingCount(remaining.length);
      setLastSyncedAt(result.data.serverSyncedAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed.");
    } finally {
      setSyncing(false);
      syncInFlight.current = false;
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
      void saveWorkspace(next);
      void queueMutation({
        entityType: collection,
        entityId: touched.id,
        operation: "upsert",
        payload: touched as any
      });
    },
    [queueMutation, saveWorkspace]
  );

  useEffect(() => {
    setOnline(typeof navigator === "undefined" ? true : navigator.onLine);

    async function boot() {
      const cached = await idbGet<WorkspaceData>(WORKSPACE_KEY);
      if (cached) {
        setData(cached);
        dataRef.current = cached;
        setLastSyncedAt(cached.serverSyncedAt || null);
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
        }
      }
      setLoading(false);
    }

    void boot();

    const handleOnline = () => {
      setOnline(true);
      void syncNow();
    };
    const handleOffline = () => setOnline(false);
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
      sync: { online, pendingCount, syncing, lastSyncedAt, error },
      syncNow,
      resetDemoData: async () => {
        const response = await fetch("/api/reset-demo", { method: "POST" });
        if (response.ok) {
          const result = await readJsonResponse<{ data: WorkspaceData }>(response);
          if (result?.data) {
            await saveWorkspace(result.data);
            setLastSyncedAt(result.data.serverSyncedAt);
          }
        } else {
          setError("Could not reset demo data while offline.");
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
            status: "active",
            currentObjective: "",
            nextAction: "",
            latestStatus: "",
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
            date: todayKey(),
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
          status: "active",
          currentObjective: input.currentObjective ?? "",
          nextAction: input.nextAction ?? "",
          latestStatus: "",
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
        void saveWorkspace(next);
        void queueMutation({
          entityType: "priorities",
          entityId: id,
          operation: "delete",
          payload: null
        });
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
      }
    };
  }, [data, error, lastSyncedAt, loading, mutate, online, pendingCount, queueMutation, saveWorkspace, syncNow, syncing]);

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useWorkspace() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return store;
}
