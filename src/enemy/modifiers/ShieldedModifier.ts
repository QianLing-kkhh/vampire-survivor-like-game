import { EnemyModifier, EnemyModifierDamageContext, EnemyModifierDamageResult } from './EnemyModifier';
import { ShieldedModifierConfig } from './EnemyModifierConfig';

export class ShieldedModifier implements EnemyModifier {
  readonly type = 'shielded' as const;

  private shieldHp: number;

  constructor(config: ShieldedModifierConfig) {
    this.shieldHp = Math.max(0, config.shieldHp ?? 30);
  }

  beforeTakeDamage(context: EnemyModifierDamageContext): EnemyModifierDamageResult {
    if (this.shieldHp <= 0 || context.damage <= 0) {
      return { damage: context.damage };
    }

    const absorbed = Math.min(this.shieldHp, context.damage);
    this.shieldHp -= absorbed;

    return {
      damage: context.damage - absorbed,
      absorbed,
    };
  }

  getDisplayTags(): string[] {
    return this.shieldHp > 0 ? ['Shielded'] : [];
  }
}
