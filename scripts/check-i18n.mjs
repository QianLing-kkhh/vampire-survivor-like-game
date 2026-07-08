import fs from 'node:fs';
import path from 'node:path';

const LOCALES = ['en-US', 'zh-CN', 'ja-JP'];
const TRANSLATION_DIR = process.env.I18N_TRANSLATION_DIR ?? path.join('src', 'i18n', 'translations');
const SOURCE_DIR = 'src';
const DATA_DIR = path.join('src', 'data');
const KEY_PREFIXES = new Set([
  'character',
  'characterSelect',
  'characterSelection',
  'common',
  'customStage',
  'dailyChallenge',
  'developer',
  'game',
  'help',
  'hud',
  'levelUp',
  'loading',
  'map',
  'passive',
  'pause',
  'records',
  'relic',
  'replay',
  'result',
  'selection',
  'settings',
  'stage',
  'stageSelect',
  'stageSelection',
  'statsBuild',
  'strategyEditor',
  'strategyPanel',
  'title',
  'tooltip',
  'ui',
  'unlock',
  'upgrade',
  'weapon',
]);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function flattenTranslations(node, prefix = '') {
  const entries = [];

  for (const [key, value] of Object.entries(node)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string') {
      entries.push([fullKey, value]);
      continue;
    }

    if (value && typeof value === 'object') {
      if (typeof value._label === 'string') {
        entries.push([fullKey, value._label]);
      }

      entries.push(...flattenTranslations(value, fullKey));
    }
  }

  return entries;
}

function hasTranslation(data, key) {
  if (typeof data[key] === 'string') {
    return data[key].trim().length > 0;
  }

  if (data[key] && typeof data[key] === 'object' && typeof data[key]._label === 'string') {
    return data[key]._label.trim().length > 0;
  }

  const value = key.split('.').reduce((node, part) => {
    if (!node || typeof node === 'string') {
      return undefined;
    }

    return node[part];
  }, data);

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  return Boolean(value && typeof value === 'object' && typeof value._label === 'string' && value._label.trim());
}

function walkFiles(directory, predicate, output = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      walkFiles(filePath, predicate, output);
      continue;
    }

    if (predicate(filePath)) {
      output.push(filePath);
    }
  }

  return output;
}

