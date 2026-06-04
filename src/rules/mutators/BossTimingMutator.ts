import { Mutator } from '../Mutator';
import { BossTimingMutatorConfig } from '../MutatorConfig';
import { MutatorContext } from '../MutatorContext';

export class BossTimingMutator implements Mutator {
  readonly id: string;
  readonly type = 'bossTiming';

  constructor(private readonly config: BossTimingMutatorConfig) {
    this.id = config.id ?? config.type;
  }

  applyFinalBossSpawnTime(baseSeconds: number, _context: MutatorContext): number {
    const multiplied = baseSeconds * (this.config.finalBossSpawnTimeMultiplier ?? 1);
    const shifted = multiplied + (this.config.finalBossSpawnTimeOffsetSeconds ?? 0);

    return Math.max(30, shifted);
  }
}
