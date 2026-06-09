import type { RunMetadata } from '../run/RunMetadata';
import type { RunModeConfig } from '../runtime/RunModeConfig';

import {
  createLeaderboardKey,
  LeaderboardKey,
  LeaderboardMode,
  serializeLeaderboardKey,
} from './LeaderboardKey';

export interface LeaderboardKeyFactoryOptions {
  mode?: LeaderboardMode;
  includeChallengeCustomModes?: boolean;
}

export interface LeaderboardKeyFactoryRunInput extends LeaderboardKeyFactoryOptions {
  runModeConfig: RunModeConfig;
  characterId: string;
  stageId: string;
  mapId: string;
  difficultyId?: string;
  seed?: string;
  challengeId?: string;
  customStageId?: string;
  rulesetId?: string;
}

export class LeaderboardKeyFactory {
  static createFromRun(input: LeaderboardKeyFactoryRunInput): LeaderboardKey {
    const isAutoStrategy = input.runModeConfig.controlMode === 'autoStrategy';

    return createLeaderboardKey({
      mode: input.mode ?? this.getModeFromRun(input),
      controlMode: isAutoStrategy ? 'autoStrategy' : 'manual',
      autoChallengeType: input.runModeConfig.autoChallengeType,
      characterId: input.characterId,
      stageId: input.stageId,
      mapId: input.mapId,
      difficultyId: input.difficultyId,
      seed: input.seed,
      challengeId: input.challengeId,
      customStageId: input.customStageId,
      rulesetId: input.rulesetId,
      strategyProfileHash: isAutoStrategy
        ? input.runModeConfig.strategyProfileHash
        : undefined,
      strategyControlType: isAutoStrategy
        ? input.runModeConfig.strategyControlType
        : undefined,
      speedBucket: input.runModeConfig.speedBucket,
    });
  }

  static serializeFromRun(input: LeaderboardKeyFactoryRunInput): string {
    return serializeLeaderboardKey(this.createFromRun(input));
  }

  static createFromMetadata(
    metadata: RunMetadata,
    options: LeaderboardKeyFactoryOptions = {},
  ): LeaderboardKey {
    return createLeaderboardKey({
      mode: options.mode ?? this.getMode(metadata, options),
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
      strategyControlType: metadata.controlMode === 'autoStrategy'
        ? metadata.strategyControlType
        : undefined,
      speedBucket: metadata.speedBucket,
    });
  }

  static serializeFromMetadata(
    metadata: RunMetadata,
    options: LeaderboardKeyFactoryOptions = {},
  ): string {
    return serializeLeaderboardKey(this.createFromMetadata(metadata, options));
  }

  private static getMode(
    metadata: RunMetadata,
    options: LeaderboardKeyFactoryOptions,
  ): LeaderboardMode {
    if (options.includeChallengeCustomModes !== false) {
      if (metadata.challengeId) {
        return 'challenge';
      }

      if (metadata.customStageId) {
        return 'custom';
      }
    }

    return metadata.autoChallengeType === 'scoreAttack'
      ? 'scoreAttack'
      : metadata.autoChallengeType === 'endless' ? 'endless' : 'normal';
  }

  private static getModeFromRun(input: LeaderboardKeyFactoryRunInput): LeaderboardMode {
    if (input.includeChallengeCustomModes !== false) {
      if (input.challengeId) {
        return 'challenge';
      }

      if (input.customStageId) {
        return 'custom';
      }
    }

    return input.runModeConfig.autoChallengeType === 'scoreAttack'
      ? 'scoreAttack'
      : input.runModeConfig.autoChallengeType === 'endless' ? 'endless' : 'normal';
  }
}
