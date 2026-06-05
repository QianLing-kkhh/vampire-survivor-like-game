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
  characterId: string;
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
    characterId: 'default',
    stageId: 'stage_001',
    mapId: 'prototype_field',
    difficultyId: 'normal',
    rulesetId: 'normal',
  };
}
