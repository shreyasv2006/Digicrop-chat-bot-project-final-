/**
 * DigiCrop AI - 10 Scenario Verification Test Script
 */

require('dotenv').config();
const handler = require('./api/chat.js');

const mockRes = () => {
  const res = {};
  res.headers = {};
  res.statusCode = 200;
  res.setHeader = (k, v) => res.headers[k] = v;
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.body = data;
    return res;
  };
  res.end = () => res;
  return res;
};

const scenarios = [
  { id: 1, prompt: "hi bro", history: [], desc: "Greeting / Small Talk" },
  { id: 2, prompt: "help", history: [], desc: "Vague / Underspecified" },
  { id: 3, prompt: "What is the NDVI of F001?", history: [], desc: "Targeted Farm Data (NDVI)" },
  { id: 4, prompt: "and its soil moisture?", history: [{ role: 'user', text: 'What is the NDVI of F001?' }, { role: 'model', text: 'The NDVI of F001 is 0.28.' }], desc: "Active Farm Follow-up Memory" },
  { id: 5, prompt: "What is the status of F004?", history: [], desc: "Concise Status Request" },
  { id: 6, prompt: "What is the NDVI of F999?", history: [], desc: "Unknown Farm Guardrail (F999)" },
  { id: 7, prompt: "How does NDVI work?", history: [], desc: "General Agriculture Concept" },
  { id: 8, prompt: "Who won the cricket match?", history: [], desc: "Off-Topic Rejection" },
  { id: 9, prompt: "Explain in detail the risks in F001", history: [], desc: "Detailed Report Request" },
];

async function runTests() {
  console.log('================================================================');
  console.log('        DIGICROP AI - 10 SCENARIO INTEGRATION VERIFICATION       ');
  console.log('================================================================\n');

  for (const s of scenarios) {
    console.log(`----------------------------------------------------------------`);
    console.log(`TEST ${s.id}: [${s.desc}]`);
    console.log(`USER PROMPT: "${s.prompt}"`);

    const req = {
      method: 'POST',
      body: {
        message: s.prompt,
        selectedDatasetId: 'general',
        conversationHistory: s.history
      }
    };
    const res = mockRes();

    await handler(req, res);

    console.log(`STATUS CODE: ${res.statusCode}`);
    console.log(`MODE DETECTED: ${res.body.mode}`);
    console.log(`SOURCES: ${JSON.stringify(res.body.sources)}`);
    console.log(`RESPONSE:\n${res.body.answer}`);
    console.log(`----------------------------------------------------------------\n`);
  }
}

runTests();
