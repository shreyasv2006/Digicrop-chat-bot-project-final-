/**
 * DigiCrop AI - Fast and Accurate Dataset Parsing, Decoding, Field Detection & Chunking
 * Handles CSV, TSV, Markdown tables, and Plain Text with 100% fidelity.
 */

/**
 * Robust string key normalizer for tolerant header matching
 */
export function normalizeHeaderKey(str) {
  if (!str) return '';
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/[\uFEFF]/g, '') // remove BOM
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Tolerant field classifier matching farm/telemetry attributes
 */
export function matchStandardFieldName(key) {
  const norm = normalizeHeaderKey(key);
  if (!norm) return null;

  if (['farmid', 'farm', 'field', 'plot', 'site', 'name', 'farmname', 'fieldid', 'plotid', 'siteid', 'plotno'].includes(norm)) return 'farmId';
  if (['crop', 'croptype', 'cropname', 'variety'].includes(norm)) return 'crop';
  if (['location', 'district', 'state', 'village', 'city', 'address'].includes(norm)) return 'location';
  if (['area', 'areaacres', 'acres', 'hectares', 'size'].includes(norm)) return 'area';
  if (['ndvi', 'canopyndvi', 'vegetationindex', 'evi', 'ndre', 'ndwi'].includes(norm)) return 'ndvi';
  if (['soilmoisture', 'moisture', 'vwc', 'sm', 'soilmoisturepct', 'moisturepct'].includes(norm)) return 'soilMoisture';
  if (['ph', 'soilph'].includes(norm)) return 'ph';
  if (['ec', 'electricalconductivity', 'ecdsm', 'ecds_m', 'soilec'].includes(norm)) return 'ec';
  if (['temperature', 'soiltemp', 'airtemp', 'temp', 'tempc', 'tempmaxc', 'tempminc', 'soiltempc', 'airtempc'].includes(norm)) return 'temperature';
  if (['humidity', 'humiditypct', 'rh', 'relativehumidity'].includes(norm)) return 'humidity';
  if (['rainfall', 'rain', 'precipitation', 'rainfallmm'].includes(norm)) return 'rainfall';
  if (['wind', 'windspeed', 'windkmh'].includes(norm)) return 'wind';
  if (['date', 'timestamp', 'time', 'day', 'datetime', 'recordedat', 'readingtime'].includes(norm)) return 'date';
  if (['alert', 'severity', 'risk', 'status', 'warning', 'condition', 'issue', 'pestdisease'].includes(norm)) return 'severity';
  if (['growthstage', 'stage'].includes(norm)) return 'growthStage';
  if (['canopycoverage', 'canopy', 'coverage'].includes(norm)) return 'canopyCoverage';
  if (['nitrogen', 'n'].includes(norm)) return 'nitrogen';
  if (['phosphorus', 'p'].includes(norm)) return 'phosphorus';
  if (['potassium', 'k'].includes(norm)) return 'potassium';

  return null;
}

/**
 * Generate a safe unique ID for storage and DOM keys
 */
export function generateSafeDatasetId(prefix = 'ds') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Decode file bytes handling UTF-8, UTF-8 BOM, UTF-16, and Windows-1252 fallback
 */
export function decodeFileBuffer(arrayBuffer) {
  if (!arrayBuffer) return '';
  const bytes = new Uint8Array(arrayBuffer);

  // Check UTF-8 BOM: EF BB BF
  if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return new TextDecoder('utf-8').decode(bytes.subarray(3));
  }
  // Check UTF-16 LE BOM: FF FE
  if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
    return new TextDecoder('utf-16le').decode(bytes.subarray(2));
  }
  // Check UTF-16 BE BOM: FE FF
  if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
    return new TextDecoder('utf-16be').decode(bytes.subarray(2));
  }

  // Try UTF-8 with fatal: true to detect non-UTF-8 encodings
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch (e) {
    // Fallback to windows-1252
    try {
      return new TextDecoder('windows-1252').decode(bytes);
    } catch (e2) {
      return new TextDecoder('utf-8').decode(bytes);
    }
  }
}

/**
 * Strip YAML Frontmatter if present
 */
export function stripFrontmatter(text) {
  if (!text || typeof text !== 'string') return { text: '', frontmatter: null };
  const trimmed = text.replace(/^\uFEFF/, '').trim();
  if (!trimmed.startsWith('---')) return { text: trimmed, frontmatter: null };

  const endIdx = trimmed.indexOf('---', 3);
  if (endIdx === -1) return { text: trimmed, frontmatter: null };

  const fmLines = trimmed.substring(3, endIdx).trim().split(/\r?\n/);
  const fm = {};
  fmLines.forEach((l) => {
    const colon = l.indexOf(':');
    if (colon !== -1) {
      const k = l.substring(0, colon).trim().toLowerCase();
      const v = l.substring(colon + 1).trim();
      fm[k] = v;
    }
  });

  const body = trimmed.substring(endIdx + 3).trim();
  return { text: body, frontmatter: fm };
}

