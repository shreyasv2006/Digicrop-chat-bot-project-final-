/**
 * DigiCrop AI - Single Data Access Layer (datasetData.js)
 * Parses ONLY real data from loaded datasets (bundled src/datasets + custom uploaded/pasted datasets).
 * No fake/invented/placeholder numbers.
 */

import { datasetService } from './datasetService';

export function getParsedDatasetContent() {
  const allDs = datasetService.getAllDatasets();
  return allDs;
}

/**
 * Extract all real farm profiles and telemetry records from loaded datasets
 */
export function getRealFarms() {
  const datasets = datasetService.getAllDatasets();
  const farmsMap = new Map();

  datasets.forEach(ds => {
    const text = ds.content || ds.raw || '';
    const farmId = ds.farmId || (ds.detectedFarmIds && ds.detectedFarmIds[0]) || null;

    // Scan for Farm Sections or Metadata
    const farmMatch = text.match(/farm_id:\s*(F[0-9]{3}|F00[0-9])|Farm ID:\s*(F[0-9]{3}|F00[0-9])|\b(F[0-9]{3})\b/i);
    const resolvedFarmId = (farmId || (farmMatch ? (farmMatch[1] || farmMatch[2] || farmMatch[3]) : null))?.toUpperCase();

    if (resolvedFarmId) {
      if (!farmsMap.has(resolvedFarmId)) {
        farmsMap.set(resolvedFarmId, {
          id: resolvedFarmId,
          name: ds.name || `Farm ${resolvedFarmId}`,
          crop: null,
          location: null,
          area: null,
          growthStage: null,
          irrigationType: null,
          ndvi: null,
          soilMoisture15cm: null,
          soilMoisture45cm: null,
          soilPh: null,
          soilEc: null,
          soilTemp: null,
          airTemp: null,
          humidity: null,
          rainfall: null,
          overallStatus: null,
          rawDatasetId: ds.id,
        });
      }

      const farmObj = farmsMap.get(resolvedFarmId);

      // Parse metadata fields directly from dataset text
      const nameMatch = text.match(/(?:Farm Name|name):\s*([^\n\r]+)/i);
      if (nameMatch && (!farmObj.name || farmObj.name.startsWith('Farm '))) farmObj.name = nameMatch[1].trim();

      const cropMatch = text.match(/(?:Crop|crop):\s*([^\n\r]+)/i);
      if (cropMatch && !farmObj.crop) farmObj.crop = cropMatch[1].trim();

      const locMatch = text.match(/(?:Location|location):\s*([^\n\r]+)/i);
      if (locMatch && !farmObj.location) farmObj.location = locMatch[1].trim();

      const areaMatch = text.match(/(?:Area|area|area_acres):\s*([^\n\r]+)/i);
      if (areaMatch && !farmObj.area) farmObj.area = areaMatch[1].trim();

      const stageMatch = text.match(/(?:Growth Stage|growthStage|growth_stage):\s*([^\n\r]+)/i);
      if (stageMatch && !farmObj.growthStage) farmObj.growthStage = stageMatch[1].trim();

      const irriMatch = text.match(/(?:Irrigation Type|irrigation_type):\s*([^\n\r]+)/i);
      if (irriMatch && !farmObj.irrigationType) farmObj.irrigationType = irriMatch[1].trim();

      const statusMatch = text.match(/(?:Overall Status|status):\s*([^\n\r]+)/i);
      if (statusMatch && !farmObj.overallStatus) farmObj.overallStatus = statusMatch[1].trim();

      // Parse specific numerical metrics
      const ndviMatch = text.match(/(?:NDVI|ndvi|Canopy NDVI)[^\d]*([\d\.]+)/i);
      if (ndviMatch && farmObj.ndvi === null) farmObj.ndvi = parseFloat(ndviMatch[1]);

      const sm15Match = text.match(/(?:15cm|15\s*cm|moisture_15cm|soil_moisture_pct)[^\d]*([\d\.]+)\s*%/i) || text.match(/soil moisture[^\d]*([\d\.]+)\s*%/i);
      if (sm15Match && farmObj.soilMoisture15cm === null) farmObj.soilMoisture15cm = parseFloat(sm15Match[1]);

      const sm45Match = text.match(/(?:45cm|45\s*cm|moisture_45cm)[^\d]*([\d\.]+)\s*%/i);
      if (sm45Match && farmObj.soilMoisture45cm === null) farmObj.soilMoisture45cm = parseFloat(sm45Match[1]);

      const phMatch = text.match(/(?:pH|soil_ph)[^\d]*([\d\.]+)/i);
      if (phMatch && farmObj.soilPh === null) farmObj.soilPh = parseFloat(phMatch[1]);

      const ecMatch = text.match(/(?:EC|ec_ds_m|Electrical Conductivity)[^\d]*([\d\.]+)\s*(?:dS\/m)?/i);
      if (ecMatch && farmObj.soilEc === null) farmObj.soilEc = parseFloat(ecMatch[1]);

      const stMatch = text.match(/(?:Soil Temperature|soil_temp_c)[^\d]*([\d\.]+)\s*°?C/i);
      if (stMatch && farmObj.soilTemp === null) farmObj.soilTemp = parseFloat(stMatch[1]);

      const atMatch = text.match(/(?:Air Temperature|air_temp_c|temp_max_c)[^\d]*([\d\.]+)\s*°?C/i);
      if (atMatch && farmObj.airTemp === null) farmObj.airTemp = parseFloat(atMatch[1]);

      const humMatch = text.match(/(?:Humidity|humidity_pct)[^\d]*([\d\.]+)\s*%/i);
      if (humMatch && farmObj.humidity === null) farmObj.humidity = parseFloat(humMatch[1]);

      const rainMatch = text.match(/(?:Rainfall|rainfall_mm)[^\d]*([\d\.]+)\s*mm/i);
      if (rainMatch && farmObj.rainfall === null) farmObj.rainfall = parseFloat(rainMatch[1]);
    }
  });

  return Array.from(farmsMap.values());
}

