/**
 * dataset-stress.test.js
 * Stress tests the dataset parsing, chunking, and indexing pipeline
 * with a 5-second timeout guard per test case.
 */
const { 
  parseCSVAccurate, 
  parseMarkdownTable, 
  chunkDatasetAsync, 
  decodeFileBuffer,
  detectDelimiter 
} = require('../src/services/datasetParser');
const { datasetService } = require('../src/services/datasetService');

async function withTimeout(fn, ms = 5000, name = 'operation') {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`TIMEOUT (${ms}ms) exceeded in: ${name}`));
    }, ms);

    Promise.resolve()
      .then(fn)
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function generateCSV(rowCount, cols = 8) {
  const headers = ['farm_id', 'timestamp', 'soil_moisture_pct', 'soil_ph', 'ec_ds_m', 'air_temp_c', 'humidity_pct', 'ndvi'];
  const lines = [headers.join(',')];
  for (let i = 0; i < rowCount; i++) {
    lines.push(`F001,2026-10-08T10:00:00Z,${(20 + (i % 15)).toFixed(1)},6.5,1.2,28.4,62.0,0.72`);
  }
  return lines.join('\n');
}

async function runCase(name, runner) {
  const start = Date.now();
  try {
    const result = await withTimeout(runner, 5000, name);
    const duration = Date.now() - start;
    console.log(`✅ [PASS] ${name} -> ${duration}ms, result:`, result);
    return { name, pass: true, duration, result };
  } catch (err) {
    const duration = Date.now() - start;
    console.error(`❌ [FAIL/FREEZE] ${name} -> ${duration}ms:`, err.message);
    return { name, pass: false, duration, error: err.message };
  }
}

