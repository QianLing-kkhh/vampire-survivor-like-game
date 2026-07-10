import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dataDir = process.env.CONTENT_AUDIT_DATA_DIR ?? path.join(root, 'src', 'data');
const requiredFiles = [
  'weapons.json',
  'enemies.json',
  'passives.json',
  'upgrades.json',
  'waves.json',
  'characters.json',
  'stages.json',
  'maps.json',
  'bosses.json',
];

const errors = [];
const jsonCache = new Map();

function addError(message) {
  errors.push(message);
}

function displayDataPath(name) {
  if (dataDir === path.join(root, 'src', 'data')) {
    return `src/data/${name}`;
  }

  return path.join(dataDir, name);
}

function readJson(name) {
  if (jsonCache.has(name)) {
    return jsonCache.get(name);
  }

  const filePath = path.join(dataDir, name);

  if (!fs.existsSync(filePath)) {
    addError(`Missing data file: ${displayDataPath(name)}`);
    jsonCache.set(name, undefined);
    return undefined;
  }

  try {
    const value = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    jsonCache.set(name, value);
    return value;
  } catch (error) {
    addError(`Invalid JSON in ${displayDataPath(name)}: ${error instanceof Error ? error.message : String(error)}`);
    jsonCache.set(name, undefined);
    return undefined;
  }
}

function toRecord(value, sourceName) {
  if (!value || typeof value !== 'object') {
    return {};
  }

  if (Array.isArray(value)) {
    const record = {};
    for (const [index, entry] of value.entries()) {
      if (!entry || typeof entry !== 'object' || typeof entry.id !== 'string' || entry.id.trim().length === 0) {
        addError(`Missing id in ${sourceName} array entry at index ${index}`);
        continue;
      }

      if (entry.id.trim() !== entry.id) {
        addError(`Padded id in ${sourceName} array entry at index ${index}: ${entry.id}`);
        continue;
      }

      if (hasId(record, entry.id)) {
        addError(`Duplicate id in ${sourceName}: ${entry.id}`);
        continue;
      }

      record[entry.id] = entry;
    }
    return record;
  }

  for (const [key, entry] of Object.entries(value)) {
    if (key.trim().length === 0) {
      addError(`Missing key in ${sourceName} object entry`);
    } else if (key.trim() !== key) {
      addError(`Padded key in ${sourceName}: ${key}`);
    }

    if (!entry || typeof entry !== 'object') {
      addError(`Invalid entry in ${sourceName} object entry ${key}: expected object`);
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(entry, 'id') && typeof entry.id !== 'string') {
      addError(`Invalid id in ${sourceName} object entry ${key}: expected string`);
    } else if (typeof entry.id === 'string' && entry.id.trim().length === 0) {
      addError(`Missing id in ${sourceName} object entry ${key}`);
    } else if (typeof entry.id === 'string' && entry.id.trim() !== entry.id) {
      addError(`Padded id in ${sourceName} object entry ${key}: ${entry.id}`);
    } else if (typeof entry.id === 'string' && entry.id !== key) {
      addError(`Mismatched id in ${sourceName}: key ${key} has id ${entry.id}`);
    }
  }

  return value;
}

function hasId(record, id) {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(record, id);
}

function appendWaveEntries(entries, sourceName, waves) {
  for (const [index, wave] of waves.entries()) {
    if (!wave || typeof wave !== 'object') {
      addError(`Invalid wave entry in ${sourceName} at index ${index}: expected object`);
      continue;
    }

    entries.push(wave);
  }
}

function collectWaveEntries(value) {
  if (Array.isArray(value)) {
    const entries = [];
    appendWaveEntries(entries, 'waves', value);
    return entries;
  }

  if (!value || typeof value !== 'object') {
    return [];
  }

  const entries = [];
  for (const [waveSetId, waveSet] of Object.entries(value)) {
    if (Array.isArray(waveSet)) {
      const waveSetEntries = [];
      appendWaveEntries(waveSetEntries, `wave set ${waveSetId}`, waveSet);
      entries.push(...waveSetEntries.map((wave) => ({ ...wave, __waveSetId: waveSetId })));
    } else if (waveSet && typeof waveSet === 'object' && Array.isArray(waveSet.waves)) {
      const waveSetEntries = [];
      appendWaveEntries(waveSetEntries, `wave set ${waveSetId}`, waveSet.waves);
      entries.push(...waveSetEntries.map((wave) => ({ ...wave, __waveSetId: waveSetId })));
    } else {
      addError(`Invalid wave set ${waveSetId} in waves.json: expected array or object with waves`);
    }
  }
  return entries;
}

