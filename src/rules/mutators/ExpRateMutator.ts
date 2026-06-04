import { Mutator } from '../Mutator';
import { ExpRateMutatorConfig } from '../MutatorConfig';
import { MutatorContext } from '../MutatorContext';

export class ExpRateMutator implements Mutator {
  readonly id: string;
  readonly type = 'expRate';

  constructor(private readonly config: ExpRateMutatorConfig) {
    this.id = config.id ?? config.type;
  }

  applyExpValue(baseExp: number, _context: MutatorContext): number {
    return Math.max(0, Math.round(baseExp * this.config.expMultiplier));
  }
}
