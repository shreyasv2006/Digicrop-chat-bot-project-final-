/**
 * DigiCrop AI - Dataset Service
 * Manages pre-packaged datasets and user-uploaded custom .md datasets
 */

import { getBuiltinDatasets, parseFrontMatter } from '../utils/ragEngine';

const CUSTOM_DATASETS_STORAGE_KEY = 'digicrop_custom_datasets';

class DatasetService {
  constructor() {
    this.builtinDatasets = getBuiltinDatasets();
    this.customDatasets = this.loadCustomDatasetsFromStorage();
  }

  loadCustomDatasetsFromStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem(CUSTOM_DATASETS_STORAGE_KEY);
        if (saved) {
          return JSON.parse(saved);
        }
      }
    } catch (err) {
      console.warn('Failed to load custom datasets from storage:', err);
    }
    return [];
  }

  saveCustomDatasetsToStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(CUSTOM_DATASETS_STORAGE_KEY, JSON.stringify(this.customDatasets));
      }
    } catch (err) {
      console.warn('Failed to save custom datasets to storage:', err);
    }
  }

  getAllDatasets() {
    return [...this.builtinDatasets, ...this.customDatasets];
  }

  getDatasetById(id) {
    return this.getAllDatasets().find(d => d.id === id || d.fileName === id);
  }

  addCustomDataset(rawMarkdown, fileName = 'custom_dataset.md') {
    const { metadata, content } = parseFrontMatter(rawMarkdown);
    const cleanId = 'custom_' + Date.now();
    
    const newDataset = {
      id: cleanId,
      fileName: fileName,
      name: metadata.name || fileName.replace('.md', '').toUpperCase(),
      category: metadata.category || 'User Dataset',
      farmId: metadata.farm_id || null,
      crop: metadata.crop || null,
      description: metadata.description || `Uploaded dataset (${fileName}).`,
      content: content || rawMarkdown,
      raw: rawMarkdown,
      isCustom: true,
      addedAt: new Date().toISOString(),
    };

    this.customDatasets.push(newDataset);
    this.saveCustomDatasetsToStorage();
    return newDataset;
  }

  removeCustomDataset(id) {
    this.customDatasets = this.customDatasets.filter(d => d.id !== id);
    this.saveCustomDatasetsToStorage();
  }

  getDatasetSelectorOptions() {
    const all = this.getAllDatasets();
    const options = [
      { id: 'general', label: '🌐 General Agriculture', description: 'Ask any agricultural question using Gemini Flash knowledge' },
    ];

    all.forEach(d => {
      let icon = '📊';
      if (d.category === 'Remote Sensing') icon = '🛰️';
      else if (d.category === 'Agronomic Knowledge') icon = '🌊';
      else if (d.category === 'Agro-Meteorology') icon = '☀️';
      else if (d.category === 'Telemetry Alerts') icon = '⚡';
      else if (d.category === 'Agronomy') icon = '🌱';
      else if (d.category === 'Decision Support') icon = '📋';
      else if (d.isCustom) icon = '📁';

      options.push({
        id: d.id,
        label: `${icon} ${d.name}`,
        description: d.description,
        category: d.category,
        farmId: d.farmId,
        isCustom: d.isCustom,
      });
    });

    return options;
  }
}

export const datasetService = new DatasetService();
