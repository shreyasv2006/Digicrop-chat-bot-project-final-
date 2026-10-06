/**
 * Vercel Serverless Function: /api/datasets
 * Returns list of available named datasets and their metadata
 */

const fs = require('fs');
const path = require('path');

function parseFrontMatter(rawContent) {
  if (!rawContent || typeof rawContent !== 'string') {
    return { metadata: {}, content: '' };
  }
  const normalized = rawContent.trim();
  if (!normalized.startsWith('---')) {
    return { metadata: {}, content: normalized };
  }
  const endIdx = normalized.indexOf('---', 3);
  if (endIdx === -1) {
    return { metadata: {}, content: normalized };
  }
  const frontText = normalized.substring(3, endIdx).trim();
  const content = normalized.substring(endIdx + 3).trim();
  const metadata = {};
  frontText.split('\n').forEach(line => {
    const colon = line.indexOf(':');
    if (colon !== -1) {
      metadata[line.substring(0, colon).trim().toLowerCase()] = line.substring(colon + 1).trim();
    }
  });
  return { metadata, content };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const datasetDirs = [
      path.join(__dirname, '../src/datasets'),
      path.join(__dirname, '../datasets'),
      path.join(process.cwd(), 'src/datasets'),
      path.join(process.cwd(), 'datasets'),
    ];

    let foundDir = null;
    for (const dir of datasetDirs) {
      if (fs.existsSync(dir)) {
        foundDir = dir;
        break;
      }
    }

    const datasets = [];

    if (foundDir) {
      const files = fs.readdirSync(foundDir).filter(f => f.endsWith('.md'));
      files.forEach(file => {
        const filePath = path.join(foundDir, file);
        const raw = fs.readFileSync(filePath, 'utf-8');
        const { metadata, content } = parseFrontMatter(raw);
        datasets.push({
          id: file.replace('.md', ''),
          fileName: file,
          name: metadata.name || file.replace('.md', '').toUpperCase(),
          category: metadata.category || 'General',
          farmId: metadata.farm_id || null,
          crop: metadata.crop || null,
          description: metadata.description || 'DigiCrop knowledge dataset.',
          content,
        });
      });
    }

    return res.status(200).json({ datasets });
  } catch (error) {
    console.error('Error in /api/datasets:', error);
    return res.status(500).json({ error: error.message });
  }
};
