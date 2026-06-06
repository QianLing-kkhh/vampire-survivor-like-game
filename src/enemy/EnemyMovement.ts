import Phaser from 'phaser';

import { Enemy } from './Enemy';

export interface Position {
  x: number;
  y: number;
}

export class EnemyMovement {
  private static readonly SEPARATION_RADIUS = 32;
  private static readonly SEPARATION_SPEED = 45;
  private static readonly GRID_CELL_SIZE = EnemyMovement.SEPARATION_RADIUS;

  private readonly trackedEnemies = new Set<Enemy>();
  private readonly spatialBuckets = new Map<string, Enemy[]>();
  private separationCandidateChecks = 0;
  private spatialEnemyCount = 0;

  prepareFrame(enemies: readonly Enemy[]): void {
    this.spatialBuckets.clear();
    this.separationCandidateChecks = 0;
    this.spatialEnemyCount = 0;
    this.trackedEnemies.clear();

    for (const enemy of enemies) {
      if (enemy.isDead || !enemy.body.active) {
        continue;
      }

      this.trackedEnemies.add(enemy);
      this.spatialEnemyCount += 1;
      const bucketKey = this.getBucketKeyForPosition(enemy.body.x, enemy.body.y);
      const bucket = this.spatialBuckets.get(bucketKey);

      if (bucket) {
        bucket.push(enemy);
        continue;
      }

      this.spatialBuckets.set(bucketKey, [enemy]);
    }
  }

  moveToward(enemy: Enemy, target: Position, deltaMs: number, speedMultiplier = 1): void {
    if (this.spatialEnemyCount === 0) {
      this.trackEnemy(enemy);
    }

    const direction = new Phaser.Math.Vector2(
      target.x - enemy.body.x,
      target.y - enemy.body.y,
    );

    if (direction.lengthSq() === 0) {
      return;
    }

    direction.normalize();

    const effectiveSpeedMultiplier = Math.max(0, speedMultiplier);
    const distance = enemy.moveSpeed * effectiveSpeedMultiplier * (deltaMs / 1000);
    enemy.body.x += direction.x * distance;
    enemy.body.y += direction.y * distance;
    this.applySeparation(enemy, deltaMs * effectiveSpeedMultiplier);
  }

  private trackEnemy(enemy: Enemy): void {
    this.trackedEnemies.add(enemy);

    for (const trackedEnemy of this.trackedEnemies) {
      if (!trackedEnemy.isDead && trackedEnemy.body.active) {
        continue;
      }

      this.trackedEnemies.delete(trackedEnemy);
    }
  }

  private applySeparation(enemy: Enemy, deltaMs: number): void {
    let separationX = 0;
    let separationY = 0;
    const separationRadiusSq = EnemyMovement.SEPARATION_RADIUS ** 2;

    for (const otherEnemy of this.getNearbyEnemies(enemy)) {
      this.separationCandidateChecks += 1;
      if (otherEnemy === enemy || otherEnemy.isDead || !otherEnemy.body.active) {
        continue;
      }

      let offsetX = enemy.body.x - otherEnemy.body.x;
      let offsetY = enemy.body.y - otherEnemy.body.y;
      const distanceSq = offsetX * offsetX + offsetY * offsetY;

      if (distanceSq >= separationRadiusSq) {
        continue;
      }

      if (distanceSq === 0) {
        offsetX = 1;
        offsetY = 0;
      } else {
        const offsetLength = Math.sqrt(distanceSq);
        offsetX /= offsetLength;
        offsetY /= offsetLength;
      }

      const distance = Math.sqrt(distanceSq);
      const strength = 1 - distance / EnemyMovement.SEPARATION_RADIUS;
      separationX += offsetX * strength;
      separationY += offsetY * strength;
    }

    const separationLengthSq = separationX * separationX + separationY * separationY;

    if (separationLengthSq === 0) {
      return;
    }

    const separationLength = Math.sqrt(separationLengthSq);
    const distance = EnemyMovement.SEPARATION_SPEED * (deltaMs / 1000);
    enemy.body.x += (separationX / separationLength) * distance;
    enemy.body.y += (separationY / separationLength) * distance;
  }

  getDebugStats(): {
    separationCandidateChecks: number;
    separationTrackedEnemyCount: number;
    separationBucketCount: number;
  } {
    return {
      separationCandidateChecks: this.separationCandidateChecks,
      separationTrackedEnemyCount: this.spatialEnemyCount || this.trackedEnemies.size,
      separationBucketCount: this.spatialBuckets.size,
    };
  }

  private getNearbyEnemies(enemy: Enemy): Enemy[] {
    if (this.spatialBuckets.size === 0) {
      return Array.from(this.trackedEnemies);
    }

    const cellX = this.getBucketCoordinate(enemy.body.x);
    const cellY = this.getBucketCoordinate(enemy.body.y);
    const nearbyEnemies: Enemy[] = [];

    for (let y = cellY - 1; y <= cellY + 1; y += 1) {
      for (let x = cellX - 1; x <= cellX + 1; x += 1) {
        const bucket = this.spatialBuckets.get(this.getBucketKey(x, y));

        if (!bucket) {
          continue;
        }

        nearbyEnemies.push(...bucket);
      }
    }

    return nearbyEnemies;
  }

  private getBucketKeyForPosition(x: number, y: number): string {
    return this.getBucketKey(this.getBucketCoordinate(x), this.getBucketCoordinate(y));
  }

  private getBucketCoordinate(value: number): number {
    return Math.floor(value / EnemyMovement.GRID_CELL_SIZE);
  }

  private getBucketKey(x: number, y: number): string {
    return `${x},${y}`;
  }
}
