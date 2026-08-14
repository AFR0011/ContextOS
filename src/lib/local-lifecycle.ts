import { LOCAL_DB_INFO } from "./local-db";

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB lifecycle transaction aborted."));
  });
}

function openLifecycleDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(LOCAL_DB_INFO.name, LOCAL_DB_INFO.version);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open ContextOS local storage."));
    request.onblocked = () => reject(new Error("ContextOS local storage is blocked by another open tab."));
    request.onupgradeneeded = () => {
      // Lifecycle operations never define schema. If this fires, local-db.ts and this
      // module disagree about the active schema version and cleanup must fail closed.
      request.transaction?.abort();
    };
  });
}

async function withLifecycleDb(operation: (db: IDBDatabase) => Promise<void>) {
  const db = await openLifecycleDb();
  try {
    await operation(db);
  } finally {
    db.close();
  }
}

/**
 * Remove the current cached workspace and queued mutations for exactly one user.
 * The remembered verified identity is retained so ContextOS can still identify
 * which local account exists on this device, but the workspace cannot cold-open
 * until it is rebuilt from the server after a later authenticated login.
 */
export async function clearLocalWorkspaceState(userId: string) {
  if (!userId) throw new Error("A verified user id is required for local cleanup.");

  await withLifecycleDb(async (db) => {
    const tx = db.transaction(
      [LOCAL_DB_INFO.stores.workspaces, LOCAL_DB_INFO.stores.outboxes],
      "readwrite"
    );
    const done = transactionDone(tx);
    tx.objectStore(LOCAL_DB_INFO.stores.workspaces).delete(userId);
    tx.objectStore(LOCAL_DB_INFO.stores.outboxes).delete(userId);
    await done;
  });
}

/**
 * Remove all ContextOS IndexedDB state belonging to exactly one verified user on
 * the current browser. Other remembered users and their workspaces are untouched.
 */
export async function removeLocalUserDeviceData(userId: string) {
  if (!userId) throw new Error("A verified user id is required for local cleanup.");

  await withLifecycleDb(async (db) => {
    const tx = db.transaction(
      [LOCAL_DB_INFO.stores.users, LOCAL_DB_INFO.stores.workspaces, LOCAL_DB_INFO.stores.outboxes],
      "readwrite"
    );
    const done = transactionDone(tx);
    tx.objectStore(LOCAL_DB_INFO.stores.users).delete(userId);
    tx.objectStore(LOCAL_DB_INFO.stores.workspaces).delete(userId);
    tx.objectStore(LOCAL_DB_INFO.stores.outboxes).delete(userId);
    await done;
  });
}
