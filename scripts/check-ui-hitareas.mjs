import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const findings = [];
const configuredScanRoots = process.env.UI_HITAREA_SCAN_ROOTS
  ? process.env.UI_HITAREA_SCAN_ROOTS.split(path.delimiter).filter(Boolean)
  : undefined;
const scanRoots = configuredScanRoots ?? [
  path.join(root, 'src', 'ui'),
  path.join(root, 'src', 'scenes'),
];

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

function collectRectangleVariables(content) {
  const rectangleVariables = [];
  const rectanglePattern = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*[^;\n]*\.add\.rectangle\(/g;

  for (const match of content.matchAll(rectanglePattern)) {
    rectangleVariables.push(match[1]);
  }

  return rectangleVariables;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

for (const scanRoot of scanRoots) {
  for (const filePath of collectTsFiles(scanRoot)) {
    const relativePath = normalize(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const patterns = [
      /new Phaser\.Geom\.Rectangle\(\s*-/g,
      /\.setTo\(\s*-/g,
    ];

    for (const pattern of patterns) {
      for (const match of content.matchAll(pattern)) {
        findings.push({
          file: relativePath,
          line: lineForIndex(content, match.index ?? 0),
          call: match[0],
        });
      }
    }

    for (const rectangleVariable of collectRectangleVariables(content)) {
      const pattern = new RegExp(`\\b${escapeRegExp(rectangleVariable)}\\.setInteractive\\(\\s*\\)`, 'g');
      for (const match of content.matchAll(pattern)) {
        findings.push({
          file: relativePath,
          line: lineForIndex(content, match.index ?? 0),
          call: 'implicit rectangle setInteractive()',
        });
      }
    }
  }
}

if (findings.length > 0) {
  console.error('[ui-hitareas] Found unsafe UI hitArea definitions.');
  console.error('[ui-hitareas] Phaser normalizes input by displayOrigin, so centered Container visuals should still use 0..width / 0..height hit areas.');
  console.error('[ui-hitareas] Rectangle UI blockers should use setRectangleHitArea() or an explicit hitArea instead of implicit setInteractive().');
  for (const finding of findings) {
    console.error(`[ui-hitareas] ${finding.file}:${finding.line} ${finding.call}`);
  }
  process.exit(1);
}

console.info('[ui-hitareas] UI hit area check passed.');
