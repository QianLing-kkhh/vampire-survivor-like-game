import type { RunMetadata } from '../run/RunMetadata';

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

export class LeaderboardKeyFactory {
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
}
