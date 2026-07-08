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
  const rectangleVariables = new Set();
  const rectanglePattern = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=;]+)?=\s*[^;\n]*\.add\.rectangle\(/g;
  const objectLiteralPattern = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=;]+)?=\s*{([\s\S]*?)}\s*;/g;
  const rectanglePropertyPattern = /\b([A-Za-z_$][\w$]*)\s*:\s*[^;\n]*\.add\.rectangle\(/g;
  const rectanglePropertyAssignmentPattern = /\b([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)\s*=\s*[^;\n]*\.add\.rectangle\(/g;

  for (const match of content.matchAll(rectanglePattern)) {
    rectangleVariables.add(match[1]);
  }

  for (const objectMatch of content.matchAll(objectLiteralPattern)) {
    const ownerName = objectMatch[1];
    const objectBody = objectMatch[2];
    for (const propertyMatch of objectBody.matchAll(rectanglePropertyPattern)) {
      rectangleVariables.add(`${ownerName}.${propertyMatch[1]}`);
    }
  }

  for (const match of content.matchAll(rectanglePropertyAssignmentPattern)) {
    rectangleVariables.add(`${match[1]}.${match[2]}`);
  }

  return [...rectangleVariables];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

for (const scanRoot of scanRoots) {
  for (const filePath of collectTsFiles(scanRoot)) {
    const relativePath = normalize(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const patterns = [
      {
        pattern: /new Phaser\.Geom\.Rectangle\(\s*-/g,
      },
      {
        pattern: /\.setTo\(\s*-/g,
      },
      {
        pattern: /\.add\.rectangle\([\s\S]*?\)\s*\.setInteractive\(\s*\)/g,
        call: 'implicit rectangle setInteractive()',
      },
    ];

    for (const { pattern, call } of patterns) {
      for (const match of content.matchAll(pattern)) {
        findings.push({
          file: relativePath,
          line: lineForIndex(content, match.index ?? 0),
          call: call ?? match[0],
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
