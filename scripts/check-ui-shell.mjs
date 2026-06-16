import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const scanRoots = [
  path.join(root, 'src', 'debug'),
  path.join(root, 'src', 'ui'),
  path.join(root, 'src', 'scenes'),
];
const allowedFiles = new Set([
  'src/ui/input/UIInteraction.ts',
  'src/ui/minimap/MinimapOverlay.ts',
]);
const rawUiPattern = /\b(?:this\.)?(?:scene\.)?add\.(?:text|rectangle|graphics)\b|\.(?:add)\.(?:text|rectangle|graphics)\b/g;
const findings = [];

function normalize(filePath) {
  return path.relative(root, filePath).replaceAll(path.sep, '/');
}

function collectTsFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (normalize(entryPath) === 'src/ui/components') {
        continue;
      }

      files.push(...collectTsFiles(entryPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(entryPath);
    }
  }

  return files;
}

function lineForIndex(content, index) {
  return content.slice(0, index).split(/\r?\n/).length;
}

for (const scanRoot of scanRoots) {
  for (const filePath of collectTsFiles(scanRoot)) {
    const relativePath = normalize(filePath);
    if (allowedFiles.has(relativePath)) {
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    for (const match of content.matchAll(rawUiPattern)) {
      findings.push({
        file: relativePath,
        line: lineForIndex(content, match.index ?? 0),
        call: match[0],
      });
    }
  }
}

if (findings.length > 0) {
  console.error(`[ui-shell] Found ${findings.length} raw Phaser UI shell calls outside shared components.`);
  for (const finding of findings.slice(0, 80)) {
    console.error(`[ui-shell] ${finding.file}:${finding.line} ${finding.call}`);
  }
  process.exit(1);
}

console.info('[ui-shell] UI shell check passed.');
