/**
 * Benchmark Script for 1MB (~10,000 rows) CSV parsing & chunking
 */
const { parseCSVAccurate, chunkDatasetAsync } = require('../src/services/datasetParser');

// Old naive parser for before comparison
function oldParseCSV(csvText) {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
  function parseRow(rowText) {
    const fields = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < rowText.length; i++) {
      const char = rowText[i];
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) {
        fields.push(cur.trim().replace(/^"|"$/g, ''));
        cur = '';
      } else {
        cur += char;
      }
    }
    fields.push(cur.trim().replace(/^"|"$/g, ''));
    return fields;
  }
  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(parseRow);
  return { headers, rows };
}

function oldConvertCSVToMarkdown(csvText, fileName = 'dataset.csv') {
  const { headers, rows } = oldParseCSV(csvText);
  let md = `# Dataset: ${fileName}\n\n`;
  rows.forEach((row, idx) => {
    md += `## Record ${idx + 1}\n`;
    headers.forEach((h, hIdx) => {
      const val = row[hIdx] || 'N/A';
      md += `- **${h}**: ${val}\n`;
    });
    md += '\n';
  });
  return md;
}

async function runBenchmark() {
  console.log('Generating ~1MB CSV test data (10,000 rows)...');
  const headers = 'farm_id,timestamp,soil_moisture_pct,soil_ph,ec_ds_m,soil_temp_c,air_temp_c,humidity_pct,rainfall_mm,ndvi\n';
  let csvContent = headers;
  for (let i = 1; i <= 10000; i++) {
    csvContent += `F007,2026-10-08T${String(i % 24).padStart(2, '0')}:00:00Z,${(20 + (i % 15) * 0.5).toFixed(1)},${(6.5 + (i % 10) * 0.1).toFixed(1)},1.4,22.1,28.4,62.0,0.0,0.72\n`;
  }
  const sizeMB = (Buffer.byteLength(csvContent) / (1024 * 1024)).toFixed(2);
  console.log(`Generated size: ${sizeMB} MB, ${csvContent.split('\n').length - 1} lines.`);

  // 1. Measure OLD implementation
  console.log('\nMeasuring OLD method (parse + convertCSVToMarkdown with full string concatenation)...');
  const t0Old = Date.now();
  try {
    const oldMd = oldConvertCSVToMarkdown(csvContent, 'large_telemetry.csv');
    const tOld = Date.now() - t0Old;
    console.log(`OLD method took: ${tOld} ms (Output string size: ${(Buffer.byteLength(oldMd) / (1024 * 1024)).toFixed(2)} MB)`);
  } catch (e) {
    console.log('OLD method failed or ran out of memory:', e.message);
  }

  // 2. Measure NEW implementation
  console.log('\nMeasuring NEW method (streaming parse + async chunking with column preservation)...');
  const t0New = Date.now();
  const parsed = parseCSVAccurate(csvContent);
  const chunks = await chunkDatasetAsync('TELEMETRY_LARGE', parsed, csvContent);
  const tNew = Date.now() - t0New;

  console.log(`NEW method took: ${tNew} ms`);
  console.log(`Parsed rows: ${parsed.rows.length}, Total chunks: ${chunks.length}`);
}

runBenchmark();
