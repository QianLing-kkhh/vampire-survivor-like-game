import {
  BlinkForwardDamageReactionSkill,
  CharacterDamageReactionConfig,
  CharacterDamageReactionSkill,
  HolySanctuaryDamageReactionSkill,
  NoneCharacterDamageReactionSkill,
  ShockwaveDamageReactionSkill,
  SlowTrailDamageReactionSkill,
} from './CharacterDamageReactionSkill';

export class CharacterDamageReactionFactory {
  static create(
    config: CharacterDamageReactionConfig | undefined,
  ): CharacterDamageReactionSkill {
    if (!config || config.type === 'none') {
      return new NoneCharacterDamageReactionSkill();
    }

    switch (config.type) {
      case 'shockwave':
        return new ShockwaveDamageReactionSkill(config);
      case 'blinkForward':
        return new BlinkForwardDamageReactionSkill(config);
      case 'slowTrail':
        return new SlowTrailDamageReactionSkill(config);
      case 'holySanctuary':
        return new HolySanctuaryDamageReactionSkill(config);
      case 'gainShield':
        console.warn(`Character damage reaction is reserved but not implemented: ${config.type}`);
        return new NoneCharacterDamageReactionSkill();
      default:
        console.warn(`Unknown character damage reaction: ${config.type}`);
        return new NoneCharacterDamageReactionSkill();
    }
  }
}
