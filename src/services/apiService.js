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

export async function sendChatMessage({
  message,
  selectedDatasetId = 'general',
  conversationHistory = [],
}) {
  const allDatasets = datasetService.getAllDatasets();
  const customDatasets = datasetService.customDatasets;

  // 1. Client-Side Pre-Check for instant short-circuiting
  const clientPreCheck = preCheckUserQuery(message, allDatasets, selectedDatasetId, conversationHistory);
  if (clientPreCheck.handled) {
    const nonModelUsage = {
      inputTokens: 0,
      outputTokens: 0,
      thinkingTokens: 0,
      totalTokens: 0,
      model: 'DigiCrop Guardrail',
      latencyMs: 15,
      calledModel: false,
    };
    const clientTrace = [
      { agent: 'Intent Classifier', action: 'Classify User Intent', status: 'Success', durationMs: 5, detail: 'Handled by pre-check' },
      { agent: 'Guardrail', action: 'Pre-check Short-Circuit', status: 'Handled', durationMs: 10, detail: 'Pre-check response' },
    ];

    saveMonitorLogToStorage({
      id: 'req_' + Date.now(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
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
      usage: nonModelUsage,
      trace: clientTrace,
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
        const usage = data.usage || {
          inputTokens: 0,
          outputTokens: 0,
          thinkingTokens: 0,
          totalTokens: 0,
          model: data.modelUsed || 'Gemini Flash',
          latencyMs: 250,
          calledModel: false,
        };
        const trace = data.trace || [];

        saveMonitorLogToStorage({
          id: 'req_' + Date.now(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
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
          usage,
          trace,
          success: true,
        };
      }
    } catch (err) {
      // Continue to client fallback
    }
  }

  // 3. Fallback Engine
  const { mode } = classifyUserIntent(message, selectedDatasetId, conversationHistory);
  const { targetDatasets, datasetNames } = detectDatasetIntent(message, allDatasets, selectedDatasetId, conversationHistory);

  const fallbackUsage = {
    inputTokens: 0,
    outputTokens: 0,
    thinkingTokens: 0,
    totalTokens: 0,
    model: 'Local Fallback',
    latencyMs: 50,
    calledModel: false,
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
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    question: message.substring(0, 80),
    mode: mode || 'FARM_DATA_QUESTION',
    usage: fallbackUsage,
    trace: fallbackTrace,
    status: 'Fallback',
  });

  return {
    answer: fallbackAnswer,
    sources: fallbackSources,
    usage: fallbackUsage,
    trace: fallbackTrace,
    success: true,
  };
}
