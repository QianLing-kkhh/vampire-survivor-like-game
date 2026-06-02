import { DamageType } from './DamageType';
import { HitResult } from './HitResult';

export class DamageCalculator {
  calculateDamage(
    baseDamage: number,
    damageType: DamageType = DamageType.Normal,
    isCritical = false,
  ): HitResult {
    return {
      damage: baseDamage,
      isCritical,
      damageType,
    };
  }
}
