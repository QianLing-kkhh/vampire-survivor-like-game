import Phaser from 'phaser';

import { BossSkill } from './BossSkill';
import { BossSkillContext } from './BossSkillContext';
import { SummonSkillConfig } from './BossSkillConfig';

export class SummonSkill implements BossSkill {
  readonly type = 'summon' as const;

  private cooldownRemainingMs: number;

  constructor(private readonly config: SummonSkillConfig) {
    this.cooldownRemainingMs = config.initialDelayMs ?? config.cooldownMs;
  }

  update(deltaMs: number, context: BossSkillContext): void {
    if (this.config.enabled === false || context.boss.isDead) {
      return;
    }

    this.cooldownRemainingMs -= deltaMs;
    if (this.cooldownRemainingMs > 0) {
      return;
    }

    this.activate(context);
    this.cooldownRemainingMs = this.config.cooldownMs;
  }

  clear(): void {
    // Summon has no persistent visuals.
  }

  private activate(context: BossSkillContext): void {
    context.runState.recordEndlessBossSkillUse();
    const summons = this.config.summons.flatMap((summon) => (
      Array<string>(Math.max(0, summon.count)).fill(summon.enemyId)
    ));
    const ringRadius = this.config.ringRadius ?? 180;
    const bossX = context.boss.body.x;
    const bossY = context.boss.body.y;

    summons.forEach((enemyId, index) => {
      const angle = (Math.PI * 2 * index) / Math.max(1, summons.length);
      context.spawnEnemy(
        enemyId,
        bossX + Math.cos(angle) * ringRadius,
        bossY + Math.sin(angle) * ringRadius,
        { useEndlessScaling: this.config.useEndlessScaling },
      );
    });

    const circle = context.scene.add.circle(bossX, bossY, ringRadius + 30, 0xaa44ff, 0.22)
      .setStrokeStyle(4, 0xaa44ff, 0.75)
      .setDepth(35);
    context.scene.tweens.add({
      targets: circle,
      alpha: 0,
      scale: 1.25,
      duration: 220,
      onComplete: () => circle.destroy(),
    });
  }
}
