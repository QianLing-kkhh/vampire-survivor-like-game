import {
  CharacterLevelUpEffect,
  CharacterLevelUpEffectConfig,
  HealLostHpPercentLevelUpEffect,
  NoneCharacterLevelUpEffect,
} from './CharacterLevelUpEffect';

export class CharacterEffectFactory {
  static createLevelUpEffect(
    config: CharacterLevelUpEffectConfig | undefined,
  ): CharacterLevelUpEffect {
    if (!config || config.type === 'none') {
      return new NoneCharacterLevelUpEffect();
    }

    switch (config.type) {
      case 'healLostHpPercent':
        return new HealLostHpPercentLevelUpEffect(config);
      case 'temporaryMoveSpeed':
      case 'temporaryWeaponDamage':
      case 'gainShield':
        console.warn(`Character level-up effect is reserved but not implemented: ${config.type}`);
        return new NoneCharacterLevelUpEffect();
      default:
        console.warn(`Unknown character level-up effect: ${config.type}`);
        return new NoneCharacterLevelUpEffect();
    }
  }
}
