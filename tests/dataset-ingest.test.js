const fs = require('fs');
const path = require('path');

async function test() {
  const { detectFormatByContent, parseRFC4180Batched, chunkTableData, detectFields } = await import('../src/services/datasetIngest.js');

  // 1. Generate 2.4 MB CSV in MD format
  let text = 'farm_id,timestamp,ndvi,soil_moisture,soil_ph,ec,soil_temp,air_temp,humidity,rainfall,alert\n';
  for(let i = 0; i < 30000; i++) {
    text += `F283,2026-10-07T06:00,0.85,30,6.5,1.2,22,25,60,0,normal\n`;
  }
  
  console.log('--- 2.4MB Mock ---');
  console.log('Size:', text.length);

  const format = detectFormatByContent(text);
  console.log('Detected format:', format);

  const progress = [];
  const start = Date.now();
  const { headers, rows } = await parseRFC4180Batched(text, format.delimiter, p => progress.push(p.percent), {});
  const parseEnd = Date.now();
  console.log(`Parsed ${rows.length} rows in ${parseEnd - start}ms. Headers:`, headers.length);
  
  const fields = detectFields(headers);
  console.log('Detected fields:', fields);

  const chunks = await chunkTableData('ds_test', headers, rows, () => {}, {});
  const chunkEnd = Date.now();
  console.log(`Chunked into ${chunks.length} chunks in ${chunkEnd - parseEnd}ms.`);

  // 2. Small 5-row CSV
  console.log('\n--- Small 5-row CSV ---');
  const smallCsv = 'a,b\n1,2\n3,4\n5,6\n7,8\n9,10';
  const smallFmt = detectFormatByContent(smallCsv);
  console.log('Format:', smallFmt);
  const smallData = await parseRFC4180Batched(smallCsv, smallFmt.delimiter);
  console.log(`Parsed rows: ${smallData.rows.length}`);

  // 3. Semicolon CSV with BOM
  console.log('\n--- Semicolon CSV (simulating BOM removed beforehand) ---');
  const semiCsv = 'col1;col2\nval1;val2\nval3;val4';
  const semiFmt = detectFormatByContent(semiCsv);
  console.log('Format:', semiFmt);

  // 4. Plain txt
  console.log('\n--- Plain text ---');
  const txt = 'This is just some\nplain text\nwith no delimiters.';
  const txtFmt = detectFormatByContent(txt);
  console.log('Format:', txtFmt);

  // 5. Empty
  console.log('\n--- Empty ---');
  const emptyFmt = detectFormatByContent('');
  console.log('Format:', emptyFmt);
}

test().catch(console.error);
