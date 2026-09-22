"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Area, ContextDate, DailyNote, Project, QueuedMutation, SyncWarning, Task, WorkspaceData, CollectionName } from "./types";
import type { ContextDateKind, ContextDateParent, TaskParent } from "./canonical-domain";
import { readJsonResponse, responseErrorMessage } from "./http-client";
import {
  commitLocalMutationBatch,
  readLocalOutbox,
  readLocalWorkspace,
  rememberLocalUser,
  replaceLocalWorkspaceState,
  writeLocalOutbox,
  writeLocalWorkspace,
  type LocalVerifiedUser
} from "./local-db";

export const emptyWorkspace = (): WorkspaceData => ({
  areas: [],
  projects: [],
  tasks: [],
  dates: [],
  dailyNotes: [],
  serverSyncedAt: ""
});

function now() {
  return new Date().toISOString();
}

function withRevision<T extends { revision?: number }>(record: T) {
  return {
    ...record,
    revision: Number.isInteger(record.revision) && (record.revision ?? 0) >= 0 ? record.revision! : 0
  };
}

function normalizeWorkspace(value: Partial<WorkspaceData> | null | undefined): WorkspaceData {
  return {
    areas: (value?.areas ?? []).map(withRevision),
    projects: (value?.projects ?? []).map(withRevision),
    tasks: (value?.tasks ?? []).map(withRevision),
    dates: (value?.dates ?? []).map(withRevision),
    dailyNotes: (value?.dailyNotes ?? []).map(withRevision),
    serverSyncedAt: value?.serverSyncedAt ?? ""
  };
}

function newId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

type WorkspaceRecord = Area | Project | Task | ContextDate | DailyNote;

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
    const collection = mutation.entityType;
    const records = current[collection] as { id: string }[];
    const payload = mutation.payload as { id: string };
    return { ...current, [collection]: replaceIn(records, payload) } as WorkspaceData;
  }, workspace);
}

function byId<T extends { id: string }>(items: T[], id: string) {
  return items.find((item) => item.id === id);
}