function collectSourceLiteralKeys() {
  const keys = new Set();
  const files = walkFiles(SOURCE_DIR, (filePath) => filePath.endsWith('.ts'));
  const callPatterns = [
    /(?:I18n\.t|this\.t|HelpFormatter\.t)\(\s*(['"`])([^'"`$]+)\1/g,
    /this\.(?:bullet|paragraph|iconRow|iconChain)\(\s*(['"`])([^'"`$]+)\1/g,
    /this\.tab\(\s*[^,]+,\s*(['"`])([^'"`$]+)\1/g,
    /this\.stat\(\s*(['"`])([^'"`$]+)\1\s*,\s*(['"`])([^'"`$]+)\3/g,
  ];

  for (const filePath of files) {
    const source = fs.readFileSync(filePath, 'utf8');

    for (const pattern of callPatterns) {
      let match;

      while ((match = pattern.exec(source)) !== null) {
        const candidates = pattern.source.includes('this\\.stat')
          ? [match[2], match[4]]
          : [match[2]];

        for (const key of candidates) {
          const root = key.split('.')[0];

          if (KEY_PREFIXES.has(root) && key.includes('.')) {
            keys.add(key);
          }
        }
      }
    }
  }

  return keys;
}

function collectKeyFields(value, keys = new Set()) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectKeyFields(item, keys));
    return keys;
  }

  if (!value || typeof value !== 'object') {
    return keys;
  }

  for (const [key, child] of Object.entries(value)) {
    if (['nameKey', 'descriptionKey', 'labelKey', 'titleKey'].includes(key) && typeof child === 'string') {
      keys.add(child);
      continue;
    }

    collectKeyFields(child, keys);
  }

  return keys;
}

function collectDataDrivenKeys() {
  const keys = new Set();
  const dataFiles = walkFiles(DATA_DIR, (filePath) => filePath.endsWith('.json'));

  for (const filePath of dataFiles) {
    collectKeyFields(readJson(filePath), keys);
  }

  const characters = readJson(path.join(DATA_DIR, 'characters.json'));
  for (const [id, character] of Object.entries(characters)) {
    keys.add(`help.characters.description.${character.id ?? id}`);

    if (character.damageReactionSkill?.type) {
      keys.add(`help.characters.reaction.${character.damageReactionSkill.type}`);
    }

    if (character.levelUpEffect?.type) {
      keys.add(`help.characters.levelUp.${character.levelUpEffect.type}`);
    }
  }

  const weapons = readJson(path.join(DATA_DIR, 'weapons.json'));
  for (const [id, weapon] of Object.entries(weapons)) {
    keys.add(`weapon.${id}.name`);
    keys.add(`weapon.${id}.description`);

    if (weapon.type) {
      keys.add(`help.weapon.type.${weapon.type}`);
    }

    if (weapon.behavior?.type) {
      keys.add(`help.weapon.behavior.${weapon.behavior.type}`);
    }

    for (const tag of weapon.tags ?? []) {
      keys.add(`help.weapon.tag.${tag}`);
    }
  }

  const passives = readJson(path.join(DATA_DIR, 'passives.json'));
  for (const passive of passives) {
    keys.add(`passive.${passive.id}.name`);
    keys.add(`passive.${passive.id}.description`);
    keys.add(`tooltip.passive.${passive.id}`);
  }

  const upgrades = readJson(path.join(DATA_DIR, 'upgrades.json'));
  for (const upgrade of upgrades) {
    keys.add(`upgrade.${upgrade.id}.name`);
    keys.add(`upgrade.${upgrade.id}.description`);
  }

  return keys;
}

function collectDuplicateUpgradeFields(translation, field) {
  const values = new Map();
  const duplicates = [];

  for (const [id, upgrade] of Object.entries(translation.upgrade ?? {})) {
    if (!upgrade || typeof upgrade !== 'object' || typeof upgrade[field] !== 'string') {
      continue;
    }

    const value = upgrade[field].trim();
    if (!value) {
      continue;
    }

    const existingId = values.get(value);
    if (existingId) {
      duplicates.push(`${value} (${existingId}, ${id})`);
      continue;
    }

    values.set(value, id);
  }

  return duplicates;
}

function main() {
  const translations = Object.fromEntries(
    LOCALES.map((locale) => [locale, readJson(path.join(TRANSLATION_DIR, `${locale}.json`))]),
  );
  const flattened = Object.fromEntries(
    LOCALES.map((locale) => [locale, new Map(flattenTranslations(translations[locale]))]),
  );
  const allLocaleKeys = new Set(LOCALES.flatMap((locale) => [...flattened[locale].keys()]));
  const requiredKeys = new Set([
    ...allLocaleKeys,
    ...collectSourceLiteralKeys(),
    ...collectDataDrivenKeys(),
  ]);
  const errors = [];

  for (const locale of LOCALES) {
    for (const [key, value] of flattened[locale]) {
      if (!value.trim()) {
        errors.push(`${locale}: empty translation for ${key}`);
      }
    }

    const missing = [...requiredKeys]
      .filter((key) => !hasTranslation(translations[locale], key))
      .sort();

    for (const key of missing) {
      errors.push(`${locale}: missing translation for ${key}`);
    }

    for (const duplicate of collectDuplicateUpgradeFields(translations[locale], 'name')) {
      errors.push(`${locale}: duplicate upgrade name ${duplicate}`);
    }

    for (const duplicate of collectDuplicateUpgradeFields(translations[locale], 'description')) {
      errors.push(`${locale}: duplicate upgrade description ${duplicate}`);
    }
  }

  if (errors.length > 0) {
    console.error(`[check-i18n] ${errors.length} issue(s) found.`);
    for (const error of errors.slice(0, 200)) {
      console.error(`- ${error}`);
    }

    if (errors.length > 200) {
      console.error(`... ${errors.length - 200} more`);
    }

    process.exit(1);
  }

  console.info(`[check-i18n] ${requiredKeys.size} keys covered across ${LOCALES.length} locales.`);
}

main();
