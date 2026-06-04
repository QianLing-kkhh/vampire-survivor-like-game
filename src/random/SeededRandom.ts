import { clampProbability } from './RandomUtils';
import { RandomSource } from './RandomSource';

export class SeededRandom implements RandomSource {
  private readonly seed: string;
  private state: number;

  constructor(seed: string) {
    this.seed = seed || 'default';
    this.state = SeededRandom.hashSeed(this.seed);
  }

  next(): number {
    this.state += 0x6d2b79f5;
    let value = this.state;

    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  nextFloat(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  nextInt(minInclusive: number, maxInclusive: number): number {
    const min = Math.ceil(Math.min(minInclusive, maxInclusive));
    const max = Math.floor(Math.max(minInclusive, maxInclusive));

    return Math.floor(this.nextFloat(min, max + 1));
  }

  chance(probability: number): boolean {
    return this.next() < clampProbability(probability);
  }

  pick<T>(items: readonly T[]): T | undefined {
    if (items.length === 0) {
      return undefined;
    }

    return items[this.nextInt(0, items.length - 1)];
  }

  weightedPick<T>(items: readonly T[], getWeight: (item: T) => number): T | undefined {
    const weightedItems = items
      .map((item) => ({ item, weight: Math.max(0, getWeight(item)) }))
      .filter((entry) => entry.weight > 0);

    if (weightedItems.length === 0) {
      return undefined;
    }

    const totalWeight = weightedItems.reduce((total, entry) => total + entry.weight, 0);
    let roll = this.nextFloat(0, totalWeight);

    for (const entry of weightedItems) {
      roll -= entry.weight;

      if (roll > 0) {
        continue;
      }

      return entry.item;
    }

    return weightedItems[weightedItems.length - 1].item;
  }

  shuffle<T>(items: readonly T[]): T[] {
    const shuffled = [...items];

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = this.nextInt(0, index);
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }

    return shuffled;
  }

  fork(label: string): RandomSource {
    return new SeededRandom(`${this.seed}:${label}`);
  }

  getSeed(): string {
    return this.seed;
  }

  private static hashSeed(seed: string): number {
    let hash = 1779033703 ^ seed.length;

    for (let index = 0; index < seed.length; index += 1) {
      hash = Math.imul(hash ^ seed.charCodeAt(index), 3432918353);
      hash = (hash << 13) | (hash >>> 19);
    }

    hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909);

    return (hash ^ (hash >>> 16)) >>> 0;
  }
}
