/**
 * datasetStore.js - Simplified IndexedDB storage for datasets
 */

const DB_NAME = 'digicrop_db';
const DB_VERSION = 2; // bumped schema version

export function openDatasetDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not available in this browser.'));
    }

    const timeout = setTimeout(() => reject(new Error('IndexedDB open timed out (5s).')), 5000);
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);

    req.onblocked = () => {
      clearTimeout(timeout);
      reject(new Error('IndexedDB is blocked. Please close other tabs of this app and try again.'));
    };

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('chunks')) {
        const chunkStore = db.createObjectStore('chunks', { keyPath: 'id' });
        chunkStore.createIndex('datasetId', 'datasetId', { unique: false });
      }
      if (!db.objectStoreNames.contains('rows')) {
        const rowStore = db.createObjectStore('rows', { keyPath: 'id' });
        rowStore.createIndex('datasetId', 'datasetId', { unique: false });
      }
    };

    req.onsuccess = (e) => {
      clearTimeout(timeout);
      const db = e.target.result;
      db.onversionchange = () => {
        db.close();
      };
      resolve(db);
    };

    req.onerror = (e) => {
      clearTimeout(timeout);
      reject(new Error(`IndexedDB open failed: ${e.target.error}`));
    };
  });
}

export async function cleanupStaleDatasets() {
  const db = await openDatasetDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['meta', 'chunks', 'rows'], 'readwrite');
    const store = tx.objectStore('meta');
    const req = store.getAll();

    req.onsuccess = () => {
      const all = req.result || [];
      const stale = all.filter(d => d.status !== 'ready');
      if (stale.length === 0) return;

      const chunkStore = tx.objectStore('chunks');
      const rowStore = tx.objectStore('rows');

      stale.forEach(d => {
        store.delete(d.id);
        const chunkIdx = chunkStore.index('datasetId');
        chunkIdx.openCursor(IDBKeyRange.only(d.id)).onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          }
        };
        const rowIdx = rowStore.index('datasetId');
        rowIdx.openCursor(IDBKeyRange.only(d.id)).onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          }
        };
      });
    };

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveDataset(meta, chunks, rowBlocks) {
  const db = await openDatasetDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['meta', 'chunks', 'rows'], 'readwrite');

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(new Error('Transaction aborted'));

    const metaStore = tx.objectStore('meta');
    metaStore.put({ ...meta, status: 'ready' });

    const chunkStore = tx.objectStore('chunks');
    for (const chunk of chunks) {
      chunkStore.put(chunk);
    }

    const rowStore = tx.objectStore('rows');
    for (const block of rowBlocks) {
      rowStore.put(block);
    }
  });
}

export async function loadAllMetadata() {
  const db = await openDatasetDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('meta', 'readonly');
    const store = tx.objectStore('meta');
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result || []).filter(d => d.status === 'ready'));
    req.onerror = () => reject(req.error);
  });
}

export async function deleteDataset(id) {
  const db = await openDatasetDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['meta', 'chunks', 'rows'], 'readwrite');
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);

    tx.objectStore('meta').delete(id);
    
    const chunkStore = tx.objectStore('chunks');
    const chunkIdx = chunkStore.index('datasetId');
    chunkIdx.openCursor(IDBKeyRange.only(id)).onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    const rowStore = tx.objectStore('rows');
    const rowIdx = rowStore.index('datasetId');
    rowIdx.openCursor(IDBKeyRange.only(id)).onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  });
}
