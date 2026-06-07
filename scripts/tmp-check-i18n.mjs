import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const targetRoots = ['src/ui', 'src/scenes', 'src/settings'];
const keyUsagePatterns = [
  /(?:I18n\.t|this\.t|HelpFormatter\.t)\(\s*['"`]([^'"`\n]+)['"`]/g,
  /\b(?:bullet|paragraph|iconRow|stat)\(\s*['"`]([^'"`\n]+)['"`]/g,
  /\bstat\(\s*['"`][^'"`\n]+['"`]\s*,\s*['"`]([^'"`\n]+)['"`]/g,
];

function getKeys(obj, prefix = '') {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if (typeof v._label === 'string') {
        out.push(full);
      }
      out.push(...getKeys(v, full));
    } else {
      out.push(full);
    }
  }
  return out;
}

function getStringEntries(obj, prefix = '') {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out.push(...getStringEntries(v, full));
    } else if (typeof v === 'string') {
      out.push([full, v]);
    }
  }
  return out;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}

function collectTypeScriptFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const itemPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectTypeScriptFiles(itemPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(itemPath);
    }
  }

  return files;
}

const usedKeys = new Set();
for (const base of targetRoots) {
  const rootDir = path.join(root, base);
  for (const file of collectTypeScriptFiles(rootDir)) {
    const text = fs.readFileSync(file, 'utf8');
    for (const keyUsages of keyUsagePatterns) {
      keyUsages.lastIndex = 0;
      let match;
      while ((match = keyUsages.exec(text)) !== null) {
        if (match[1].includes('${')) {
          continue;
        }
        usedKeys.add(match[1]);
      }
    }
  }
}

const en = readJson('src/i18n/translations/en-US.json');
const zh = readJson('src/i18n/translations/zh-CN.json');
const ja = readJson('src/i18n/translations/ja-JP.json');

const enKeys = new Set(getKeys(en));
const zhKeys = new Set(getKeys(zh));
const jaKeys = new Set(getKeys(ja));

const missingEn = [...usedKeys].filter((key) => !enKeys.has(key)).sort();
const missingZh = [...usedKeys].filter((key) => !zhKeys.has(key)).sort();
const missingJa = [...usedKeys].filter((key) => !jaKeys.has(key)).sort();

console.log(`Used keys total: ${usedKeys.size}`);
console.log(`\nMissing in en-US (${missingEn.length}):`);
console.log(missingEn.join('\n') || '(none)');
console.log(`\nMissing in zh-CN (${missingZh.length}):`);
console.log(missingZh.join('\n') || '(none)');
console.log(`\nMissing in ja-JP (${missingJa.length}):`);
console.log(missingJa.join('\n') || '(none)');

const localizedHelpPollutionPatterns = [
  /\?\?\?\?/,
  /^Routes:/,
  /^Type:/,
  /^unknown$/i,
  /Unknown map/,
  /Unknown behavior/,
  /Depends on map configuration/,
  /A random unlocked stage/,
  /actual character/,
  /actual stage/,
  /No special map mechanics/,
  /\bupgrades \+/,
];

const globalPollutionPatterns = [
  /�/,
  /\?\?\?\?/,
  /锟/,
  /闁/,
  /銉/,
  /瑷€/,
  /缁/,
  /閲/,
  /杩/,
  /鍏/,
  /寮/,
  /澹/,
];

function collectLocalizedHelpPollution(localeName, translations) {
  return getStringEntries(translations)
    .filter(([key]) => key.startsWith('help.'))
    .filter(([, value]) => localizedHelpPollutionPatterns.some((pattern) => pattern.test(value)))
    .map(([key, value]) => `${localeName}:${key}=${value}`);
}

function collectGlobalPollution(localeName, translations) {
  return getStringEntries(translations)
    .filter(([, value]) => globalPollutionPatterns.some((pattern) => pattern.test(value)))
    .map(([key, value]) => `${localeName}:${key}=${value}`);
}

const zhHelpPollution = collectLocalizedHelpPollution('zh-CN', zh);
const jaHelpPollution = collectLocalizedHelpPollution('ja-JP', ja);
const helpPollution = [...zhHelpPollution, ...jaHelpPollution];
const globalPollution = [
  ...collectGlobalPollution('en-US', en),
  ...collectGlobalPollution('zh-CN', zh),
  ...collectGlobalPollution('ja-JP', ja),
];

console.log(`\nLocalized help pollution (${helpPollution.length}):`);
console.log(helpPollution.join('\n') || '(none)');
console.log(`\nGlobal translation pollution (${globalPollution.length}):`);
console.log(globalPollution.join('\n') || '(none)');

if (
  missingEn.length > 0
  || missingZh.length > 0
  || missingJa.length > 0
  || helpPollution.length > 0
  || globalPollution.length > 0
) {
  process.exitCode = 1;
}
