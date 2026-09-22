import type { QueuedMutation, WorkspaceData } from "./types";

const DB_NAME = "contextos-offline-v1";
const DB_VERSION = 3;

const USER_STORE = "users";
const WORKSPACE_STORE = "workspaces";
const OUTBOX_STORE = "outboxes";

export interface LocalVerifiedUser {
  id: string;
  email: string;
  verifiedAt?: string;
}

export interface StoredLocalUser {
  id: string;
  email: string;
  verifiedAt: string;
}

export interface LocalMutationCommitResult {
  outbox: QueuedMutation[];
  workspace: WorkspaceData;
}

function storedUser(user: LocalVerifiedUser): StoredLocalUser {
  return {
    id: user.id,
    email: user.email,
    verifiedAt: user.verifiedAt ?? new Date().toISOString()
  };
}

function requestValue<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      const oldVersion = (event as IDBVersionChangeEvent).oldVersion;
      const tx = request.transaction;
      if (!db.objectStoreNames.contains(USER_STORE)) db.createObjectStore(USER_STORE, { keyPath: "id" });
      if (!db.objectStoreNames.contains(WORKSPACE_STORE)) db.createObjectStore(WORKSPACE_STORE);
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) db.createObjectStore(OUTBOX_STORE);

      // C8 is a deliberate clean persistence break. There are no real users yet,
      // so incompatible v2 workspace/outbox snapshots are discarded and rebuilt
      // from authenticated canonical bootstrap instead of carrying obsolete shapes.
      if (oldVersion < 3 && tx) {
        tx.objectStore(WORKSPACE_STORE).clear();
        tx.objectStore(OUTBOX_STORE).clear();
        if (db.objectStoreNames.contains("kv")) db.deleteObjectStore("kv");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("ContextOS local database upgrade is blocked by another open tab."));
  });
}

async function withUserDb<T>(user: LocalVerifiedUser, operation: (db: IDBDatabase) => Promise<T>): Promise<T> {
  const db = await openDb();
  try {
    return await operation(db);
  } finally {
    db.close();
  }
}

async function withDb<T>(operation: (db: IDBDatabase) => Promise<T>): Promise<T> {
  const db = await openDb();
  try {
    return await operation(db);
  } finally {
    db.close();
  }
}

export async function rememberLocalUser(user: LocalVerifiedUser) {
  await withUserDb(user, async (db) => {
    const tx = db.transaction(USER_STORE, "readwrite");
    const done = transactionDone(tx);
    tx.objectStore(USER_STORE).put(storedUser(user));
    await done;
  });
}

export async function readLocalUser(userId: string): Promise<StoredLocalUser | null> {
  return withDb(async (db) => {
    const tx = db.transaction(USER_STORE, "readonly");
    const done = transactionDone(tx);
    const value = await requestValue(tx.objectStore(USER_STORE).get(userId));
    await done;
    return (value as StoredLocalUser | undefined) ?? null;
  });
}

export async function listLocalUsers(): Promise<StoredLocalUser[]> {
  return withDb(async (db) => {
    const tx = db.transaction(USER_STORE, "readonly");
    const done = transactionDone(tx);
    const values = await requestValue(tx.objectStore(USER_STORE).getAll());
    await done;
    return (values as StoredLocalUser[]).sort((a, b) => b.verifiedAt.localeCompare(a.verifiedAt));
  });
}

export async function readLocalWorkspace(user: LocalVerifiedUser): Promise<WorkspaceData | null> {
  return withUserDb(user, async (db) => {
    const tx = db.transaction(WORKSPACE_STORE, "readonly");
    const done = transactionDone(tx);
    const value = await requestValue(tx.objectStore(WORKSPACE_STORE).get(user.id));
    await done;
    return (value as WorkspaceData | undefined) ?? null;
  });
}

export async function writeLocalWorkspace(user: LocalVerifiedUser, workspace: WorkspaceData) {
  await withUserDb(user, async (db) => {
    const tx = db.transaction(WORKSPACE_STORE, "readwrite");
    const done = transactionDone(tx);
    tx.objectStore(WORKSPACE_STORE).put(workspace, user.id);
    await done;
  });
}

export async function readLocalOutbox(user: LocalVerifiedUser): Promise<QueuedMutation[]> {
  return withUserDb(user, async (db) => {
    const tx = db.transaction(OUTBOX_STORE, "readonly");
    const done = transactionDone(tx);
    const value = await requestValue(tx.objectStore(OUTBOX_STORE).get(user.id));
    await done;
    return (value as QueuedMutation[] | undefined) ?? [];
  });
}

