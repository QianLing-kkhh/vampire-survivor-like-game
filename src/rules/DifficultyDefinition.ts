export type DifficultyId = 'normal' | 'easy' | 'hard' | string;

export interface DifficultyDefinition {
  id: DifficultyId;
  nameKey: string;
  descriptionKey?: string;
  enemyHpMultiplier: number;
  enemyDamageMultiplier: number;
  enemySpeedMultiplier: number;
  spawnRateMultiplier: number;
  treasureDropMultiplier: number;
  expMultiplier: number;
  bossHpMultiplier: number;
  bossDamageMultiplier: number;
  bossSkillCooldownMultiplier: number;
  scoreMultiplier?: number;
}

export const BUILT_IN_DIFFICULTIES: Record<string, DifficultyDefinition> = {
  normal: {
    id: 'normal',
    nameKey: 'difficulty.normal',
    descriptionKey: 'difficulty.normal.description',
    enemyHpMultiplier: 1,
    enemyDamageMultiplier: 1,
    enemySpeedMultiplier: 1,
    spawnRateMultiplier: 1,
    treasureDropMultiplier: 1,
    expMultiplier: 1,
    bossHpMultiplier: 1,
    bossDamageMultiplier: 1,
    bossSkillCooldownMultiplier: 1,
    scoreMultiplier: 1,
  },
  easy: {
    id: 'easy',
    nameKey: 'difficulty.easy',
    descriptionKey: 'difficulty.easy.description',
    enemyHpMultiplier: 0.85,
    enemyDamageMultiplier: 0.85,
    enemySpeedMultiplier: 0.95,
    spawnRateMultiplier: 0.9,
    treasureDropMultiplier: 1.1,
    expMultiplier: 1,
    bossHpMultiplier: 0.9,
    bossDamageMultiplier: 0.9,
    bossSkillCooldownMultiplier: 1.1,
    scoreMultiplier: 0.8,
  },
  hard: {
    id: 'hard',
    nameKey: 'difficulty.hard',
    descriptionKey: 'difficulty.hard.description',
    enemyHpMultiplier: 1.25,
    enemyDamageMultiplier: 1.25,
    enemySpeedMultiplier: 1.05,
    spawnRateMultiplier: 1.15,
    treasureDropMultiplier: 0.9,
    expMultiplier: 1,
    bossHpMultiplier: 1.25,
    bossDamageMultiplier: 1.25,
    bossSkillCooldownMultiplier: 0.9,
    scoreMultiplier: 1.25,
  },
};

export const DEFAULT_DIFFICULTY_ID = 'normal';
