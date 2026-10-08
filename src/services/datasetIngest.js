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
  // Binary check: lots of NUL or non-printable ASCII
  const nulCount = (text.match(/\x00/g) || []).length;
  if (nulCount > text.length * 0.01) {
    throw new Error('File appears to be binary.');
  }

  if (badCharCount > text.length * 0.05 || text.charCodeAt(0) === 0xFEFF || text.charCodeAt(0) === 0xFFFE) {
    text = new TextDecoder('utf-16le').decode(buffer);
    if ((text.match(/\uFFFD/g) || []).length > text.length * 0.05) {
      text = new TextDecoder('windows-1252').decode(buffer);
    }
  }

  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }
  
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (text.trim().length === 0) {
    throw new Error('File is empty or contains only whitespace.');
  }

  return text;
}

export function detectFormatByContent(text) {
  // We do the detection inside universalParseBatched now. This is a stub for backwards compatibility,
  // returning plain text as a fallback if called early.
  return { type: 'Plain Text', delimiter: null, cols: 0 };
}

function cleanMarkdownFences(text) {
  let clean = text;
  if (clean.startsWith('---')) {
    const end = clean.indexOf('---', 3);
    if (end !== -1) clean = clean.substring(end + 3);
  }
  
  const lines = clean.split('\n');
  return lines.filter(l => !l.trim().startsWith('```')).join('\n');
}

export async function universalParseBatched(text, onProgress, cancelToken) {
  const clean = cleanMarkdownFences(text);
  const lines = clean.split('\n');
  const maxLines = lines.length;
  
  // 1. Check for tabular block
  // We scan for a block of >= 3 lines that share a delimiter
  const candidates = [',', ';', '\t', '|'];
  let bestTable = null;
  
  for (const delim of candidates) {
    let currentBlock = [];
    let currentCols = 0;
    
    for (let i = 0; i < maxLines; i++) {
      const l = lines[i].trim();
      if (l.length === 0 || l.startsWith('#') || l.startsWith('//') || l.startsWith('>')) {
        continue; // ignore blank/comment
      }
      
      const parts = l.split(delim);
      const cols = delim === '|' ? parts.filter(p => p.trim().length > 0).length : parts.length;
      
      if (cols >= 2) {
        if (currentBlock.length === 0) {
          currentBlock.push({ index: i, line: l });
          currentCols = cols;
        } else if (cols === currentCols || (delim === '|' && Math.abs(cols - currentCols) <= 1)) {
          currentBlock.push({ index: i, line: l });
        } else {
          // If mismatch, check if previous block was valid
          if (currentBlock.length >= 3) {
            if (!bestTable || currentBlock.length > bestTable.lines.length) {
              bestTable = { delim, lines: currentBlock, cols: currentCols };
            }
          }
          currentBlock = [{ index: i, line: l }];
          currentCols = cols;
        }
      } else {
        if (currentBlock.length >= 3) {
          if (!bestTable || currentBlock.length > bestTable.lines.length) {
            bestTable = { delim, lines: currentBlock, cols: currentCols };
          }
        }
        currentBlock = [];
      }
    }
    
    if (currentBlock.length >= 3) {
      if (!bestTable || currentBlock.length > bestTable.lines.length) {
        bestTable = { delim, lines: currentBlock, cols: currentCols };
      }
    }
  }
  
  let records = [];
  let headers = [];
  let formatType = 'Plain Text';
  let delimiter = null;
  
  if (bestTable) {
    // Parse as table
    delimiter = bestTable.delim;
    formatType = delimiter === '|' ? 'Markdown Document' : 'Structured CSV Telemetry';
    
    // Find header
    let headerLine = bestTable.lines[0].line;
    let dataStartIndex = 1;
    
    // Process markdown separator
    if (delimiter === '|' && bestTable.lines.length > 1 && /^[\s|:-]+$/.test(bestTable.lines[1].line)) {
      dataStartIndex = 2;
    }
    
    const parseRow = (lineStr, delim) => {
      let row = lineStr.split(delim);
      if (delim === '|') {
        if (row.length > 0 && row[0].trim() === '') row.shift();
        if (row.length > 0 && row[row.length - 1].trim() === '') row.pop();
      }
      return row.map(c => c.trim().replace(/^"|"$/g, '')); // strip outer quotes and spaces
    };
    
    headers = parseRow(headerLine, delimiter).map((h, i) => h || `col${i}`);
    
    for (let i = dataStartIndex; i < bestTable.lines.length; i++) {
      if (i % 2000 === 0) {
        if (cancelToken && cancelToken.isCancelled) throw new Error('Canceled');
        if (onProgress) onProgress({ percent: 10 + Math.floor((i / bestTable.lines.length) * 40) });
        await new Promise(r => setTimeout(r, 0));
      }
      const r = parseRow(bestTable.lines[i].line, delimiter);
      if (r.length === 0 || r.every(x => x === '')) continue;
      
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = r[idx] !== undefined ? r[idx] : '';
      });
      records.push(obj);
    }
  } else {
    // Check for Key-Value pairs
    const kvRegex = /^[-*]?\s*\*\*?([^\*:=]+)\*\*?[:=]\s*(.+)$/;
    let currentRecord = {};
    let hasKV = false;
    
    for (let i = 0; i < maxLines; i++) {
      const l = lines[i].trim();
      if (l.length === 0 || l.startsWith('#')) {
        if (Object.keys(currentRecord).length > 0) {
          records.push(currentRecord);
          currentRecord = {};
        }
      } else {
        const match = l.match(kvRegex);
        if (match) {
          hasKV = true;
          currentRecord[match[1].trim()] = match[2].trim();
        }
      }
    }
    if (Object.keys(currentRecord).length > 0) records.push(currentRecord);
    
    if (hasKV && records.length > 0) {
      formatType = 'Records';
      const allKeys = new Set();
      records.forEach(r => Object.keys(r).forEach(k => allKeys.add(k)));
      headers = Array.from(allKeys);
      // Ensure all rows have all keys
      records = records.map(r => {
        const obj = {};
        headers.forEach(h => obj[h] = r[h] || '');
        return obj;
      });
    } else {
      // Plain text fallback
      formatType = 'Plain Text';
      headers = ['text'];
      records = [];
      let currentPara = [];
      for (let i = 0; i < maxLines; i++) {
        const l = lines[i].trim();
        if (l.length === 0) {
          if (currentPara.length > 0) {
            records.push({ text: currentPara.join('\n') });
            currentPara = [];
          }
        } else {
          currentPara.push(l);
          if (currentPara.join('\n').length > 1500) {
            records.push({ text: currentPara.join('\n') });
            currentPara = [];
          }
        }
      }
      if (currentPara.length > 0) records.push({ text: currentPara.join('\n') });
    }
  }
  
  if (onProgress) onProgress({ percent: 50 });
  return {
    type: formatType,
    delimiter,
    headers,
    rows: records,
    cols: headers.length
  };
}

