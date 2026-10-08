/**
 * check-service-calls.js
 * Scans service/store modules for exported methods and verifies all callers
 * across the codebase call valid, existing functions/methods.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

const SERVICE_MODULES = [
  { name: 'datasetService', file: path.join(SRC, 'services', 'datasetService.js') },
  { name: 'datasetData', file: path.join(SRC, 'services', 'datasetData.js') },
  { name: 'apiService', file: path.join(SRC, 'services', 'apiService.js') },
  { name: 'chatStorage', file: path.join(SRC, 'services', 'chatStorage.js') },
  { name: 'dialogService', file: path.join(SRC, 'services', 'dialogService.js') },
  { name: 'datasetParser', file: path.join(SRC, 'services', 'datasetParser.js') },
  { name: 'ragEngine', file: path.join(SRC, 'utils', 'ragEngine.js') },
];

function extractExports(filePath) {
  if (!fs.existsSync(filePath)) return new Set();
  const content = fs.readFileSync(filePath, 'utf8');
  const methods = new Set();

  // 1. export function / export async function / export const
  const funcMatches = content.matchAll(/export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/g);
  for (const m of funcMatches) methods.add(m[1]);

  const constMatches = content.matchAll(/export\s+const\s+([A-Za-z0-9_]+)\s*=/g);
  for (const m of constMatches) methods.add(m[1]);

  // 2. Class methods in class declaration
  const classMatches = content.matchAll(/class\s+[A-Za-z0-9_]+\s*\{([\s\S]*?)\n\}/g);
  for (const cm of classMatches) {
    const classBody = cm[1];
    const methodMatches = classBody.matchAll(/^\s*(?:async\s+)?([A-Za-z0-9_]+)\s*\(/gm);
    for (const mm of methodMatches) {
      if (mm[1] !== 'constructor') methods.add(mm[1]);
    }
  }

  // 3. Named export object: export { a, b, c }
  const exportBlock = content.matchAll(/export\s*\{([^}]+)\}/g);
  for (const eb of exportBlock) {
    const items = eb[1].split(',');
    for (const it of items) {
      const clean = it.trim().split(/\s+as\s+/)[0].trim();
      if (clean) methods.add(clean);
    }
  }

  // 4. Default export object properties if object literal
  const defaultObj = content.match(/export\s+default\s*\{([\s\S]*?)\};?/);
  if (defaultObj) {
    const props = defaultObj[1].split(',');
    for (const p of props) {
      const clean = p.trim().split(':')[0].trim();
      if (clean && /^[A-Za-z0-9_]+$/.test(clean)) methods.add(clean);
    }
  }

  return methods;
}

function getAllJsFiles(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
        results = results.concat(getAllJsFiles(full));
      }
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      results.push(full);
    }
  }
  return results;
}

function runAudit() {
  console.log('🔍 Auditing Service & Store method invocations across codebase...\n');

  const moduleExports = new Map();
  for (const sm of SERVICE_MODULES) {
    const exported = extractExports(sm.file);
    moduleExports.set(sm.name, exported);
    console.log(`📦 ${sm.name} exports (${exported.size} methods):`);
    console.log(`   [${Array.from(exported).join(', ')}]`);
  }

  const allFiles = [...getAllJsFiles(SRC), path.join(ROOT, 'App.js')].filter(f => fs.existsSync(f));
  const mismatches = [];

  for (const filePath of allFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    const relPath = path.relative(ROOT, filePath);

    // Check moduleName.methodName(
    for (const [modName, exportedSet] of moduleExports.entries()) {
      const callRegex = new RegExp(`\\b${modName}\\.([A-Za-z0-9_]+)\\s*\\(`, 'g');
      let match;
      while ((match = callRegex.exec(content)) !== null) {
        const methodName = match[1];
        if (!exportedSet.has(methodName)) {
          mismatches.push({
            file: relPath,
            module: modName,
            calledMethod: methodName,
            available: Array.from(exportedSet),
          });
        }
      }

      // Check named imports: import { method1, method2 } from '...modName...'
      // e.g. import { foo } from '../services/datasetData';
      const importRegex = new RegExp(`import\\s*\\{([^}]+)\\}\\s*from\\s*['"][^'"]*${modName}['"]`, 'g');
      let impMatch;
      while ((impMatch = importRegex.exec(content)) !== null) {
        const importedItems = impMatch[1].split(',');
        for (const it of importedItems) {
          const item = it.trim().split(/\s+as\s+/)[0].trim();
          if (item && !exportedSet.has(item)) {
            mismatches.push({
              file: relPath,
              module: modName,
              calledMethod: item + ' (imported)',
              available: Array.from(exportedSet),
            });
          }
        }
      }
    }
  }

  console.log('\n--- AUDIT RESULTS ---');
  if (mismatches.length === 0) {
    console.log('✅ ZERO MISMATCHES FOUND! All service method calls and imports are valid.\n');
    return true;
  } else {
    console.log(`❌ Found ${mismatches.length} mismatch(es):`);
    for (const m of mismatches) {
      console.log(`   - ${m.file}: called "${m.module}.${m.calledMethod}" (NOT EXPORTED)`);
    }
    console.log('');
    return false;
  }
}

const success = runAudit();
process.exit(success ? 0 : 1);
