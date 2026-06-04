import Phaser from 'phaser';

import { BossSkill } from './BossSkill';
import { BossSkillContext } from './BossSkillContext';
import { ShockwaveSkillConfig } from './BossSkillConfig';

export class ShockwaveSkill implements BossSkill {
  readonly type = 'shockwave' as const;

  private cooldownRemainingMs: number;
  private warningRemainingMs = 0;
  private center = new Phaser.Math.Vector2();
  private warningCircle?: Phaser.GameObjects.Arc;

  constructor(private readonly config: ShockwaveSkillConfig) {
    this.cooldownRemainingMs = config.initialDelayMs ?? config.cooldownMs;
  }

  update(deltaMs: number, context: BossSkillContext): void {
    if (this.config.enabled === false || context.boss.isDead) {
      return;
    }

    if (this.warningRemainingMs > 0) {
      this.warningRemainingMs -= deltaMs;
      this.warningCircle?.setPosition(context.boss.body.x, context.boss.body.y);
      this.center.set(context.boss.body.x, context.boss.body.y);

      if (this.warningRemainingMs <= 0) {
        this.activate(context);
      }

      return;
    }

    this.cooldownRemainingMs -= deltaMs;
    if (this.cooldownRemainingMs <= 0) {
      this.startWarning(context);
    }
  }

  clear(): void {
    this.warningCircle?.destroy();
    this.warningCircle = undefined;
  }

  private startWarning(context: BossSkillContext): void {
    this.center.set(context.boss.body.x, context.boss.body.y);
    const warningMs = this.config.warningMs ?? 0;

    if (warningMs <= 0) {
      this.activate(context);
      return;
    }

    this.warningRemainingMs = warningMs;
    this.warningCircle = context.scene.add.circle(
      this.center.x,
      this.center.y,
      this.config.radius,
      0xff7733,
      0.14,
    ).setStrokeStyle(4, 0xffaa33, 0.8).setDepth(34);
  }

  private activate(context: BossSkillContext): void {
    this.clear();
    context.runState.recordEndlessBossSkillUse();
    const playerPosition = context.getPlayerPosition();

    if (Phaser.Math.Distance.Between(
      this.center.x,
      this.center.y,
      playerPosition.x,
      playerPosition.y,
    ) <= this.config.radius) {
      const direction = playerPosition.clone().subtract(this.center);
      if (direction.lengthSq() === 0) {
        direction.set(1, 0);
      }
      direction.normalize();

      const incomingDamage = context.boss.damage * this.config.damageMultiplier;
      const result = context.applyPlayerDamage('boss_skill:shockwave', incomingDamage, {
        knockbackDirection: direction,
        knockbackDistance: this.config.knockbackDistance ?? 0,
        isBossSkill: true,
      });

      if (result.hit) {
        context.runState.recordEndlessBossSkillHit(result.actualDamage, incomingDamage);
      }
    }

    const circle = context.scene.add.circle(this.center.x, this.center.y, this.config.radius, 0xffaa33, 0.22)
      .setStrokeStyle(4, 0xffaa33, 0.75)
      .setDepth(35);
    context.scene.tweens.add({
      targets: circle,
      alpha: 0,
      scale: 1.25,
      duration: 220,
      onComplete: () => circle.destroy(),
    });
    this.cooldownRemainingMs = this.config.cooldownMs;
    this.warningRemainingMs = 0;
  }
}
