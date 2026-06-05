export interface SelectionState {
  characterId: string;
  stageId: string;
  mapId: string;
  difficultyId?: string;
  challengeId?: string;
  customStageId?: string;
  seed?: string;
  rulesetId?: string;
  challengeDateKey?: string;
}

export const RANDOM_UNLOCKED_CHARACTER_ID = 'random_unlocked';

export const DEFAULT_SELECTION_STATE: SelectionState = {
  characterId: RANDOM_UNLOCKED_CHARACTER_ID,
  stageId: 'stage_001',
  mapId: 'prototype_field',
  difficultyId: 'normal',
};
