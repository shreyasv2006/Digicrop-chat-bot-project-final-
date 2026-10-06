/**
 * Vercel Serverless Function: /api/chat
 * Handles Gemini Flash API integration with debug logging and diagnostic status
 */

const fs = require('fs');
const path = require('path');

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
  const datasetDirs = [
    path.join(__dirname, '../src/datasets'),
    path.join(__dirname, '../datasets'),
    path.join(process.cwd(), 'src/datasets'),
    path.join(process.cwd(), 'datasets'),
  ];

  const datasets = [];
  let foundDir = null;
  for (const dir of datasetDirs) {
    if (fs.existsSync(dir)) {
      foundDir = dir;
      break;
    }
  }

  if (foundDir) {
    const files = fs.readdirSync(foundDir).filter(f => f.endsWith('.md'));
    files.forEach(file => {
      const filePath = path.join(foundDir, file);
      const raw = fs.readFileSync(filePath, 'utf-8');
      const { metadata, content } = parseFrontMatter(raw);
      datasets.push({
        id: file.replace('.md', ''),
        fileName: file,
        name: metadata.name || file.replace('.md', '').toUpperCase(),
        category: metadata.category || 'General',
        farmId: metadata.farm_id || null,
        crop: metadata.crop || null,
        description: metadata.description || 'DigiCrop knowledge dataset.',
        content,
        raw,
      });
    });
  }
  return datasets;
}

