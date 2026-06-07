import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

function collectFiles(basePaths) {
  const files = [];
  for (const basePath of basePaths) {
    const root = path.join(ROOT, basePath);
    if (!fs.existsSync(root)) {
      continue;
    }

    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }

        if (entry.isFile() && entry.name.endsWith('.ts')) {
          files.push(full);
        }
      }
    };

    walk(root);
  }

  return files;
}

function stripQuotes(raw) {
  if (raw.length < 2) {
    return raw;
  }

  const quote = raw[0];
  const last = raw[raw.length - 1];
  if (quote !== last || (quote !== '"' && quote !== "'" && quote !== '`')) {
    return raw;
  }

  return raw.slice(1, -1);
}

function looksLikeStyleOrConstant(text) {
  if (!text) {
    return true;
  }

  const compact = text.trim();
  if (compact.length === 0) return true;
  if (compact.length <= 2) return true;
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(compact)) return true;
  if (/^-?\d+(?:\.\d+)?(?:px|%)?$/.test(compact)) return true;
  if (/^[a-zA-Z0-9_\-:.\/\s]+$/.test(compact) && compact.toLowerCase() === compact) {
    return true;
  }

  return false;
}

const files = collectFiles(['src/ui', 'src/scenes', 'src/settings']);
const findings = [];

const addTextRegex = /add\.text\([^\n]*?,\s*([^,\n]+)\s*,\s*(['"`])([\s\S]*?)\2/g;
const setTextRegex = /setText\(\s*(['"`])([\s\S]*?)\1/g;

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const lines = source.split(/\r?\n/);

  const hits = [];
  let match;

  while ((match = addTextRegex.exec(source)) !== null) {
    const raw = match[1].trim();
    if (raw.includes('I18n.t(') || raw.includes('this.t(')) {
      continue;
    }

    if (raw.startsWith('`') || raw.startsWith("'") || raw.startsWith('"')) {
      hits.push({ value: stripQuotes(raw), kind: 'addText', text: match[0].slice(0, 120) });
    }
  }

  while ((match = setTextRegex.exec(source)) !== null) {
    const raw = match[1].trim();
    if (raw.includes('I18n.t(') || raw.includes('this.t(')) {
      continue;
    }

    hits.push({ value: stripQuotes(raw), kind: 'setText', text: match[0].slice(0, 120) });
  }

  for (const hit of hits) {
    const value = hit.value;
    if (looksLikeStyleOrConstant(value)) {
      continue;
    }

    const index = source.indexOf(hit.text);
    const line = source.slice(0, index).split(/\r?\n/).length;
    findings.push({
      file: path.relative(ROOT, file),
      line,
      value,
      kind: hit.kind,
      lineText: lines[line - 1]?.trim(),
    });
  }
}

if (findings.length === 0) {
  console.log('No literal visible-text candidates found.');
  process.exit(0);
}

console.log(`Hard-coded visible text candidates: ${findings.length}`);
for (const item of findings) {
  console.log(`${item.file}:${item.line} [${item.kind}] ${item.value}`);
  console.log(`  ${item.lineText}`);
}