function warningSummary(warnings: SyncWarning[]) {
  if (warnings.length === 1) return warnings[0].message;
  return `${warnings.length} queued changes were skipped because their server record revisions were no longer current.`;
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
  forceRefreshFromServer: () => Promise<boolean>;
  resetDemoData: () => Promise<void>;
  addArea: (name: string) => string;
  updateArea: (id: string, updates: Partial<Area>) => void;
  addProject: (data: { name: string; areaId: string; objective?: string }) => string;
  updateProject: (id: string, updates: Partial<Project>) => void;
  addTask: (data: { title: string; parent: TaskParent; plannedDate?: string | null; scheduledTime?: string | null }) => string;
  updateTask: (id: string, updates: Partial<Task>) => void;
  addDate: (data: {
    title: string;
    kind: ContextDateKind;
    parent: ContextDateParent;
    date: string;
    startTime?: string | null;
    endTime?: string | null;
    details?: string;
  }) => string;
  updateDate: (id: string, updates: Partial<ContextDate>) => void;
  updateDailyNote: (localDate: string, content: string) => void;
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
  const localReconcileInFlight = useRef(false);

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

  const reconcileDurableLocalState = useCallback(async () => {
    if (localReconcileInFlight.current) return;
    localReconcileInFlight.current = true;
    try {
      while (true) {
        const observedVersion = localMutationVersion.current;
        await localWrite.current;
        const [workspace, outbox] = await Promise.all([
          readLocalWorkspace(user),
          readLocalOutbox(user)
        ]);

        if (localMutationVersion.current !== observedVersion) continue;

        if (workspace) {
          const normalized = normalizeWorkspace(workspace);
          dataRef.current = normalized;
          setData(normalized);
        }
        setPendingCount(outbox.length);
        break;
      }
    } finally {
      localReconcileInFlight.current = false;
    }
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
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sync failed.");
      setLastErrorAt(now());
    } finally {
      setSyncing(false);
      syncInFlight.current = false;
    }
  }, [saveWorkspace, user]);

  const forceRefreshFromServer = useCallback(async () => {
    if (typeof window === "undefined") return false;
    if (!navigator.onLine) {
      setOnline(false);
      setError("Cannot refresh from server while offline.");
      setLastErrorAt(now());
      return false;
    }

    setOnline(true);
    await localWrite.current;
    const outbox = await readLocalOutbox(user);
    if (outbox.length > 0) {
      setError("Sync pending changes before refreshing from server.");
      setLastErrorAt(now());
      return false;
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
        return false;
      }

      await saveWorkspace(result.data);
      setLastSyncedAt(result.data.serverSyncedAt);
      setLastRefreshAt(now());
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Refresh failed.");
      setLastErrorAt(now());
      return false;
    } finally {
      setRefreshing(false);
    }
  }, [saveWorkspace, user]);

  const mutateBatch = useCallback((changes: LocalRecordChange[]) => {
    if (!changes.length) return;
    localMutationVersion.current += 1;

    const committedAt = now();
    let next = dataRef.current;
    const mutations: QueuedMutation[] = [];

    for (const change of changes) {
      const baseRevision = Number.isInteger(change.record.revision) && change.record.revision > 0
        ? change.record.revision
        : null;
      const touched = {
        ...change.record,
        updatedAt: committedAt,
        revision: (baseRevision ?? 0) + 1
      } as WorkspaceRecord;
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
        createdAt: committedAt,
        baseServerSyncedAt: dataRef.current.serverSyncedAt || null,
        baseRevision
      } as QueuedMutation);
    }

    const normalized = normalizeWorkspace(next);
    dataRef.current = normalized;
    setData(normalized);

    const write = localWrite.current.then(async () => {
      const committed = await commitLocalMutationBatch(user, mutations);
      setPendingCount(committed.outbox.length);
    });
    localWrite.current = write.catch(() => undefined);

    void write
      .then(() => window.setTimeout(() => void syncNow(), 80))
      .catch(async (reason) => {
        let reconciled = false;
        try {
          await reconcileDurableLocalState();
          reconciled = true;
        } catch {
          // Preserve the original local-persistence error; a later reload can
          // still recover from the last durable IndexedDB state.
        }
        const baseMessage = reason instanceof Error ? reason.message : "Could not persist a local workspace change.";
        setError(
          reconciled
            ? baseMessage + " The workspace was reconciled to durable local state; retry the change."
            : baseMessage + " Local reconciliation also failed; reload before making further edits."
        );
        setLastErrorAt(now());
      });
  }, [reconcileDurableLocalState, syncNow, user]);

  const mutate = useCallback(<T extends WorkspaceRecord>(collection: CollectionName, record: T) => {
    mutateBatch([{ collection, record }]);
  }, [mutateBatch]);

  useEffect(() => {
    setOnline(typeof navigator === "undefined" ? true : navigator.onLine);

    async function boot() {
      const bootMutationVersion = localMutationVersion.current;
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
        } catch (reason) {
          const message = reason instanceof Error ? reason.message : "Server refresh is unavailable.";
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

  const api = useMemo<StoreApi>(() => ({
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
      if (!response.ok || !result?.data) {
        setError(responseErrorMessage(response, result, "Could not reset demo data"));
        setLastErrorAt(now());
        return;
      }

      const normalized = normalizeWorkspace(result.data);
      await replaceLocalWorkspaceState(user, normalized, []);
      dataRef.current = normalized;
      setData(normalized);
      setPendingCount(0);
      setLastSyncedAt(result.data.serverSyncedAt);
      setLastRefreshAt(now());
      setError(null);
      setLastWarning(null);
      setLastWarningAt(null);
      setStaleMutationCount(0);
    },
    addArea: (name) => {
      const ts = now();
      const area: Area = {
        id: newId("area"),
        name: name.trim(),
        state: "active",
        createdAt: ts,
        updatedAt: ts,
        revision: 0
      };
      mutate("areas", area);
      return area.id;
    },
    updateArea: (id, updates) => {
      const area = byId(dataRef.current.areas, id);
      if (area) mutate("areas", { ...area, ...updates });
    },
    addProject: (input) => {
      const ts = now();
      const project: Project = {
        id: newId("proj"),
        name: input.name.trim(),
        areaId: input.areaId,
        objective: input.objective ?? "",
        state: "active",
        createdAt: ts,
        updatedAt: ts,
        revision: 0
      };
      mutate("projects", project);
      return project.id;
    },
    updateProject: (id, updates) => {
      const project = byId(dataRef.current.projects, id);
      if (project) mutate("projects", { ...project, ...updates });
    },
    addTask: (input) => {
      const ts = now();
      const task: Task = {
        id: newId("task"),
        title: input.title.trim(),
        parent: input.parent,
        plannedDate: input.plannedDate ?? null,
        scheduledTime: input.plannedDate ? input.scheduledTime ?? null : null,
        state: "open",
        createdAt: ts,
        updatedAt: ts,
        revision: 0
      };
      mutate("tasks", task);
      return task.id;
    },
    updateTask: (id, updates) => {
      const task = byId(dataRef.current.tasks, id);
      if (!task) return;
      const next = { ...task, ...updates };
      if (!next.plannedDate) next.scheduledTime = null;
      mutate("tasks", next);
    },
    addDate: (input) => {
      const ts = now();
      const title = input.title.trim();
      if (!title || !input.date) throw new Error("Date title and date are required.");
      const date: ContextDate = {
        id: newId("date"),
        title,
        kind: input.kind,
        parent: input.parent,
        date: input.date,
        startTime: input.startTime ?? null,
        endTime: input.kind === "event" ? input.endTime ?? null : null,
        details: input.details ?? "",
        createdAt: ts,
        updatedAt: ts,
        revision: 0
      };
      mutate("dates", date);
      return date.id;
    },
    updateDate: (id, updates) => {
      const current = byId(dataRef.current.dates, id);
      if (!current) return;
      const next = { ...current, ...updates };
      next.title = next.title.trim();
      if (!next.title || !next.date) throw new Error("Date title and date are required.");
      if (next.kind === "deadline") next.endTime = null;
      mutate("dates", next);
    },
    updateDailyNote: (localDate, content) => {
      const ts = now();
      const existing = dataRef.current.dailyNotes.find((note) => note.localDate === localDate);
      const note: DailyNote = existing
        ? { ...existing, content }
        : {
            id: newId("daily-note"),
            localDate,
            content,
            createdAt: ts,
            updatedAt: ts,
            revision: 0
          };
      mutate("dailyNotes", note);
    }
  }), [
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