// Mode Classifier
function classifyUserIntent(userQuery, selectedDatasetId = 'general') {
  if (!userQuery) return { mode: 'MODE_A_GENERAL', isStrict: false };

  const qLower = userQuery.toLowerCase().trim();
  const strictKeywords = [
    'only from', 'strictly from', 'only use', 'strictly use',
    'don\'t use general', 'do not use general', 'do not invent', 'only according to'
  ];
  const isStrict = strictKeywords.some(kw => qLower.includes(kw));

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

// Intent Dataset Detection
function detectDatasetIntent(userQuery, availableDatasets, selectedDatasetId = null) {
  if (!userQuery) return { targetDatasets: [], isStrict: false, datasetNames: [] };
  const queryLower = userQuery.toLowerCase();
  const { isStrict } = classifyUserIntent(userQuery, selectedDatasetId);

  const matchedSet = new Set();

  if (selectedDatasetId && selectedDatasetId !== 'general') {
    const selDs = availableDatasets.find(d => d.id === selectedDatasetId || d.fileName === selectedDatasetId);
    if (selDs) matchedSet.add(selDs);
  }

  availableDatasets.forEach(ds => {
    if (ds.farmId && queryLower.includes(ds.farmId.toLowerCase())) {
      matchedSet.add(ds);
    }
    const dsNameLower = ds.name.toLowerCase();
    const fileNameLower = ds.fileName.toLowerCase();
    if (queryLower.includes(dsNameLower) || queryLower.includes(fileNameLower)) {
      matchedSet.add(ds);
    }
  });

  const targetDatasets = Array.from(matchedSet);
  return {
    targetDatasets,
    isStrict,
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

    const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null;
    const requestedModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    // SERVER-SIDE DEBUG LOGGING
    console.log('\n[Gemini Debug]');
    console.log(`received user prompt: "${message}"`);
    console.log(`model: ${requestedModel}`);

    if (!apiKey) {
      console.log('request sent: false');
      console.log('response received: false');
      console.log('[Gemini Debug Error] GEMINI_API_KEY is not configured or empty in .env');

      return res.status(200).json({
        geminiConnected: false,
        answer: '⚠️ **Gemini API Key Missing**: Please set `GEMINI_API_KEY=your_key` inside your `.env` file to connect to real Gemini Flash AI.',
        sources: ['Gemini API Diagnostic'],
        modelUsed: requestedModel,
        errorDetails: 'GEMINI_API_KEY environment variable is empty or missing on the server.',
      });
    }

    // Load server datasets & merge with custom user datasets
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

    // Check if query is about a Farm ID (e.g. F999) that does NOT exist in data
    const farmIdMatch = message.toLowerCase().match(/f00[0-9]|f[0-9]{3}/i);
    if (farmIdMatch) {
      const targetFarmId = farmIdMatch[0].toUpperCase();
      const farmDs = allDatasets.find(d => 
        (d.farmId && d.farmId.toUpperCase() === targetFarmId) ||
        d.name.toUpperCase().includes(targetFarmId) ||
        d.id.toUpperCase().includes(targetFarmId) ||
        d.content.includes(targetFarmId)
      );

      if (!farmDs) {
        console.log('request sent: false (short-circuited by anti-hallucination check)');
        console.log('response received: true (grounded negative response)');

        const unkAnswer = message.toLowerCase().includes('risk')
          ? `I can't determine ${targetFarmId}'s risk without its farm data.`
          : `I don't have the current data for farm ${targetFarmId}. Please select or provide the ${targetFarmId} dataset.`;

        return res.status(200).json({
          geminiConnected: true,
          answer: unkAnswer,
          sources: ['System Guardrail'],
          modelUsed: requestedModel,
          mode: 'MODE_B_FARM_DATASET',
        });
      }
    }

    // Classify Mode (MODE A: General Agriculture vs MODE B: Farm Dataset Analysis)
    const { mode, isStrict } = classifyUserIntent(message, selectedDatasetId);
    const { targetDatasets, datasetNames } = detectDatasetIntent(message, allDatasets, selectedDatasetId);

    // Build Context Text
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

    const systemInstructionText = `You are DigiCrop AI — an intelligent agricultural AI assistant created for the DigiCrop agricultural platform.

### MANDATORY SYSTEM BEHAVIOR:

MODE A — GENERAL QUESTIONS (General agriculture, science, or general questions like "tell me a joke", "capital of France", "what is photosynthesis"):
- Answer naturally, helpfully, and uniquely based on the user's specific prompt.
- Do NOT refuse general questions or claim you lack a dataset for general questions.

MODE B — FARM / DATASET QUESTIONS:
- When answering farm-specific questions (NDVI values, soil moisture, alerts, risk scores, farm status, or dataset queries):
  1. Answer ONLY using the facts, numbers, and measurements explicitly present in the provided dataset context.
  2. STRICT ANTI-HALLUCINATION RULE: You MUST NEVER fabricate or invent farm values, soil moisture %, soil pH, EC readings, NDVI numbers, temperatures, sensor readings, dates, or farm IDs.
  3. MISSING DATA RULE: If a requested farm measurement or attribute (e.g. soil pH, yield) is NOT present in the provided dataset context, reply clearly:
     "I don't have that information in the [Dataset Name] dataset."
  4. NO ASSUMPTIONS: Never assume F001 or any farm if the user did not specify it.
  5. DATA VS INTERPRETATION SEPARATION: Differentiate Observed Data, Calculated Results, AI Interpretation, and Action Recommendations.

SOURCE TRANSPARENCY:
- For general questions, end response with: \`Source: Gemini Agricultural Knowledge\`
- For dataset answers, end response with: \`Source: [Dataset Name]\``;

    const contents = [];
    if (Array.isArray(conversationHistory)) {
      conversationHistory.slice(-6).forEach(msg => {
        contents.push({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        });
      });
    }

    const currentPromptText = mode === 'MODE_B_FARM_DATASET' && contextText
      ? `${contextText}USER QUESTION: ${message}`
      : message;

    contents.push({
      role: 'user',
      parts: [{ text: currentPromptText }]
    });

    // Deduplicated fallback model list
    const candidateModels = [...new Set([
      requestedModel,
      'gemini-2.5-flash',
      'gemini-1.5-flash',
      'gemini-2.0-flash',
    ])];

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Retry with exponential backoff for rate limit (429) errors
    async function callGeminiWithRetry(modelCandidate, maxRetries = 3) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelCandidate}:generateContent?key=${apiKey}`;
      const body = JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: systemInstructionText }] },
        generationConfig: {
          temperature: mode === 'MODE_A_GENERAL' ? 0.7 : 0.1,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      });

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
          });

          if (response.ok) {
            return await response.json();
          }

          const errText = await response.text();
          const isRateLimit = response.status === 429;
          const isServerError = response.status >= 500;

          if ((isRateLimit || isServerError) && attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
            console.warn(`[Gemini Debug] ${response.status} on model ${modelCandidate}, attempt ${attempt}/${maxRetries}. Retrying in ${delay}ms...`);
            await sleep(delay);
            continue;
          }

          console.warn(`[Gemini Debug] API call failed for model ${modelCandidate} (status ${response.status}):`, errText.substring(0, 200));
          return null;
        } catch (err) {
          if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000;
            console.warn(`[Gemini Debug] Fetch error on attempt ${attempt}, retrying in ${delay}ms:`, err.message);
            await sleep(delay);
            continue;
          }
          console.warn(`[Gemini Debug] Fetch error for model ${modelCandidate} (final):`, err.message);
          return null;
        }
      }
      return null;
    }

    let geminiResponseData = null;
    let successfulModel = null;

    console.log('request sent: true');

    for (const modelCandidate of candidateModels) {
      geminiResponseData = await callGeminiWithRetry(modelCandidate);
      if (geminiResponseData && geminiResponseData.candidates && geminiResponseData.candidates.length > 0) {
        successfulModel = modelCandidate;
        console.log('response received: true (model:', modelCandidate + ')');
        break;
      }
    }

    if (!geminiResponseData || !geminiResponseData.candidates || geminiResponseData.candidates.length === 0) {
      console.log('response received: false (all models exhausted or rate limited)');
      return res.status(200).json({
        geminiConnected: false,
        answer: '⚠️ **Gemini is temporarily busy** (rate limit reached). Please wait a moment and try again.',
        sources: ['Gemini API Diagnostic'],
        modelUsed: requestedModel,
        errorDetails: 'All Gemini model candidates exhausted after retries.',
      });
    }

    const rawAnswerText = geminiResponseData.candidates[0]?.content?.parts?.[0]?.text || 'No response generated.';

    const sourcesUsed = mode === 'MODE_B_FARM_DATASET' && datasetNames.length > 0
      ? datasetNames
      : ['Gemini Agricultural Knowledge'];

    return res.status(200).json({
      geminiConnected: true,
      answer: rawAnswerText,
      sources: sourcesUsed,
      modelUsed: successfulModel,
      mode,
      isStrict,
      targetDatasets: targetDatasets.map(d => ({ name: d.name, fileName: d.fileName })),
    });

  } catch (error) {
    console.error('[Gemini Debug Error] Error in /api/chat handler:', error);
    return res.status(500).json({
      geminiConnected: false,
      error: error.message || 'Internal Server Error',
      answer: 'AI analysis is temporarily unavailable. Please try again.'
    });
  }
};
