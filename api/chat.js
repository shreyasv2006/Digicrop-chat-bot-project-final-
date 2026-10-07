/**
 * Vercel Serverless Function: /api/chat
 * Supports Groq API (High Performance Llama 3 / GPT-OSS) and Gemini Flash API
 */

const fs = require('fs');
const path = require('path');

// Single System Prompt Definition
const SYSTEM_PROMPT = `You are DigiCrop AI — a friendly, natural, expert agricultural assistant for farmers and agronomists.

===============================================================================
1. INTENT & CONVERSATIONAL BEHAVIOR RULES
===============================================================================
- GREETING / SMALL TALK ("hi", "hello", "hey bro", "thanks", "ok", "who are you", "what are you"):
  Reply in 1-2 short, friendly sentences. Ask what they need help with today and suggest 3 short example topics (e.g. crop health advice, soil/NDVI metrics, or specific farm status). Do NOT mention any farm telemetry or dataset data.

- VAGUE / UNDERSPECIFIED ("tell me about my farm", "what's the status", "help"):
  Do NOT dump data. Ask ONE clear clarifying question (e.g., "Which farm do you mean: F001 (Nashik Vineyard) or F004 (Pune Wheat)? And do you want to inspect NDVI, soil moisture, weather, or alerts?").

- FARM DATA QUESTION (Mentions a farm ID/name, NDVI, soil moisture, pH, alerts, risk, etc.):
  Answer ONLY the specific metric or question asked using the provided dataset context.
  - Example: "What is the NDVI of F001?" -> Answer with the exact NDVI value (**0.28 - Critical Low**) and a one-line explanation of what that number means. Do NOT list soil pH, moisture, alerts, or fertigation logs unless explicitly asked.
  - After answering, you may offer at most ONE short optional follow-up (e.g., "Would you like me to check the soil moisture for F001 as well?").

- GENERAL AGRICULTURE QUESTION (soil science, irrigation, pest management, remote sensing, crop guidelines):
  Answer concisely using general agricultural knowledge in plain, farmer-friendly terms. Do NOT inject farm telemetry.

- OFF-TOPIC QUESTION (non-agricultural topics like sports, movies, politics):
  Politely decline in one sentence and steer the conversation back to farming and DigiCrop AI.

===============================================================================
2. ANSWER LENGTH AND TONE RULES
===============================================================================
- Match length to the question:
  * Simple factual question = 1-3 sentences.
  * "Explain" or "How does" question = 1 short paragraph or 3-5 concise bullet points.
  * "Detailed / full report" request = Structured multi-section response.
- Lead with the direct answer in the very first sentence. Never use filler intros ("Great question!", "Certainly!", "Sure, I can help with that") and do not repeat the user's question.
- Never list unrequested telemetry metrics or extra sections.
- Tone: Warm, practical, supportive, and farmer-friendly. Explain technical acronyms (NDVI, EC, NDRE) briefly when first introduced.

===============================================================================
3. FORMATTING AND STRUCTURE RULES
===============================================================================
- Output clean Markdown.
- Use short paragraphs and bold text for key values and metrics (e.g., **NDVI: 0.28 (Critical Low)**).
- ALWAYS include units for every numerical value (%, dS/m, °C, mm, pH value).
- Use bullet points ONLY when listing 3 or more parallel items.
- Use Markdown tables ONLY when explicitly comparing multiple farms or multiple metrics.
- No raw JSON output and no markdown code fences around normal text.

===============================================================================
4. GROUNDING AND ANTI-HALLUCINATION RULES
===============================================================================
- For farm-specific telemetry, use ONLY the facts present in the provided dataset context.
- STRICT ANTI-HALLUCINATION RULE: Never fabricate or invent farm values, soil moisture %, soil pH, EC readings, NDVI numbers, temperatures, dates, or farm IDs.
- MISSING DATA RULE: If a requested farm measurement or attribute is missing from the dataset, state clearly in one sentence: "I don't have [metric] data for this farm."
- UNKNOWN FARM RULE: If asked about an unindexed farm (e.g. F999), reply: "I don't have data for farm [Farm ID]. Please select or upload its dataset to inspect telemetry."
- DATA SUPREMACY: If general agricultural knowledge and farm dataset data conflict, the dataset data wins for that specific farm.
`;

