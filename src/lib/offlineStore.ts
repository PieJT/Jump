import type { OfflineTrackMeta } from "../types";

const DB_NAME = "jump-offline";
const DB_VERSION = 1;
const STORE = "tracks";

/** A stored record: track metadata plus the actual audio bytes, in one row so we never have the two get out of sync. */
export interface StoredTrack extends OfflineTrackMeta {
  blob: Blob;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Failed to open offline storage"));
  });
  return dbPromise;
}

function requestToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed"));
  });
}

export async function putOfflineTrack(track: StoredTrack): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).put(track);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to save track"));
  });
}

export async function getOfflineTrack(id: string): Promise<StoredTrack | undefined> {
  const db = await openDB();
  const tx = db.transaction(STORE, "readonly");
  return requestToPromise(tx.objectStore(STORE).get(id));
}

export async function deleteOfflineTrack(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).delete(id);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to delete track"));
  });
}

/** Metadata only (no blobs) — cheap enough to call whenever the offline list needs a refresh. */
export async function listOfflineTracks(): Promise<OfflineTrackMeta[]> {
  const db = await openDB();
  const tx = db.transaction(STORE, "readonly");
  const all = await requestToPromise(tx.objectStore(STORE).getAll());
  return (all as StoredTrack[])
    .map(({ blob: _blob, ...meta }) => meta)
    .sort((a, b) => b.downloadedAt - a.downloadedAt);
}

export async function isTrackDownloaded(id: string): Promise<boolean> {
  const db = await openDB();
  const tx = db.transaction(STORE, "readonly");
  const key = await requestToPromise(tx.objectStore(STORE).getKey(id));
  return key !== undefined;
}

export async function getOfflineStorageUsedBytes(): Promise<number> {
  const tracks = await listOfflineTracks();
  return tracks.reduce((sum, t) => sum + t.sizeBytes, 0);
}

/** Browser-reported quota, when available (Safari/older browsers may not support the Storage API). */
export async function getStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (!navigator.storage?.estimate) return null;
  try {
    const { usage, quota } = await navigator.storage.estimate();
    if (usage === undefined || quota === undefined) return null;
    return { usage, quota };
  } catch {
    return null;
  }
}