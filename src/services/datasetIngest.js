/**
 * datasetIngest.js - Read, detect, parse, and chunk datasets
 */

export async function readFileWithEncodingFallback(file) {
  if (file.size > 25 * 1024 * 1024) {
    throw new Error('File exceeds maximum size of 25 MB.');
  }
  
  const buffer = await file.arrayBuffer();
  let text = new TextDecoder('utf-8').decode(buffer);
  
  const badCharCount = (text.match(/\uFFFD/g) || []).length;
  if (badCharCount > text.length * 0.05 || text.charCodeAt(0) === 0xFEFF || text.charCodeAt(0) === 0xFFFE) {
    // Try utf-16le
    text = new TextDecoder('utf-16le').decode(buffer);
    if ((text.match(/\uFFFD/g) || []).length > text.length * 0.05) {
      text = new TextDecoder('windows-1252').decode(buffer);
    }
  }

  // Strip BOM
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }
  
  // Normalize newlines to \n
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export function detectFormatByContent(text) {
  // Strip YAML frontmatter
  let clean = text;
  if (clean.startsWith('---')) {
    const end = clean.indexOf('---', 3);
    if (end !== -1) clean = clean.substring(end + 3);
  }
  
  // Skip titles and empty lines
  const lines = clean.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('#')).slice(0, 100);
  if (lines.length === 0) return { type: 'Text', delimiter: null, cols: 0 };
  
  const candidates = [',', ';', '\t', '|'];
  for (const delim of candidates) {
    // Only count lines that actually contain the delimiter
    const linesWithDelim = lines.filter(l => l.includes(delim));
    if (linesWithDelim.length === 0) continue;

    const counts = linesWithDelim.map(l => l.split(delim).length);
    const mostCommon = counts.reduce((acc, val) => {
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    }, {});
    
    let maxCount = 0;
    let maxCols = 0;
    for (const [cols, freq] of Object.entries(mostCommon)) {
      if (freq > maxCount) {
        maxCount = freq;
        maxCols = parseInt(cols);
      }
    }
    
    if (maxCols >= 2 && maxCount >= Math.min(3, linesWithDelim.length * 0.5)) {
      if (delim === '|') {
        return { type: 'Markdown Document', delimiter: '|', cols: maxCols };
      }
      return { type: 'Structured CSV Telemetry', delimiter: delim, cols: maxCols };
    }
  }
  
  return { type: 'Plain Text', delimiter: null, cols: 0 };
}

export async function parseRFC4180Batched(text, delimiter, onProgress, cancelToken) {
  let records = [];
  
  // Strip YAML frontmatter
  let clean = text;
  if (clean.startsWith('---')) {
    const end = clean.indexOf('---', 3);
    if (end !== -1) clean = clean.substring(end + 3);
  }
  
  const lines = clean.split('\n');
  const maxLines = lines.length;
  
  let batchSize = 2000;
  let batchRecords = [];
  
  let i = 0;
  while (i < maxLines) {
    if (cancelToken && cancelToken.isCancelled) throw new Error('Canceled');
    let progressMade = false;
    let startI = i;

    for (let j = 0; j < batchSize && i < maxLines; j++, i++) {
      let line = lines[i];
      if (i === 0 && (line.startsWith('#') || line.startsWith('---'))) continue;
      if (line.trim().length === 0) continue;
      
      let row;
      if (!line.includes('"')) {
        row = line.split(delimiter);
      } else {
        row = [];
        let cur = '';
        let inQuotes = false;
        
        while (i < maxLines) {
          const l = lines[i];
          const lLen = l.length;
          let k = 0;
          if (i > startI + j) {
            cur += '\n'; // it was a multiline
          }
          
          for (; k < lLen; k++) {
            const char = l[k];
            if (char === '"') {
              if (inQuotes && k + 1 < lLen && l[k + 1] === '"') {
                cur += '"';
                k++;
              } else {
                inQuotes = !inQuotes;
              }
            } else if (char === delimiter && !inQuotes) {
              row.push(cur);
              cur = '';
            } else {
              cur += char;
            }
          }
          
          if (inQuotes) {
            i++; // read next line
            if (i >= maxLines) break;
          } else {
            row.push(cur);
            break;
          }
        }
      }
      
      if (row.length > 1 || (row.length === 1 && row[0].trim().length > 0)) {
        if (delimiter === '|' && row.length >= 2 && row[0].trim() === '' && row[row.length-1].trim() === '') {
          row = row.slice(1, -1);
        }
        const trimmed = row.map(c => c.trim());
        if (!(delimiter === '|' && trimmed.every(c => /^[\s-:]+$/.test(c)))) {
          batchRecords.push(trimmed);
        }
      }
      progressMade = true;
    }
    
    if (!progressMade && i === startI) {
      throw new Error('Parser stalled on line ' + i);
    }
    
    records = records.concat(batchRecords);
    batchRecords = [];
    
    if (onProgress) onProgress({ percent: Math.min(60, 10 + Math.floor((i / maxLines) * 50)) });
    await new Promise(r => setTimeout(r, 0));
  }
  
  if (records.length <= 1) return { headers: [], rows: [] };
  
  let rawHeaders = records[0].map(h => h.trim());
  // deduplicate empty
  rawHeaders = rawHeaders.map((h, idx) => h || `Column${idx + 1}`);
  const hSet = new Set();
  const headers = rawHeaders.map(h => {
    let clean = h;
    let count = 1;
    while (hSet.has(clean)) {
      clean = `${h}_${count}`;
      count++;
    }
    hSet.add(clean);
    return clean;
  });
  
  // padding ragged
  const rows = [];
  for (let k = 1; k < records.length; k++) {
    const r = records[k];
    if (r.length === headers.length && r.every(v => v.includes('---'))) continue; // markdown table separator
    
    const obj = {};
    for (let col = 0; col < headers.length; col++) {
      obj[headers[col]] = col < r.length ? r[col] : '';
    }
    rows.push(obj);
  }
  
  return { headers, rows };
}

