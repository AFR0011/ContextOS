import type { QueuedMutation, WorkspaceData } from "./types";

const DB_NAME = "contextos-offline-v1";
const DB_VERSION = 2;

const LEGACY_STORE = "kv";
const USER_STORE = "users";
const WORKSPACE_STORE = "workspaces";
const OUTBOX_STORE = "outboxes";
const LEGACY_WORKSPACE_KEY = "workspace";
const LEGACY_OUTBOX_KEY = "outbox";

export interface LocalVerifiedUser {
  id: string;
  email: string;
  verifiedAt?: string;
}

interface StoredLocalUser {
  id: string;
  email: string;
  verifiedAt: string;
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
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(LEGACY_STORE)) db.createObjectStore(LEGACY_STORE);
      if (!db.objectStoreNames.contains(USER_STORE)) db.createObjectStore(USER_STORE, { keyPath: "id" });
      if (!db.objectStoreNames.contains(WORKSPACE_STORE)) db.createObjectStore(WORKSPACE_STORE);
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) db.createObjectStore(OUTBOX_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("ContextOS local database upgrade is blocked by another open tab."));
  });
}

async function migrateLegacyV1ForUser(db: IDBDatabase, user: LocalVerifiedUser) {
  if (!db.objectStoreNames.contains(LEGACY_STORE)) return;

  const tx = db.transaction([LEGACY_STORE, USER_STORE, WORKSPACE_STORE, OUTBOX_STORE], "readwrite");
  const legacy = tx.objectStore(LEGACY_STORE);
  const workspaces = tx.objectStore(WORKSPACE_STORE);
  const outboxes = tx.objectStore(OUTBOX_STORE);
  const users = tx.objectStore(USER_STORE);

  const [legacyWorkspace, legacyOutbox, currentWorkspace, currentOutbox] = await Promise.all([
    requestValue(legacy.get(LEGACY_WORKSPACE_KEY)),
    requestValue(legacy.get(LEGACY_OUTBOX_KEY)),
    requestValue(workspaces.get(user.id)),
    requestValue(outboxes.get(user.id))
  ]);

  if (currentWorkspace === undefined && legacyWorkspace !== undefined) {
    workspaces.put(legacyWorkspace, user.id);
  }
  if (currentOutbox === undefined && legacyOutbox !== undefined) {
    outboxes.put(legacyOutbox, user.id);
  }

  users.put(storedUser(user));

  if (legacyWorkspace !== undefined) legacy.delete(LEGACY_WORKSPACE_KEY);
  if (legacyOutbox !== undefined) legacy.delete(LEGACY_OUTBOX_KEY);

  await transactionDone(tx);
}

async function withUserDb<T>(user: LocalVerifiedUser, operation: (db: IDBDatabase) => Promise<T>): Promise<T> {
  const db = await openDb();
  try {
    await migrateLegacyV1ForUser(db, user);
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
    tx.objectStore(USER_STORE).put(storedUser(user));
    await transactionDone(tx);
  });
}

export async function readLocalUser(userId: string): Promise<StoredLocalUser | null> {
  return withDb(async (db) => {
    const tx = db.transaction(USER_STORE, "readonly");
    const value = await requestValue(tx.objectStore(USER_STORE).get(userId));
    await transactionDone(tx);
    return (value as StoredLocalUser | undefined) ?? null;
  });
}

export async function listLocalUsers(): Promise<StoredLocalUser[]> {
  return withDb(async (db) => {
    const tx = db.transaction(USER_STORE, "readonly");
    const values = await requestValue(tx.objectStore(USER_STORE).getAll());
    await transactionDone(tx);
    return (values as StoredLocalUser[]).sort((a, b) => b.verifiedAt.localeCompare(a.verifiedAt));
  });
}

export async function readLocalWorkspace(user: LocalVerifiedUser): Promise<WorkspaceData | null> {
  return withUserDb(user, async (db) => {
    const tx = db.transaction(WORKSPACE_STORE, "readonly");
    const value = await requestValue(tx.objectStore(WORKSPACE_STORE).get(user.id));
    await transactionDone(tx);
    return (value as WorkspaceData | undefined) ?? null;
  });
}

export async function writeLocalWorkspace(user: LocalVerifiedUser, workspace: WorkspaceData) {
  await withUserDb(user, async (db) => {
    const tx = db.transaction(WORKSPACE_STORE, "readwrite");
    tx.objectStore(WORKSPACE_STORE).put(workspace, user.id);
    await transactionDone(tx);
  });
}

export async function readLocalOutbox(user: LocalVerifiedUser): Promise<QueuedMutation[]> {
  return withUserDb(user, async (db) => {
    const tx = db.transaction(OUTBOX_STORE, "readonly");
    const value = await requestValue(tx.objectStore(OUTBOX_STORE).get(user.id));
    await transactionDone(tx);
    return (value as QueuedMutation[] | undefined) ?? [];
  });
}

export async function writeLocalOutbox(user: LocalVerifiedUser, outbox: QueuedMutation[]) {
  await withUserDb(user, async (db) => {
    const tx = db.transaction(OUTBOX_STORE, "readwrite");
    tx.objectStore(OUTBOX_STORE).put(outbox, user.id);
    await transactionDone(tx);
  });
}

export const LOCAL_DB_INFO = {
  name: DB_NAME,
  version: DB_VERSION,
  stores: {
    users: USER_STORE,
    workspaces: WORKSPACE_STORE,
    outboxes: OUTBOX_STORE,
    legacy: LEGACY_STORE
  }
} as const;