/**
 * Auto-detect delimiter among comma, semicolon, tab, pipe
 */
export function detectDelimiter(textSample) {
  const lines = textSample.split(/\r?\n/).filter((l) => l.trim().length > 0 && !l.startsWith('#'));
  const candidateDelims = [',', ';', '\t', '|'];
  const scores = { ',': 0, ';': 0, '\t': 0, '|': 0 };

  const sampleSize = Math.min(lines.length, 10);
  for (let i = 0; i < sampleSize; i++) {
    const line = lines[i];
    let inQuotes = false;
    const counts = { ',': 0, ';': 0, '\t': 0, '|': 0 };

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') inQuotes = !inQuotes;
      else if (!inQuotes && counts[char] !== undefined) {
        counts[char]++;
      }
    }

    candidateDelims.forEach((d) => {
      if (counts[d] > 0) scores[d] += counts[d];
    });
  }

  let bestDelim = ',';
  let bestScore = -1;
  candidateDelims.forEach((d) => {
    if (scores[d] > bestScore) {
      bestScore = scores[d];
      bestDelim = d;
    }
  });

  return bestScore > 0 ? bestDelim : ',';
}

/**
 * High-speed, 100% compliant CSV/TSV Parser with quotes, escapes, ragged rows, BOM support
 */
export function parseCSVAccurate(rawText, specifiedDelim = null) {
  if (!rawText || typeof rawText !== 'string') {
    return { headers: [], rows: [], rowObjects: [], delimiter: ',' };
  }

  // Remove BOM and normalize line endings
  const clean = rawText
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // Strip frontmatter if present
  const { text: bodyText } = stripFrontmatter(clean);
  if (!bodyText.trim()) {
    return { headers: [], rows: [], rowObjects: [], delimiter: ',' };
  }

  const delimiter = specifiedDelim || detectDelimiter(bodyText);

  // State machine parse
  const records = [];
  let currentRecord = [];
  let currentField = '';
  let inQuotes = false;
  const len = bodyText.length;

  for (let i = 0; i < len; i++) {
    const char = bodyText[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < len && bodyText[i + 1] === '"') {
          // Escaped quote: "" -> "
          currentField += '"';
          i++;
        } else {
          // End of quote
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        currentRecord.push(currentField);
        currentField = '';
      } else if (char === '\n') {
        currentRecord.push(currentField);
        currentField = '';
        // Only push non-empty records (ignore trailing whitespace row)
        if (currentRecord.length > 1 || (currentRecord.length === 1 && currentRecord[0].trim().length > 0)) {
          records.push(currentRecord);
        }
        currentRecord = [];
      } else {
        currentField += char;
      }
    }
  }

  // Push final field/record if any
  if (currentField.length > 0 || currentRecord.length > 0) {
    currentRecord.push(currentField);
    if (currentRecord.length > 1 || (currentRecord.length === 1 && currentRecord[0].trim().length > 0)) {
      records.push(currentRecord);
    }
  }

  if (records.length === 0) {
    return { headers: [], rows: [], rowObjects: [], delimiter };
  }

  // Header row
  const rawHeaders = records[0].map((h, idx) => {
    const trimmed = h.trim();
    return trimmed.length > 0 ? trimmed : `Column_${idx + 1}`;
  });

  // Make headers unique
  const headerCount = {};
  const headers = rawHeaders.map((h) => {
    if (!headerCount[h]) {
      headerCount[h] = 1;
      return h;
    } else {
      headerCount[h]++;
      return `${h}_${headerCount[h]}`;
    }
  });

  // Data rows
  const dataRows = records.slice(1);
  const rows = [];
  const rowObjects = [];

  for (let i = 0; i < dataRows.length; i++) {
    const rawRow = dataRows[i];
    // Pad ragged rows
    const row = [];
    const rowObj = {};
    for (let j = 0; j < headers.length; j++) {
      const val = j < rawRow.length ? rawRow[j] : '';
      row.push(val);
      rowObj[headers[j]] = val;
    }
    rows.push(row);
    rowObjects.push(rowObj);
  }

  return {
    headers,
    rows,
    rowObjects,
    delimiter,
  };
}

/**
 * Parse Markdown Table
 */
