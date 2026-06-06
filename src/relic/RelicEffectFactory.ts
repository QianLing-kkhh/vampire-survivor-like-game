import { DamageRuleRelicEffect } from './effects/DamageRuleRelicEffect';
import { DefenseRelicEffect } from './effects/DefenseRelicEffect';
import { TreasureRelicEffect } from './effects/TreasureRelicEffect';
import { WeaponTagRelicEffect } from './effects/WeaponTagRelicEffect';
import {
  DamageTakenRelicEffectConfig,
  EventTriggeredRelicEffectConfig,
  RelicEffect,
  RelicEffectConfig,
  TreasureRateRelicEffectConfig,
  WeaponTagDamageRelicEffectConfig,
} from './RelicEffect';

export class RelicEffectFactory {
  static create(config: RelicEffectConfig): RelicEffect | null {
    switch (config.type) {
      case 'treasureRate':
        return new TreasureRelicEffect(config as TreasureRateRelicEffectConfig);
      case 'weaponTagDamage':
        return new WeaponTagRelicEffect(config as WeaponTagDamageRelicEffectConfig);
      case 'damageTaken':
        return new DamageRuleRelicEffect(config as DamageTakenRelicEffectConfig);
      case 'eventTriggered':
        return new DefenseRelicEffect(config as EventTriggeredRelicEffectConfig);
      case 'lowHealthDamageModifier':
      case 'pickupRangeModifier':
      case 'treasureScoreBonus':
      case 'onDamageTakenCounter':
      case 'timedSlowPulse':
        return null;
      default:
        console.warn(`Unknown relic effect type skipped: ${config.type}`);
        return null;
    }
  }

  static createMany(configs: readonly RelicEffectConfig[]): RelicEffect[] {
    return configs
      .map((config) => this.create(config))
      .filter((effect): effect is RelicEffect => effect !== null);
  }
}
