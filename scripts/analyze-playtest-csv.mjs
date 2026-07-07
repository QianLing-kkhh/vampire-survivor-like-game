import fs from 'node:fs';
import path from 'node:path';

const filePath = process.argv[2];

if (!filePath) {
  console.info('Usage: node scripts/analyze-playtest-csv.mjs path/to/playtest.csv');
  console.info('       npm.cmd run analyze:csv -- path/to/playtest.csv');
  process.exit(0);
}

const resolvedPath = path.resolve(process.cwd(), filePath);

if (!fs.existsSync(resolvedPath)) {
  console.error(`[analyze] CSV file not found: ${filePath}`);
  process.exit(1);
}

const parsedCsv = parseCsv(fs.readFileSync(resolvedPath, 'utf8'));
const report = buildReport(parsedCsv.rows);

console.info(formatReport(report));

function parseCsv(text) {
  const parsedRows = parseCsvRows(text).filter((row) => row.some((value) => value.length > 0));
  const headers = parsedRows[0] ?? [];
  const rows = parsedRows.slice(1).map((values) => {
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });
    return row;
  });

  return { headers, rows };
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === '"' && quoted && nextCharacter === '"') {
      value += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      quoted = !quoted;
      continue;
    }

    if (character === ',' && !quoted) {
      row.push(value);
      value = '';
      continue;
    }

    if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && nextCharacter === '\n') {
        index += 1;
      }
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
      continue;
    }

    value += character;
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value);
    rows.push(row);
  }

  return rows;
}

function buildReport(rows) {
  const schemaGroups = groupBySchema(rows);
  const warnings = [];

  if (schemaGroups.length > 1) {
    warnings.push('CSV contains mixed csvSchemaVersion/contentHash groups. Compare grouped samples separately.');
  }

  const victory = calculateVictoryRate(rows);
  const endless = calculateEndlessMetrics(rows);
  const boss = calculateBossMetrics(rows);
  const weapons = calculateWeaponMetrics(rows);

  if (weapons.length === 0) {
    warnings.push('weaponDamageStats is missing or empty; weapon damage share was skipped.');
  }

  return {
    totalRuns: rows.length,
    schemaGroups,
    victory,
    averageSurvivalTime: averageField(rows, 'survivalTime'),
    deathTimeBuckets: calculateDeathTimeBuckets(rows),
    averageFinalLevel: averageField(rows, 'finalLevel'),
    averageKillCount: averageField(rows, 'killCount'),
    evolutionRate: rows.length === 0 ? null : rows.filter((row) => hasListValue(row.evolutionPath)).length / rows.length,
    boss,
    endless,
    treasure: calculateTreasureMetrics(rows),
    weapons,
    warnings,
    suggestedChecks: buildSuggestedChecks(victory, boss, endless),
  };
}

