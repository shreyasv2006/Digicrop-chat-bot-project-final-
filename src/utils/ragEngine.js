/**
 * DigiCrop AI - Advanced RAG Engine, Intent Classifier & Targeted Chunking
 */

import { SYSTEM_PROMPT } from '../config/systemPrompt.js';

/**
 * Simple Front Matter Parser
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

// Built-in Datasets Registry - Starts empty as required
export function getBuiltinDatasets() {
  return [];
}

/**
 * Active Farm Extraction from Conversation History
 */
export function extractActiveFarmFromHistory(conversationHistory = []) {
  if (!Array.isArray(conversationHistory) || conversationHistory.length === 0) {
    return null;
  }

  for (let i = conversationHistory.length - 1; i >= 0; i--) {
    const msg = conversationHistory[i];
    const text = (msg.text || msg.content || '').toUpperCase();
    const match = text.match(/F[0-9]{3}|F00[0-9]|\bFARM_[A-Z0-9_-]+\b|\bFIELD_[A-Z0-9_-]+\b/i);
    if (match) {
      return match[0];
    }
  }

  return null;
}

/**
 * 5-Mode Intent Classifier
 */
export function classifyUserIntent(userQuery, selectedDatasetId = 'general', conversationHistory = []) {
  if (!userQuery) return { mode: 'GREETING_SMALLTALK', isStrict: false, activeFarmId: null };

  const qTrim = userQuery.trim();
  const qLower = qTrim.toLowerCase();

  const activeFarmId = extractActiveFarmFromHistory(conversationHistory);

  // 1. Greeting, Identity & Small Talk Check
  const greetingPhrases = [
    'hi', 'hello', 'hey', 'hey bro', 'hi bro', 'hello bro', 'good morning', 'good afternoon',
    'good evening', 'thanks', 'thank you', 'ok', 'okay', 'cool', 'awesome', 'sup', 'yo',
    'who are you', 'what are you', 'what can you do', 'tell me about yourself'
  ];
  if (greetingPhrases.includes(qLower) || (/^hi\b|^hello\b|^hey\b/i.test(qLower) && qTrim.split(/\s+/).length <= 3)) {
    if (!qLower.includes('ndvi') && !qLower.includes('soil') && !qLower.includes('farm')) {
      return { mode: 'GREETING_SMALLTALK', isStrict: false, activeFarmId };
    }
  }

  // 2. Vague & Underspecified Check
  const vaguePhrases = [
    'help', 'tell me about my farm', 'what\'s the status', 'how is my farm',
    'how are the crops doing', 'show farm status', 'farm status', 'my farm status',
    'what is happening with my farm', 'give me details', 'status'
  ];
  const isSelected = selectedDatasetId && selectedDatasetId !== 'general';

  if ((vaguePhrases.includes(qLower) || qLower === 'help') && !activeFarmId && !isSelected) {
    return { mode: 'VAGUE_UNDERSPECIFIED', isStrict: false, activeFarmId: null };
  }

  // 3. Off-Topic Check (Non-agriculture)
  const offTopicKeywords = [
    'cricket', 'football', 'movie', 'actor', 'president', 'capital of france', 'joke',
    'who won', 'bitcoin', 'crypto', 'stock market', 'iphone', 'play station', 'game'
  ];
  if (offTopicKeywords.some(kw => qLower.includes(kw))) {
    return { mode: 'OFF_TOPIC', isStrict: false, activeFarmId: null };
  }

  // 4. Farm Data Question Check
  const farmTelemetryKeywords = [
    'ndvi', 'soil moisture', 'soil ph', 'ec', 'electrical conductivity', 'ndre', 'ndwi',
    'evi', 'telemetry', 'sensor', 'alert', 'alerts', 'root-zone', 'drip', 'fertigation',
    'risk', 'temperature', 'humidity', 'rainfall', 'its moisture', 'its ndvi', 'its soil', 'its status', 'farm'
  ];

  const mentionsFarm = farmTelemetryKeywords.some(kw => qLower.includes(kw));
  const isFollowUpWithContext = (qLower.includes('its') || qLower.includes('and')) && activeFarmId !== null;

  if (mentionsFarm || isSelected || isFollowUpWithContext) {
    return { mode: 'FARM_DATA_QUESTION', isStrict: false, activeFarmId };
  }

  // 5. General Agriculture Question
  return { mode: 'GENERAL_AGRICULTURE', isStrict: false, activeFarmId: null };
}

