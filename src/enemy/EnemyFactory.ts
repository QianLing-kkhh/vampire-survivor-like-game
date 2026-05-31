import Phaser from 'phaser';

import { Enemy, EnemyStats } from './Enemy';

type EnemyConfigMap = Record<string, EnemyStats>;

export class EnemyFactory {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly enemyConfigs: EnemyConfigMap,
  ) {}

  create(enemyId: string, x: number, y: number): Enemy {
    const stats = this.enemyConfigs[enemyId];

    if (!stats) {
      throw new Error(`Unknown enemy id: ${enemyId}`);
    }

    return new Enemy(this.scene, enemyId, stats, x, y);
  }
}
