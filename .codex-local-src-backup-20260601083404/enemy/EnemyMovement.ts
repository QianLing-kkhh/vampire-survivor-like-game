import Phaser from 'phaser';

import { Enemy } from './Enemy';

export interface Position {
  x: number;
  y: number;
}

export class EnemyMovement {
  moveToward(enemy: Enemy, target: Position, deltaMs: number): void {
    const direction = new Phaser.Math.Vector2(
      target.x - enemy.body.x,
      target.y - enemy.body.y,
    );

    if (direction.lengthSq() === 0) {
      return;
    }

    direction.normalize();

    const distance = enemy.moveSpeed * (deltaMs / (1000 / 60));
    enemy.body.x += direction.x * distance;
    enemy.body.y += direction.y * distance;
  }
}