/**
 * Pre-Check Short-Circuiting Guardrail
 */
export function preCheckUserQuery(userQuery, availableDatasets, selectedDatasetId = 'general', conversationHistory = []) {
  if (!userQuery) return { handled: false };
  const qLower = userQuery.trim().toLowerCase();

  const { mode, activeFarmId } = classifyUserIntent(userQuery, selectedDatasetId, conversationHistory);

  // Mode 1: Greeting
  if (mode === 'GREETING_SMALLTALK') {
    return {
      handled: true,
      answer: "Hello! 👋 I'm DigiCrop AI, your agricultural assistant.\n\nHow can I help you today? Here are a few things you can ask me:\n- **Crop Advice**: Best practices for grapes or wheat\n- **Telemetry Metrics**: Ask about NDVI or soil moisture\n- **Farm Analysis**: Check status for **F001** (Nashik Vineyard) or **F004** (Pune Wheat)",
      sources: ["DigiCrop Guidance"],
    };
  }

  // Mode 2: Vague / Underspecified
  if (mode === 'VAGUE_UNDERSPECIFIED') {
    return {
      handled: true,
      answer: "Which farm would you like to inspect: **F001** (Nashik Vineyard) or **F004** (Pune Wheat)? And do you want to check NDVI, soil moisture, weather, or active alerts?",
      sources: ["DigiCrop Guidance"],
    };
  }

  // Mode 5: Off-Topic
  if (mode === 'OFF_TOPIC') {
    return {
      handled: true,
      answer: "I specialize in farming, crops, and agricultural telemetry. How can I help with your crops or farm datasets today?",
      sources: ["DigiCrop Guidance"],
    };
  }

  // Explicit Dataset Selection Command
  const switchMatch = qLower.match(/^(?:use|switch to|select)\s+(?:the\s+)?([a-z0-9_\-\s]+?)(?:\s+dataset)?$/i);
  if (switchMatch) {
    const rawTarget = switchMatch[1].trim().toLowerCase();
    const foundDs = availableDatasets.find(d => 
      (d?.id && d.id.toLowerCase() === rawTarget) ||
      (d?.fileName && d.fileName.toLowerCase().includes(rawTarget)) ||
      (d?.name && d.name.toLowerCase().includes(rawTarget)) ||
      (d?.farmId && d.farmId.toLowerCase() === rawTarget)
    );
    if (foundDs) {
      return {
        handled: true,
        answer: `Selected **${foundDs.name}**. What specific metric (NDVI, soil moisture, alerts) would you like to check?`,
        sources: [foundDs.name],
        newSelectedDatasetId: foundDs.id,
      };
    }
  }

  // Unknown Farm ID Check (e.g. F999)
  const farmIdMatch = qLower.match(/f[0-9]{3}|f00[0-9]/i);
  const targetFarmId = (farmIdMatch ? farmIdMatch[0] : activeFarmId)?.toUpperCase();

  if (targetFarmId) {
    const farmDs = availableDatasets.find(d => 
      (d.farmId && d.farmId.toUpperCase() === targetFarmId) ||
      d.name.toUpperCase().includes(targetFarmId) ||
      d.id.toUpperCase().includes(targetFarmId) ||
      d.content.includes(targetFarmId)
    );

    if (!farmDs) {
      return {
        handled: true,
        answer: `I don't have dataset or telemetry information for farm **${targetFarmId}**. Please select or upload the ${targetFarmId} dataset to inspect its metrics.`,
        sources: ["System Guardrail"],
      };
    }
  }

  return { handled: false };
}

/**
 * Targeted Chunking by Section/Topic
 */
