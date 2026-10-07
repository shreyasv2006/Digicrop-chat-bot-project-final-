import datasetService from './datasetService';
import { preCheckUserQuery, classifyUserIntent, detectDatasetIntent } from '../utils/ragEngine';

export function saveMonitorLogToStorage(entry) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const KEY = 'digicrop_agent_monitor_history';
      const raw = window.localStorage.getItem(KEY);
      const current = raw ? JSON.parse(raw) : [];
      current.unshift(entry);
      window.localStorage.setItem(KEY, JSON.stringify(current.slice(0, 200)));
    }
  } catch (err) {
    console.warn('Failed to save monitor log:', err);
  }
}

export function getMonitorHistory() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const KEY = 'digicrop_agent_monitor_history';
      const raw = window.localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    }
  } catch (err) {}
  return [];
}

export function clearMonitorHistory() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('digicrop_agent_monitor_history');
    }
  } catch (err) {}
}

export async function sendChatMessage({
  message,
  selectedDatasetId = 'general',
  conversationHistory = [],
}) {
  const allDatasets = datasetService.getAllDatasets();
  const customDatasets = datasetService.customDatasets;

  // 1. Client-Side Pre-Check for instant short-circuiting
  try {
    const clientPreCheck = preCheckUserQuery(message, allDatasets, selectedDatasetId, conversationHistory);
    if (clientPreCheck && clientPreCheck.handled) {
      const nonModelUsage = {
        provider: 'None',
        model: 'DigiCrop Guardrail',
        promptTokens: 0,
        completionTokens: 0,
        thinkingTokens: 0,
        totalTokens: 0,
        questionTokens: 0,
        latencyMs: 15,
        calledModel: false,
        inputTokens: 0,
        outputTokens: 0,
      };
      const clientTrace = [
        { agent: 'Intent Classifier', action: 'Classify User Intent', status: 'Success', durationMs: 5, detail: 'Handled by pre-check' },
        { agent: 'Guardrail', action: 'Pre-check Short-Circuit', status: 'Handled', durationMs: 10, detail: 'Pre-check response' },
      ];

      saveMonitorLogToStorage({
        id: 'req_' + Date.now(),
        timestamp: Date.now(),
        question: message.substring(0, 80),
        mode: 'GREETING_SMALLTALK',
        usage: nonModelUsage,
        trace: clientTrace,
        status: 'Handled',
      });

      return {
        answer: clientPreCheck.answer,
        sources: clientPreCheck.sources || ['DigiCrop Guidance'],
        newSelectedDatasetId: clientPreCheck.newSelectedDatasetId || null,
        modelUsed: 'DigiCrop Guardrail',
        geminiConnected: true,
        usage: nonModelUsage,
        trace: clientTrace,
        success: true,
      };
    }
  } catch (err) {
    console.warn('Pre-check error, proceeding to backend:', err);
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
        const usage = data.usage || {
          provider: 'None',
          model: data.modelUsed || 'AI Engine',
          promptTokens: 0,
          completionTokens: 0,
          thinkingTokens: 0,
          totalTokens: 0,
          questionTokens: 0,
          latencyMs: 250,
          calledModel: false,
          inputTokens: 0,
          outputTokens: 0,
        };
        const trace = data.trace || [];

        saveMonitorLogToStorage({
          id: 'req_' + Date.now(),
          timestamp: Date.now(),
          question: message.substring(0, 80),
          mode: data.mode || 'FARM_DATA_QUESTION',
          usage,
          trace,
          status: 'Success',
        });

        return {
          answer: data.answer,
          sources: data.sources || ['Gemini Agricultural Knowledge'],
          modelUsed: data.modelUsed || 'Gemini Flash',
          newSelectedDatasetId: data.newSelectedDatasetId || null,
          mode: data.mode || 'FARM_DATA_QUESTION',
          geminiConnected: data.geminiConnected !== false,
          usage,
          trace,
          success: true,
        };
      }
    } catch (err) {
      console.warn(`Endpoint ${endpoint} failed:`, err);
    }
  }

  // 3. Fallback Engine
  let mode = 'GENERAL_AGRICULTURE';
  let targetDatasets = [];
  let datasetNames = [];
  try {
    const intentRes = classifyUserIntent(message, selectedDatasetId, conversationHistory);
    mode = intentRes.mode;
    const detRes = detectDatasetIntent(message, allDatasets, selectedDatasetId, conversationHistory);
    targetDatasets = detRes.targetDatasets;
    datasetNames = detRes.datasetNames;
  } catch (e) {}

  const fallbackUsage = {
    provider: 'None',
    model: 'Local Fallback',
    promptTokens: 0,
    completionTokens: 0,
    thinkingTokens: 0,
    totalTokens: 0,
    questionTokens: 0,
    latencyMs: 50,
    calledModel: false,
    inputTokens: 0,
    outputTokens: 0,
  };
  const fallbackTrace = [
    { agent: 'Intent Classifier', action: 'Classify User Intent', status: 'Success', durationMs: 10, detail: `mode: ${mode}` },
    { agent: 'Fallback', action: 'Local RAG Fallback', status: 'Fallback Used', durationMs: 40, detail: 'Network fallback' },
  ];

  let fallbackAnswer = "I specialize in farming, crops, and agricultural telemetry. How can I help with your crops or farm datasets today?";
  let fallbackSources = ['DigiCrop Guidance'];

  if (mode === 'FARM_DATA_QUESTION' && targetDatasets.length > 0) {
    const mainDs = targetDatasets[0];
    fallbackAnswer = `*Note: Unable to reach live AI service. Here is the dataset info:*\n\n**${mainDs.name}:**\n${mainDs.content}`;
    fallbackSources = datasetNames;
  }

  saveMonitorLogToStorage({
    id: 'req_' + Date.now(),
    timestamp: Date.now(),
    question: message.substring(0, 80),
    mode: mode || 'FARM_DATA_QUESTION',
    usage: fallbackUsage,
    trace: fallbackTrace,
    status: 'Fallback',
  });

  return {
    answer: fallbackAnswer,
    sources: fallbackSources,
    geminiConnected: false,
    usage: fallbackUsage,
    trace: fallbackTrace,
    success: true,
  };
}
