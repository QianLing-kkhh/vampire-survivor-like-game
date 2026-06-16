import { Math2D } from '../core/domain/Math2D';
import { Vector2 } from '../core/domain/Vector2';
import { RandomSource } from './RandomSource';

export function clampProbability(probability: number): number {
  return Math2D.clamp(probability, 0, 1);
}

export function randomAngle(random: RandomSource): number {
  return random.nextFloat(0, Math.PI * 2);
}

export function randomPointOnCircle(random: RandomSource, radius: number): Vector2 {
  const angle = randomAngle(random);

  return new Vector2(
    Math.cos(angle) * radius,
    Math.sin(angle) * radius,
  );
}

export function randomPointInCircle(random: RandomSource, radius: number): Vector2 {
  const angle = randomAngle(random);
  const distance = Math.sqrt(random.next()) * Math.max(0, radius);

  return new Vector2(
    Math.cos(angle) * distance,
    Math.sin(angle) * distance,
  );
}

export function weightedChoice<T>(
  random: RandomSource,
  items: readonly T[],
  getWeight: (item: T) => number,
): T | undefined {
  return random.weightedPick(items, getWeight);
}
