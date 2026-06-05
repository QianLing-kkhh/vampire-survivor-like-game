export interface SelectionState {
  characterId: string;
  stageId: string;
  selectedStageId?: string;
  mapId: string;
  difficultyId?: string;
  challengeId?: string;
  customStageId?: string;
  seed?: string;
  rulesetId?: string;
  challengeDateKey?: string;
}

export const RANDOM_UNLOCKED_CHARACTER_ID = 'random_unlocked';
export const RANDOM_UNLOCKED_STAGE_ID = 'random_unlocked_stage';

export const DEFAULT_SELECTION_STATE: SelectionState = {
  characterId: RANDOM_UNLOCKED_CHARACTER_ID,
  stageId: RANDOM_UNLOCKED_STAGE_ID,
  selectedStageId: RANDOM_UNLOCKED_STAGE_ID,
  mapId: 'prototype_field',
  difficultyId: 'normal',
};
