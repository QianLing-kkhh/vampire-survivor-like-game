import { WeaponTagQuery } from '../../weapon/tags/WeaponTagQuery';
import { RelicEffect, WeaponTagDamageRelicEffectConfig } from '../RelicEffect';
import { RelicEffectContext } from '../RelicEffectContext';

export class WeaponTagRelicEffect implements RelicEffect {
  readonly type = 'weaponTagDamage';

  constructor(private readonly config: WeaponTagDamageRelicEffectConfig) {}

  modifyWeaponDamage(
    weaponId: string,
    baseValue: number,
    context: RelicEffectContext,
  ): number {
    const tags = context.weaponManager?.getWeaponTags(weaponId) ?? [];

    return WeaponTagQuery.hasAnyTag(tags, this.config.tags)
      ? baseValue * this.config.multiplier
      : baseValue;
  }
}
