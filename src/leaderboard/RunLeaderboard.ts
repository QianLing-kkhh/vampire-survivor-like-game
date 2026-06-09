import type { PassiveLevel } from '../passive/PassiveItem';
import type { RunMetadata } from '../run/RunMetadata';
import type { RunState } from '../run/RunState';

import { createLeaderboardKey, LeaderboardKey } from './LeaderboardKey';
import { LeaderboardManager } from './LeaderboardManager';
import type { LeaderboardRecord } from './LeaderboardRecord';

export interface RunLeaderboardResult {
  key: LeaderboardKey;
  rank: number | null;
  records: LeaderboardRecord[];
}

export interface RunLeaderboardContext {
  runState: RunState;
  metadata: RunMetadata;
  resultType: 'gameOver' | 'victory';
  survivalTime: number;
  finalLevel: number;
  killCount: number;
  score: number;
  weaponIds: string[];
  passiveItems: PassiveLevel[];
  evolutionPath: string[];
}

export class RunLeaderboard {
  static addRunResult(context: RunLeaderboardContext): RunLeaderboardResult {
    const key = this.createKey(context);

    if (key.mode === 'normal' && context.resultType !== 'victory') {
      return {
        key,
        rank: null,
        records: LeaderboardManager.getRecords(key),
      };
    }

    const record = this.createRecord(context, key);
    const rank = LeaderboardManager.addRecord(key, record);

    return {
      key,
      rank,
      records: LeaderboardManager.getRecords(key),
    };
  }

  static getRecordsForMetadata(metadata: RunMetadata): LeaderboardRecord[] {
    return LeaderboardManager.getRecords(this.createKeyFromMetadata(metadata));
  }

  static createKeyFromMetadata(metadata: RunMetadata): LeaderboardKey {
    return createLeaderboardKey({
      mode: metadata.autoChallengeType === 'scoreAttack'
        ? 'scoreAttack'
        : metadata.autoChallengeType === 'endless' ? 'endless' : 'normal',
      controlMode: metadata.controlMode === 'autoStrategy' ? 'autoStrategy' : 'manual',
      autoChallengeType: metadata.autoChallengeType,
      characterId: metadata.characterId,
      stageId: metadata.stageId,
      mapId: metadata.mapId,
      difficultyId: metadata.difficultyId,
      seed: metadata.seed,
      challengeId: metadata.challengeId,
      customStageId: metadata.customStageId,
      rulesetId: metadata.rulesetId,
      strategyProfileHash: metadata.controlMode === 'autoStrategy'
        ? metadata.strategyProfileHash
        : undefined,
      speedBucket: metadata.speedBucket,
    });
  }

  private static createKey(context: RunLeaderboardContext): LeaderboardKey {
    if (context.runState.endlessStarted) {
      return createLeaderboardKey({
        ...this.createKeyFromMetadata(context.metadata),
        mode: 'endless',
      });
    }

    return this.createKeyFromMetadata(context.metadata);
  }

  private static createRecord(
    context: RunLeaderboardContext,
    key: LeaderboardKey,
  ): LeaderboardRecord {
    return {
      id: context.metadata.runId,
      runId: context.metadata.runId,
      runSeed: context.metadata.runSeed,
      gameVersion: context.metadata.gameVersion,
      contentHash: context.metadata.contentHash,
      timestamp: new Date().toISOString(),
      mode: key.mode,
      controlMode: key.controlMode,
      autoChallengeType: key.autoChallengeType,
      strategyProfileId: context.metadata.strategyProfileId,
      strategyProfileHash: key.strategyProfileHash,
      simulationSpeedMultiplier: context.metadata.simulationSpeedMultiplier,
      speedBucket: context.metadata.speedBucket,
      resultType: context.resultType,
      survivalTime: context.survivalTime,
      endlessSurvivalTime: context.runState.endlessSurvivalTime,
      score: context.score,
      finalLevel: context.finalLevel,
      killCount: context.killCount,
      characterId: key.characterId ?? 'default',
      stageId: key.stageId ?? 'stage_001',
      mapId: key.mapId ?? 'prototype_field',
      difficultyId: key.difficultyId,
      customStageId: key.customStageId,
      challengeId: key.challengeId,
      rulesetId: key.rulesetId,
      seed: key.seed,
      weaponIds: [...context.weaponIds],
      passiveItems: context.passiveItems.map((passive) => `${passive.name} Lv.${passive.level}`),
      evolutionPath: [...context.evolutionPath],
    };
  }
}
