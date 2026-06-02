import Phaser from 'phaser';

import { Enemy, EnemyStats } from '../enemy/Enemy';

type EnemyConfigMap = Record<string, EnemyStats>;
type BossImageBody = Phaser.GameObjects.Image & {
  radius: number;
  setFillStyle: (color: number) => BossImageBody;
};

export class BossFactory {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly enemyConfigs: EnemyConfigMap,
  ) {}

  create(bossId: string, x: number, y: number): Enemy {
    const stats = this.enemyConfigs[bossId];

    if (!stats) {
      throw new Error(`Unknown boss id: ${bossId}`);
    }

    const boss = new Enemy(this.scene, bossId, stats, x, y);
    const textureKey = bossId.replace('_boss', '');

    if (!this.scene.textures.exists(textureKey)) {
      return boss;
    }

    const scale = stats.scale ?? 1;
    const body = this.scene.add.image(x, y, textureKey) as BossImageBody;
    body.setDisplaySize(24 * scale, 24 * scale);
    body.radius = 12 * scale;
    body.setFillStyle = () => body;

    boss.body.destroy();
    (boss as unknown as { body: BossImageBody }).body = body;

    return boss;
  }
}
