import Phaser from 'phaser';

import { AssetKeyResolver } from '../assets/AssetKeyResolver';
import { ContentBootstrap } from '../content/ContentBootstrap';
import { ContentRegistry } from '../content/ContentRegistry';
import { VisualScale } from '../visual/VisualScale';

import { Enemy, EnemyStats } from './Enemy';

type EnemyConfigMap = Record<string, EnemyStats>;
type EnemyImageBody = Phaser.GameObjects.Image & {
  radius: number;
  setFillStyle: (color: number) => EnemyImageBody;
};
type EnemySpriteBody = Phaser.GameObjects.Sprite & {
  radius: number;
  setFillStyle: (color: number) => EnemySpriteBody;
};

export class EnemyFactory {
  constructor(
    private readonly scene: Phaser.Scene,
    enemyConfigs?: EnemyConfigMap,
  ) {
    ContentBootstrap.ensureInitialized();
    this.enemyConfigs = enemyConfigs ?? ContentRegistry.listEnemies();
  }

  private readonly enemyConfigs: EnemyConfigMap;

  create(enemyId: string, x: number, y: number, statsOverride?: EnemyStats): Enemy {
    const stats = statsOverride ?? this.enemyConfigs[enemyId];

    if (!stats) {
      throw new Error(`Unknown enemy id: ${enemyId}`);
    }

    const enemy = new Enemy(this.scene, enemyId, stats, x, y);
    const textureKey = AssetKeyResolver.getEnemyTextureKey(this.scene, enemyId);
    const animationKey = AssetKeyResolver.getEnemyAnimationKey(this.scene, enemyId);

    if (textureKey) {
      const body = this.createArtBody(enemyId, stats, x, y, textureKey, animationKey);

      enemy.body.destroy();
      (enemy as unknown as { body: EnemyImageBody | EnemySpriteBody }).body = body;

      return enemy;
    }

    return enemy;
  }

  getEnemyStats(enemyId: string): EnemyStats {
    const stats = this.enemyConfigs[enemyId];

    if (!stats) {
      throw new Error(`Unknown enemy id: ${enemyId}`);
    }

    return { ...stats };
  }

  private createArtBody(
    enemyId: string,
    stats: EnemyStats,
    x: number,
    y: number,
    textureKey: string,
    animationKey: string | null,
  ): EnemyImageBody | EnemySpriteBody {
    const scale = stats.scale ?? 1;
    const displaySize = VisualScale.getEnemyDisplaySize(enemyId, scale);

    if (animationKey) {
      const body = this.scene.add.sprite(x, y, textureKey) as EnemySpriteBody;
      body.setDisplaySize(displaySize, displaySize);
      body.play(animationKey);
      body.radius = 12 * scale;
      body.setFillStyle = () => body;
      return body;
    }

    const body = this.scene.add.image(x, y, textureKey) as EnemyImageBody;
    body.setDisplaySize(displaySize, displaySize);
    body.radius = 12 * scale;
    body.setFillStyle = () => body;
    return body;
  }
}
