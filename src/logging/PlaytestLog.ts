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
  totalRewardCount: number;
  levelUpUpgradeCount: number;
  chestUpgradeCount: number;
  chestEvolutionCount: number;
  duplicateOrInvalidUpgradeCount: number;
  endlessMode: boolean;
  endlessStarted: boolean;
  endlessSurvivalTime: number;
  endlessEnemyKills: number;
  endlessDamageTaken: number;
  endlessTreasureDropCount: number;
  endlessTreasureOpenCount: number;
  endlessLeaderboardRank: number;
  endlessScalingLevel: number;
  endlessHpMultiplier: number;
  endlessDamageMultiplier: number;
  endlessSpeedMultiplier: number;
  endlessExpMultiplier: number;
  endlessRewardCount: number;
  endlessHealCount: number;
  endlessOverdriveCount: number;
  endlessGrowthCount: number;
  endlessPermanentDamageMultiplier: number;
  endlessMaxOverdriveStacksReached: number;
  endlessOverdriveActiveTime: number;
  endlessEnemySlowCount: number;
  endlessEnemySlowActiveTime: number;
  endlessShieldGained: number;
  endlessShieldConsumed: number;
  endlessShieldRemaining: number;
  endlessShieldAbsorbedDamage: number;
  endlessBossSpawnCount: number;
  endlessBossKillCount: number;
  endlessBossDamageTakenByPlayer: number;
  endlessBossDamageDealtToPlayer: number;
  endlessBossIdsKilled: readonly string[];
  endlessBossIdsSpawned: readonly string[];
  endlessBossSkillHitCount: number;
  endlessBossSkillUseCount: number;
  finalMoveSpeed: number;
  finalPickupRange: number;
  finalMaxHp: number;
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
    'totalRewardCount',
    'levelUpUpgradeCount',
    'chestUpgradeCount',
    'chestEvolutionCount',
    'duplicateOrInvalidUpgradeCount',
    'endlessMode',
    'endlessStarted',
    'endlessSurvivalTime',
    'endlessEnemyKills',
    'endlessDamageTaken',
    'endlessTreasureDropCount',
    'endlessTreasureOpenCount',
    'endlessLeaderboardRank',
    'endlessScalingLevel',
    'endlessHpMultiplier',
    'endlessDamageMultiplier',
    'endlessSpeedMultiplier',
    'endlessExpMultiplier',
    'endlessRewardCount',
    'endlessHealCount',
    'endlessOverdriveCount',
    'endlessGrowthCount',
    'endlessPermanentDamageMultiplier',
    'endlessMaxOverdriveStacksReached',
    'endlessOverdriveActiveTime',
    'endlessEnemySlowCount',
    'endlessEnemySlowActiveTime',
    'endlessShieldGained',
    'endlessShieldConsumed',
    'endlessShieldRemaining',
    'endlessShieldAbsorbedDamage',
    'endlessBossSpawnCount',
    'endlessBossKillCount',
    'endlessBossDamageTakenByPlayer',
    'endlessBossDamageDealtToPlayer',
    'endlessBossIdsKilled',
    'endlessBossIdsSpawned',
    'endlessBossSkillHitCount',
    'endlessBossSkillUseCount',
    'finalMoveSpeed',
    'finalPickupRange',
    'finalMaxHp',
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
      data.totalRewardCount.toString(),
      data.levelUpUpgradeCount.toString(),
      data.chestUpgradeCount.toString(),
      data.chestEvolutionCount.toString(),
      data.duplicateOrInvalidUpgradeCount.toString(),
      data.endlessMode ? 'true' : 'false',
      data.endlessStarted ? 'true' : 'false',
      Math.floor(data.endlessSurvivalTime).toString(),
      data.endlessEnemyKills.toString(),
      Math.floor(data.endlessDamageTaken).toString(),
      data.endlessTreasureDropCount.toString(),
      data.endlessTreasureOpenCount.toString(),
      data.endlessLeaderboardRank.toString(),
      data.endlessScalingLevel.toString(),
      PlaytestLog.formatNumber(data.endlessHpMultiplier),
      PlaytestLog.formatNumber(data.endlessDamageMultiplier),
      PlaytestLog.formatNumber(data.endlessSpeedMultiplier),
      PlaytestLog.formatNumber(data.endlessExpMultiplier),
      data.endlessRewardCount.toString(),
      data.endlessHealCount.toString(),
      data.endlessOverdriveCount.toString(),
      data.endlessGrowthCount.toString(),
      PlaytestLog.formatNumber(data.endlessPermanentDamageMultiplier),
      data.endlessMaxOverdriveStacksReached.toString(),
      PlaytestLog.formatNumber(data.endlessOverdriveActiveTime),
      data.endlessEnemySlowCount.toString(),
      PlaytestLog.formatNumber(data.endlessEnemySlowActiveTime),
      data.endlessShieldGained.toString(),
      data.endlessShieldConsumed.toString(),
      data.endlessShieldRemaining.toString(),
      Math.floor(data.endlessShieldAbsorbedDamage).toString(),
      data.endlessBossSpawnCount.toString(),
      data.endlessBossKillCount.toString(),
      Math.floor(data.endlessBossDamageTakenByPlayer).toString(),
      Math.floor(data.endlessBossDamageDealtToPlayer).toString(),
      data.endlessBossIdsKilled.join('|'),
      data.endlessBossIdsSpawned.join('|'),
      data.endlessBossSkillHitCount.toString(),
      data.endlessBossSkillUseCount.toString(),
      PlaytestLog.formatNumber(data.finalMoveSpeed),
      PlaytestLog.formatNumber(data.finalPickupRange),
      PlaytestLog.formatNumber(data.finalMaxHp),
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

  private static formatNumber(value: number): string {
    return Number.isInteger(value)
      ? value.toString()
      : value.toFixed(2).replace(/\.?0+$/, '');
  }
}