export function parseMarkdownTable(text) {
  if (!text || !text.includes('|')) return null;
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let headerIdx = -1;
  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].includes('|') && /^[| -:]+$/.test(lines[i + 1])) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) return null;

  const rawHeaderCols = lines[headerIdx]
    .split('|')
    .map((c) => c.trim())
    .filter((c, idx, arr) => !( (idx === 0 || idx === arr.length - 1) && c === '' ));

  if (rawHeaderCols.length < 2) return null;

  const headers = rawHeaderCols.map((h, idx) => (h.length > 0 ? h : `Col_${idx + 1}`));
  const rows = [];
  const rowObjects = [];

  for (let i = headerIdx + 2; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes('|') || line.startsWith('#')) break;
    const cols = line
      .split('|')
      .map((c) => c.trim())
      .filter((c, idx, arr) => !( (idx === 0 || idx === arr.length - 1) && c === '' ));

    if (cols.length === 0) continue;
    const row = [];
    const rowObj = {};
    for (let j = 0; j < headers.length; j++) {
      const val = j < cols.length ? cols[j] : '';
      row.push(val);
      rowObj[headers[j]] = val;
    }
    rows.push(row);
    rowObjects.push(rowObj);
  }

  return {
    headers,
    rows,
    rowObjects,
  };
}

/**
 * Fast, Batch-Yielding Chunker for Datasets
 * Every chunk carries dataset title and column headers for perfect LLM grounding.
 */
export async function chunkDatasetAsync(datasetName, parsedData, rawContent, onProgress = null) {
  const chunks = [];

  // 1. Structured CSV/Table Data
  if (parsedData && parsedData.headers && parsedData.headers.length > 0 && parsedData.rows && parsedData.rows.length > 0) {
    const { headers, rows } = parsedData;
    const totalRows = rows.length;
    const rowsPerChunk = 25; // 25 rows per chunk is optimal for prompt context
    const totalChunks = Math.ceil(totalRows / rowsPerChunk);

    for (let i = 0; i < totalRows; i += rowsPerChunk) {
      const slice = rows.slice(i, i + rowsPerChunk);
      const chunkIndex = Math.floor(i / rowsPerChunk) + 1;

      let chunkText = `### Dataset: ${datasetName} (Part ${chunkIndex}/${totalChunks})\n`;
      chunkText += `Columns: [${headers.join(', ')}]\n\n`;

      slice.forEach((row, rIdx) => {
        const rowNum = i + rIdx + 1;
        const rowPairs = headers.map((h, hIdx) => `${h}: ${row[hIdx] ?? 'N/A'}`).join(' | ');
        chunkText += `Row ${rowNum}: ${rowPairs}\n`;
      });

      chunks.push({
        id: `${datasetName}_chunk_${chunkIndex}`,
        index: chunkIndex,
        text: chunkText,
        startRow: i + 1,
        endRow: Math.min(i + rowsPerChunk, totalRows),
      });

      // Report progress and yield to main thread every 500 rows
      if (onProgress && (i % 500 === 0 || i + rowsPerChunk >= totalRows)) {
        onProgress({
          processedRows: Math.min(i + rowsPerChunk, totalRows),
          totalRows,
          processedChunks: chunks.length,
          totalChunks,
          percent: Math.min(100, Math.round(((i + rowsPerChunk) / totalRows) * 100)),
        });
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    return chunks;
  }

  // 2. Markdown or Free Text: Split by Headings or Paragraphs
  const { text: cleanBody } = stripFrontmatter(rawContent);
  const sections = cleanBody.split(/(?=\n##\s+)/g).filter((s) => s.trim().length > 0);

  if (sections.length > 1) {
    sections.forEach((sec, idx) => {
      chunks.push({
        id: `${datasetName}_sec_${idx + 1}`,
        index: idx + 1,
        text: sec.trim(),
      });
    });
  } else {
    // Split by paragraphs
    const paragraphs = cleanBody.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
    if (paragraphs.length > 1) {
      let currentChunk = '';
      let chunkIdx = 1;
      for (const p of paragraphs) {
        if ((currentChunk + '\n\n' + p).length > 800) {
          if (currentChunk.trim()) {
            chunks.push({ id: `${datasetName}_p_${chunkIdx++}`, text: currentChunk.trim() });
          }
          currentChunk = p;
        } else {
          currentChunk = currentChunk ? currentChunk + '\n\n' + p : p;
        }
      }
      if (currentChunk.trim()) {
        chunks.push({ id: `${datasetName}_p_${chunkIdx++}`, text: currentChunk.trim() });
      }
    } else {
      chunks.push({ id: `${datasetName}_all`, text: cleanBody.trim() });
    }
  }

  if (onProgress) {
    onProgress({
      processedRows: 0,
      totalRows: 0,
      processedChunks: chunks.length,
      totalChunks: chunks.length,
      percent: 100,
    });
  }

  return chunks;
}
