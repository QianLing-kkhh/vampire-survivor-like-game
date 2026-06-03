import Phaser from 'phaser';

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
    private readonly enemyConfigs: EnemyConfigMap,
  ) {}

  create(enemyId: string, x: number, y: number, statsOverride?: EnemyStats): Enemy {
    const stats = statsOverride ?? this.enemyConfigs[enemyId];

    if (!stats) {
      throw new Error(`Unknown enemy id: ${enemyId}`);
    }

    const enemy = new Enemy(this.scene, enemyId, stats, x, y);
    const artTextureKey = this.getArtTextureKey(enemyId);

    if (artTextureKey && this.scene.textures.exists(artTextureKey)) {
      const body = this.createArtBody(enemyId, stats, x, y, artTextureKey);

      enemy.body.destroy();
      (enemy as unknown as { body: EnemyImageBody | EnemySpriteBody }).body = body;

      return enemy;
    }

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
  ): EnemyImageBody | EnemySpriteBody {
    const scale = stats.scale ?? 1;
    const displaySize = 24 * scale;

    if (this.isAnimatedEnemy(enemyId)) {
      const body = this.scene.add.sprite(x, y, textureKey) as EnemySpriteBody;
      body.setDisplaySize(displaySize, displaySize);
      body.play(this.getArtAnimationKey(enemyId));
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

  private isAnimatedEnemy(enemyId: string): boolean {
    return enemyId === 'slime'
      || enemyId === 'bat'
      || enemyId === 'golem'
      || enemyId === 'boss';
  }

  private getArtTextureKey(enemyId: string): string | undefined {
    switch (enemyId) {
      case 'slime':
        return 'art_enemies_slime_walk_sheet';
      case 'bat':
        return 'art_enemies_bat_fly_sheet';
      case 'golem':
        return 'art_enemies_golem_walk_sheet';
      case 'boss':
        return 'art_enemies_boss_lava_beast_idle_sheet';
      case 'slime_boss':
        return 'slime_boss';
      case 'bat_boss':
        return 'bat_boss';
      case 'golem_boss':
        return 'golem_boss';
      default:
        return undefined;
    }
  }

  private getArtAnimationKey(enemyId: string): string {
    switch (enemyId) {
      case 'slime':
        return 'art_slime_walk';
      case 'bat':
        return 'art_bat_fly';
      case 'golem':
        return 'art_golem_walk';
      case 'boss':
        return 'art_boss_lava_beast_idle';
      default:
        return `${this.getArtTextureKey(enemyId) ?? enemyId}_anim`;
    }
  }
}
