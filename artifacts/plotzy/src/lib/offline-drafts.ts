// ---------------------------------------------------------------------------
// offline-drafts.ts
//
// Lightweight IndexedDB store that keeps the latest unsaved chapter content
// locally.  The chapter-editor can call saveDraft() on every debounced edit
// and loadDraft() on mount to recover content that was never flushed to the
// server (e.g. the user lost connectivity or closed the tab).
//
// Why IndexedDB instead of localStorage?
//   - No 5 MB cap — chapters with embedded images can be large.
//   - Async — won't block the main thread on large writes.
// ---------------------------------------------------------------------------

const DB_NAME = "plotzy-offline";
const DB_VERSION = 1;
const STORE = "drafts";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "chapterId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export interface DraftEntry {
  chapterId: number;
  bookId: number;
  title: string;
  content: string;
  savedAt: number; // Date.now()
}

/** Persist the current editor state locally. Call this on every debounce tick. */
export async function saveDraft(draft: DraftEntry): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(draft);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Load a locally-saved draft (if any). Returns null when nothing is cached. */
export async function loadDraft(
  chapterId: number,
): Promise<DraftEntry | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(chapterId);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

/** Remove the local draft after a successful server save. */
export async function clearDraft(chapterId: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(chapterId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