export function detectFields(headers) {
  const detected = [];
  const hLower = headers.map(h => String(h).toLowerCase().replace(/[^a-z0-9]/g, ''));
  
  if (hLower.some(h => ['farmid', 'farm', 'field', 'plot', 'name'].includes(h))) detected.push('farm');
  if (hLower.some(h => ['date', 'timestamp', 'datetime', 'time'].includes(h))) detected.push('date');
  if (hLower.some(h => ['crop', 'variety'].includes(h))) detected.push('crop');
  if (hLower.some(h => h.includes('ndvi'))) detected.push('ndvi');
  if (hLower.some(h => ['soilmoisture', 'moisture', 'sm', 'vwc'].includes(h))) detected.push('soil moisture');
  if (hLower.some(h => ['ph'].includes(h))) detected.push('pH');
  if (hLower.some(h => ['ec', 'conductivity'].includes(h))) detected.push('EC');
  if (hLower.some(h => h.includes('temp'))) detected.push('temperature');
  if (hLower.some(h => h.includes('humid'))) detected.push('humidity');
  if (hLower.some(h => h.includes('rain'))) detected.push('rainfall');
  if (hLower.some(h => ['alert', 'status', 'severity', 'risk'].includes(h))) detected.push('alert');
  
  return detected.length > 0 ? detected : headers.slice(0, 5);
}

export async function chunkTableData(dsId, headers, rows, onProgress, cancelToken) {
  const chunks = [];
  const CHUNK_SIZE = 50;
  
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    if (cancelToken && cancelToken.isCancelled) throw new Error('Canceled');
    const batch = rows.slice(i, i + CHUNK_SIZE);
    
    const lines = batch.map(row => {
      return headers.map(h => `${h}: ${row[h] || ''}`).join(', ');
    });
    
    chunks.push({
      id: `${dsId}_chunk_${i}`,
      datasetId: dsId,
      text: lines.join('\n')
    });
    
    if (i % 2000 === 0 && onProgress) {
      onProgress({ percent: 50 + Math.floor((i / rows.length) * 50) });
      await new Promise(r => setTimeout(r, 0));
    }
  }
  
  if (onProgress) onProgress({ percent: 100 });
  return chunks;
}
