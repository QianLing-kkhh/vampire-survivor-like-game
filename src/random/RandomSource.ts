export interface RandomSource {
  next(): number;
  nextFloat(min: number, max: number): number;
  nextInt(minInclusive: number, maxInclusive: number): number;
  chance(probability: number): boolean;
  pick<T>(items: readonly T[]): T | undefined;
  weightedPick<T>(items: readonly T[], getWeight: (item: T) => number): T | undefined;
  shuffle<T>(items: readonly T[]): T[];
  fork(label: string): RandomSource;
  getSeed(): string;
}
