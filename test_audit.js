/**
 * DigiCrop AI Integration Test Script
 */

const testPrompts = [
  "What is NDVI?",
  "What is photosynthesis?",
  "How does irrigation affect crops?",
  "What are the major crops grown in India?",
  "Explain precision agriculture.",
  "Tell me a joke.",
  "What is the capital of France?",
  "What is the current NDVI of F999?",
];

async function runAudit() {
  console.log('--- DIGICROP AI GEMINI INTEGRATION AUDIT ---\n');
  
  for (const prompt of testPrompts) {
    console.log(`[TEST PROMPT]: "${prompt}"`);
    try {
      const res = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt, selectedDatasetId: 'general' })
      });
      const data = await res.json();
      console.log(`[RESP STATUS]: ${res.status}`);
      console.log(`[GEMINI CONNECTED]: ${data.geminiConnected}`);
      console.log(`[MODEL USED]: ${data.modelUsed}`);
      console.log(`[ANSWER SNIPPET]: ${data.answer.substring(0, 150).replace(/\n/g, ' ')}...\n`);
    } catch (err) {
      console.error(`[ERROR]:`, err.message);
    }
  }
}

runAudit();
