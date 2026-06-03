import { WeaponDamageStat } from '../weapon/WeaponManager';
import { KeyValueStat } from '../stats/RunStats';
import { PassiveLevel } from '../passive/PassiveItem';

export type UpgradeSelectionModeLog = 'weighted_random';

export interface PlaytestLogData {
  runId: string;
  timestamp: string;
  autoMode: boolean;
  fastMode: boolean;
  timeScale: number;
  upgradeSelectionMode: UpgradeSelectionModeLog;
  resultType: 'gameOver' | 'victory';
  survivalTime: number;
  finalLevel: number;
  finalExp: number;
  killCount: number;
  treasureDropCount: number;
  treasureOpenCount: number;
  treasureUpgradePath: readonly string[];
  evolutionPath: readonly string[];
  evolutionCandidateStats: string;
  evolutionTime: number | null;
  postEvolutionDuration: number;
  bossSpawned: boolean;
  bossKilled: boolean;
  bossSpawnTime: number;
  bossKillTime: number;
  bossFightDuration: number;
  bossPhaseDamageTaken: number;
  bossPhaseLowestHp: number;
  bossPhaseKills: number;
  bossDashCount: number;
  bossDashHitCount: number;
  totalUpgradeCount: number;
  levelUpUpgradeCount: number;
  chestUpgradeCount: number;
  duplicateOrInvalidUpgradeCount: number;
  weaponIds: readonly string[];
  passiveItems: readonly PassiveLevel[];
  upgradePath: readonly string[];
  weaponDamageStats: readonly WeaponDamageStat[];
  damageTaken: number;
  lowestHp: number;
  weaponHitStats: readonly KeyValueStat[];
  weaponKillStats: readonly KeyValueStat[];
  upgradeCountStats: readonly KeyValueStat[];
}

export class PlaytestLog {
  private static readonly HEADER = [
    'runId',
    'timestamp',
    'autoMode',
    'fastMode',
    'timeScale',
    'upgradeSelectionMode',
    'resultType',
    'survivalTime',
    'finalLevel',
    'finalExp',
    'killCount',
    'treasureDropCount',
    'treasureOpenCount',
    'treasureUpgradePath',
    'evolutionPath',
    'evolutionCandidateStats',
    'evolutionTime',
    'postEvolutionDuration',
    'bossSpawned',
    'bossKilled',
    'bossSpawnTime',
    'bossKillTime',
    'bossFightDuration',
    'bossPhaseDamageTaken',
    'bossPhaseLowestHp',
    'bossPhaseKills',
    'bossDashCount',
    'bossDashHitCount',
    'totalUpgradeCount',
    'levelUpUpgradeCount',
    'chestUpgradeCount',
    'duplicateOrInvalidUpgradeCount',
    'weaponIds',
    'passiveItems',
    'upgradePath',
    'weaponDamageStats',
    'damageTaken',
    'lowestHp',
    'weaponHitStats',
    'weaponKillStats',
    'upgradeCountStats',
  ].join(',');

  static createRunId(): string {
    return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }

  static getHeader(): string {
    return PlaytestLog.HEADER;
  }

  static createCsv(data: PlaytestLogData): string {
    const values = [
      data.runId,
      data.timestamp,
      data.autoMode ? 'true' : 'false',
      data.fastMode ? 'true' : 'false',
      data.timeScale.toString(),
      data.upgradeSelectionMode,
      data.resultType,
      Math.floor(data.survivalTime).toString(),
      data.finalLevel.toString(),
      Math.floor(data.finalExp).toString(),
      data.killCount.toString(),
      data.treasureDropCount.toString(),
      data.treasureOpenCount.toString(),
      data.treasureUpgradePath.join('|'),
      data.evolutionPath.join('|'),
      data.evolutionCandidateStats,
      data.evolutionTime === null ? '' : Math.floor(data.evolutionTime).toString(),
      Math.floor(data.postEvolutionDuration).toString(),
      data.bossSpawned ? 'true' : 'false',
      data.bossKilled ? 'true' : 'false',
      Math.floor(data.bossSpawnTime).toString(),
      Math.floor(data.bossKillTime).toString(),
      Math.floor(data.bossFightDuration).toString(),
      Math.floor(data.bossPhaseDamageTaken).toString(),
      Math.floor(data.bossPhaseLowestHp).toString(),
      data.bossPhaseKills.toString(),
      data.bossDashCount.toString(),
      data.bossDashHitCount.toString(),
      data.totalUpgradeCount.toString(),
      data.levelUpUpgradeCount.toString(),
      data.chestUpgradeCount.toString(),
      data.duplicateOrInvalidUpgradeCount.toString(),
      data.weaponIds.join('|'),
      data.passiveItems
        .map((passive) => `${passive.id}:${passive.level}`)
        .join('|'),
      data.upgradePath.join('|'),
      PlaytestLog.formatWeaponDamageStats(data.weaponDamageStats),
      Math.floor(data.damageTaken).toString(),
      Math.floor(data.lowestHp).toString(),
      PlaytestLog.formatKeyValueStats(data.weaponHitStats),
      PlaytestLog.formatKeyValueStats(data.weaponKillStats),
      PlaytestLog.formatKeyValueStats(data.upgradeCountStats),
    ];

    return values.map(PlaytestLog.escapeCsvValue).join(',');
  }

  private static formatKeyValueStats(stats: readonly KeyValueStat[]): string {
    return PlaytestLog.mergeKeyValueStats(stats)
      .map((stat) => `${stat.key}:${Math.floor(stat.value)}`)
      .join('|');
  }

  private static formatWeaponDamageStats(stats: readonly WeaponDamageStat[]): string {
    const mergedStats = new Map<string, number>();

    for (const stat of stats) {
      mergedStats.set(
        stat.weaponId,
        (mergedStats.get(stat.weaponId) ?? 0) + stat.totalDamage,
      );
    }

    return Array.from(mergedStats.entries())
      .map(([weaponId, totalDamage]) => `${weaponId}:${Math.floor(totalDamage)}`)
      .join('|');
  }

  private static mergeKeyValueStats(stats: readonly KeyValueStat[]): KeyValueStat[] {
    const mergedStats = new Map<string, number>();

    for (const stat of stats) {
      mergedStats.set(stat.key, (mergedStats.get(stat.key) ?? 0) + stat.value);
    }

    return Array.from(mergedStats.entries()).map(([key, value]) => ({ key, value }));
  }

  private static escapeCsvValue(value: string): string {
    if (!/[",\n]/.test(value)) {
      return value;
    }

    return `"${value.replace(/"/g, '""')}"`;
  }
}
