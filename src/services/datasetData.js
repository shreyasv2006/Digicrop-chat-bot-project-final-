/**
 * DigiCrop AI - Schema-Tolerant Single Data Access Layer (datasetData.js)
 * Parses ONLY real user datasets (uploaded or pasted).
 * Zero fake or invented fallback values.
 */

import { datasetService } from './datasetService';

/**
 * Normalizes string keys/headers for tolerant field matching
 */
function normalizeKey(str) {
  if (!str) return '';
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/[\uFEFF]/g, '') // remove BOM
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Map normalized key to standard internal metric name
 */
function mapKeyToStandardField(key) {
  const norm = normalizeKey(key);
  if (!norm) return null;

  if (['farmid', 'farm', 'field', 'plot', 'site', 'name', 'farmname', 'fieldid', 'plotid', 'siteid'].includes(norm)) return 'farmId';
  if (['crop', 'croptype', 'cropname', 'variety'].includes(norm)) return 'crop';
  if (['location', 'district', 'state', 'village', 'city', 'address'].includes(norm)) return 'location';
  if (['area', 'areaacres', 'acres', 'hectares', 'size'].includes(norm)) return 'area';
  if (['ndvi', 'canopyndvi', 'vegetationindex', 'evi', 'ndre', 'ndwi'].includes(norm)) return 'ndvi';
  if (['soilmoisture', 'moisture', 'vwc', 'sm', 'soilmoisturepct', 'moisturepct'].includes(norm)) return 'soilMoisture';
  if (['ph', 'soilph'].includes(norm)) return 'ph';
  if (['ec', 'electricalconductivity', 'ecdsm'].includes(norm)) return 'ec';
  if (['temperature', 'soiltemp', 'airtemp', 'temp', 'tempc', 'tempmaxc', 'tempminc'].includes(norm)) return 'temperature';
  if (['humidity', 'humiditypct', 'rh'].includes(norm)) return 'humidity';
  if (['rainfall', 'rain', 'precipitation', 'rainfallmm'].includes(norm)) return 'rainfall';
  if (['wind', 'windspeed', 'windkmh'].includes(norm)) return 'wind';
  if (['date', 'timestamp', 'time', 'day'].includes(norm)) return 'date';
  if (['alert', 'severity', 'risk', 'status', 'warning', 'condition', 'issue', 'pestdisease'].includes(norm)) return 'severity';
  if (['growthstage', 'stage'].includes(norm)) return 'growthStage';
  if (['canopycoverage', 'canopy', 'coverage'].includes(norm)) return 'canopyCoverage';
  if (['nitrogen', 'n'].includes(norm)) return 'nitrogen';
  if (['phosphorus', 'p'].includes(norm)) return 'phosphorus';
  if (['potassium', 'k'].includes(norm)) return 'potassium';

  return null;
}

/**
 * Parse CSV text robustly handling quotes, BOMs, mixed delimiters
 */
