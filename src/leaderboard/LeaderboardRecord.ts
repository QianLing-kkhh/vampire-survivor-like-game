export interface LeaderboardRecord {
  id: string;
  timestamp: string;
  mode: string;
  survivalTime: number;
  endlessSurvivalTime?: number;
  finalLevel: number;
  killCount: number;
  characterId: string;
  stageId: string;
  mapId: string;
  seed?: string;
  weaponIds: string[];
  passiveItems: string[];
  evolutionPath: string[];
  metadata?: Record<string, unknown>;
}