function parseFrontMatter(rawContent) {
  if (!rawContent || typeof rawContent !== 'string') {
    return { metadata: {}, content: '' };
  }
  const normalized = rawContent.trim();
  if (!normalized.startsWith('---')) {
    return { metadata: {}, content: normalized };
  }
  const endIdx = normalized.indexOf('---', 3);
  if (endIdx === -1) {
    return { metadata: {}, content: normalized };
  }
  const frontText = normalized.substring(3, endIdx).trim();
  const content = normalized.substring(endIdx + 3).trim();
  const metadata = {};
  frontText.split('\n').forEach(line => {
    const colon = line.indexOf(':');
    if (colon !== -1) {
      metadata[line.substring(0, colon).trim().toLowerCase()] = line.substring(colon + 1).trim();
    }
  });
  return { metadata, content };
}

function loadServerDatasets() {
  return [];
}

function extractActiveFarmFromHistory(conversationHistory = []) {
  if (!Array.isArray(conversationHistory) || conversationHistory.length === 0) {
    return null;
  }
  for (let i = conversationHistory.length - 1; i >= 0; i--) {
    const msg = conversationHistory[i];
    const text = (msg.text || msg.content || '').toUpperCase();
    const match = text.match(/F[0-9]{3}|F00[0-9]/);
    if (match) return match[0];
  }
  return null;
}

// 5-Mode Intent Classifier
function classifyUserIntent(userQuery, selectedDatasetId = 'general', conversationHistory = []) {
  if (!userQuery) return { mode: 'GREETING_SMALLTALK', activeFarmId: null };

  const qTrim = userQuery.trim();
  const qLower = qTrim.toLowerCase();
  const activeFarmId = extractActiveFarmFromHistory(conversationHistory);

  // 1. Greeting, Identity & Small Talk
  const greetingPhrases = [
    'hi', 'hello', 'hey', 'hey bro', 'hi bro', 'hello bro', 'good morning', 'good afternoon',
    'good evening', 'thanks', 'thank you', 'ok', 'okay', 'cool', 'awesome', 'sup', 'yo',
    'who are you', 'what are you', 'what can you do', 'tell me about yourself'
  ];
  if (greetingPhrases.includes(qLower) || (/^hi\b|^hello\b|^hey\b/i.test(qLower) && qTrim.split(/\s+/).length <= 3)) {
    if (!qLower.includes('ndvi') && !qLower.includes('soil') && !qLower.includes('farm') && !qLower.includes('f00')) {
      return { mode: 'GREETING_SMALLTALK', activeFarmId };
    }
  }

  // 2. Vague & Underspecified
  const vaguePhrases = [
    'help', 'tell me about my farm', 'what\'s the status', 'how is my farm',
    'how are the crops doing', 'show farm status', 'farm status', 'my farm status',
    'what is happening with my farm', 'give me details', 'status'
  ];
  const isSelected = selectedDatasetId && selectedDatasetId !== 'general';
  const hasSpecificFarmId = /f[0-9]{3}|f00[0-9]/i.test(qLower);

  if ((vaguePhrases.includes(qLower) || qLower === 'help') && !hasSpecificFarmId && !activeFarmId && !isSelected) {
    return { mode: 'VAGUE_UNDERSPECIFIED', activeFarmId: null };
  }

  // 3. Off-Topic Check
  const offTopicKeywords = [
    'cricket', 'football', 'movie', 'actor', 'president', 'capital of france', 'joke',
    'who won', 'bitcoin', 'crypto', 'stock market', 'iphone', 'play station', 'game'
  ];
  if (offTopicKeywords.some(kw => qLower.includes(kw))) {
    return { mode: 'OFF_TOPIC', activeFarmId: null };
  }

  // 4. Farm Data Question
  const farmTelemetryKeywords = [
    'f001', 'f002', 'f003', 'f004', 'f005', 'f006', 'f007', 'f008', 'f009', 'f999',
    'ndvi', 'soil moisture', 'soil ph', 'ec', 'electrical conductivity', 'ndre', 'ndwi',
    'evi', 'telemetry', 'sensor', 'alert', 'alerts', 'root-zone', 'drip', 'fertigation',
    'risk', 'curling', 'scorching', 'vineyard', 'temperature', 'humidity', 'rainfall',
    'its moisture', 'its ndvi', 'its soil', 'its status', 'and f004', 'and f001'
  ];

  const mentionsFarm = farmTelemetryKeywords.some(kw => qLower.includes(kw)) || hasSpecificFarmId;
  const isFollowUpWithContext = (qLower.includes('its') || qLower.includes('and')) && activeFarmId !== null;

  if (mentionsFarm || isSelected || isFollowUpWithContext) {
    return { mode: 'FARM_DATA_QUESTION', activeFarmId };
  }

  // 5. General Agriculture Question
  return { mode: 'GENERAL_AGRICULTURE', activeFarmId: null };
}

