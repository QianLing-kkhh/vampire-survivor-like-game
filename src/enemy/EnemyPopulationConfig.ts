export interface EnemyPopulationConfig {
  mergeEnabled: boolean;
  minAliveEnemies: number;
  mergeMaxLevel: number;
  spawnMergeLockMs: number;
  mergeCooldownMs: number;
  mergeCheckCooldownMs: number;
  mergeMovementLockMs: number;
  mergeContactDamageImmunityMs: number;
  maxMergesPerFrame: number;
  mergeScaleGrowthPerLevel: number;
  fallbackEnemyId: string;
}

export const ENEMY_POPULATION_CONFIG: EnemyPopulationConfig = {
  mergeEnabled: true,
  minAliveEnemies: 5,
  mergeMaxLevel: 3,
  spawnMergeLockMs: 1500,
  mergeCooldownMs: 3000,
  mergeCheckCooldownMs: 500,
  mergeMovementLockMs: 3000,
  mergeContactDamageImmunityMs: 500,
  maxMergesPerFrame: 8,
  mergeScaleGrowthPerLevel: 0.18,
  fallbackEnemyId: 'slime',
};
