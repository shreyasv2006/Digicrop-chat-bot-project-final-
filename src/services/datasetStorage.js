/**
 * datasetStorage.js
 * High-performance IndexedDB storage for DigiCrop AI datasets.
 * Solves the 5MB localStorage quota limit and avoids main-thread serialization freezes.
 */

const DB_NAME = 'digicrop_dataset_db';
const DB_VERSION = 1;
const STORE_NAME = 'datasets';
const LS_FALLBACK_KEY = 'digicrop_custom_datasets';

let dbInstance = null;
const memoryStore = new Map();

function getIDB() {
  if (
    typeof window !== 'undefined' &&
    (window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB)
  ) {
    return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
  }
  return null;
}

export function openDatasetDB() {
  return new Promise((resolve, reject) => {
    const idb = getIDB();
    if (!idb) {
      return resolve(null); // Fallback to memory / localStorage
    }
    if (dbInstance) {
      return resolve(dbInstance);
    }

    try {
      const req = idb.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('addedAt', 'addedAt', { unique: false });
        }
      };

      req.onsuccess = (e) => {
        dbInstance = e.target.result;
        resolve(dbInstance);
      };

      req.onerror = (e) => {
        console.warn('IndexedDB open error for datasets, using fallback:', e.target.error);
        resolve(null);
      };
    } catch (err) {
      console.warn('IndexedDB open exception, using fallback:', err);
      resolve(null);
    }
  });
}

/**
 * Load all custom datasets from IndexedDB (or localStorage fallback)
 */
export async function loadAllStoredDatasets() {
  const db = await openDatasetDB();
  if (!db) {
    // Fallback: localStorage / memoryStore
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(LS_FALLBACK_KEY);
        if (raw) return JSON.parse(raw);
      }
    } catch (e) {}
    return Array.from(memoryStore.values());
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const list = req.result || [];
        resolve(list);
      };

      req.onerror = () => {
        console.warn('Failed to load datasets from IndexedDB:', req.error);
        resolve([]);
      };
    } catch (err) {
      console.warn('IndexedDB read transaction error:', err);
      resolve([]);
    }
  });
}

/**
 * Save a single dataset record in ONE incremental transaction
 */
export async function saveDatasetRecord(dataset) {
  memoryStore.set(dataset.id, dataset);

  const db = await openDatasetDB();
  if (!db) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // Save minimal metadata to localStorage to prevent quota exhaustion
        const light = { ...dataset };
        if (light.raw && light.raw.length > 50000) light.raw = light.raw.slice(0, 50000) + '...';
        if (light.content && light.content.length > 50000) light.content = light.content.slice(0, 50000) + '...';
        if (light.rows && light.rows.length > 500) light.rows = light.rows.slice(0, 500);
        if (light.rowObjects && light.rowObjects.length > 500) light.rowObjects = light.rowObjects.slice(0, 500);

        const current = await loadAllStoredDatasets();
        const idx = current.findIndex((d) => d.id === dataset.id);
        if (idx !== -1) current[idx] = light;
        else current.push(light);
        window.localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(current));
      }
    } catch (e) {
      console.warn('localStorage dataset fallback save failed:', e);
    }
    return dataset;
  }

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(dataset);

      req.onsuccess = () => resolve(dataset);
      req.onerror = () => {
        console.error('IndexedDB put error:', req.error);
        reject(req.error || new Error('Could not save dataset to IndexedDB'));
      };
    } catch (err) {
      console.error('IndexedDB transaction error:', err);
      reject(err);
    }
  });
}

/**
 * Remove a dataset record by ID
 */
export async function removeDatasetRecord(id) {
  memoryStore.delete(id);

  const db = await openDatasetDB();
  if (!db) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const current = (await loadAllStoredDatasets()).filter((d) => d.id !== id);
        window.localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(current));
      }
    } catch (e) {}
    return;
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => {
        console.warn('Failed to delete dataset from IndexedDB:', req.error);
        resolve();
      };
    } catch (err) {
      resolve();
    }
  });
}

/**
 * Delete all datasets
 */
export async function clearAllStoredDatasets() {
  memoryStore.clear();

  const db = await openDatasetDB();
  if (!db) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(LS_FALLBACK_KEY);
      }
    } catch (e) {}
    return;
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    } catch (err) {
      resolve();
    }
  });
}

/**
 * Cleanup any unfinished datasets left in 'indexing' status from previous crash / force-close
 */
export async function cleanupUnfinishedDatasets() {
  const all = await loadAllStoredDatasets();
  const unfinished = all.filter((d) => d && d.status === 'indexing');
  if (unfinished.length === 0) return 0;

  for (const ds of unfinished) {
    await removeDatasetRecord(ds.id);
  }
  return unfinished.length;
}
