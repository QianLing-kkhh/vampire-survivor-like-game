import Phaser from 'phaser';

import { AssetKeyResolver } from '../assets/AssetKeyResolver';
import { ContentBootstrap } from '../content/ContentBootstrap';
import { ContentRegistry } from '../content/ContentRegistry';
import type { EnemyStats } from '../core/domain/EnemyTypes';
import { RunRuleSet } from '../rules/RunRuleSet';
import { VisualScale } from '../visual/VisualScale';

import { Enemy } from './Enemy';
import { EnemyModifierConfig } from './modifiers/EnemyModifierConfig';
import { EnemyModifierFactory } from './modifiers/EnemyModifierFactory';
import { EnemyModifierRuntime } from './modifiers/EnemyModifierRuntime';

type EnemyConfigMap = Record<string, EnemyStats>;
export interface EnemyCreateOptions {
  modifiers?: EnemyModifierConfig[];
}

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
    private readonly runRuleSet?: RunRuleSet,
  ) {
    ContentBootstrap.ensureInitialized();
    this.enemyConfigs = enemyConfigs ?? ContentRegistry.listEnemies();
  }

  private readonly enemyConfigs: EnemyConfigMap;

  create(
    enemyId: string,
    x: number,
    y: number,
    statsOverrideOrOptions?: EnemyStats | EnemyCreateOptions,
    options?: EnemyCreateOptions,
  ): Enemy {
    const baseStats = this.enemyConfigs[enemyId];
    const statsOverride = this.isEnemyCreateOptions(statsOverrideOrOptions)
      ? undefined
      : statsOverrideOrOptions;
    const createOptions = this.isEnemyCreateOptions(statsOverrideOrOptions)
      ? statsOverrideOrOptions
      : options;

    if (!baseStats && !statsOverride) {
      throw new Error(`Unknown enemy id: ${enemyId}`);
    }

    const modifierRuntime = new EnemyModifierRuntime(
      EnemyModifierFactory.createMany(createOptions?.modifiers),
    );
    const modifiedStats = modifierRuntime.applyStats({
      ...(baseStats ?? statsOverride as EnemyStats),
      ...(statsOverride ?? {}),
    });
    const stats = this.applyRunRules(enemyId, modifiedStats);
    const enemy = new Enemy(this.scene, enemyId, stats, x, y);
    enemy.setModifierRuntime(modifierRuntime);
    const textureKey = AssetKeyResolver.getEnemyTextureKey(this.scene, enemyId);
    const animationKey = AssetKeyResolver.getEnemyAnimationKey(this.scene, enemyId);

    if (textureKey) {
      const body = this.createArtBody(enemyId, stats, x, y, textureKey, animationKey);

      enemy.body.destroy();
      (enemy as unknown as { body: EnemyImageBody | EnemySpriteBody }).body = body;
      enemy.refreshShadow();

      return enemy;
    }

    return enemy;
  }

  private isEnemyCreateOptions(value: EnemyStats | EnemyCreateOptions | undefined): value is EnemyCreateOptions {
    return value !== undefined && 'modifiers' in value;
  }

  getEnemyStats(enemyId: string): EnemyStats {
    const stats = this.enemyConfigs[enemyId];

    if (!stats) {
      throw new Error(`Unknown enemy id: ${enemyId}`);
    }

    return { ...stats };
  }

  private applyRunRules(enemyId: string, stats: EnemyStats): EnemyStats {
    if (!this.runRuleSet) {
      return stats;
    }

    const ruleStats = enemyId === 'boss' || stats.bossLike === true || enemyId.endsWith('_boss')
      ? this.runRuleSet.applyBossStats(stats)
      : this.runRuleSet.applyEnemyStats(stats);

    return {
      ...ruleStats,
      exp: this.runRuleSet.applyExpValue(ruleStats.exp),
    };
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
    const displaySize = VisualScale.getEnemyDisplaySize(enemyId, scale)
      * VisualScale.getEnemyVisualDisplayMultiplier(enemyId);

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