async function main() {
  console.log('⚡ Starting Dataset Stress Tests (5-second timeout per case)...\n');
  const results = [];

  // Case 1: Tiny CSV (5 rows)
  results.push(await runCase('1. Tiny CSV (5 rows)', async () => {
    const text = generateCSV(5);
    const ds = await datasetService.addCustomDatasetAsync({
      rawText: text,
      fileName: 'tiny.csv',
      replaceExisting: true,
    });
    return `${ds.chunkCount} chunks, ${ds.rawRowCount} rows`;
  }));

  // Case 2: 1MB CSV (~10k rows)
  results.push(await runCase('2. 1MB CSV (~10k rows)', async () => {
    const text = generateCSV(10000);
    const ds = await datasetService.addCustomDatasetAsync({
      rawText: text,
      fileName: 'test_1mb.csv',
      replaceExisting: true,
    });
    return `${ds.chunkCount} chunks, ${ds.rawRowCount} rows`;
  }));

  // Case 3: 5MB CSV (~50k rows)
  results.push(await runCase('3. 5MB CSV (~50k rows)', async () => {
    const text = generateCSV(50000);
    const ds = await datasetService.addCustomDatasetAsync({
      rawText: text,
      fileName: 'test_5mb.csv',
      replaceExisting: true,
    });
    return `${ds.chunkCount} chunks, ${ds.rawRowCount} rows`;
  }));

  // Case 4: CSV with semicolons and a BOM
  results.push(await runCase('4. CSV with semicolons and a BOM', async () => {
    const text = '\uFEFFfarm_id;timestamp;soil_moisture_pct;soil_ph\nF001;2026-10-08;24.5;6.8\nF002;2026-10-08;21.2;7.1';
    const ds = await datasetService.addCustomDatasetAsync({
      rawText: text,
      fileName: 'bom_semi.csv',
      replaceExisting: true,
    });
    return `${ds.chunkCount} chunks, ${ds.rawRowCount} rows`;
  }));

  // Case 5: CSV with quoted fields containing commas and newlines
  results.push(await runCase('5. CSV with quoted commas & newlines', async () => {
    const text = 'id,title,notes\n1,"Item, One","Line 1\nLine 2"\n2,"Item, Two","Single line"';
    const ds = await datasetService.addCustomDatasetAsync({
      rawText: text,
      fileName: 'quoted.csv',
      replaceExisting: true,
    });
    return `${ds.chunkCount} chunks, ${ds.rawRowCount} rows`;
  }));

  // Case 6: Header-only CSV
  results.push(await runCase('6. Header-only CSV', async () => {
    const text = 'farm_id,timestamp,soil_moisture_pct\n';
    try {
      await datasetService.addCustomDatasetAsync({
        rawText: text,
        fileName: 'header_only.csv',
        replaceExisting: true,
      });
      return 'Unexpectedly succeeded';
    } catch (e) {
      return `Correctly rejected: ${e.message}`;
    }
  }));

  // Case 7: Empty file
  results.push(await runCase('7. Empty file', async () => {
    try {
      await datasetService.addCustomDatasetAsync({
        rawText: '',
        fileName: 'empty.csv',
        replaceExisting: true,
      });
      return 'Unexpectedly succeeded';
    } catch (e) {
      return `Correctly rejected: ${e.message}`;
    }
  }));

  // Case 8: Whitespace-only file
  results.push(await runCase('8. Whitespace-only file', async () => {
    try {
      await datasetService.addCustomDatasetAsync({
        rawText: '   \n\n  \t  \n  ',
        fileName: 'whitespace.csv',
        replaceExisting: true,
      });
      return 'Unexpectedly succeeded';
    } catch (e) {
      return `Correctly rejected: ${e.message}`;
    }
  }));

  // Case 9: Single very long line with no newlines (200KB)
  results.push(await runCase('9. Single very long line (200KB)', async () => {
    const text = 'F001,2026-10-08,' + 'x'.repeat(200000);
    const ds = await datasetService.addCustomDatasetAsync({
      rawText: text,
      fileName: 'long_line.txt',
      replaceExisting: true,
    });
    return `${ds.chunkCount} chunks`;
  }));

  // Case 10: Plain text with no blank lines (1MB)
  results.push(await runCase('10. Plain text no blank lines (1MB)', async () => {
    const lines = [];
    for (let i = 0; i < 15000; i++) {
      lines.push(`Line ${i}: sensor reading data telemetry status ok value=${i * 1.5}`);
    }
    const text = lines.join('\n');
    const ds = await datasetService.addCustomDatasetAsync({
      rawText: text,
      fileName: 'no_blank_lines.txt',
      replaceExisting: true,
    });
    return `${ds.chunkCount} chunks`;
  }));

  // Case 11: Markdown file with one huge table (5000 rows)
  results.push(await runCase('11. Markdown huge table (5000 rows)', async () => {
    const lines = ['| farm_id | crop | moisture |', '| --- | --- | --- |'];
    for (let i = 0; i < 5000; i++) {
      lines.push(`| F00${(i % 5) + 1} | Wheat | ${25 + (i % 10)}% |`);
    }
    const text = lines.join('\n');
    const ds = await datasetService.addCustomDatasetAsync({
      rawText: text,
      fileName: 'huge_table.md',
      replaceExisting: true,
    });
    return `${ds.chunkCount} chunks, ${ds.rawRowCount} rows`;
  }));

  // Case 12: File name with parentheses and spaces
  results.push(await runCase('12. Name with parentheses and spaces', async () => {
    const text = generateCSV(10);
    const ds = await datasetService.addCustomDatasetAsync({
      rawText: text,
      fileName: 'TELEMETRY_MAR_2026(4).csv',
      replaceExisting: true,
    });
    return `ID: ${ds.id}, Name: ${ds.name}, ${ds.chunkCount} chunks`;
  }));

  // Case 13: Duplicate upload of the same file twice in a row
  results.push(await runCase('13. Duplicate upload twice in a row', async () => {
    const text = generateCSV(10);
    const ds1 = await datasetService.addCustomDatasetAsync({
      rawText: text,
      fileName: 'dup_test.csv',
      replaceExisting: false,
    });
    const ds2 = await datasetService.addCustomDatasetAsync({
      rawText: text,
      fileName: 'dup_test.csv',
      replaceExisting: false,
    });
    return `1st: ${ds1.name}, 2nd: ${ds2.name}`;
  }));

  console.log('\n--- SUMMARY ---');
  const fails = results.filter(r => !r.pass);
  if (fails.length === 0) {
    console.log('🎉 ALL CASES PASSED UNDER TIMEOUT GUARD!');
  } else {
    console.error(`💥 ${fails.length} CASE(S) FAILED:`);
    fails.forEach(f => console.error(`   - ${f.name}: ${f.error}`));
  }
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
