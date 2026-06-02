import Phaser from 'phaser';

import { Enemy, EnemyStats } from './Enemy';

type EnemyConfigMap = Record<string, EnemyStats>;
type EnemyImageBody = Phaser.GameObjects.Image & {
  radius: number;
  setFillStyle: (color: number) => EnemyImageBody;
};

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

    const enemy = new Enemy(this.scene, enemyId, stats, x, y);
    const textureKey = enemyId === 'boss' ? 'boss_lava_beast' : enemyId;

    if (!this.scene.textures.exists(textureKey)) {
      return enemy;
    }

    const scale = stats.scale ?? 1;
    const body = this.scene.add.image(x, y, textureKey) as EnemyImageBody;
    body.setDisplaySize(24 * scale, 24 * scale);
    body.radius = 12 * scale;
    body.setFillStyle = () => body;

    enemy.body.destroy();
    (enemy as unknown as { body: EnemyImageBody }).body = body;

    return enemy;
  }
}
