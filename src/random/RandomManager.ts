import { RandomSource } from './RandomSource';
import { SeededRandom } from './SeededRandom';

type RandomStreamName =
  | 'gameplay'
  | 'upgrade'
  | 'spawn'
  | 'treasure'
  | 'endless'
  | 'boss'
  | 'visual';

export class RandomManager {
  private readonly root: RandomSource;
  private readonly streams = new Map<RandomStreamName | string, RandomSource>();

  constructor(private readonly seed: string) {
    this.root = new SeededRandom(seed);
  }

  getRunSeed(): string {
    return this.seed;
  }

  getRoot(): RandomSource {
    return this.root;
  }

  getSource(name: RandomStreamName | string): RandomSource {
    const existingStream = this.streams.get(name);

    if (existingStream) {
      return existingStream;
    }

    const stream = this.root.fork(name);

    this.streams.set(name, stream);
    return stream;
  }

  getGameplayRandom(): RandomSource {
    return this.getSource('gameplay');
  }

  getUpgradeRandom(): RandomSource {
    return this.getSource('upgrade');
  }

  getSpawnRandom(): RandomSource {
    return this.getSource('spawn');
  }

  getTreasureRandom(): RandomSource {
    return this.getSource('treasure');
  }

  getEndlessRandom(): RandomSource {
    return this.getSource('endless');
  }

  getBossRandom(): RandomSource {
    return this.getSource('boss');
  }

  getVisualRandom(): RandomSource {
    return this.getSource('visual');
  }
}
