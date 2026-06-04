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

export const DEFAULT_SELECTION_STATE: SelectionState = {
  characterId: 'default',
  stageId: 'stage_001',
  mapId: 'prototype_field',
  difficultyId: 'normal',
};
