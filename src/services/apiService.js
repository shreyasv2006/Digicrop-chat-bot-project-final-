/**
 * DigiCrop AI - Frontend API Service
 * Communicates with backend /api/chat endpoint with client-side fallback
 */

import { datasetService } from './datasetService';
import { detectDatasetIntent, buildGroundedContext, preCheckUserQuery } from '../utils/ragEngine';

export async function sendChatMessage({
  message,
  selectedDatasetId = 'general',
  conversationHistory = [],
}) {
  const allDatasets = datasetService.getAllDatasets();
  const customDatasets = datasetService.customDatasets;

  // 1. Client-Side Pre-Check for instant short-circuiting (e.g., dataset commands, missing farm queries)
  const clientPreCheck = preCheckUserQuery(message, allDatasets, selectedDatasetId);
  if (clientPreCheck.handled) {
    return {
      answer: clientPreCheck.answer,
      sources: clientPreCheck.sources || ['DigiCrop Guidance'],
      newSelectedDatasetId: clientPreCheck.newSelectedDatasetId || null,
      modelUsed: 'DigiCrop Pre-Check Guardrail',
      success: true,
    };
  }

  // 2. Call backend API
  const apiEndpoints = [
    '/api/chat',
    'http://localhost:3001/api/chat',
  ];

  for (const endpoint of apiEndpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          selectedDatasetId,
          conversationHistory,
          customDatasets,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          answer: data.answer,
          sources: data.sources || ['Gemini Agricultural Knowledge'],
          modelUsed: data.modelUsed || 'Gemini Flash',
          newSelectedDatasetId: data.newSelectedDatasetId || null,
          mode: data.mode || 'MODE_A_GENERAL',
          isStrict: data.isStrict || false,
          success: true,
        };
      }
    } catch (err) {
      // Endpoint unreachable, continue to fallback
    }
  }

  // 3. Fallback execution if backend endpoint is unavailable
  console.log('[DigiCrop AI] Executing client-side RAG fallback engine.');
  const { targetDatasets, isStrict, datasetNames } = detectDatasetIntent(message, allDatasets, selectedDatasetId);

  const clientApiKey = typeof process !== 'undefined' && process.env ? (process.env.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY) : null;
  const clientModel = typeof process !== 'undefined' && process.env ? (process.env.GEMINI_MODEL || 'gemini-2.5-flash') : 'gemini-2.5-flash';

  if (clientApiKey) {
    try {
      const { systemInstruction, contextText } = buildGroundedContext(message, targetDatasets, isStrict, conversationHistory);
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${clientModel}:generateContent?key=${clientApiKey}`;
      
      const contents = [];
      conversationHistory.slice(-6).forEach(msg => {
        contents.push({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        });
      });
      contents.push({
        role: 'user',
        parts: [{ text: `${contextText}USER QUESTION: ${message}` }]
      });

      const resp = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: systemInstruction }] },
          generationConfig: { temperature: 0.2, topP: 0.95 }
        })
      });

      if (resp.ok) {
        const resData = await resp.json();
        const ans = resData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (ans) {
          return {
            answer: ans,
            sources: datasetNames.length > 0 ? datasetNames : ['Gemini Agricultural Knowledge'],
            modelUsed: clientModel,
            isStrict,
            success: true,
          };
        }
      }
    } catch (err) {
      console.warn('Client direct Gemini call failed:', err);
    }
  }

  // Failsafe dataset answer generator
  return generateOfflineFailsafeResponse(message, targetDatasets, isStrict, datasetNames);
}

function generateOfflineFailsafeResponse(message, targetDatasets, isStrict, datasetNames) {
  if (targetDatasets.length > 0) {
    const mainDs = targetDatasets[0];
    return {
      answer: `### ${mainDs.name} Analysis\n\n**Observed Telemetry:**\n${mainDs.content}\n\n*Source: ${mainDs.name}*`,
      sources: [mainDs.name],
      success: true,
    };
  }

  return {
    answer: `I can assist with general agriculture concepts, or analyze specific farm datasets. Please select or provide a farm dataset such as **F001 Farm Dataset** to inspect telemetry metrics.`,
    sources: ['DigiCrop Guidance'],
    success: true,
  };
}
