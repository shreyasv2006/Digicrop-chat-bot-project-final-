/**
 * DigiCrop AI - RAG Engine, Intent Classifier & Anti-Hallucination Guardrails
 */

import farmsMd from '../datasets/farms.md';
import farmF001Md from '../datasets/farm_F001.md';
import farmF004Md from '../datasets/farm_F004.md';
import soilKnowledgeMd from '../datasets/soil_knowledge.md';
import ndviKnowledgeMd from '../datasets/ndvi_knowledge.md';
import weatherDataMd from '../datasets/weather_data.md';
import alertsMd from '../datasets/alerts.md';
import cropsMd from '../datasets/crops.md';
import agriculturalGuidelinesMd from '../datasets/agricultural_guidelines.md';

/**
 * Utility to parse simple Front Matter without external dependencies
 */
export function parseFrontMatter(rawContent) {
  if (!rawContent || typeof rawContent !== 'string') {
    return { metadata: {}, content: '' };
  }

  const normalized = rawContent.trim();
  if (!normalized.startsWith('---')) {
    return { metadata: {}, content: normalized };
  }

  const endFrontMatterIndex = normalized.indexOf('---', 3);
  if (endFrontMatterIndex === -1) {
    return { metadata: {}, content: normalized };
  }

  const frontMatterText = normalized.substring(3, endFrontMatterIndex).trim();
  const content = normalized.substring(endFrontMatterIndex + 3).trim();

  const metadata = {};
  const lines = frontMatterText.split('\n');
  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      const key = line.substring(0, colonIdx).trim().toLowerCase();
      const value = line.substring(colonIdx + 1).trim();
      metadata[key] = value;
    }
  }

  return { metadata, content };
}

// Built-in Datasets Registry
const BUILTIN_DATASETS_RAW = [
  { id: 'farms', filename: 'farms.md', raw: farmsMd },
  { id: 'farm_F001', filename: 'farm_F001.md', raw: farmF001Md },
  { id: 'farm_F004', filename: 'farm_F004.md', raw: farmF004Md },
  { id: 'soil_knowledge', filename: 'soil_knowledge.md', raw: soilKnowledgeMd },
  { id: 'ndvi_knowledge', filename: 'ndvi_knowledge.md', raw: ndviKnowledgeMd },
  { id: 'weather_data', filename: 'weather_data.md', raw: weatherDataMd },
  { id: 'alerts', filename: 'alerts.md', raw: alertsMd },
  { id: 'crops', filename: 'crops.md', raw: cropsMd },
  { id: 'agricultural_guidelines', filename: 'agricultural_guidelines.md', raw: agriculturalGuidelinesMd },
];

export function getBuiltinDatasets() {
  return BUILTIN_DATASETS_RAW.map(item => {
    const parsed = parseFrontMatter(item.raw);
    return {
      id: item.id,
      fileName: item.filename,
      name: parsed.metadata.name || item.filename.replace('.md', '').toUpperCase(),
      category: parsed.metadata.category || 'General',
      farmId: parsed.metadata.farm_id || null,
      crop: parsed.metadata.crop || null,
      description: parsed.metadata.description || 'DigiCrop knowledge dataset.',
      content: parsed.content,
      raw: item.raw,
    };
  });
}

/**
 * Classify User Intent:
 * MODE A: General Agriculture Question (Does not ask about a specific farm or dataset measurement)
 * MODE B: Farm / Dataset Analysis (Asks about a farm ID, specific dataset, telemetry, alerts, risk, or farm comparison)
 */
export function classifyUserIntent(userQuery, selectedDatasetId = 'general') {
  if (!userQuery) return { mode: 'MODE_A_GENERAL', isStrict: false };

  const qLower = userQuery.toLowerCase().trim();

  // Strict dataset-only phrases
  const strictKeywords = [
    'only from', 'strictly from', 'only use', 'strictly use',
    'don\'t use general', 'do not use general', 'do not invent', 'only according to'
  ];
  const isStrict = strictKeywords.some(kw => qLower.includes(kw));

  // Keywords that indicate farm/dataset inquiry
  const farmKeywords = [
    'farm', 'farms', 'f001', 'f002', 'f003', 'f004', 'f005', 'f006', 'f007', 'f008', 'f009',
    'this farm', 'my farm', 'the farm', 'its soil', 'its ndvi', 'its risk', 'its moisture',
    'compare f001', 'compare f004', 'dataset', 'telemetry', 'sensor', 'alert', 'alerts'
  ];

  const hasFarmRef = farmKeywords.some(kw => qLower.includes(kw)) || /f00[0-9]/i.test(qLower);
  const isSelected = selectedDatasetId && selectedDatasetId !== 'general';

  if (hasFarmRef || isSelected || isStrict) {
    return { mode: 'MODE_B_FARM_DATASET', isStrict };
  }

  return { mode: 'MODE_A_GENERAL', isStrict: false };
}

