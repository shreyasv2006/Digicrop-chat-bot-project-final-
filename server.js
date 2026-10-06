/**
 * DigiCrop AI - Local Express Backend Server
 * Serves /api/chat and /api/datasets with debug logging
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const chatHandler = require('./api/chat');
const datasetsHandler = require('./api/datasets');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Attach API handlers
app.post('/api/chat', (req, res) => chatHandler(req, res));
app.get('/api/datasets', (req, res) => datasetsHandler(req, res));

// Health check & Diagnostic Status endpoint
app.get('/api/health', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  if (!apiKey) {
    return res.json({
      status: 'error',
      geminiConnected: false,
      message: 'GEMINI_API_KEY is not configured or empty in .env file',
      geminiModel: model,
    });
  }

  // Attempt lightweight ping to Gemini API to test real connectivity
  try {
    const pingUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const pingResp = await fetch(pingUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'ping' }] }]
      })
    });

    if (pingResp.ok) {
      return res.json({
        status: 'ok',
        geminiConnected: true,
        message: 'Gemini API is connected and responding successfully!',
        geminiModel: model,
      });
    } else {
      const errTxt = await pingResp.text();
      return res.json({
        status: 'error',
        geminiConnected: false,
        message: `Gemini API call failed with status ${pingResp.status}`,
        details: errTxt,
        geminiModel: model,
      });
    }
  } catch (err) {
    return res.json({
      status: 'error',
      geminiConnected: false,
      message: `Gemini API network error: ${err.message}`,
      geminiModel: model,
    });
  }
});

app.listen(PORT, () => {
  console.log(`[DigiCrop AI Backend] Server running at http://localhost:${PORT}`);
  console.log(`[DigiCrop AI Backend] Gemini Model: ${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}`);
  console.log(`[DigiCrop AI Backend] API Key set: ${!!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim())}`);
});
