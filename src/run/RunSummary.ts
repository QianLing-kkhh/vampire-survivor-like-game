export type RunSummaryResult = 'gameOver' | 'completed' | 'victory';

export interface RunSummary {
  result: RunSummaryResult;
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