/**
 * Pre-Check Short-Circuiting Guardrail
 * Catches missing datasets, unselected generic farm queries, and explicit dataset switches BEFORE Gemini API calls
 */
export function preCheckUserQuery(userQuery, availableDatasets, selectedDatasetId = 'general') {
  if (!userQuery) return { handled: false };
  const qLower = userQuery.trim().toLowerCase();

  // 1. Explicit dataset selection / switch command
  const switchMatch = qLower.match(/^(?:use|switch to|select)\s+(?:the\s+)?([a-z0-9_\-\s]+?)(?:\s+dataset)?$/i);
  if (switchMatch) {
    const rawTarget = switchMatch[1].trim().toLowerCase();
    const foundDs = availableDatasets.find(d => 
      d.id.toLowerCase() === rawTarget ||
      d.fileName.toLowerCase().includes(rawTarget) ||
      d.name.toLowerCase().includes(rawTarget) ||
      (d.farmId && d.farmId.toLowerCase() === rawTarget)
    );
    if (foundDs) {
      return {
        handled: true,
        answer: `Using **${foundDs.name}**. What would you like to analyze or ask about this dataset?`,
        sources: [foundDs.name],
        newSelectedDatasetId: foundDs.id,
      };
    }
  }

  // 2. Generic unspecific farm query when no farm is selected
  const isGenericFarmQuery = (
    qLower.includes('how is the farm doing') ||
    qLower.includes('how is my farm') ||
    qLower.includes('what\'s happening with my farm') ||
    qLower.includes('how are the crops doing') ||
    qLower.includes('show farm status')
  );

  const isFarmSelected = selectedDatasetId && selectedDatasetId !== 'general';
  const mentionsSpecificFarm = /f00[0-9]|farm\s*[0-9]+/i.test(qLower);

  if (isGenericFarmQuery && !isFarmSelected && !mentionsSpecificFarm) {
    return {
      handled: true,
      answer: "I can help analyze a farm, but I need a farm dataset or farm ID first. You can select a dataset such as **F001 Farm Dataset** or ask about a specific farm ID.",
      sources: ["DigiCrop Guidance"],
    };
  }

  // 3. Query specifies a Farm ID (e.g. F009) that does NOT exist in available datasets
  const farmIdMatch = qLower.match(/f00[0-9]|f[0-9]{3}/i);
  if (farmIdMatch) {
    const targetFarmId = farmIdMatch[0].toUpperCase();
    const farmDs = availableDatasets.find(d => 
      (d.farmId && d.farmId.toUpperCase() === targetFarmId) ||
      d.name.toUpperCase().includes(targetFarmId) ||
      d.id.toUpperCase().includes(targetFarmId) ||
      d.content.includes(targetFarmId)
    );

    if (!farmDs) {
      if (qLower.includes('risk')) {
        return {
          handled: true,
          answer: `I can't determine ${targetFarmId}'s risk without its farm data.`,
          sources: ["System Guardrail"],
        };
      }
      return {
        handled: true,
        answer: `I don't have dataset or telemetry information for farm ${targetFarmId}. Please select or upload the ${targetFarmId} dataset.`,
        sources: ["System Guardrail"],
      };
    }
  }

  return { handled: false };
}

/**
 * Intelligent Dataset Intent Detector
 */