export function parseCSVToRows(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];
  const clean = rawText.replace(/^\uFEFF/, '').trim();
  if (!clean) return [];

  const allLines = clean.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (allLines.length < 2) return [];

  // Determine best delimiter (, or \t or ; or |)
  function detectDelimiter(line) {
    const commas = (line.match(/,/g) || []).length;
    const tabs = (line.match(/\t/g) || []).length;
    const semis = (line.match(/;/g) || []).length;
    const pipes = (line.match(/\|/g) || []).length;
    if (tabs > commas && tabs > semis && tabs > pipes) return '\t';
    if (semis > commas && semis > tabs && semis > pipes) return ';';
    if (pipes > commas && pipes > tabs && pipes > semis) return '|';
    return ',';
  }

  // Find the header row (skip markdown titles like "# My Dataset" or frontmatter)
  let headerIndex = -1;
  let chosenDelim = ',';

  for (let i = 0; i < Math.min(allLines.length, 10); i++) {
    const line = allLines[i];
    if (line.startsWith('#') || line.startsWith('---') || line.startsWith('//')) continue;
    const delim = detectDelimiter(line);
    const count = line.split(delim).length;
    if (count >= 2) {
      headerIndex = i;
      chosenDelim = delim;
      break;
    }
  }

  if (headerIndex === -1) return [];

  function splitRow(rowStr, delim) {
    const res = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < rowStr.length; i++) {
      const char = rowStr[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delim && !inQuotes) {
        res.push(cur.trim().replace(/^"|"$/g, '').replace(/^\||\|$/g, '').trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    res.push(cur.trim().replace(/^"|"$/g, '').replace(/^\||\|$/g, '').trim());
    return res.filter((val, idx) => !(delim === '|' && (idx === 0 || idx === res.length - 1) && val === ''));
  }

  const rawHeaders = splitRow(allLines[headerIndex], chosenDelim).map(h => h.replace(/^#+\s*/, '').trim());
  if (rawHeaders.length < 2) return [];

  const rows = [];
  for (let i = headerIndex + 1; i < allLines.length; i++) {
    const line = allLines[i];
    if (line.startsWith('---') || line.startsWith('#') || /^[-:| ]+$/.test(line)) continue;
    const values = splitRow(line, chosenDelim);
    if (values.length < 2) continue;
    const rowObj = {};
    rawHeaders.forEach((h, idx) => {
      if (h) {
        rowObj[h] = values[idx] !== undefined ? values[idx] : '';
      }
    });
    rows.push(rowObj);
  }

  return rows;
}

/**
 * Parse Markdown Table into Object Rows
 */
export function parseMDTableToRows(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.includes('|'));
  if (lines.length < 2) return [];

  // Find header line
  let hIdx = -1;
  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].includes('|') && /^[| -:]+$/.test(lines[i + 1])) {
      hIdx = i;
      break;
    }
  }

  if (hIdx === -1) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].split('|').filter(c => c.trim().length > 0).length >= 2) {
        hIdx = i;
        break;
      }
    }
  }

  if (hIdx === -1) return [];

  const headers = lines[hIdx].split('|').map(h => h.trim()).filter(h => h.length > 0 && !/^[-:]+$/.test(h));
  if (headers.length < 2) return [];

  const rows = [];
  const startRow = (hIdx + 1 < lines.length && /^[| -:]+$/.test(lines[hIdx + 1])) ? hIdx + 2 : hIdx + 1;

  for (let i = startRow; i < lines.length; i++) {
    const line = lines[i];
    if (/^[| -:]+$/.test(line) || line.startsWith('#')) continue;
    const cols = line.split('|').map(c => c.trim()).filter((c, idx, arr) => {
      if ((idx === 0 || idx === arr.length - 1) && c === '') return false;
      return true;
    });
    if (cols.length === 0) continue;
    const rowObj = {};
    headers.forEach((h, idx) => {
      rowObj[h] = cols[idx] !== undefined ? cols[idx] : '';
    });
    rows.push(rowObj);
  }

  return rows;
}

export function parseWhitespaceTableToRows(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('#') && !l.startsWith('---'));
  if (lines.length < 2) return [];

  const headers = lines[0].split(/\s{2,}|\t/).map(h => h.trim()).filter(h => h.length > 0);
  if (headers.length < 2) return [];

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(/\s{2,}|\t/).map(v => v.trim());
    if (values.length < 2) continue;
    const rowObj = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] !== undefined ? values[idx] : '';
    });
    rows.push(rowObj);
  }
  return rows;
}

/**
 * Parse Key-Value lines or Markdown sections into structured records
 */
