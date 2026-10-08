const fs = require('fs');

async function test() {
  const { universalParseBatched } = await import('../src/services/datasetIngest.js');

  const cases = [
    {
      name: 'CSV with .md extension',
      text: 'farm,date,ndvi\nF001,2026-10-01,0.8\nF001,2026-10-02,0.82',
    },
    {
      name: 'CSV inside code fence',
      text: 'Some notes\n```csv\nfarm,date,ndvi\nF001,2026-10-01,0.8\nF001,2026-10-02,0.82\n```\nMore notes',
    },
    {
      name: 'Title line + blank + CSV',
      text: '# My Data\n\nfarm,date,ndvi\nF001,2026-10-01,0.8\nF001,2026-10-02,0.82',
    },
    {
      name: 'Markdown pipe table',
      text: '| farm | date | ndvi |\n|---|---|---|\n| F001 | 2026-10-01 | 0.8 |\n| F001 | 2026-10-02 | 0.82 |',
    },
    {
      name: 'Two Markdown tables',
      text: '## Table 1\n| farm | date |\n|---|---|\n| F001 | 2026-10-01 |\n\n## Table 2\n| farm | date |\n|---|---|\n| F002 | 2026-10-01 |',
    },
    {
      name: 'Key-value records',
      text: '**farm**: F001\n**date**: 2026-10-01\n\n**farm**: F001\n**date**: 2026-10-02',
    },
    {
      name: 'Semicolon CSV with BOM',
      text: '\uFEFFfarm;date;ndvi\nF001;2026-10-01;0.8\nF001;2026-10-02;0.82',
    },
    {
      name: 'Tab-separated',
      text: 'farm\tdate\tndvi\nF001\t2026-10-01\t0.8\nF001\t2026-10-02\t0.82',
    },
    {
      name: 'Plain prose Markdown',
      text: '# Hello\nThis is just some text.\n\nIt has no tables.',
    },
    {
      name: 'Empty file',
      text: '   \n\n  ',
    }
  ];

  console.log('| Case | Format | Rows | ms |');
  console.log('|---|---|---|---|');

  for (const c of cases) {
    const start = Date.now();
    try {
      if (c.text.trim().length === 0) throw new Error('File is empty or contains only whitespace.');
      const res = await universalParseBatched(c.text);
      const ms = Date.now() - start;
      console.log(`| ${c.name} | ${res.type} | ${res.rows.length} | ${ms} |`);
    } catch (e) {
      const ms = Date.now() - start;
      console.log(`| ${c.name} | ERROR: ${e.message} | - | ${ms} |`);
    }
  }

  // Binary file
  const binStart = Date.now();
  try {
    const binText = '\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00';
    if ((binText.match(/\x00/g) || []).length > binText.length * 0.01) {
      throw new Error('File appears to be binary.');
    }
    const res = await universalParseBatched(binText);
    console.log(`| Binary file | ${res.type} | ${res.rows.length} | ${Date.now() - binStart} |`);
  } catch(e) {
    console.log(`| Binary file | ERROR: ${e.message} | - | ${Date.now() - binStart} |`);
  }

  // 2.4 MB test
  let largeText = 'farm_id,timestamp,ndvi,soil_moisture,soil_ph,ec,soil_temp,air_temp,humidity,rainfall,alert\n';
  for(let i=0; i<30000; i++) {
    largeText += `F283,2026-10-07T06:00,0.85,30,6.5,1.2,22,25,60,0,normal\n`;
  }
  const largeStart = Date.now();
  const resLarge = await universalParseBatched(largeText);
  console.log(`| 2.4MB generated | ${resLarge.type} | ${resLarge.rows.length} | ${Date.now() - largeStart} |`);
}

test().catch(console.error);
