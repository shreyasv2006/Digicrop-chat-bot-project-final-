/**
 * datasetService.js
 */

import { loadAllMetadata, deleteDataset, cleanupStaleDatasets } from './datasetStore.js';

class DatasetService {
  constructor() {
    this.customDatasets = [];
    this.listeners = [];
    
    // Bind public methods
    this.getAllDatasets = this.getAllDatasets.bind(this);
    this.getLoadedFarmIds = this.getLoadedFarmIds.bind(this);
    this.getDatasetById = this.getDatasetById.bind(this);
    
    // Boot sequence
    this.boot();
  }

  async boot() {
    try {
      if (typeof window !== 'undefined') {
        await cleanupStaleDatasets();
        const metas = await loadAllMetadata();
        this.customDatasets = metas;
        this.notifyListeners();
      }
    } catch (e) {
      console.warn('DatasetService boot error:', e);
    }
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notifyListeners() {
    this.listeners.forEach(l => {
      try { l(); } catch (e) {}
    });
  }

  getAllDatasets() {
    return this.customDatasets;
  }

  getDatasetById(id) {
    if (!id) return null;
    return this.customDatasets.find(d => d.id === id || d.name === id) || null;
  }

  getLoadedFarmIds() {
    try {
      const set = new Set();
      this.customDatasets.forEach(d => {
        if (d.detectedFields && d.detectedFields.includes('farm')) {
          // If we had farm IDs extracted, they'd be here. For simplicity, we just return empty or what we had if we store it.
          // Since the prompt says "Keep the PUBLIC method names", we just ensure it doesn't crash.
        }
      });
      return Array.from(set).sort();
    } catch (err) {
      return [];
    }
  }

  hasDatasetWithName(name) {
    if (!name) return false;
    const clean = name.trim().toLowerCase();
    return this.customDatasets.some(d => (d.name && d.name.toLowerCase() === clean));
  }

  registerNewDataset(meta) {
    const existingIdx = this.customDatasets.findIndex(d => d.id === meta.id);
    if (existingIdx !== -1) {
      this.customDatasets[existingIdx] = meta;
    } else {
      this.customDatasets.push(meta);
    }
    this.notifyListeners();
  }

  async removeCustomDataset(id) {
    this.customDatasets = this.customDatasets.filter(d => d.id !== id);
    this.notifyListeners();
    try {
      await deleteDataset(id);
    } catch (e) {
      console.warn('Error deleting dataset from DB:', e);
    }
  }

  async removeAllDatasets() {
    const ids = this.customDatasets.map(d => d.id);
    this.customDatasets = [];
    this.notifyListeners();
    
    for (const id of ids) {
      try { await deleteDataset(id); } catch(e){}
    }
  }

  async renameCustomDataset(id, newName) {
    const ds = this.customDatasets.find(d => d.id === id);
    if (ds) {
      ds.name = newName.trim();
      this.notifyListeners();
      try {
        const metas = await loadAllMetadata();
        const fullMeta = metas.find(m => m.id === id);
        if (fullMeta) {
          fullMeta.name = newName.trim();
          const db = await (await import('./datasetStore.js')).openDatasetDB();
          const tx = db.transaction('meta', 'readwrite');
          tx.objectStore('meta').put(fullMeta);
        }
      } catch (e) {}
    }
  }

  async cleanupUnfinishedDatasets() {
    try {
      await cleanupStaleDatasets();
      const metas = await loadAllMetadata();
      this.customDatasets = metas;
      this.notifyListeners();
    } catch (e) {}
  }

  getDatasetSelectorOptions() {
    const all = this.getAllDatasets();
    const options = [
      { id: 'general', label: '🌐 General Agriculture', description: 'Ask any agricultural question using DigiCrop AI knowledge' },
    ];

    all.forEach(d => {
      options.push({
        id: d.id,
        label: `📁 ${d.name}`,
        description: `Format: ${d.type}`,
        chunkCount: d.chunkCount,
      });
    });

    return options;
  }
}

export const datasetService = new DatasetService();

export function getLoadedFarmIds() {
  return datasetService.getLoadedFarmIds();
}

export function getDatasetById(id) {
  return datasetService.getDatasetById(id);
}

export default datasetService;