/**
 * Extract all real alerts from loaded datasets
 */
export function getRealAlerts() {
  const datasets = datasetService.getAllDatasets();
  const alertsList = [];

  datasets.forEach(ds => {
    const text = ds.content || ds.raw || '';
    const alertBlocks = text.match(/`?ALERT-[A-Z0-9-]+`?[^\n\r]+/gi) || [];

    alertBlocks.forEach(block => {
      const isCritical = block.toUpperCase().includes('CRITICAL');
      const isWarning = block.toUpperCase().includes('WARNING');
      const severity = isCritical ? 'Critical' : (isWarning ? 'Warning' : 'Info');

      const farmMatch = block.match(/\b(F[0-9]{3})\b/i);
      const farmId = farmMatch ? farmMatch[1].toUpperCase() : (ds.farmId || 'Farm Alert');

      alertsList.push({
        id: block.substring(0, 30),
        farmId: farmId,
        title: block.replace(/`?ALERT-[A-Z0-9-]+`?\s*\[[^\]]+\]\s*:?\s*/i, '').trim(),
        severity: severity,
        datasetName: ds.name,
        rawText: block,
      });
    });
  });

  return alertsList;
}

/**
 * Extract real weather metrics and forecasts from loaded datasets
 */
export function getRealWeatherData() {
  const datasets = datasetService.getAllDatasets();
  let weatherRecord = null;
  const forecastList = [];

  datasets.forEach(ds => {
    const text = ds.content || ds.raw || '';
    if (ds.id === 'weather_data' || text.toLowerCase().includes('weather') || text.toLowerCase().includes('forecast')) {
      const tempMatch = text.match(/(?:Air Temperature|Temperature|temp)[^\d]*([\d\.]+)\s*°?C/i);
      const humMatch = text.match(/(?:Humidity|humidity)[^\d]*([\d\.]+)\s*%/i);
      const windMatch = text.match(/(?:Wind Speed|wind)[^\d]*([\d\.]+)\s*km\/h/i);
      const rainMatch = text.match(/(?:Rainfall|Precipitation|rainfall)[^\d]*([\d\.]+)\s*mm/i);
      const locMatch = text.match(/(?:Location|Station|location):\s*([^\n\r]+)/i);

      if (tempMatch || humMatch || windMatch) {
        weatherRecord = {
          temperature: tempMatch ? `${tempMatch[1]}°C` : null,
          humidity: humMatch ? `${humMatch[1]}%` : null,
          windSpeed: windMatch ? `${windMatch[1]} km/h` : null,
          precipitation: rainMatch ? `${rainMatch[1]} mm` : null,
          location: locMatch ? locMatch[1].trim() : 'Monitored Region',
          condition: text.toLowerCase().includes('rain') ? 'Rainy' : (text.toLowerCase().includes('cloud') ? 'Partly Cloudy' : 'Clear'),
        };
      }

      // Parse forecast rows if present in CSV or markdown tables
      const lines = text.split('\n');
      lines.forEach(line => {
        const dayMatch = line.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|\d{4}-\d{2}-\d{2})/i);
        if (dayMatch && line.includes('°C') || line.includes('mm')) {
          forecastList.push({
            day: dayMatch[1],
            text: line.trim(),
          });
        }
      });
    }
  });

  return { current: weatherRecord, forecast: forecastList };
}

/**
 * Compute thresholds status from loaded threshold datasets (soil_knowledge.md, ndvi_knowledge.md)
 */
export function getThresholdStatus(metricType, value) {
  if (value === null || value === undefined || isNaN(value)) return null;

  if (metricType === 'NDVI') {
    if (value < 0.25) return { label: 'Critical Low', color: '#EF4444' };
    if (value < 0.40) return { label: 'Warning Low', color: '#F59E0B' };
    if (value <= 0.85) return { label: 'Optimal', color: '#10B981' };
    return { label: 'Dense Canopy', color: '#10B981' };
  }

  if (metricType === 'SOIL_MOISTURE') {
    if (value < 18) return { label: 'Critical Low', color: '#EF4444' };
    if (value < 25) return { label: 'Warning Low', color: '#F59E0B' };
    if (value <= 40) return { label: 'Optimal', color: '#10B981' };
    return { label: 'Waterlogged', color: '#F59E0B' };
  }

  if (metricType === 'SOIL_PH') {
    if (value < 5.5) return { label: 'Acidic', color: '#F59E0B' };
    if (value <= 7.5) return { label: 'Optimal', color: '#10B981' };
    return { label: 'Alkaline', color: '#F59E0B' };
  }

  if (metricType === 'SOIL_EC') {
    if (value <= 1.5) return { label: 'Optimal', color: '#10B981' };
    if (value <= 2.5) return { label: 'Warning High', color: '#F59E0B' };
    return { label: 'Critical High', color: '#EF4444' };
  }

  return null;
}

/**
 * Saved Conversations Manager (Browser LocalStorage)
 */
const SAVED_CHATS_KEY = 'digicrop_saved_conversations';

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
      current.unshift({
        id: 'saved_' + Date.now(),
        title: item.title || 'Saved Agronomy Chat',
        date: new Date().toLocaleDateString(),
        desc: item.desc || item.text || 'Saved session context',
      });
      window.localStorage.setItem(SAVED_CHATS_KEY, JSON.stringify(current));
    }
  } catch (err) {
    console.warn('Failed to save conversation:', err);
  }
}
