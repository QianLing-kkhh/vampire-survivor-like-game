export interface SimulationResult {
  seed: string;
  characterId: string;
  stageId: string;
  mapId: string;
  difficultyId: string;
  strategyProfileId: string;
  strategyProfileHash: string;
  durationSeconds: number;
  tickMs: number;
  result: 'gameOver' | 'completed';
  survivalTimeSeconds: number;
  level: number;
  kills: number;
  exp: number;
  score: number;
  damageDealt: number;
  damageTaken: number;
  pickupsCollected: number;
  enemiesSpawned: number;
}