export async function writeLocalOutbox(user: LocalVerifiedUser, outbox: QueuedMutation[]) {
  await withUserDb(user, async (db) => {
    const tx = db.transaction(OUTBOX_STORE, "readwrite");
    const done = transactionDone(tx);
    tx.objectStore(OUTBOX_STORE).put(outbox, user.id);
    await done;
  });
}

export async function replaceLocalWorkspaceState(
  user: LocalVerifiedUser,
  workspace: WorkspaceData,
  outbox: QueuedMutation[] = []
) {
  await withUserDb(user, async (db) => {
    const tx = db.transaction([WORKSPACE_STORE, OUTBOX_STORE], "readwrite");
    const done = transactionDone(tx);
    tx.objectStore(WORKSPACE_STORE).put(workspace, user.id);
    tx.objectStore(OUTBOX_STORE).put(outbox, user.id);
    await done;
  });
}

function replaceRecord<T extends { id: string }>(items: T[], record: T) {
  const exists = items.some((item) => item.id === record.id);
  return exists ? items.map((item) => (item.id === record.id ? record : item)) : [record, ...items];
}

function applyMutationsToWorkspace(workspace: WorkspaceData, mutations: QueuedMutation[]) {
  return mutations.reduce((current, mutation) => {
    const records = current[mutation.entityType] as { id: string }[];
    const payload = mutation.payload as { id: string };
    return {
      ...current,
      [mutation.entityType]: replaceRecord(records, payload)
    } as WorkspaceData;
  }, workspace);
}

export async function commitLocalMutationBatch(
  user: LocalVerifiedUser,
  mutations: QueuedMutation[]
): Promise<LocalMutationCommitResult> {
  if (mutations.length === 0) {
    throw new Error("A local mutation commit requires at least one queued mutation.");
  }

  return withUserDb(user, (db) =>
    new Promise<LocalMutationCommitResult>((resolve, reject) => {
      const tx = db.transaction([WORKSPACE_STORE, OUTBOX_STORE], "readwrite");
      const workspaces = tx.objectStore(WORKSPACE_STORE);
      const outboxes = tx.objectStore(OUTBOX_STORE);
      const workspaceRequest = workspaces.get(user.id);
      const outboxRequest = outboxes.get(user.id);
      let committedOutbox: QueuedMutation[] = [];
      let committedWorkspace: WorkspaceData | null = null;
      let workspaceReady = false;
      let outboxReady = false;

      const abort = () => {
        try {
          tx.abort();
        } catch {
          // Request failure may already have aborted the transaction.
        }
      };

      const queueWrites = () => {
        if (!workspaceReady || !outboxReady || committedWorkspace) return;
        const durableWorkspace = (workspaceRequest.result as WorkspaceData | undefined) ?? {
          areas: [],
          projects: [],
          tasks: [],
          dates: [],
          dailyNotes: [],
          serverSyncedAt: ""
        };
        const existingOutbox = (outboxRequest.result as QueuedMutation[] | undefined) ?? [];
        committedWorkspace = applyMutationsToWorkspace(durableWorkspace, mutations);
        committedOutbox = [...existingOutbox, ...mutations];

        // Only this transaction's mutation payloads are applied to the durable
        // workspace. Uncommitted optimistic UI state can never hitchhike into a
        // later successful IndexedDB transaction.
        workspaces.put(committedWorkspace, user.id);
        outboxes.put(committedOutbox, user.id);
      };

      workspaceRequest.onsuccess = () => {
        workspaceReady = true;
        queueWrites();
      };
      workspaceRequest.onerror = abort;
      outboxRequest.onsuccess = () => {
        outboxReady = true;
        queueWrites();
      };
      outboxRequest.onerror = abort;

      tx.oncomplete = () => {
        if (!committedWorkspace) {
          reject(new Error("Local workspace mutation transaction completed without a workspace commit."));
          return;
        }
        resolve({ outbox: committedOutbox, workspace: committedWorkspace });
      };
      tx.onerror = () => reject(tx.error ?? workspaceRequest.error ?? outboxRequest.error ?? new Error("Could not commit local workspace mutation."));
      tx.onabort = () => reject(tx.error ?? workspaceRequest.error ?? outboxRequest.error ?? new Error("Local workspace mutation transaction was aborted."));
    })
  );
}

export const LOCAL_DB_INFO = {
  name: DB_NAME,
  version: DB_VERSION,
  stores: {
    users: USER_STORE,
    workspaces: WORKSPACE_STORE,
    outboxes: OUTBOX_STORE
  }
} as const;
