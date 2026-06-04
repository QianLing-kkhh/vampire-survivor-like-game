export type EnemyModifierType =
  | 'fast'
  | 'shielded'
  | 'explosive'
  | 'splitOnDeath';

export interface BaseEnemyModifierConfig {
  type: EnemyModifierType;
  id?: string;
  strength?: number;
}

export interface FastModifierConfig extends BaseEnemyModifierConfig {
  type: 'fast';
  speedMultiplier?: number;
}

export interface ShieldedModifierConfig extends BaseEnemyModifierConfig {
  type: 'shielded';
  shieldHp?: number;
}

export interface ExplosiveModifierConfig extends BaseEnemyModifierConfig {
  type: 'explosive';
  explosionRadius?: number;
  explosionDamage?: number;
}

export interface SplitOnDeathModifierConfig extends BaseEnemyModifierConfig {
  type: 'splitOnDeath';
  spawnEnemyId: string;
  count: number;
}

export type EnemyModifierConfig =
  | FastModifierConfig
  | ShieldedModifierConfig
  | ExplosiveModifierConfig
  | SplitOnDeathModifierConfig;