function collectBossEntries(value) {
  if (Array.isArray(value)) {
    return value.flatMap(collectBossEntries);
  }

  if (!value || typeof value !== 'object') {
    return [];
  }

  if (typeof value.enemyId === 'string') {
    return [value];
  }

  return Object.values(value).flatMap(collectBossEntries);
}

for (const fileName of requiredFiles) {
  readJson(fileName);
}

const weapons = toRecord(readJson('weapons.json'), 'weapons.json');
const enemies = toRecord(readJson('enemies.json'), 'enemies.json');
const passives = toRecord(readJson('passives.json'), 'passives.json');
const waves = readJson('waves.json');
const characters = toRecord(readJson('characters.json'), 'characters.json');
const stages = toRecord(readJson('stages.json'), 'stages.json');
const maps = toRecord(readJson('maps.json'), 'maps.json');
const bosses = readJson('bosses.json');

for (const [stageId, stage] of Object.entries(stages)) {
  if (!stage || typeof stage !== 'object') {
    addError(`Stage ${stageId} must be an object.`);
    continue;
  }

  if (!hasId(maps, stage.mapId)) {
    addError(`Stage ${stageId} references missing mapId: ${stage.mapId}`);
  }

  const finalBossId = stage.finalBossId ?? stage.bossId;
  if (finalBossId && !hasId(enemies, finalBossId)) {
    addError(`Stage ${stageId} references missing finalBossId: ${finalBossId}`);
  }
}

for (const [characterId, character] of Object.entries(characters)) {
  const startingWeaponId = character?.startingWeaponId ?? character?.weaponId;
  if (startingWeaponId && !hasId(weapons, startingWeaponId)) {
    addError(`Character ${characterId} references missing startingWeaponId: ${startingWeaponId}`);
  }
}

for (const boss of collectBossEntries(bosses)) {
  const bossId = boss.id ?? boss.enemyId;
  const enemyId = boss.enemyId;
  if (enemyId && !hasId(enemies, enemyId)) {
    addError(`Boss config ${bossId} references missing enemyId: ${enemyId}`);
  }

  for (const skill of boss.skills ?? []) {
    if (!skill || typeof skill !== 'object' || !Array.isArray(skill.summons)) {
      continue;
    }

    for (const summon of skill.summons) {
      if (summon?.enemyId && !hasId(enemies, summon.enemyId)) {
        addError(`Boss config ${bossId} summon references missing enemyId: ${summon.enemyId}`);
      }
    }
  }
}

for (const wave of collectWaveEntries(waves)) {
  const enemyId = wave?.enemyId ?? wave?.enemy;
  const waveSetId = wave?.__waveSetId ?? 'waves';
  if (enemyId && !hasId(enemies, enemyId)) {
    addError(`Wave set ${waveSetId} references missing enemyId: ${enemyId}`);
  }
}

for (const [weaponId, weapon] of Object.entries(weapons)) {
  const requiredPassiveId = weapon?.requiredPassiveId ?? weapon?.evolutionPassiveId;
  const evolvesTo = weapon?.evolvesTo ?? weapon?.evolvedWeaponId;

  if (requiredPassiveId && !hasId(passives, requiredPassiveId)) {
    addError(`Weapon ${weaponId} references missing passive: ${requiredPassiveId}`);
  }

  if (evolvesTo && !hasId(weapons, evolvesTo)) {
    addError(`Weapon ${weaponId} references missing evolved weapon: ${evolvesTo}`);
  }
}

if (errors.length > 0) {
  console.error('[content] Content audit failed:');
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.info('[content] JSON reference checks passed.');