export function detectFields(headers) {
  const fields = [];
  const joined = headers.join(' ').toLowerCase();
  
  if (joined.match(/farm|field|plot|site/)) fields.push('farm');
  if (joined.match(/crop|variety/)) fields.push('crop');
  if (joined.match(/date|timestamp|time/)) fields.push('date');
  if (joined.match(/ndvi|savi/)) fields.push('ndvi');
  if (joined.match(/soil.*moisture|vwc/)) fields.push('soil moisture');
  if (joined.match(/ph/)) fields.push('pH');
  if (joined.match(/ec|conductivity/)) fields.push('EC');
  if (joined.match(/temp/)) fields.push('temperature');
  if (joined.match(/humid/)) fields.push('humidity');
  if (joined.match(/rain|precip/)) fields.push('rainfall');
  if (joined.match(/wind/)) fields.push('wind');
  if (joined.match(/alert|severity|risk/)) fields.push('alert');
  
  return fields;
}

export async function chunkTableData(datasetId, headers, rows, onProgress, cancelToken) {
  const chunks = [];
  const rowsPerChunk = 50;
  const totalRows = rows.length;
  const maxChunks = 20000;
  
  let chunkCount = 0;
  for (let i = 0; i < totalRows; i += rowsPerChunk) {
    if (cancelToken && cancelToken.isCancelled) throw new Error('Canceled');
    
    if (chunkCount >= maxChunks) {
      console.warn('Max chunks reached, truncating dataset');
      break;
    }
    
    const slice = rows.slice(i, i + rowsPerChunk);
    let chunkText = `Headers: [${headers.join(', ')}]\n\n`;
    
    const lines = slice.map((row, rIdx) => {
      const rowNum = i + rIdx + 1;
      const pairs = headers.map(h => `${h}: ${row[h]}`).join(' | ');
      return `Row ${rowNum}: ${pairs}`;
    });
    
    // basic splitting of lines if they exceed 1500 chars roughly
    let currentPara = '';
    const paras = [];
    for (const l of lines) {
      if (currentPara.length + l.length > 1500) {
        paras.push(currentPara);
        currentPara = l;
      } else {
        currentPara += (currentPara ? '\n' : '') + l;
      }
    }
    if (currentPara) paras.push(currentPara);
    
    chunkText += paras.join('\n\n');
    
    chunks.push({
      id: `${datasetId}_chunk_${chunkCount}`,
      datasetId,
      chunkIndex: chunkCount,
      text: chunkText
    });
    
    chunkCount++;
    if (chunkCount % 100 === 0) {
      if (onProgress) onProgress({ percent: Math.min(95, 60 + Math.floor((i / totalRows) * 35)) });
      await new Promise(r => setTimeout(r, 0));
    }
  }
  
  return chunks;
}
