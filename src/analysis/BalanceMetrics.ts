import { PlaytestCsvRow } from './PlaytestCsvParser';
import {
  BossMetrics,
  EndlessMetrics,
  SchemaGroupSummary,
  TreasureMetrics,
  VictoryMetrics,
  WeaponMetric,
} from './BalanceReport';

export function parseNumberSafe(value: string | undefined): number | null {
  if (value === undefined || value.trim() === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseBooleanSafe(value: string | undefined): boolean | null {
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

export function parseDuration(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  if (!value.includes(':')) {
    return parseNumberSafe(value);
  }

  const parts = value.split(':').map((part) => Number(part));

  if (parts.some((part) => !Number.isFinite(part))) {
    return null;
  }

  return parts.reduce((total, part) => total * 60 + part, 0);
}

export function groupBySchema(rows: PlaytestCsvRow[]): SchemaGroupSummary[] {
  const groups = new Map<string, SchemaGroupSummary>();

  for (const row of rows) {
    const csvSchemaVersion = row.csvSchemaVersion || row.schemaVersion || 'unknown';
    const contentHash = row.contentHash || 'unknown';
    const key = `${csvSchemaVersion}|${contentHash}`;
    const group = groups.get(key) ?? {
      key,
      csvSchemaVersion,
      contentHash,
      runCount: 0,
    };

    group.runCount += 1;
    groups.set(key, group);
  }

  return Array.from(groups.values());
}

export function calculateVictoryRate(rows: PlaytestCsvRow[]): VictoryMetrics {
  const victoryCount = rows.filter((row) => row.resultType === 'victory').length;
  const gameOverCount = rows.filter((row) => row.resultType === 'gameOver').length;

  return {
    totalRuns: rows.length,
    victoryCount,
    gameOverCount,
    victoryRate: rows.length === 0 ? 0 : victoryCount / rows.length,
  };
}

export function calculateBossMetrics(rows: PlaytestCsvRow[]): BossMetrics {
  const bossSpawnedRows = rows.filter((row) => parseBooleanSafe(row.bossSpawned) === true);
  const bossKilledRows = rows.filter((row) => parseBooleanSafe(row.bossKilled) === true);
  const dashUses = sumField(rows, 'bossDashCount');
  const dashHits = sumField(rows, 'bossDashHitCount');

  return {
    bossSpawnRate: rows.length === 0 ? null : bossSpawnedRows.length / rows.length,
    bossKillRate: bossSpawnedRows.length === 0 ? null : bossKilledRows.length / bossSpawnedRows.length,
    bossDashHitRate: dashUses === 0 ? null : dashHits / dashUses,
    averageBossPhaseDamage: averageField(rows, 'bossPhaseDamageTaken'),
  };
}

export function calculateEndlessMetrics(rows: PlaytestCsvRow[]): EndlessMetrics {
  const endlessRows = rows.filter((row) => parseBooleanSafe(row.endlessStarted) === true);
  const rewardBreakdown = {
    heal: sumField(rows, 'endlessHealCount'),
    overdrive: sumField(rows, 'endlessOverdriveCount'),
    growth: sumField(rows, 'endlessGrowthCount'),
    enemySlow: sumField(rows, 'endlessEnemySlowCount'),
  };

  return {
    endlessStartedRate: rows.length === 0 ? null : endlessRows.length / rows.length,
    averageEndlessSurvivalTime: averageField(endlessRows, 'endlessSurvivalTime'),
    maxEndlessSurvivalTime: maxField(endlessRows, 'endlessSurvivalTime'),
    averageEndlessRewardCount: averageField(endlessRows, 'endlessRewardCount'),
    averageEndlessLevelIntervalSeconds: averageField(endlessRows, 'averageEndlessLevelIntervalSeconds'),
    rewardBreakdown,
  };
}

export function calculateTreasureMetrics(rows: PlaytestCsvRow[]): TreasureMetrics {
  return {
    averageTreasureDrops: averageField(rows, 'treasureDropCount'),
    averageTreasureOpens: averageField(rows, 'treasureOpenCount'),
    averageEndlessTreasureDrops: averageField(rows, 'endlessTreasureDropCount'),
    averageEndlessTreasureOpens: averageField(rows, 'endlessTreasureOpenCount'),
  };
}

export function calculateWeaponMetrics(rows: PlaytestCsvRow[]): WeaponMetric[] {
  const totals = new Map<string, number>();

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

export function averageField(rows: PlaytestCsvRow[], field: string): number | null {
  const values = rows
    .map((row) => parseNumberSafe(row[field]))
    .filter((value): value is number => value !== null);

  if (values.length === 0) {
    return null;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function maxField(rows: PlaytestCsvRow[], field: string): number | null {
  const values = rows
    .map((row) => parseNumberSafe(row[field]))
    .filter((value): value is number => value !== null);

  return values.length === 0 ? null : Math.max(...values);
}

export function sumField(rows: PlaytestCsvRow[], field: string): number {
  return rows.reduce((total, row) => total + (parseNumberSafe(row[field]) ?? 0), 0);
}

export function parseStatList(value: string | undefined): Array<[string, number]> {
  if (!value) {
    return [];
  }

  return value
    .split('|')
    .map((entry): [string, number] | null => {
      const separatorIndex = entry.lastIndexOf(':');
      if (separatorIndex <= 0) {
        return null;
      }

      const key = entry.slice(0, separatorIndex);
      const parsedValue = parseNumberSafe(entry.slice(separatorIndex + 1));
      return parsedValue === null ? null : [key, parsedValue];
    })
    .filter((entry): entry is [string, number] => entry !== null);
}
