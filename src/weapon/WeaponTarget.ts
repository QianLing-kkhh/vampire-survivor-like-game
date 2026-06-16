import type { DamageTargetContext } from '../combat/DamageCalculator';
import type { EnemyQuery } from '../enemy/EnemyQuery';

export interface WeaponTarget extends EnemyQuery {
  getDamageTargetContext(): DamageTargetContext;
}
