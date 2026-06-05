import { PlayerHealth } from '../player/PlayerHealth';

export type CharacterLevelUpEffectType =
  | 'healLostHpPercent'
  | 'temporaryMoveSpeed'
  | 'temporaryWeaponDamage'
  | 'gainShield'
  | 'none';

export interface CharacterLevelUpEffectConfig {
  type: CharacterLevelUpEffectType;
  lostHpRatio?: number;
  durationMs?: number;
  multiplier?: number;
  shieldStacks?: number;
}

export interface CharacterLevelUpEffectContext {
  playerHealth: PlayerHealth;
}

export interface CharacterLevelUpEffectResult {
  healAmount: number;
}

export interface CharacterLevelUpEffect {
  readonly type: CharacterLevelUpEffectType;
  apply(context: CharacterLevelUpEffectContext): CharacterLevelUpEffectResult;
}

export class NoneCharacterLevelUpEffect implements CharacterLevelUpEffect {
  readonly type = 'none';

  apply(): CharacterLevelUpEffectResult {
    return { healAmount: 0 };
  }
}

export class HealLostHpPercentLevelUpEffect implements CharacterLevelUpEffect {
  readonly type = 'healLostHpPercent';

  constructor(private readonly config: CharacterLevelUpEffectConfig) {}

  apply(context: CharacterLevelUpEffectContext): CharacterLevelUpEffectResult {
    const healAmount = context.playerHealth.healLostHpRatio(this.config.lostHpRatio ?? 0);

    return { healAmount };
  }
}