// Targeted Section Chunking
function chunkDatasetByTopic(dsContent, queryLower) {
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

function detectDatasetIntent(userQuery, availableDatasets, selectedDatasetId = null, conversationHistory = []) {
  if (!userQuery) return { targetDatasets: [], datasetNames: [] };
  const queryLower = userQuery.toLowerCase();
  const activeFarmId = extractActiveFarmFromHistory(conversationHistory);

  const matchedSet = new Set();

  if (selectedDatasetId && selectedDatasetId !== 'general') {
    const selDs = availableDatasets.find(d => d.id === selectedDatasetId || d.fileName === selectedDatasetId);
    if (selDs) matchedSet.add(selDs);
  }

  availableDatasets.forEach(ds => {
    if (ds.farmId) {
      if (queryLower.includes(ds.farmId.toLowerCase())) {
        matchedSet.add(ds);
      } else if (activeFarmId && ds.farmId.toUpperCase() === activeFarmId.toUpperCase()) {
        matchedSet.add(ds);
      }
    }
  });

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

  return {
    targetDatasets,
    datasetNames: targetDatasets.map(d => d.name),
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { message, selectedDatasetId = 'general', conversationHistory = [], customDatasets = [] } = req.body || {};

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message string is required.' });
    }

    const startTime = Date.now();
    const trace = [];

    const groqKey = process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.trim() : null;
    const geminiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null;
    const groqModel = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

    const tIntent = Date.now();
    const { mode, activeFarmId } = classifyUserIntent(message, selectedDatasetId, conversationHistory);
    trace.push({
      agent: 'Intent Classifier',
      action: 'Classify User Intent',
      status: 'Success',
      durationMs: Date.now() - tIntent,
      detail: `mode: ${mode}`,
    });

    // Helper for non-model response usage
    const makeNonModelUsage = (modelName = 'None') => ({
      inputTokens: 0,
      outputTokens: 0,
      thinkingTokens: 0,
      totalTokens: 0,
      model: modelName,
      latencyMs: Date.now() - startTime,
      calledModel: false,
    });

    // MODE 1: GREETING & SMALL TALK
    if (mode === 'GREETING_SMALLTALK') {
      trace.push({ agent: 'Guardrail', action: 'Intent Short-Circuit', status: 'Handled', durationMs: Date.now() - startTime, detail: 'Handled GREETING_SMALLTALK' });
      return res.status(200).json({
        geminiConnected: true,
        answer: "Hello! 👋 I'm DigiCrop AI, your agricultural assistant.\n\nHow can I help you today? Ask me any agricultural question or upload a dataset to analyze your farm metrics.",
        sources: ['DigiCrop Guidance'],
        modelUsed: groqKey ? groqModel : 'Gemini Flash',
        mode,
        usage: makeNonModelUsage(),
        trace,
      });
    }

    // MODE 2: VAGUE & UNDERSPECIFIED
    if (mode === 'VAGUE_UNDERSPECIFIED') {
      trace.push({ agent: 'Guardrail', action: 'Intent Short-Circuit', status: 'Handled', durationMs: Date.now() - startTime, detail: 'Handled VAGUE_UNDERSPECIFIED' });
      return res.status(200).json({
        geminiConnected: true,
        answer: "Which farm or dataset would you like to inspect? Upload or select a dataset to inspect NDVI, soil moisture, weather, or alerts.",
        sources: ['DigiCrop Guidance'],
        modelUsed: groqKey ? groqModel : 'Gemini Flash',
        mode,
        usage: makeNonModelUsage(),
        trace,
      });
    }

    // MODE 3: OFF-TOPIC
    if (mode === 'OFF_TOPIC') {
      trace.push({ agent: 'Guardrail', action: 'Intent Short-Circuit', status: 'Handled', durationMs: Date.now() - startTime, detail: 'Handled OFF_TOPIC' });
      return res.status(200).json({
        geminiConnected: true,
        answer: "I specialize in farming, crops, and agricultural telemetry. How can I help with your crops or farm datasets today?",
        sources: ['DigiCrop Guidance'],
        modelUsed: groqKey ? groqModel : 'Gemini Flash',
        mode,
        usage: makeNonModelUsage(),
        trace,
      });
    }

    // Load server datasets & merge custom datasets
    const serverDatasets = loadServerDatasets();
    const allDatasets = [...serverDatasets];
    if (Array.isArray(customDatasets)) {
      customDatasets.forEach(cd => {
        if (cd && cd.name && cd.content && !allDatasets.some(d => d.id === cd.id)) {
          allDatasets.push({
            id: cd.id || cd.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
            fileName: cd.fileName || `${cd.name}.md`,
            name: cd.name,
            category: cd.category || 'User Dataset',
            farmId: cd.farmId || null,
            crop: cd.crop || null,
            description: cd.description || 'Custom uploaded dataset.',
            content: cd.content,
            raw: cd.content,
          });
        }
      });
    }

    // Unknown Farm Check
    const tGuard = Date.now();
    const farmIdMatch = message.toLowerCase().match(/f[0-9]{3}|f00[0-9]/i);
    const targetFarmId = (farmIdMatch ? farmIdMatch[0] : activeFarmId)?.toUpperCase();

    if (targetFarmId) {
      const farmDs = allDatasets.find(d => 
        (d.farmId && d.farmId.toUpperCase() === targetFarmId) ||
        d.name.toUpperCase().includes(targetFarmId) ||
        d.id.toUpperCase().includes(targetFarmId) ||
        d.content.includes(targetFarmId)
      );

      if (!farmDs) {
        trace.push({ agent: 'Guardrail', action: 'Check Farm ID', status: 'Triggered', durationMs: Date.now() - tGuard, detail: `Unindexed farm: ${targetFarmId}` });
        return res.status(200).json({
          geminiConnected: true,
          answer: `I don't have dataset or telemetry information for farm **${targetFarmId}**. Please select or upload the ${targetFarmId} dataset to inspect telemetry.`,
          sources: ['System Guardrail'],
          modelUsed: groqKey ? groqModel : 'Gemini Flash',
          mode: 'FARM_DATA_QUESTION',
          usage: makeNonModelUsage(),
          trace,
        });
      }
    }
    trace.push({ agent: 'Guardrail', action: 'Check Farm ID', status: 'Passed', durationMs: Date.now() - tGuard, detail: targetFarmId ? `Validated farm: ${targetFarmId}` : 'No farm ID restriction' });

    // Detect target datasets & chunk content
    const tRet = Date.now();
    const { targetDatasets, datasetNames } = detectDatasetIntent(message, allDatasets, selectedDatasetId, conversationHistory);
    trace.push({
      agent: 'Retriever',
      action: 'Search Datasets & Chunking',
      status: 'Success',
      durationMs: Date.now() - tRet,
      detail: `${targetDatasets.length} dataset(s) matched (${datasetNames.join(', ') || 'None'})`,
    });

    let contextText = '';
    if (mode === 'FARM_DATA_QUESTION' && targetDatasets.length > 0) {
      contextText += `=== TARGETED FARM DATASET CONTEXT (${targetDatasets.length}) ===\n\n`;
      targetDatasets.forEach(ds => {
        contextText += `--- DATASET: "${ds.name}" (Farm ID: ${ds.farmId || 'N/A'}) ---\n`;
        contextText += `${ds.content}\n\n`;
      });
      contextText += `===============================================\n\n`;
    }

    const isDetailedRequest = message.toLowerCase().includes('explain in detail') || message.toLowerCase().includes('full report') || message.toLowerCase().includes('detailed');
    let maxOutputTokens = 350;
    if (mode === 'GENERAL_AGRICULTURE') maxOutputTokens = 600;
    if (isDetailedRequest) maxOutputTokens = 1200;

    const currentPromptText = contextText ? `${contextText}USER QUESTION: ${message}` : message;

    // 1. PRIMARY INFERENCE: GROQ API
    if (groqKey) {
      const tGen = Date.now();
      try {
        const groqMessages = [
          { role: 'system', content: SYSTEM_PROMPT }
        ];

        if (Array.isArray(conversationHistory)) {
          conversationHistory.slice(-6).forEach(msg => {
            groqMessages.push({
              role: (msg.sender === 'user' || msg.role === 'user') ? 'user' : 'assistant',
              content: msg.text || msg.content || ''
            });
          });
        }

        groqMessages.push({
          role: 'user',
          content: currentPromptText
        });

        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: groqModel,
            messages: groqMessages,
            temperature: 0.3,
            top_p: 0.9,
            max_tokens: maxOutputTokens,
          })
        });

        if (groqResponse.ok) {
          const groqData = await groqResponse.json();
          const groqAnswer = groqData.choices?.[0]?.message?.content;

          if (groqAnswer) {
            const sourcesUsed = mode === 'FARM_DATA_QUESTION' && datasetNames.length > 0
              ? datasetNames
              : ['Groq Agricultural AI'];

            const gUsage = groqData.usage || {};
            const usage = {
              inputTokens: gUsage.prompt_tokens || 0,
              outputTokens: gUsage.completion_tokens || 0,
              thinkingTokens: 0,
              totalTokens: gUsage.total_tokens || ((gUsage.prompt_tokens || 0) + (gUsage.completion_tokens || 0)),
              model: groqModel,
              latencyMs: Date.now() - startTime,
              calledModel: true,
            };

            trace.push({
              agent: 'Model Generator',
              action: 'Generate Groq Response',
              status: 'Success',
              durationMs: Date.now() - tGen,
              detail: `Model: ${groqModel} (${usage.totalTokens} tokens)`,
            });

            return res.status(200).json({
              geminiConnected: true,
              answer: groqAnswer,
              sources: sourcesUsed,
              modelUsed: `Groq (${groqModel})`,
              mode,
              targetDatasets: targetDatasets.map(d => ({ name: d.name, fileName: d.fileName })),
              usage,
              trace,
            });
          }
        }
      } catch (err) {
        console.warn('[Groq API Call Failed]:', err.message);
        trace.push({ agent: 'Model Generator', action: 'Groq API Call', status: 'Failed', durationMs: Date.now() - tGen, detail: err.message });
      }
    }

    // 2. SECONDARY INFERENCE: GEMINI API FALLBACK
    if (geminiKey) {
      const tGen = Date.now();
      const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`;
      
      const contents = [];
      if (Array.isArray(conversationHistory)) {
        conversationHistory.slice(-6).forEach(msg => {
          contents.push({
            role: (msg.sender === 'user' || msg.role === 'user') ? 'user' : 'model',
            parts: [{ text: msg.text || msg.content || '' }]
          });
        });
      }
      contents.push({
        role: 'user',
        parts: [{ text: currentPromptText }]
      });

      try {
        const geminiResponse = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            generationConfig: {
              temperature: 0.3,
              topP: 0.9,
              maxOutputTokens,
            }
          })
        });

        if (geminiResponse.ok) {
          const geminiData = await geminiResponse.json();
          const geminiAnswer = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (geminiAnswer) {
            const sourcesUsed = mode === 'FARM_DATA_QUESTION' && datasetNames.length > 0
              ? datasetNames
              : ['Gemini Agricultural Knowledge'];

            const meta = geminiData.usageMetadata || {};
            const usage = {
              inputTokens: meta.promptTokenCount || 0,
              outputTokens: meta.candidatesTokenCount || 0,
              thinkingTokens: meta.thoughtsTokenCount || 0,
              totalTokens: meta.totalTokenCount || ((meta.promptTokenCount || 0) + (meta.candidatesTokenCount || 0)),
              model: geminiModel,
              latencyMs: Date.now() - startTime,
              calledModel: true,
            };

            trace.push({
              agent: 'Model Generator',
              action: 'Generate Gemini Response',
              status: 'Success',
              durationMs: Date.now() - tGen,
              detail: `Model: ${geminiModel} (${usage.totalTokens} tokens)`,
            });

            return res.status(200).json({
              geminiConnected: true,
              answer: geminiAnswer,
              sources: sourcesUsed,
              modelUsed: geminiModel,
              mode,
              targetDatasets: targetDatasets.map(d => ({ name: d.name, fileName: d.fileName })),
              usage,
              trace,
            });
          }
        }
      } catch (err) {
        console.warn('[Gemini API Call Failed]:', err.message);
        trace.push({ agent: 'Model Generator', action: 'Gemini API Call', status: 'Failed', durationMs: Date.now() - tGen, detail: err.message });
      }
    }

    // 3. TERTIARY FALLBACK: GROUNDED DATASET RAG RESPONSE
    const tFall = Date.now();
    if (mode === 'FARM_DATA_QUESTION' && targetDatasets.length > 0) {
      const mainDs = targetDatasets[0];
      trace.push({ agent: 'Fallback', action: 'Grounded RAG Engine Fallback', status: 'Fallback Used', durationMs: Date.now() - tFall, detail: 'Used local dataset text fallback' });
      return res.status(200).json({
        geminiConnected: true,
        answer: `*Note: Here is the observed telemetry from your dataset:*\n\n**${mainDs.name} Telemetry:**\n\n${mainDs.content}`,
        sources: datasetNames,
        modelUsed: 'Grounded Dataset Engine',
        mode,
        usage: makeNonModelUsage('Grounded Dataset Engine'),
        trace,
      });
    }

    trace.push({ agent: 'Fallback', action: 'Service Unavailable Fallback', status: 'Fallback Used', durationMs: Date.now() - tFall, detail: 'API quota busy' });
    return res.status(200).json({
      geminiConnected: false,
      answer: '⚠️ **AI Service Busy**: Please wait a moment and try again.',
      sources: ['API Diagnostic'],
      modelUsed: 'DigiCrop AI',
      usage: makeNonModelUsage('DigiCrop AI'),
      trace,
    });

  } catch (error) {
    console.error('[DigiCrop AI Error]:', error);
    return res.status(500).json({
      geminiConnected: false,
      error: error.message || 'Internal Server Error',
      answer: 'AI analysis is temporarily unavailable. Please try again.'
    });
  }
};
