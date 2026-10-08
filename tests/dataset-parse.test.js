/**
 * Tests for Dataset Parsing & Field Detection
 * 3 tiny fixtures:
 * 1. Quoted CSV with semicolon delimiter and a UTF-8 BOM
 * 2. Markdown table
 * 3. Plain text with sections
 */

const assert = require('assert');
const {
  parseCSVAccurate,
  parseMarkdownTable,
  chunkDatasetAsync,
  matchStandardFieldName,
} = require('../src/services/datasetParser');

async function runTests() {
  console.log('🧪 Starting Dataset Parser & Chunking Tests...\n');

  // -------------------------------------------------------------------------
  // Fixture 1: Quoted CSV with semicolon delimiter and UTF-8 BOM
  // -------------------------------------------------------------------------
  const fixture1_bomSemicolonCSV =
    '\uFEFF"farm_id";"timestamp";"soil_moisture_pct";"soil_ph";"alert"\n' +
    '"F007";"2026-10-08T06:00:00Z";"24.5";"6.8";"Normal"\n' +
    '"F007";"2026-10-08T12:00:00Z";"22.1";"6.9";"Critical; dry root zone"\n' +
    '"F008";"2026-10-08T12:00:00Z";"31.0";"7.1";"Optimal"';

  const res1 = parseCSVAccurate(fixture1_bomSemicolonCSV);
  assert.strictEqual(res1.delimiter, ';', 'Should auto-detect semicolon delimiter');
  assert.strictEqual(res1.headers.length, 5, 'Should have 5 headers');
  assert.deepStrictEqual(
    res1.headers,
    ['farm_id', 'timestamp', 'soil_moisture_pct', 'soil_ph', 'alert'],
    'Headers should match exactly'
  );
  assert.strictEqual(res1.rows.length, 3, 'Should parse exactly 3 data rows');
  assert.strictEqual(
    res1.rows[1][4],
    'Critical; dry root zone',
    'Should preserve semicolon inside quotes without splitting'
  );

  // Field detection on fixture 1 headers
  const detected1 = res1.headers.map(matchStandardFieldName).filter(Boolean);
  assert(detected1.includes('farmId'), 'Should detect farmId');
  assert(detected1.includes('date'), 'Should detect date/timestamp');
  assert(detected1.includes('soilMoisture'), 'Should detect soilMoisture');
  assert(detected1.includes('ph'), 'Should detect ph');
  assert(detected1.includes('severity'), 'Should detect severity/alert');

  const chunks1 = await chunkDatasetAsync('F007_TELEMETRY', res1, fixture1_bomSemicolonCSV);
  assert(chunks1.length >= 1, 'Should produce at least 1 chunk');
  assert(chunks1[0].text.includes('farm_id: F007'), 'Chunk text should contain row values');
  assert(chunks1[0].text.includes('Columns: [farm_id, timestamp'), 'Chunk text should carry column names');
  console.log('✅ Fixture 1 PASSED: Semicolon BOM CSV parsed (3 rows, 5 detected fields, 1 chunk)');

  // -------------------------------------------------------------------------
  // Fixture 2: Markdown Table
  // -------------------------------------------------------------------------
  const fixture2_markdownTable =
    '# Grape Variety Observations\n\n' +
    '| crop | variety | ndvi | canopy_coverage |\n' +
    '| :--- | :--- | :--- | :--- |\n' +
    '| Grapes | Thompson Seedless | 0.78 | 85% |\n' +
    '| Grapes | Sharad Seedless | 0.65 | 72% |\n' +
    '| Wheat | Sharbati | 0.82 | 90% |\n';

  const res2 = parseMarkdownTable(fixture2_markdownTable);
  assert(res2 !== null, 'Markdown table should be detected');
  assert.strictEqual(res2.headers.length, 4, 'Should have 4 headers');
  assert.strictEqual(res2.rows.length, 3, 'Should parse exactly 3 rows');
  assert.strictEqual(res2.rows[0][0], 'Grapes', 'First row crop should be Grapes');
  assert.strictEqual(res2.rows[0][2], '0.78', 'First row ndvi should be 0.78');

  const detected2 = res2.headers.map(matchStandardFieldName).filter(Boolean);
  assert(detected2.includes('crop'), 'Should detect crop');
  assert(detected2.includes('ndvi'), 'Should detect ndvi');
  assert(detected2.includes('canopyCoverage'), 'Should detect canopyCoverage');

  const chunks2 = await chunkDatasetAsync('Grape_Observations', res2, fixture2_markdownTable);
  assert(chunks2.length >= 1, 'Should produce at least 1 chunk');
  console.log('✅ Fixture 2 PASSED: Markdown Table parsed (3 rows, 3 detected fields, 1 chunk)');

  // -------------------------------------------------------------------------
  // Fixture 3: Plain text with sections
  // -------------------------------------------------------------------------
  const fixture3_plainText =
    '# Agronomy Protocol for Wheat Rust\n\n' +
    '## Symptoms\n' +
    'Yellow to orange powdery pustules appearing on the leaves during cool damp mornings.\n\n' +
    '## Control Measures\n' +
    'Apply Propiconazole 25% EC @ 1ml per liter of water at first symptom onset.\n\n' +
    '## Irrigation Timing\n' +
    'Avoid sprinkler irrigation late in the evening to keep leaf canopy dry overnight.';

  const chunks3 = await chunkDatasetAsync('Wheat_Rust_Guide', null, fixture3_plainText);
  assert.strictEqual(chunks3.length, 4, 'Should split plain text into 4 chunks (title + 3 sections)');
  assert(chunks3[1].text.includes('Symptoms'), 'Second chunk should contain Symptoms');
  assert(chunks3[2].text.includes('Control Measures'), 'Third chunk should contain Control Measures');
  console.log('✅ Fixture 3 PASSED: Plain text parsed into 4 section chunks');

  console.log('\n🎉 ALL 3 FIXTURE TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
