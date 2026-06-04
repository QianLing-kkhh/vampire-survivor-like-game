import Phaser from 'phaser';

import { RandomSource } from './RandomSource';

export function clampProbability(probability: number): number {
  return Math.max(0, Math.min(1, probability));
}

export function randomAngle(random: RandomSource): number {
  return random.nextFloat(0, Math.PI * 2);
}

export function randomPointOnCircle(random: RandomSource, radius: number): Phaser.Math.Vector2 {
  const angle = randomAngle(random);

  return new Phaser.Math.Vector2(
    Math.cos(angle) * radius,
    Math.sin(angle) * radius,
  );
}

export function randomPointInCircle(random: RandomSource, radius: number): Phaser.Math.Vector2 {
  const angle = randomAngle(random);
  const distance = Math.sqrt(random.next()) * Math.max(0, radius);

  return new Phaser.Math.Vector2(
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
