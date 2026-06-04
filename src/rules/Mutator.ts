import { EnemyStats } from '../enemy/Enemy';

import { MutatorContext } from './MutatorContext';

export interface Mutator {
  readonly id: string;
  readonly type: string;

  applyEnemyStats?(stats: EnemyStats, context: MutatorContext): EnemyStats;
  applyBossStats?(stats: EnemyStats, context: MutatorContext): EnemyStats;
  applySpawnRate?(baseInterval: number, context: MutatorContext): number;
  applyTreasureDropChance?(baseChance: number, context: MutatorContext): number;
  applyExpValue?(baseExp: number, context: MutatorContext): number;
  applyFinalBossSpawnTime?(baseSeconds: number, context: MutatorContext): number;
  filterWeaponPool?(weaponIds: string[], context: MutatorContext): string[];

  getDisplayNameKey?(): string;
  getDescriptionKey?(): string;
}
