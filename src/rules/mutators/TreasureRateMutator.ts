import { Mutator } from '../Mutator';
import { TreasureRateMutatorConfig } from '../MutatorConfig';
import { MutatorContext } from '../MutatorContext';

export class TreasureRateMutator implements Mutator {
  readonly id: string;
  readonly type = 'treasureRate';

  constructor(private readonly config: TreasureRateMutatorConfig) {
    this.id = config.id ?? config.type;
  }

  applyTreasureDropChance(baseChance: number, _context: MutatorContext): number {
    return Math.max(0, Math.min(1, baseChance * this.config.treasureDropMultiplier));
  }
}
