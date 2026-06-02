import Phaser from 'phaser';

import { Enemy } from './Enemy';

export interface Position {
  x: number;
  y: number;
}

export class EnemyMovement {
  private static readonly SEPARATION_RADIUS = 32;
  private static readonly SEPARATION_SPEED = 45;

  private readonly trackedEnemies = new Set<Enemy>();

  moveToward(enemy: Enemy, target: Position, deltaMs: number): void {
    this.trackEnemy(enemy);

    const direction = new Phaser.Math.Vector2(
      target.x - enemy.body.x,
      target.y - enemy.body.y,
    );

    if (direction.lengthSq() === 0) {
      return;
    }

    direction.normalize();

    const distance = enemy.moveSpeed * (deltaMs / 1000);
    enemy.body.x += direction.x * distance;
    enemy.body.y += direction.y * distance;
    this.applySeparation(enemy, deltaMs);
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
    const separation = new Phaser.Math.Vector2(0, 0);

    for (const otherEnemy of this.trackedEnemies) {
      if (otherEnemy === enemy || otherEnemy.isDead || !otherEnemy.body.active) {
        continue;
      }

      const offset = new Phaser.Math.Vector2(
        enemy.body.x - otherEnemy.body.x,
        enemy.body.y - otherEnemy.body.y,
      );
      const distanceSq = offset.lengthSq();

      if (distanceSq >= EnemyMovement.SEPARATION_RADIUS ** 2) {
        continue;
      }

      if (distanceSq === 0) {
        offset.set(1, 0);
      } else {
        offset.normalize();
      }

      const distance = Math.sqrt(distanceSq);
      const strength = 1 - distance / EnemyMovement.SEPARATION_RADIUS;
      separation.add(offset.scale(strength));
    }

    if (separation.lengthSq() === 0) {
      return;
    }

    separation.normalize().scale(EnemyMovement.SEPARATION_SPEED * (deltaMs / 1000));
    enemy.body.x += separation.x;
    enemy.body.y += separation.y;
  }
}
