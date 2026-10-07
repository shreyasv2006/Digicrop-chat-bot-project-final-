/**
 * DigiCrop AI - Dataset Service
 * Manages pre-packaged datasets and user-uploaded custom .md, .csv, and .txt datasets
 */

import { getBuiltinDatasets, parseFrontMatter } from '../utils/ragEngine';

const CUSTOM_DATASETS_STORAGE_KEY = 'digicrop_custom_datasets';

export function parseCSV(csvText) {
  if (!csvText || typeof csvText !== 'string') return { headers: [], rows: [] };
  const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  function parseRow(rowText) {
    const fields = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < rowText.length; i++) {
      const char = rowText[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(cur.trim().replace(/^"|"$/g, ''));
        cur = '';
      } else {
        cur += char;
      }
    }
    fields.push(cur.trim().replace(/^"|"$/g, ''));
    return fields;
  }

  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(parseRow);
  return { headers, rows };
}

export function convertCSVToMarkdown(csvText, fileName = 'dataset.csv') {
  const { headers, rows } = parseCSV(csvText);
  if (headers.length === 0) return csvText;

  let md = `# Dataset: ${fileName}\n\n`;
  rows.forEach((row, idx) => {
    md += `## Record ${idx + 1}\n`;
    headers.forEach((h, hIdx) => {
      const val = row[hIdx] || 'N/A';
      md += `- **${h}**: ${val}\n`;
    });
    md += '\n';
  });
  return md;
}