export function detectDatasetIntent(userQuery, availableDatasets, selectedDatasetId = null) {
  if (!userQuery) return { targetDatasets: [], isStrict: false, datasetNames: [] };

  const queryLower = userQuery.toLowerCase();
  const { isStrict } = classifyUserIntent(userQuery, selectedDatasetId);

  const matchedSet = new Set();

  // 1. If explicit dataset selected in UI
  if (selectedDatasetId && selectedDatasetId !== 'general') {
    const selDs = availableDatasets.find(d => d.id === selectedDatasetId || d.fileName === selectedDatasetId);
    if (selDs) matchedSet.add(selDs);
  }

  // 2. Scan query for specific farm IDs (F001, F004, etc.)
  availableDatasets.forEach(ds => {
    if (ds.farmId && queryLower.includes(ds.farmId.toLowerCase())) {
      matchedSet.add(ds);
    }
  });

  // 3. Scan query for dataset names / keywords
  availableDatasets.forEach(ds => {
    const dsNameLower = ds.name.toLowerCase();
    const fileNameLower = ds.fileName.toLowerCase();
    
    if (queryLower.includes(dsNameLower) || queryLower.includes(fileNameLower)) {
      matchedSet.add(ds);
    }

    if ((queryLower.includes('ndvi') || queryLower.includes('vegetation index')) && ds.id === 'ndvi_knowledge') {
      matchedSet.add(ds);
    }
    if ((queryLower.includes('soil') || queryLower.includes('moisture') || queryLower.includes('ph')) && ds.id === 'soil_knowledge') {
      matchedSet.add(ds);
    }
    if ((queryLower.includes('weather') || queryLower.includes('humidity') || queryLower.includes('vpd')) && ds.id === 'weather_data') {
      matchedSet.add(ds);
    }
    if ((queryLower.includes('alert') || queryLower.includes('critical')) && ds.id === 'alerts') {
      matchedSet.add(ds);
    }
    if ((queryLower.includes('crop') || queryLower.includes('grapes') || queryLower.includes('pomegranate')) && ds.id === 'crops') {
      matchedSet.add(ds);
    }
    if ((queryLower.includes('guideline') || queryLower.includes('protocol')) && ds.id === 'agricultural_guidelines') {
      matchedSet.add(ds);
    }
    if ((queryLower.includes('farms') || queryLower.includes('all farm')) && ds.id === 'farms') {
      matchedSet.add(ds);
    }
  });

  const targetDatasets = Array.from(matchedSet);
  const datasetNames = targetDatasets.map(d => d.name);

  return {
    targetDatasets,
    isStrict,
    datasetNames,
  };
}

/**
 * Build System Instructions and Grounded RAG Context for Gemini
 */
export function buildGroundedContext(userQuery, targetDatasets, isStrict, conversationHistory = []) {
  const { mode } = classifyUserIntent(userQuery);

  let contextText = '';
  
  if (mode === 'MODE_B_FARM_DATASET' && targetDatasets.length > 0) {
    contextText += `=== GROUNDED FARM DATASETS IN CONTEXT (${targetDatasets.length}) ===\n\n`;
    targetDatasets.forEach(ds => {
      contextText += `--- DATASET: "${ds.name}" (File: ${ds.fileName}, Category: ${ds.category}) ---\n`;
      if (ds.farmId) contextText += `Farm ID: ${ds.farmId}\n`;
      if (ds.description) contextText += `Description: ${ds.description}\n`;
      contextText += `\n${ds.content}\n\n`;
    });
    contextText += `===============================================\n\n`;
  }

  const systemInstruction = `You are DigiCrop AI — an intelligent agricultural AI assistant created for the DigiCrop agricultural platform.

### MANDATORY SYSTEM BEHAVIOR:

MODE A — GENERAL AGRICULTURE QUESTIONS:
- If the user asks general questions about farming, crops, irrigation, soil science, NDVI concepts, remote sensing, India agriculture, or agricultural technology, answer naturally and helpfully using your general agricultural knowledge.
- Do NOT refuse normal general agriculture questions or claim you lack a dataset for general questions.

MODE B — FARM / DATASET QUESTIONS:
- When answering farm-specific questions (NDVI values, soil moisture, alerts, risk scores, farm status, or dataset queries):
  1. Answer ONLY using the facts, numbers, and measurements explicitly present in the provided dataset context.
  2. STRICT ANTI-HALLUCINATION RULE: You MUST NEVER fabricate or invent farm values, soil moisture %, soil pH, EC readings, NDVI numbers, temperatures, sensor readings, dates, or farm IDs.
  3. MISSING DATA RULE: If a requested farm measurement or attribute (e.g. soil pH, yield) is NOT present in the provided dataset context, reply clearly:
     "I don't have that information in the [Dataset Name] dataset."
  4. NO ASSUMPTIONS: Never assume F001 or any farm if the user did not specify it.
  5. DATA VS INTERPRETATION SEPARATION: Differentiate Observed Data, Calculated Results, AI Interpretation, and Action Recommendations.
  6. PEST & DISEASE DIAGNOSIS SAFETY: Never issue 100% definitive plant disease diagnoses; use cautious hedging ("possible indication...", "requires field verification").

SOURCE TRANSPARENCY:
- For general questions, end response with: \`Source: Gemini Agricultural Knowledge\`
- For dataset answers, end response with: \`Source: [Dataset Name]\``;

  return { systemInstruction, contextText };
}
