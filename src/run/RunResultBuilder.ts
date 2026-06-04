import { PlaytestLog } from '../logging/PlaytestLog';
import { PlaytestLogBuffer } from '../logging/PlaytestLogBuffer';
import { EndlessLeaderboard } from '../endless/EndlessLeaderboard';
import { ExpManager } from '../progression/ExpManager';
import { LevelManager } from '../progression/LevelManager';
import { UpgradeSelectionModeLog } from '../logging/PlaytestLog';
import { PassiveManager } from '../passive/PassiveManager';
import { PlayerHealth } from '../player/PlayerHealth';
import { PlayerStats } from '../player/PlayerStats';
import { RunStats } from '../stats/RunStats';
import { WeaponManager } from '../weapon/WeaponManager';

import { RunState } from './RunState';

export interface BossResultState {
  bossSpawned: boolean;
  bossKilled: boolean;
  bossSpawnTime: number;
  bossKillTime: number;
}

export interface RunResultBuildContext {
  runId: string;
  autoMode: boolean;
  fastMode: boolean;
  timeScale: number;
  upgradeSelectionMode: UpgradeSelectionModeLog;
  resultType: 'gameOver' | 'victory';
  survivalTime: number;
  evolutionCandidateStats: string;
  runState: RunState;
  runStats: RunStats;
  weaponManager?: WeaponManager;
  passiveManager?: PassiveManager;
  playerStats?: PlayerStats;
  playerHealth?: PlayerHealth;
  levelManager?: LevelManager;
  expManager?: ExpManager;
  bossState: BossResultState;
}

