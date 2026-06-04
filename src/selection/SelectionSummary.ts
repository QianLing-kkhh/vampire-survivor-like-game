export interface SelectionSummary {
  characterId: string;
  characterName: string;
  stageId: string;
  stageName: string;
  mapId: string;
  mapName: string;
  difficultyId?: string;
  seed?: string;
  valid: boolean;
  warnings: string[];
}
