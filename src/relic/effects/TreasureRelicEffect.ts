import { RelicEffect, TreasureRateRelicEffectConfig } from '../RelicEffect';
import { RelicEffectContext } from '../RelicEffectContext';

export class TreasureRelicEffect implements RelicEffect {
  readonly type = 'treasureRate';

  constructor(private readonly config: TreasureRateRelicEffectConfig) {}

  modifyTreasureDropChance(baseChance: number, _context: RelicEffectContext): number {
    const multiplier = this.config.multiplier ?? 1;
    const bonusChance = this.config.bonusChance ?? 0;

    return Math.max(0, Math.min(1, baseChance * multiplier + bonusChance));
  }
}