export function countDatasetChunks(content) {
  if (!content || typeof content !== 'string') return 0;
  const sections = content.split(/(?=\n##\s+)/g).filter(s => s.trim().length > 0);
  if (sections.length > 1) return sections.length;
  
  // Try splitting by paragraph or section breaks
  const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  if (paragraphs.length > 1) return Math.min(paragraphs.length, 50);

  // If table/CSV lines
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length > 2) {
    // Chunk row groups of 3-5 rows
    return Math.min(Math.ceil((lines.length - 1) / 3), 50);
  }

  return 1;
}

export function extractFarmIdsFromContent(text) {
  if (!text) return [];
  const matches = text.match(/\bF[0-9]{3}\b|\bF00[0-9]\b/gi) || [];
  const unique = Array.from(new Set(matches.map(m => m.toUpperCase())));
  return unique;
}

export const DATASET_TEMPLATES = {
  farm_profile: {
    title: 'Farm Profile Template',
    extension: 'csv',
    content: `farm_id,name,owner,location,area_acres,crop,variety,sowing_date,irrigation_type,soil_type
F007,Green Valley Organic Farm,Ramesh Patil,Nashik Maharashtra,12.5,Grapes,Thompson Seedless,2025-10-15,Drip,Clay Loam (EXAMPLE)`
  },
  telemetry_time_series: {
    title: 'Telemetry Time Series Template',
    extension: 'csv',
    content: `farm_id,timestamp,soil_moisture_pct,soil_ph,ec_ds_m,soil_temp_c,air_temp_c,humidity_pct,rainfall_mm,ndvi
F007,2026-10-07T06:00:00Z,24.5,6.8,1.4,22.1,28.4,62.0,0.0,0.72 (EXAMPLE)`
  },
  crop_knowledge: {
    title: 'Crop Knowledge Template',
    extension: 'md',
    content: `---
name: Crop Knowledge Protocol
category: Agronomy
---

# Crop Knowledge: Table Grapes

## Growth Stages & Water Needs
- **Stage**: Fruit Development (October-November)
- **Water Need**: 35mm per week via root-zone drip
- **Ideal Soil pH**: 6.5 - 7.2
- **NPK Balance**: High Potassium (12:5:24) during berry sizing (EXAMPLE)`
  },
  pests_diseases: {
    title: 'Pests & Diseases Template',
    extension: 'csv',
    content: `crop,pest_disease,symptoms,favorable_conditions,organic_control,chemical_control,prevention
Grapes,Downy Mildew,Oily leaf spots white fluffy growth under leaf,High humidity >85% and warm night temp,Neem oil spray 5ml/L,Copper Hydroxide 2g/L,Ensure canopy ventilation (EXAMPLE)`
  },
  fertilizer_schedule: {
    title: 'Fertilizer & Irrigation Schedule',
    extension: 'csv',
    content: `crop,stage,product,dose_per_acre,timing,method
Wheat,Crown Root Initiation,Urea + Single Super Phosphate,45kg Urea + 50kg SSP,21 days after sowing,Soil broadcasting followed by light irrigation (EXAMPLE)`
  },
  thresholds_rules: {
    title: 'Thresholds & Alert Rules',
    extension: 'csv',
    content: `metric,optimal_range,warning_range,critical_range,recommended_action
Soil Moisture %,28% - 35%,20% - 27%,< 18%,Trigger emergency drip irrigation for 90 mins (EXAMPLE)`
  },
  weather_forecast: {
    title: 'Weather Forecast Template',
    extension: 'csv',
    content: `location,date,temp_min_c,temp_max_c,rainfall_mm,humidity_pct,wind_kmh
Nashik,2026-10-07,19.5,31.2,0.0,58,12 (EXAMPLE)`
  },
  mandi_prices: {
    title: 'Mandi Prices Template',
    extension: 'csv',
    content: `crop,market,date,min_price_rs,max_price_rs,modal_price_rs
Grapes (Export Grade),Pimpalgaon APMC,2026-10-07,70,110,92 (EXAMPLE)`
  },
  govt_schemes: {
    title: 'Government Schemes Template',
    extension: 'md',
    content: `---
name: PM Krishi Sinchayee Yojana
category: Government Scheme
---

## PM Krishi Sinchayee Yojana (PMKSY)
- **Benefit**: 55% subsidy on Drip and Micro-Irrigation installation
- **Eligibility**: Small & marginal farmers with verified land titles
- **How to Apply**: Submit application via state Mahadbt or DBT Agriculture portal with Aadhar and land 7/12 extract (EXAMPLE)`
  },
  faq: {
    title: 'FAQ Template',
    extension: 'csv',
    content: `question,answer,language
What is ideal EC for grape soil?,Ideal Electrical Conductivity (EC) for table grape soil is below 1.5 dS/m to prevent root salt stress.,English (EXAMPLE)`
  }
};

class DatasetService {
  constructor() {
    this.builtinDatasets = [];
    this.customDatasets = this.loadCustomDatasetsFromStorage();
    this.listeners = [];
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
    this.notifyListeners();
  }

  getAllDatasets() {
    return [...this.customDatasets].map(d => {
      const chunks = countDatasetChunks(d.content);
      const source = d.isPasted ? 'Pasted' : 'Uploaded';
      const farmIds = extractFarmIdsFromContent(d.content + ' ' + (d.farmId || ''));
      return {
        ...d,
        chunkCount: chunks,
        source: source,
        detectedFarmIds: farmIds,
      };
    });
  }

  getDatasetById(id) {
    return this.getAllDatasets().find(d => d.id === id || d.fileName === id);
  }

  getLoadedFarmIds() {
    const set = new Set();
    this.getAllDatasets().forEach(d => {
      if (d.farmId) set.add(d.farmId.toUpperCase());
      if (d.detectedFarmIds) {
        d.detectedFarmIds.forEach(fid => set.add(fid.toUpperCase()));
      }
    });
    return Array.from(set).sort();
  }

  addCustomDataset(rawText, fileName = 'custom_dataset.md', isPasted = false) {
    let contentToProcess = rawText;
    const lowerName = fileName.toLowerCase();

    if (lowerName.endsWith('.csv')) {
      contentToProcess = convertCSVToMarkdown(rawText, fileName);
    }

    const { metadata, content } = parseFrontMatter(contentToProcess);
    const cleanId = 'custom_' + Date.now();
    const cleanName = metadata.name || fileName.replace(/\.[^/.]+$/, '').toUpperCase();
    const extractedFarms = extractFarmIdsFromContent(rawText + ' ' + (metadata.farm_id || ''));
    const detectedFarm = metadata.farm_id || (extractedFarms.length > 0 ? extractedFarms[0] : null);

    const newDataset = {
      id: cleanId,
      fileName: fileName,
      name: cleanName,
      category: metadata.category || 'User Dataset',
      farmId: detectedFarm,
      crop: metadata.crop || null,
      description: metadata.description || `Custom dataset (${fileName}).`,
      content: content || contentToProcess,
      raw: rawText,
      isCustom: true,
      isPasted: isPasted,
      addedAt: new Date().toISOString(),
    };

    const existingIndex = this.customDatasets.findIndex(d => 
      d.fileName.toLowerCase() === fileName.toLowerCase() ||
      d.name.toLowerCase() === cleanName.toLowerCase()
    );

    if (existingIndex !== -1) {
      this.customDatasets[existingIndex] = newDataset;
    } else {
      this.customDatasets.push(newDataset);
    }

    this.saveCustomDatasetsToStorage();
    return this.getDatasetById(cleanId) || newDataset;
  }

  renameCustomDataset(id, newName) {
    const ds = this.customDatasets.find(d => d.id === id);
    if (ds) {
      ds.name = newName.trim();
      this.saveCustomDatasetsToStorage();
    }
  }

  removeCustomDataset(id) {
    this.customDatasets = this.customDatasets.filter(d => d.id !== id);
    this.saveCustomDatasetsToStorage();
  }

  removeAllDatasets() {
    this.customDatasets = [];
    this.saveCustomDatasetsToStorage();
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
        description: d.description,
        category: d.category || 'User Dataset',
        farmId: d.farmId,
        isCustom: true,
        chunkCount: d.chunkCount,
      });
    });

    return options;
  }
}

export const datasetService = new DatasetService();
export default datasetService;
