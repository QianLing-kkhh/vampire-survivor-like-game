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
  const filePath = path.join(dataDir, name);

  if (!fs.existsSync(filePath)) {
    addError(`Missing data file: ${displayDataPath(name)}`);
    return undefined;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    addError(`Invalid JSON in ${displayDataPath(name)}: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}

function toRecord(value, sourceName) {
  if (!value || typeof value !== 'object') {
    return {};
  }

  if (Array.isArray(value)) {
    const record = {};
    for (const entry of value) {
      if (entry && typeof entry === 'object' && typeof entry.id === 'string') {
        if (hasId(record, entry.id)) {
          addError(`Duplicate id in ${sourceName}: ${entry.id}`);
          continue;
        }
        record[entry.id] = entry;
      }
    }
    return record;
  }

  return value;
}

function hasId(record, id) {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(record, id);
}

function collectWaveEntries(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value || typeof value !== 'object') {
    return [];
  }

  const entries = [];
  for (const [waveSetId, waveSet] of Object.entries(value)) {
    if (Array.isArray(waveSet)) {
      entries.push(...waveSet.map((wave) => ({ ...wave, __waveSetId: waveSetId })));
    } else if (waveSet && typeof waveSet === 'object' && Array.isArray(waveSet.waves)) {
      entries.push(...waveSet.waves.map((wave) => ({ ...wave, __waveSetId: waveSetId })));
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
