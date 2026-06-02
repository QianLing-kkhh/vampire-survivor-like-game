import { DamageType } from './DamageType';

export interface HitResult {
  damage: number;
  isCritical: boolean;
  damageType: DamageType;
}