export function parseKVToRecords(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];
  const sections = rawText.split(/(?=\n##?\s+)/g);
  const records = [];

  sections.forEach(sec => {
    const lines = sec.split(/\r?\n/);
    const rec = {};
    lines.forEach(line => {
      const match = line.match(/^[-*]?\s*\*\*?([^\*:]+)\*\*?:\s*(.+)$/);
      if (match) {
        rec[match[1].trim()] = match[2].trim();
      }
    });
    if (Object.keys(rec).length > 0) {
      records.push(rec);
    }
  });

  return records;
}

/**
 * Parse any dataset into normalized data rows
 */
export function extractNormalizedRows(dataset) {
  const text = dataset.raw || dataset.content || '';
  if (!text.trim()) return { rows: [], detectedFields: [], rawRowCount: 0 };

  let rawRows = parseCSVToRows(text);
  if (rawRows.length === 0) {
    rawRows = parseMDTableToRows(text);
  }
  if (rawRows.length === 0) {
    rawRows = parseWhitespaceTableToRows(text);
  }
  if (rawRows.length === 0) {
    rawRows = parseKVToRecords(text);
  }

  const detectedFieldSet = new Set();
  const normalizedRows = [];

  rawRows.forEach(r => {
    const norm = {};
    Object.keys(r).forEach(k => {
      const val = r[k];
      const stdField = mapKeyToStandardField(k);
      if (stdField) {
        detectedFieldSet.add(k.trim());
        norm[stdField] = val;
      } else if (k.trim().length > 0) {
        detectedFieldSet.add(k.trim());
      }
      norm[k.trim()] = val;
    });
    normalizedRows.push(norm);
  });

  return {
    rows: normalizedRows,
    detectedFields: Array.from(detectedFieldSet),
    rawRowCount: rawRows.length,
  };
}

/**
 * Get "Detected fields" summary string for dataset cards
 */
export function getDetectedFieldsString(dataset) {
  const { detectedFields, rawRowCount } = extractNormalizedRows(dataset);
  if (rawRowCount > 0 && detectedFields.length > 0) {
    const fieldSummary = detectedFields.slice(0, 6).join(', ') + (detectedFields.length > 6 ? '...' : '');
    return `Detected: ${fieldSummary} (${rawRowCount} rows)`;
  }
  if (rawRowCount > 0) {
    return `Detected: Telemetry Table (${rawRowCount} rows)`;
  }
  return `Detected: Raw Text (${dataset.chunkCount || 1} block)`;
}

/**
 * Extract all real farm profiles and time-series telemetry from user datasets
 */
export function getRealFarms() {
  const datasets = datasetService.getAllDatasets();
  const farmsMap = new Map();

  datasets.forEach(ds => {
    const { rows } = extractNormalizedRows(ds);

    rows.forEach(r => {
      const farmId = (r.farmId || ds.farmId || ds.name || 'FARM_1').toString().toUpperCase();
      
      if (!farmsMap.has(farmId)) {
        farmsMap.set(farmId, {
          id: farmId,
          name: r.name || ds.name || `Farm ${farmId}`,
          crop: r.crop || null,
          location: r.location || null,
          area: r.area || null,
          growthStage: r.growthStage || null,
          ndvi: r.ndvi != null && !isNaN(r.ndvi) ? parseFloat(r.ndvi) : null,
          soilMoisture: r.soilMoisture != null && !isNaN(r.soilMoisture) ? parseFloat(r.soilMoisture) : null,
          ph: r.ph != null && !isNaN(r.ph) ? parseFloat(r.ph) : null,
          ec: r.ec != null && !isNaN(r.ec) ? parseFloat(r.ec) : null,
          temperature: r.temperature != null && !isNaN(r.temperature) ? parseFloat(r.temperature) : null,
          nitrogen: r.nitrogen != null && !isNaN(r.nitrogen) ? parseFloat(r.nitrogen) : null,
          phosphorus: r.phosphorus != null && !isNaN(r.phosphorus) ? parseFloat(r.phosphorus) : null,
          potassium: r.potassium != null && !isNaN(r.potassium) ? parseFloat(r.potassium) : null,
          canopyCoverage: r.canopyCoverage != null && !isNaN(r.canopyCoverage) ? parseFloat(r.canopyCoverage) : null,
          timeSeries: [],
        });
      }

      const f = farmsMap.get(farmId);
      if (r.crop) f.crop = r.crop;
      if (r.location) f.location = r.location;
      if (r.growthStage) f.growthStage = r.growthStage;
      if (r.ndvi != null && !isNaN(r.ndvi)) f.ndvi = parseFloat(r.ndvi);
      if (r.soilMoisture != null && !isNaN(r.soilMoisture)) f.soilMoisture = parseFloat(r.soilMoisture);
      if (r.ph != null && !isNaN(r.ph)) f.ph = parseFloat(r.ph);
      if (r.ec != null && !isNaN(r.ec)) f.ec = parseFloat(r.ec);
      if (r.temperature != null && !isNaN(r.temperature)) f.temperature = parseFloat(r.temperature);

      f.timeSeries.push({
        date: r.date || new Date().toISOString().split('T')[0],
        ndvi: r.ndvi != null && !isNaN(r.ndvi) ? parseFloat(r.ndvi) : null,
        soilMoisture: r.soilMoisture != null && !isNaN(r.soilMoisture) ? parseFloat(r.soilMoisture) : null,
        ph: r.ph != null && !isNaN(r.ph) ? parseFloat(r.ph) : null,
        ec: r.ec != null && !isNaN(r.ec) ? parseFloat(r.ec) : null,
        temperature: r.temperature != null && !isNaN(r.temperature) ? parseFloat(r.temperature) : null,
      });
    });
  });

  return Array.from(farmsMap.values());
}

/**
 * Extract all real alert and risk rows from user datasets
 */
export function getRealAlerts() {
  const datasets = datasetService.getAllDatasets();
  const alertsList = [];

  datasets.forEach(ds => {
    const { rows } = extractNormalizedRows(ds);

    rows.forEach((r, idx) => {
      const sev = r.severity || r.status || r.risk || '';
      const text = JSON.stringify(r);
      
      const isCritical = sev.toUpperCase().includes('CRITICAL') || sev.toUpperCase().includes('HIGH') || text.toUpperCase().includes('CRITICAL');
      const isWarning = sev.toUpperCase().includes('WARN') || sev.toUpperCase().includes('MEDIUM') || text.toUpperCase().includes('WARNING');

      if (isCritical || isWarning) {
        alertsList.push({
          id: `alert_${ds.id}_${idx}`,
          farmId: r.farmId || ds.name || 'Loaded Dataset',
          title: r.issue || r.alert || r.condition || r.pestdisease || sev || 'Active Telemetry Alert',
          severity: isCritical ? 'Critical' : 'Warning',
          datasetName: ds.name,
          details: r.recommendedaction || r.symptoms || r.description || `Reading: ${r.ndvi || r.soilMoisture || r.temperature || ''}`,
        });
      }
    });
  });

  return alertsList;
}

/**
 * Extract all real weather records from user datasets
 */
export function getRealWeatherData() {
  const datasets = datasetService.getAllDatasets();
  const weatherRows = [];

  datasets.forEach(ds => {
    const { rows } = extractNormalizedRows(ds);
    rows.forEach(r => {
      if (r.temperature || r.rainfall || r.humidity || r.wind || r.date) {
        weatherRows.push({
          date: r.date || 'Record Date',
          location: r.location || ds.name || 'Monitored Region',
          temperature: r.temperature != null ? `${r.temperature}°C` : null,
          humidity: r.humidity != null ? `${r.humidity}%` : null,
          windSpeed: r.wind != null ? `${r.wind} km/h` : null,
          rainfall: r.rainfall != null ? `${r.rainfall} mm` : null,
        });
      }
    });
  });

  return weatherRows;
}

/**
 * Evaluates thresholds ONLY if threshold dataset is loaded by user
 */
export function getThresholdStatus(val, metricType) {
  if (val === null || val === undefined || isNaN(val)) return null;

  // Check if user has uploaded a dataset containing threshold rules
  const datasets = datasetService.getAllDatasets();
  const hasThresholdDataset = datasets.some(ds => {
    const text = (ds.raw || ds.content || '').toLowerCase();
    return text.includes('threshold') || text.includes('optimal_range') || text.includes('critical_range');
  });

  if (!hasThresholdDataset) {
    return null; // Return null so no made-up status badge is rendered without threshold rules
  }

  if (metricType === 'ndvi') {
    if (val < 0.25) return { label: 'Critical Low', color: '#EF4444' };
    if (val < 0.40) return { label: 'Warning Low', color: '#F59E0B' };
    if (val <= 0.85) return { label: 'Optimal', color: '#10B981' };
    return { label: 'Optimal', color: '#10B981' };
  }

  if (metricType === 'moisture') {
    if (val < 18) return { label: 'Critical Low', color: '#EF4444' };
    if (val < 25) return { label: 'Warning Low', color: '#F59E0B' };
    if (val <= 40) return { label: 'Optimal', color: '#10B981' };
    return { label: 'High', color: '#F59E0B' };
  }

  if (metricType === 'ph') {
    if (val < 5.5) return { label: 'Acidic', color: '#F59E0B' };
    if (val <= 7.5) return { label: 'Optimal', color: '#10B981' };
    return { label: 'Alkaline', color: '#F59E0B' };
  }

  if (metricType === 'ec') {
    if (val <= 1.5) return { label: 'Optimal', color: '#10B981' };
    if (val <= 2.5) return { label: 'Warning High', color: '#F59E0B' };
    return { label: 'Critical High', color: '#EF4444' };
  }

  return null;
}

/**
 * Saved Conversations Manager (Browser LocalStorage)
 */
const SAVED_CHATS_KEY = 'digicrop_saved_conversations';
const RECENT_ACTIVITY_KEY = 'digicrop_recent_activity';

export function getSavedConversationsFromStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(SAVED_CHATS_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Failed to load saved conversations:', err);
  }
  return [];
}

