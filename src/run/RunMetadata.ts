import type {
  AutoChallengeType,
  RunControlMode,
  StrategySpeedBucket,
} from '../runtime/RunModeConfig';

export interface RunMetadata {
  runId: string;
  runSeed: string;
  replayId?: string;
  gameVersion: string;
  contentHash: string;
  saveSchemaVersion: number;
  csvSchemaVersion: number;
  replaySchemaVersion?: number;
  customStageSchemaVersion?: number;
  selectedCharacterId?: string;
  characterSelectionMode?: 'fixed' | 'random_unlocked';
  characterId: string;
  selectedStageId?: string;
  stageSelectionMode?: 'fixed' | 'random_unlocked';
  stageId: string;
  mapId: string;
  difficultyId?: string;
  customStageId?: string;
  customStageContentHash?: string;
  challengeId?: string;
  challengeType?: string;
  challengeDate?: string;
  rulesetId?: string;
  seed?: string;
  leaderboardKey?: string;
  controlMode?: RunControlMode;
  autoChallengeType?: AutoChallengeType;
  strategyProfileId?: string;
  strategyProfileHash?: string;
  simulationSpeedMultiplier?: number;
  speedBucket?: StrategySpeedBucket;
}

export function createDefaultRunMetadata(): RunMetadata {
  return {
    runId: '',
    runSeed: '',
    gameVersion: '',
    contentHash: '',
    saveSchemaVersion: 0,
    csvSchemaVersion: 0,
    replaySchemaVersion: 0,
    customStageSchemaVersion: 0,
    selectedCharacterId: 'default',
    characterSelectionMode: 'fixed',
    characterId: 'default',
    selectedStageId: 'random_unlocked_stage',
    stageSelectionMode: 'random_unlocked',
    stageId: 'stage_001',
    mapId: 'prototype_field',
    difficultyId: 'normal',
    rulesetId: 'normal',
  };
}
