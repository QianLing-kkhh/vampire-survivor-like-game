import { Mutator } from '../Mutator';
import { SpawnRateMutatorConfig } from '../MutatorConfig';
import { MutatorContext } from '../MutatorContext';

export class SpawnRateMutator implements Mutator {
  readonly id: string;
  readonly type = 'spawnRate';

  constructor(private readonly config: SpawnRateMutatorConfig) {
    this.id = config.id ?? config.type;
  }

  applySpawnRate(baseInterval: number, _context: MutatorContext): number {
    return baseInterval / Math.max(0.001, this.config.spawnRateMultiplier);
  }
}
