import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcDir = path.join(root, 'src');
const strict = process.argv.includes('--strict');
const maxDisplayedWarnings = 200;

const jsonImportWhitelist = new Set([
  'src/content/ContentBootstrap.ts',
  'src/version/ContentHash.ts',
]);

const mathRandomWhitelist = new Set([
  'src/random/RunSeed.ts',
  'src/random/SeededRandom.ts',
]);

const localStorageWhitelist = new Set([
  'src/save/SaveStorage.ts',
  'src/custom/CustomStageStorage.ts',
  'src/replay/ReplayStorage.ts',
  'src/logging/PlaytestLogBuffer.ts',
  'src/content/providers/LocalContentPackProvider.ts',
]);

const textureKeyWhitelist = new Set([
  'src/assets/AssetKeyMap.ts',
  'src/assets/AssetKeyResolver.ts',
  'src/scenes/PreloadScene.ts',
]);

const warnings = [];

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

function addWarning(filePath, line, ruleId, suggestion) {
  warnings.push({
    file: normalize(filePath),
    line,
    ruleId,
    suggestion,
  });
}

function lineNumberForIndex(content, index) {
  return content.slice(0, index).split(/\r?\n/).length;
}

function scanFile(filePath) {
  const relativePath = normalize(filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  if (!jsonImportWhitelist.has(relativePath)) {
    const jsonImportPattern = /import\s+[^;]*?['"][^'"]*\/data\/[^'"]+\.json['"]/g;
    for (const match of content.matchAll(jsonImportPattern)) {
      addWarning(
        filePath,
        lineNumberForIndex(content, match.index ?? 0),
        'A_DIRECT_DATA_JSON_IMPORT',
        'Read gameplay content through ContentRegistry or a registry-backed manager.',
      );
    }
  }

  if (!mathRandomWhitelist.has(relativePath)) {
    for (const match of content.matchAll(/Math\.random\s*\(/g)) {
      addWarning(
        filePath,
        lineNumberForIndex(content, match.index ?? 0),
        'B_DIRECT_MATH_RANDOM',
        'Use injected RandomSource streams from RandomManager for gameplay randomness.',
      );
    }
  }

  if (!localStorageWhitelist.has(relativePath)) {
    for (const match of content.matchAll(/\blocalStorage\b/g)) {
      addWarning(
        filePath,
        lineNumberForIndex(content, match.index ?? 0),
        'C_DIRECT_LOCAL_STORAGE',
        'Use SaveManager, SaveStorage, or a dedicated storage wrapper instead of direct localStorage.',
      );
    }
  }

  if (!textureKeyWhitelist.has(relativePath)) {
    const textureKeyPattern = /['"`][^'"`]*(?:_icon|_projectile|boss_lava_beast|slime_boss)[^'"`]*['"`]/g;
    for (const match of content.matchAll(textureKeyPattern)) {
      addWarning(
        filePath,
        lineNumberForIndex(content, match.index ?? 0),
        'D_HARDCODED_TEXTURE_KEY',
        'Prefer AssetKeyResolver or AssetKeyMap for texture, animation, and icon keys.',
      );
    }
  }

  if (relativePath === 'src/scenes/GameScene.ts' && lines.length > 1000) {
    addWarning(
      filePath,
      1,
      'E_GAMESCENE_SIZE',
      `GameScene.ts has ${lines.length} lines; consider moving new orchestration into runtime services.`,
    );
  }
}

for (const filePath of collectTsFiles(srcDir)) {
  scanFile(filePath);
}

console.info(`[architecture] Total warnings: ${warnings.length}`);

for (const warning of warnings.slice(0, maxDisplayedWarnings)) {
  console.warn(
    `[architecture] ${warning.file}:${warning.line} ${warning.ruleId} - ${warning.suggestion}`,
  );
}

if (warnings.length > maxDisplayedWarnings) {
  console.warn(
    `[architecture] Showing first ${maxDisplayedWarnings} warnings; ${warnings.length - maxDisplayedWarnings} more hidden.`,
  );
}

if (strict && warnings.length > 0) {
  console.error('[architecture] Strict mode failed because architecture warnings were found.');
  process.exit(1);
}

console.info('[architecture] Boundary check completed.');