export class RunResultBuilder {
  build(context: RunResultBuildContext) {
    const weaponIds = context.weaponManager?.getWeaponIds() ?? [];
    const passiveItems = context.passiveManager?.getPassiveLevels() ?? [];
    const weaponDamageStats = context.weaponManager?.getWeaponDamageStats() ?? [];
    const runStatsSummary = context.runStats.getSummary();
    const finalLevel = context.levelManager?.currentLevel ?? 1;
    const finalExp = context.expManager?.totalExp ?? 0;
    const finalMoveSpeed = context.playerStats?.moveSpeed ?? 0;
    const finalPickupRange = context.playerStats?.pickupRange ?? 0;
    const finalMaxHp = context.playerHealth?.maxHp ?? context.playerStats?.maxHp ?? 0;
    const bossFightDuration = this.getBossFightDuration(context);
    const endlessLeaderboardRank = this.updateEndlessLeaderboard({
      runState: context.runState,
      survivalTime: context.survivalTime,
      finalLevel,
      killCount: context.runState.killCount,
      weaponIds,
      passiveItems,
    });
    const postEvolutionDuration = context.runState.evolutionTime === null
      ? 0
      : Math.max(0, context.survivalTime - context.runState.evolutionTime);
    const playtestCsv = PlaytestLog.createCsv({
      runId: context.runId,
      runSeed: context.runState.runSeed,
      timestamp: new Date().toISOString(),
      autoMode: context.autoMode,
      fastMode: context.fastMode,
      timeScale: context.timeScale,
      upgradeSelectionMode: context.upgradeSelectionMode,
      resultType: context.resultType,
      survivalTime: context.survivalTime,
      finalLevel,
      finalExp,
      killCount: context.runState.killCount,
      treasureDropCount: context.runState.treasureDropCount,
      treasureOpenCount: context.runState.treasureOpenCount,
      treasureUpgradePath: context.runState.treasureUpgradePath,
      evolutionPath: context.runState.evolutionPath,
      evolutionCandidateStats: context.evolutionCandidateStats,
      evolutionTime: context.runState.evolutionTime,
      postEvolutionDuration,
      bossSpawned: context.bossState.bossSpawned,
      bossKilled: context.bossState.bossKilled,
      bossSpawnTime: context.bossState.bossSpawnTime,
      bossKillTime: context.bossState.bossKillTime,
      bossFightDuration,
      bossPhaseDamageTaken: context.runState.bossPhaseDamageTaken,
      bossPhaseLowestHp: context.runState.bossPhaseLowestHp,
      bossPhaseKills: context.runState.bossPhaseKills,
      bossDashCount: context.runState.bossDashCount,
      bossDashHitCount: context.runState.bossDashHitCount,
      totalUpgradeCount: context.runState.totalUpgradeCount,
      totalRewardCount: context.runState.totalRewardCount,
      levelUpUpgradeCount: context.runState.levelUpUpgradeCount,
      chestUpgradeCount: context.runState.chestUpgradeCount,
      chestEvolutionCount: context.runState.chestEvolutionCount,
      duplicateOrInvalidUpgradeCount: context.runState.duplicateOrInvalidUpgradeCount,
      endlessMode: context.runState.endlessMode,
      endlessStarted: context.runState.endlessStarted,
      endlessSurvivalTime: context.runState.endlessSurvivalTime,
      endlessEnemyKills: context.runState.endlessEnemyKills,
      endlessDamageTaken: context.runState.endlessDamageTaken,
      endlessTreasureDropCount: context.runState.endlessTreasureDropCount,
      endlessTreasureOpenCount: context.runState.endlessTreasureOpenCount,
      endlessLeaderboardRank,
      endlessScalingLevel: context.runState.endlessScalingLevel,
      endlessHpMultiplier: context.runState.endlessHpMultiplier,
      endlessDamageMultiplier: context.runState.endlessDamageMultiplier,
      endlessSpeedMultiplier: context.runState.endlessSpeedMultiplier,
      endlessExpMultiplier: context.runState.endlessExpMultiplier,
      endlessRewardCount: context.runState.endlessRewardCount,
      endlessHealCount: context.runState.endlessHealCount,
      endlessOverdriveCount: context.runState.endlessOverdriveCount,
      endlessGrowthCount: context.runState.endlessGrowthCount,
      endlessPermanentDamageMultiplier: context.runState.endlessPermanentDamageMultiplier,
      endlessMaxOverdriveStacksReached: context.runState.endlessMaxOverdriveStacksReached,
      endlessOverdriveActiveTime: context.runState.endlessOverdriveActiveTime,
      endlessEnemySlowCount: context.runState.endlessEnemySlowCount,
      endlessEnemySlowActiveTime: context.runState.endlessEnemySlowActiveTime,
      endlessShieldGained: context.runState.endlessShieldGained,
      endlessShieldConsumed: context.runState.endlessShieldConsumed,
      endlessShieldRemaining: context.runState.endlessShieldRemaining,
      endlessShieldAbsorbedDamage: context.runState.endlessShieldAbsorbedDamage,
      endlessBossSpawnCount: context.runState.endlessBossSpawnCount,
      endlessBossKillCount: context.runState.endlessBossKillCount,
      endlessBossDamageTakenByPlayer: context.runState.endlessBossDamageTakenByPlayer,
      endlessBossDamageDealtToPlayer: context.runState.endlessBossDamageDealtToPlayer,
      endlessBossIdsKilled: context.runState.endlessBossIdsKilled,
      endlessBossIdsSpawned: context.runState.endlessBossIdsSpawned,
      endlessBossSkillHitCount: context.runState.endlessBossSkillHitCount,
      endlessBossSkillUseCount: context.runState.endlessBossSkillUseCount,
      maxSimultaneousEndlessBosses: context.runState.maxSimultaneousEndlessBosses,
      activeEndlessBossCountAtDeath: context.runState.activeEndlessBossCountAtDeath,
      endlessBossSpawnSkippedBySoftCapCount: context.runState.endlessBossSpawnSkippedBySoftCapCount,
      finalExpRequirementMultiplier: context.runState.finalExpRequirementMultiplier,
      maxExpRequirementMultiplier: context.runState.maxExpRequirementMultiplier,
      endlessLevelUpCount: context.runState.endlessLevelUpCount,
      averageEndlessLevelIntervalSeconds: context.runState.averageEndlessLevelIntervalSeconds,
      difficultyId: context.runState.difficultyId,
      mutatorIds: context.runState.mutatorIds,
      rulesetId: context.runState.rulesetId,
      finalMoveSpeed,
      finalPickupRange,
      finalMaxHp,
      weaponIds,
      passiveItems,
      upgradePath: context.runState.upgradePath,
      weaponDamageStats,
      damageTaken: runStatsSummary.damageTaken,
      lowestHp: runStatsSummary.lowestHp,
      weaponHitStats: runStatsSummary.weaponHitStats,
      weaponKillStats: runStatsSummary.weaponKillStats,
      upgradeCountStats: runStatsSummary.upgradeCountStats,
    });

    PlaytestLogBuffer.append(playtestCsv);

    return {
      resultType: context.resultType,
      survivalTime: context.survivalTime,
      finalLevel,
      finalExp,
      killCount: context.runState.killCount,
      treasureDropCount: context.runState.treasureDropCount,
      treasureOpenCount: context.runState.treasureOpenCount,
      treasureUpgradePath: context.runState.treasureUpgradePath,
      evolutionPath: context.runState.evolutionPath,
      evolutionCandidateStats: context.evolutionCandidateStats,
      evolutionTime: context.runState.evolutionTime,
      postEvolutionDuration,
      bossSpawned: context.bossState.bossSpawned,
      bossKilled: context.bossState.bossKilled,
      bossSpawnTime: context.bossState.bossSpawnTime,
      bossKillTime: context.bossState.bossKillTime,
      bossFightDuration,
      bossPhaseDamageTaken: context.runState.bossPhaseDamageTaken,
      bossPhaseLowestHp: context.runState.bossPhaseLowestHp,
      bossPhaseKills: context.runState.bossPhaseKills,
      bossDashCount: context.runState.bossDashCount,
      bossDashHitCount: context.runState.bossDashHitCount,
      totalUpgradeCount: context.runState.totalUpgradeCount,
      totalRewardCount: context.runState.totalRewardCount,
      levelUpUpgradeCount: context.runState.levelUpUpgradeCount,
      chestUpgradeCount: context.runState.chestUpgradeCount,
      chestEvolutionCount: context.runState.chestEvolutionCount,
      duplicateOrInvalidUpgradeCount: context.runState.duplicateOrInvalidUpgradeCount,
      endlessMode: context.runState.endlessMode,
      endlessStarted: context.runState.endlessStarted,
      endlessSurvivalTime: context.runState.endlessSurvivalTime,
      endlessEnemyKills: context.runState.endlessEnemyKills,
      endlessDamageTaken: context.runState.endlessDamageTaken,
      endlessTreasureDropCount: context.runState.endlessTreasureDropCount,
      endlessTreasureOpenCount: context.runState.endlessTreasureOpenCount,
      endlessLeaderboardRank,
      endlessScalingLevel: context.runState.endlessScalingLevel,
      endlessHpMultiplier: context.runState.endlessHpMultiplier,
      endlessDamageMultiplier: context.runState.endlessDamageMultiplier,
      endlessSpeedMultiplier: context.runState.endlessSpeedMultiplier,
      endlessExpMultiplier: context.runState.endlessExpMultiplier,
      endlessRewardCount: context.runState.endlessRewardCount,
      endlessHealCount: context.runState.endlessHealCount,
      endlessOverdriveCount: context.runState.endlessOverdriveCount,
      endlessGrowthCount: context.runState.endlessGrowthCount,
      endlessPermanentDamageMultiplier: context.runState.endlessPermanentDamageMultiplier,
      endlessMaxOverdriveStacksReached: context.runState.endlessMaxOverdriveStacksReached,
      endlessOverdriveActiveTime: context.runState.endlessOverdriveActiveTime,
      endlessEnemySlowCount: context.runState.endlessEnemySlowCount,
      endlessEnemySlowActiveTime: context.runState.endlessEnemySlowActiveTime,
      endlessShieldGained: context.runState.endlessShieldGained,
      endlessShieldConsumed: context.runState.endlessShieldConsumed,
      endlessShieldRemaining: context.runState.endlessShieldRemaining,
      endlessShieldAbsorbedDamage: context.runState.endlessShieldAbsorbedDamage,
      endlessBossSpawnCount: context.runState.endlessBossSpawnCount,
      endlessBossKillCount: context.runState.endlessBossKillCount,
      endlessBossDamageTakenByPlayer: context.runState.endlessBossDamageTakenByPlayer,
      endlessBossDamageDealtToPlayer: context.runState.endlessBossDamageDealtToPlayer,
      endlessBossIdsKilled: context.runState.endlessBossIdsKilled,
      endlessBossIdsSpawned: context.runState.endlessBossIdsSpawned,
      endlessBossSkillHitCount: context.runState.endlessBossSkillHitCount,
      endlessBossSkillUseCount: context.runState.endlessBossSkillUseCount,
      maxSimultaneousEndlessBosses: context.runState.maxSimultaneousEndlessBosses,
      activeEndlessBossCountAtDeath: context.runState.activeEndlessBossCountAtDeath,
      endlessBossSpawnSkippedBySoftCapCount: context.runState.endlessBossSpawnSkippedBySoftCapCount,
      finalExpRequirementMultiplier: context.runState.finalExpRequirementMultiplier,
      maxExpRequirementMultiplier: context.runState.maxExpRequirementMultiplier,
      endlessLevelUpCount: context.runState.endlessLevelUpCount,
      averageEndlessLevelIntervalSeconds: context.runState.averageEndlessLevelIntervalSeconds,
      difficultyId: context.runState.difficultyId,
      mutatorIds: context.runState.mutatorIds,
      rulesetId: context.runState.rulesetId,
      finalMoveSpeed,
      finalPickupRange,
      finalMaxHp,
      endlessLeaderboardEntries: EndlessLeaderboard.getEntries(),
      weaponIds,
      passiveItems,
      weaponDamageStats,
      damageTaken: runStatsSummary.damageTaken,
      lowestHp: runStatsSummary.lowestHp,
      weaponHitStats: runStatsSummary.weaponHitStats,
      weaponKillStats: runStatsSummary.weaponKillStats,
      upgradeCountStats: runStatsSummary.upgradeCountStats,
      runId: context.runId,
      runSeed: context.runState.runSeed,
      autoMode: context.autoMode,
      fastMode: context.fastMode,
      timeScale: context.timeScale,
      upgradeSelectionMode: context.upgradeSelectionMode,
      upgradePath: context.runState.upgradePath,
      playtestCsv,
      bufferedRunsCount: PlaytestLogBuffer.getCount(),
    };
  }

  private getBossFightDuration(context: RunResultBuildContext): number {
    if (!context.bossState.bossSpawned) {
      return 0;
    }

    return Math.max(
      0,
      (context.bossState.bossKilled ? context.bossState.bossKillTime : context.survivalTime)
        - context.bossState.bossSpawnTime,
    );
  }

  private updateEndlessLeaderboard(context: {
    runState: RunState;
    survivalTime: number;
    finalLevel: number;
    killCount: number;
    weaponIds: string[];
    passiveItems: ReturnType<PassiveManager['getPassiveLevels']>;
  }): number {
    if (!context.runState.endlessStarted) {
      context.runState.recordEndlessLeaderboardRank(null);
      return 0;
    }

    const rank = EndlessLeaderboard.add({
      timestamp: new Date().toISOString(),
      endlessSurvivalTime: context.runState.endlessSurvivalTime,
      totalSurvivalTime: context.survivalTime,
      finalLevel: context.finalLevel,
      killCount: context.killCount,
      weaponIds: context.weaponIds,
      passiveItems: context.passiveItems,
      evolutionPath: context.runState.evolutionPath,
    });

    context.runState.recordEndlessLeaderboardRank(rank);
    return rank ?? 0;
  }
}