function parseNumberSafe(value) {
  if (value === undefined || value.trim() === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBooleanSafe(value) {
  if (value === undefined || value.trim() === '') {
    return null;
  }

  if (value.toLowerCase() === 'true') {
    return true;
  }

  if (value.toLowerCase() === 'false') {
    return false;
  }

  return null;
}

function groupBySchema(rows) {
  const groups = new Map();

  for (const row of rows) {
    const csvSchemaVersion = row.csvSchemaVersion || row.schemaVersion || 'unknown';
    const contentHash = row.contentHash || 'unknown';
    const key = `${csvSchemaVersion}|${contentHash}`;
    const group = groups.get(key) ?? { key, csvSchemaVersion, contentHash, runCount: 0 };

    group.runCount += 1;
    groups.set(key, group);
  }

  return Array.from(groups.values());
}

function calculateVictoryRate(rows) {
  const victoryCount = rows.filter((row) => row.resultType === 'victory').length;
  const gameOverCount = rows.filter((row) => row.resultType === 'gameOver').length;

  return {
    totalRuns: rows.length,
    victoryCount,
    gameOverCount,
    victoryRate: rows.length === 0 ? 0 : victoryCount / rows.length,
  };
}

function calculateBossMetrics(rows) {
  const spawned = rows.filter((row) => parseBooleanSafe(row.bossSpawned) === true);
  const killed = rows.filter((row) => parseBooleanSafe(row.bossKilled) === true);
  const dashUses = sumField(rows, 'bossDashCount') + sumField(rows, 'endlessBossSkillUseCount');
  const dashHits = sumField(rows, 'bossDashHitCount') + sumField(rows, 'endlessBossSkillHitCount');

  return {
    bossSpawnRate: rows.length === 0 ? null : spawned.length / rows.length,
    bossKillRate: spawned.length === 0 ? null : killed.length / spawned.length,
    bossDashHitRate: dashUses === 0 ? null : dashHits / dashUses,
    averageBossPhaseDamage: averageField(rows, 'bossPhaseDamageTaken'),
    averageBossDamageDealt: averageField(rows, 'bossDamageDealt'),
  };
}

function calculateEndlessMetrics(rows) {
  const endlessRows = rows.filter((row) => parseBooleanSafe(row.endlessStarted) === true);

  return {
    endlessStartedRate: rows.length === 0 ? null : endlessRows.length / rows.length,
    averageEndlessSurvivalTime: averageField(endlessRows, 'endlessSurvivalTime'),
    maxEndlessSurvivalTime: maxField(endlessRows, 'endlessSurvivalTime'),
    averageEndlessRewardCount: averageField(endlessRows, 'endlessRewardCount'),
    averageEndlessLevelIntervalSeconds: averageField(endlessRows, 'averageEndlessLevelIntervalSeconds'),
    rewardBreakdown: {
      heal: sumField(rows, 'endlessHealCount'),
      overdrive: sumField(rows, 'endlessOverdriveCount'),
      growth: sumField(rows, 'endlessGrowthCount'),
      enemySlow: sumField(rows, 'endlessEnemySlowCount'),
    },
  };
}

function calculateTreasureMetrics(rows) {
  return {
    averageTreasureDrops: averageField(rows, 'treasureDropCount'),
    averageTreasureOpens: averageField(rows, 'treasureOpenCount'),
    averageEndlessTreasureDrops: averageField(rows, 'endlessTreasureDropCount'),
    averageEndlessTreasureOpens: averageField(rows, 'endlessTreasureOpenCount'),
  };
}

function calculateWeaponMetrics(rows) {
  const totals = new Map();

  for (const row of rows) {
    for (const [weaponId, damage] of parseStatList(row.weaponDamageStats)) {
      totals.set(weaponId, (totals.get(weaponId) ?? 0) + damage);
    }
  }

  const totalDamage = Array.from(totals.values()).reduce((total, value) => total + value, 0);

  return Array.from(totals.entries())
    .map(([weaponId, damage]) => ({
      weaponId,
      totalDamage: damage,
      damageShare: totalDamage === 0 ? 0 : damage / totalDamage,
    }))
    .sort((left, right) => right.totalDamage - left.totalDamage);
}

function calculateDeathTimeBuckets(rows) {
  const buckets = {
    '0-120s': 0,
    '120-240s': 0,
    '240-300s': 0,
    '300s+': 0,
  };

  for (const row of rows.filter((candidate) => candidate.resultType === 'gameOver')) {
    const survivalTime = parseNumberSafe(row.survivalTime);

    if (survivalTime === null) {
      continue;
    }

    if (survivalTime < 120) {
      buckets['0-120s'] += 1;
    } else if (survivalTime < 240) {
      buckets['120-240s'] += 1;
    } else if (survivalTime < 300) {
      buckets['240-300s'] += 1;
    } else {
      buckets['300s+'] += 1;
    }
  }

  return buckets;
}

function buildSuggestedChecks(victory, boss, endless) {
  const checks = [
    'Compare only rows with matching csvSchemaVersion and contentHash.',
    'Review death time buckets before changing early-game values.',
  ];

  if (victory.victoryRate > 0.85) {
    checks.push('Victory rate is high; inspect Boss phase damage and late-wave pressure.');
  }

  if (boss.bossDashHitRate !== null && boss.bossDashHitRate > 0.25) {
    checks.push('Boss dash hit rate is above target range; verify dash pressure before increasing it.');
  }

  if (
    boss.bossSpawnRate !== null
    && boss.bossSpawnRate > 0
    && boss.averageBossDamageDealt !== null
    && boss.averageBossDamageDealt < 500
  ) {
    checks.push('Boss appears but average boss damage dealt is low; inspect output positioning before more survival tuning.');
  }

  if (endless.averageEndlessRewardCount !== null && endless.averageEndlessRewardCount > 100) {
    checks.push('Endless reward count is high; inspect EXP requirement scaling and treasure pacing.');
  }

  return checks;
}

function averageField(rows, field) {
  const values = rows
    .map((row) => parseNumberSafe(row[field]))
    .filter((value) => value !== null);

  if (values.length === 0) {
    return null;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function maxField(rows, field) {
  const values = rows
    .map((row) => parseNumberSafe(row[field]))
    .filter((value) => value !== null);

  return values.length === 0 ? null : Math.max(...values);
}

function sumField(rows, field) {
  return rows.reduce((total, row) => total + (parseNumberSafe(row[field]) ?? 0), 0);
}

function parseStatList(value) {
  if (!value) {
    return [];
  }

  return value
    .split('|')
    .map((entry) => {
      const separatorIndex = entry.lastIndexOf(':');
      if (separatorIndex <= 0) {
        return null;
      }

      const parsedValue = parseNumberSafe(entry.slice(separatorIndex + 1));
      return parsedValue === null ? null : [entry.slice(0, separatorIndex), parsedValue];
    })
    .filter((entry) => entry !== null);
}

function hasListValue(value) {
  return Boolean(value && value.split('|').some((entry) => entry.trim().length > 0));
}

function formatReport(report) {
  return [
    '# Playtest Balance Report',
    '',
    '## Data Overview',
    `- Total runs: ${report.totalRuns}`,
    `- Schema/content groups: ${report.schemaGroups.length}`,
    ...report.schemaGroups.map((group) => (
      `  - schema=${group.csvSchemaVersion}, contentHash=${shortHash(group.contentHash)}: ${group.runCount} runs`
    )),
    '',
    '## Normal Mode',
    `- Victory: ${report.victory.victoryCount}`,
    `- GameOver: ${report.victory.gameOverCount}`,
    `- Victory rate: ${percent(report.victory.victoryRate)}`,
    `- Average survival time: ${duration(report.averageSurvivalTime)}`,
    `- Average final level: ${number(report.averageFinalLevel)}`,
    `- Average kills: ${number(report.averageKillCount)}`,
    `- Evolution rate: ${percent(report.evolutionRate)}`,
    `- Death time distribution: ${formatRecord(report.deathTimeBuckets)}`,
    '',
    '## Boss Phase',
    `- Boss spawn rate: ${percent(report.boss.bossSpawnRate)}`,
    `- Boss kill rate: ${percent(report.boss.bossKillRate)}`,
    `- Boss dash hit rate: ${percent(report.boss.bossDashHitRate)}`,
    `- Average boss phase damage: ${number(report.boss.averageBossPhaseDamage)}`,
    `- Average boss damage dealt: ${number(report.boss.averageBossDamageDealt)}`,
    '',
    '## Endless Mode',
    `- Endless entry rate: ${percent(report.endless.endlessStartedRate)}`,
    `- Average endless survival: ${duration(report.endless.averageEndlessSurvivalTime)}`,
    `- Max endless survival: ${duration(report.endless.maxEndlessSurvivalTime)}`,
    `- Average endless rewards: ${number(report.endless.averageEndlessRewardCount)}`,
    `- Average endless level interval: ${duration(report.endless.averageEndlessLevelIntervalSeconds)}`,
    `- Reward usage: ${formatRecord(report.endless.rewardBreakdown)}`,
    '',
    '## Treasures',
    `- Average drops: ${number(report.treasure.averageTreasureDrops)}`,
    `- Average opens: ${number(report.treasure.averageTreasureOpens)}`,
    `- Average endless drops: ${number(report.treasure.averageEndlessTreasureDrops)}`,
    `- Average endless opens: ${number(report.treasure.averageEndlessTreasureOpens)}`,
    '',
    '## Weapons',
    ...formatWeapons(report.weapons),
    '',
    '## Warnings',
    ...(report.warnings.length === 0 ? ['- None'] : report.warnings.map((warning) => `- ${warning}`)),
    '',
    '## Suggested Checks',
    ...report.suggestedChecks.map((check) => `- ${check}`),
  ].join('\n');
}

function formatWeapons(weapons) {
  if (weapons.length === 0) {
    return ['- No weapon damage stats found.'];
  }

  return weapons
    .slice(0, 12)
    .map((weapon) => `- ${weapon.weaponId}: ${Math.round(weapon.totalDamage)} damage (${percent(weapon.damageShare)})`);
}

function percent(value) {
  return value === null ? 'n/a' : `${(value * 100).toFixed(1)}%`;
}

function number(value) {
  return value === null ? 'n/a' : value.toFixed(1);
}

function duration(value) {
  if (value === null) {
    return 'n/a';
  }

  const seconds = Math.max(0, Math.round(value));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
}

function shortHash(value) {
  return value.length > 12 ? value.slice(0, 12) : value;
}

function formatRecord(record) {
  return Object.entries(record)
    .map(([key, value]) => `${key}=${value}`)
    .join(', ');
}
