import { DamageTakenRelicEffectConfig, RelicEffect } from '../RelicEffect';
import { RelicEffectContext } from '../RelicEffectContext';

export class DamageRuleRelicEffect implements RelicEffect {
  readonly type = 'damageTaken';

  constructor(private readonly config: DamageTakenRelicEffectConfig) {}

  modifyDamageTaken(incomingDamage: number, _context: RelicEffectContext): number {
    return Math.max(0, incomingDamage * this.config.multiplier);
  }
}