export function chunkDatasetByTopic(dsContent, queryLower) {
  if (!dsContent) return '';

  const sections = dsContent.split(/(?=\n##\s+)/g);
  if (sections.length <= 1) return dsContent;

  const metadataChunk = sections[0];
  const matchedChunks = [metadataChunk];

  const wantsNdvi = queryLower.includes('ndvi') || queryLower.includes('remote sensing') || queryLower.includes('vegetation') || queryLower.includes('ndre') || queryLower.includes('ndwi');
  const wantsSoil = queryLower.includes('soil') || queryLower.includes('moisture') || queryLower.includes('ph') || queryLower.includes('ec');
  const wantsAlerts = queryLower.includes('alert') || queryLower.includes('risk') || queryLower.includes('critical');
  const wantsIrrigation = queryLower.includes('water') || queryLower.includes('irrigation') || queryLower.includes('fertigation');
  const wantsFieldNotes = queryLower.includes('field') || queryLower.includes('observation') || queryLower.includes('note') || queryLower.includes('scorching');

  const isSpecificQuestion = wantsNdvi || wantsSoil || wantsAlerts || wantsIrrigation || wantsFieldNotes;

  sections.forEach((sec, idx) => {
    if (idx === 0) return;
    const secLower = sec.toLowerCase();

    if (!isSpecificQuestion) {
      // General status question -> include all sections
      matchedChunks.push(sec);
      return;
    }

    if (wantsNdvi && (secLower.includes('remote sensing') || secLower.includes('ndvi') || secLower.includes('vegetation'))) {
      matchedChunks.push(sec);
    }
    if (wantsSoil && (secLower.includes('soil') || secLower.includes('moisture') || secLower.includes('telemetry'))) {
      matchedChunks.push(sec);
    }
    if (wantsAlerts && (secLower.includes('alert') || secLower.includes('risk'))) {
      matchedChunks.push(sec);
    }
    if (wantsIrrigation && (secLower.includes('water') || secLower.includes('irrigation') || secLower.includes('nutrient'))) {
      matchedChunks.push(sec);
    }
    if (wantsFieldNotes && (secLower.includes('field') || secLower.includes('observation'))) {
      matchedChunks.push(sec);
    }
  });

  return matchedChunks.join('\n\n');
}

/**
 * Intelligent Dataset Intent Detector & Chunking RAG
 */
export function detectDatasetIntent(userQuery, availableDatasets, selectedDatasetId = null, conversationHistory = []) {
  if (!userQuery) return { targetDatasets: [], isStrict: false, datasetNames: [] };

  const queryLower = userQuery.toLowerCase();
  const activeFarmId = extractActiveFarmFromHistory(conversationHistory);

  const matchedSet = new Set();

  // Selected dataset in UI
  if (selectedDatasetId && selectedDatasetId !== 'general') {
    const selDs = availableDatasets.find(d => d.id === selectedDatasetId || d.fileName === selectedDatasetId);
    if (selDs) matchedSet.add(selDs);
  }

  // Scan for Farm IDs in query or active conversation memory
  availableDatasets.forEach(ds => {
    if (ds.farmId) {
      if (queryLower.includes(ds.farmId.toLowerCase())) {
        matchedSet.add(ds);
      } else if (activeFarmId && ds.farmId.toUpperCase() === activeFarmId.toUpperCase()) {
        matchedSet.add(ds);
      }
    }
  });

  // Scan query for general knowledge datasets
  availableDatasets.forEach(ds => {
    const dsNameLower = ds.name.toLowerCase();
    if (queryLower.includes(dsNameLower)) {
      matchedSet.add(ds);
    }
    if ((queryLower.includes('ndvi') || queryLower.includes('vegetation index')) && ds.id === 'ndvi_knowledge') {
      matchedSet.add(ds);
    }
    if ((queryLower.includes('soil') || queryLower.includes('moisture') || queryLower.includes('ph')) && ds.id === 'soil_knowledge') {
      matchedSet.add(ds);
    }
  });

  const targetDatasets = Array.from(matchedSet).map(ds => {
    const chunkedContent = chunkDatasetByTopic(ds.content, queryLower);
    return { ...ds, content: chunkedContent };
  });

  const datasetNames = targetDatasets.map(d => d.name);

  return {
    targetDatasets,
    isStrict: false,
    datasetNames,
  };
}

/**
 * Build System Instructions and Grounded RAG Context for Gemini
 */
export function buildGroundedContext(userQuery, targetDatasets, isStrict = false, conversationHistory = []) {
  const { mode } = classifyUserIntent(userQuery, 'general', conversationHistory);

  let contextText = '';
  if (mode === 'FARM_DATA_QUESTION' && targetDatasets.length > 0) {
    contextText += `=== TARGETED FARM DATASET CONTEXT (${targetDatasets.length}) ===\n\n`;
    targetDatasets.forEach(ds => {
      contextText += `--- DATASET: "${ds.name}" (Farm ID: ${ds.farmId || 'N/A'}) ---\n`;
      contextText += `${ds.content}\n\n`;
    });
    contextText += `===============================================\n\n`;
  }

  return { systemInstruction: SYSTEM_PROMPT, contextText, mode };
}
