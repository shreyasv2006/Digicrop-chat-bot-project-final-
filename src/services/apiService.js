/**
 * DigiCrop AI - Frontend API Service
 * Communicates with backend /api/chat endpoint with client-side 5-mode fallback
 */

import { datasetService } from './datasetService';
import { classifyUserIntent, preCheckUserQuery, detectDatasetIntent, buildGroundedContext } from '../utils/ragEngine';

export async function sendChatMessage({
  message,
  selectedDatasetId = 'general',
  conversationHistory = [],
}) {
  const allDatasets = datasetService.getAllDatasets();
  const customDatasets = datasetService.customDatasets;

  // 1. Client-Side Pre-Check for instant short-circuiting (Greetings, Vague Queries, Off-Topic, F999)
  const clientPreCheck = preCheckUserQuery(message, allDatasets, selectedDatasetId, conversationHistory);
  if (clientPreCheck.handled) {
    return {
      answer: clientPreCheck.answer,
      sources: clientPreCheck.sources || ['DigiCrop Guidance'],
      newSelectedDatasetId: clientPreCheck.newSelectedDatasetId || null,
      modelUsed: 'DigiCrop Guardrail',
      success: true,
    };
  }

  // 2. Send multi-turn request to backend API
  const apiEndpoints = [
    '/api/chat',
    'http://localhost:3001/api/chat',
  ];

  const trimmedHistory = conversationHistory.slice(-8).map(msg => ({
    sender: msg.sender || msg.role || 'user',
    text: msg.text || msg.content || '',
  }));

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
          conversationHistory: trimmedHistory,
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
          mode: data.mode || 'FARM_DATA_QUESTION',
          success: true,
        };
      }
    } catch (err) {
      // API endpoint unreachable, continue to Tier 3 client fallback
    }
  }

  // 3. Tier 3 Fallback Engine
  console.log('[DigiCrop AI] Executing Tier 3 client-side fallback engine.');
  const { mode } = classifyUserIntent(message, selectedDatasetId, conversationHistory);
  const { targetDatasets, datasetNames } = detectDatasetIntent(message, allDatasets, selectedDatasetId, conversationHistory);

  if (mode === 'FARM_DATA_QUESTION' && targetDatasets.length > 0) {
    const mainDs = targetDatasets[0];
    return {
      answer: `*Note: Unable to reach live AI service. Here is the dataset info:*\n\n**${mainDs.name}:**\n${mainDs.content}`,
      sources: datasetNames,
      success: true,
    };
  }

  return {
    answer: "I specialize in farming, crops, and agricultural telemetry. How can I help with your crops or farm datasets today?",
    sources: ['DigiCrop Guidance'],
    success: true,
  };
}