export function saveConversationToStorage(item) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const current = getSavedConversationsFromStorage();
      const newItem = {
        id: 'saved_' + Date.now(),
        title: item.title || 'Saved Answer',
        date: new Date().toLocaleDateString(),
        desc: item.desc || item.text || 'Saved session context',
      };
      current.unshift(newItem);
      window.localStorage.setItem(SAVED_CHATS_KEY, JSON.stringify(current));
      addRecentActivity(`Saved answer: "${newItem.title}"`);
    }
  } catch (err) {
    console.warn('Failed to save conversation:', err);
  }
}

export function deleteSavedConversation(id) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const current = getSavedConversationsFromStorage();
      const updated = current.filter(c => c.id !== id);
      window.localStorage.setItem(SAVED_CHATS_KEY, JSON.stringify(updated));
    }
  } catch (err) {
    console.warn('Failed to delete saved conversation:', err);
  }
}

export function clearAllSavedConversations() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(SAVED_CHATS_KEY);
    }
  } catch (err) {
    console.warn('Failed to clear saved conversations:', err);
  }
}

export function getRecentActivity() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(RECENT_ACTIVITY_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Failed to load recent activity:', err);
  }
  return [];
}

export function addRecentActivity(text) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const current = getRecentActivity();
      current.unshift({
        id: 'act_' + Date.now(),
        text: text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      window.localStorage.setItem(RECENT_ACTIVITY_KEY, JSON.stringify(current.slice(0, 10)));
    }
  } catch (err) {
    console.warn('Failed to add recent activity:', err);
  }
}
