export type MutatorType =
  | 'enemyStat'
  | 'spawnRate'
  | 'treasureRate'
  | 'expRate'
  | 'bossTiming'
  | 'weaponPool';

export interface BaseMutatorConfig {
  type: MutatorType | string;
  id?: string;
  enabled?: boolean;
}

export interface EnemyStatMutatorConfig extends BaseMutatorConfig {
  type: 'enemyStat';
  enemyHpMultiplier?: number;
  enemyDamageMultiplier?: number;
  enemySpeedMultiplier?: number;
}

export interface SpawnRateMutatorConfig extends BaseMutatorConfig {
  type: 'spawnRate';
  spawnRateMultiplier: number;
}

export interface TreasureRateMutatorConfig extends BaseMutatorConfig {
  type: 'treasureRate';
  treasureDropMultiplier: number;
}

export interface ExpRateMutatorConfig extends BaseMutatorConfig {
  type: 'expRate';
  expMultiplier: number;
}

export interface BossTimingMutatorConfig extends BaseMutatorConfig {
  type: 'bossTiming';
  finalBossSpawnTimeMultiplier?: number;
  finalBossSpawnTimeOffsetSeconds?: number;
  warningBeforeBossOffsetSeconds?: number;
}

export interface WeaponPoolMutatorConfig extends BaseMutatorConfig {
  type: 'weaponPool';
  allowedWeaponIds?: string[];
  bannedWeaponIds?: string[];
  requiredTags?: string[];
  bannedTags?: string[];
}

export type MutatorConfig =
  | EnemyStatMutatorConfig
  | SpawnRateMutatorConfig
  | TreasureRateMutatorConfig
  | ExpRateMutatorConfig
  | BossTimingMutatorConfig
  | WeaponPoolMutatorConfig
  | BaseMutatorConfig;
