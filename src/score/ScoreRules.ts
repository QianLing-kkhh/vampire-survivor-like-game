export type ScoreSource = 'normalEnemy' | 'miniBoss' | 'finalBoss' | 'treasure';

export const SCORE_RULES = {
  normalEnemyKill: 1,
  miniBossKill: 300,
  finalBossKill: 1000,
  treasureOpen: 100,
} as const;
