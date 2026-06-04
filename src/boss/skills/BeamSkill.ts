import Phaser from 'phaser';

import { BossSkill } from './BossSkill';
import { BossSkillContext } from './BossSkillContext';
import { BeamSkillConfig } from './BossSkillConfig';
import { getDistanceSegmentToPoint } from './DashSkill';

export class BeamSkill implements BossSkill {
  readonly type = 'beam' as const;

  private cooldownRemainingMs: number;
  private warningRemainingMs = 0;
  private beamStart = new Phaser.Math.Vector2();
  private beamEnd = new Phaser.Math.Vector2();
  private beamDirection = new Phaser.Math.Vector2(1, 0);
  private warningLine?: Phaser.GameObjects.Line;

  constructor(private readonly config: BeamSkillConfig) {
    this.cooldownRemainingMs = config.initialDelayMs ?? config.cooldownMs;
  }

  update(deltaMs: number, context: BossSkillContext): void {
    if (this.config.enabled === false || context.boss.isDead) {
      return;
    }

    if (this.warningRemainingMs > 0) {
      this.warningRemainingMs -= deltaMs;
      this.updateWarningLine(context);

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
    this.warningLine?.destroy();
    this.warningLine = undefined;
  }

  private startWarning(context: BossSkillContext): void {
    this.captureBeam(context);
    const warningMs = this.config.warningMs ?? 0;

    if (warningMs <= 0) {
      this.activate(context);
      return;
    }

    this.warningRemainingMs = warningMs;
    this.warningLine = context.scene.add.line(
      this.beamStart.x,
      this.beamStart.y,
      0,
      0,
      this.beamEnd.x - this.beamStart.x,
      this.beamEnd.y - this.beamStart.y,
      0xff3333,
      0.65,
    ).setOrigin(0, 0).setDepth(34);
  }

  private updateWarningLine(context: BossSkillContext): void {
    if (!this.warningLine?.active) {
      return;
    }

    this.captureBeam(context);
    this.warningLine.setPosition(this.beamStart.x, this.beamStart.y);
    this.warningLine.setTo(
      0,
      0,
      this.beamEnd.x - this.beamStart.x,
      this.beamEnd.y - this.beamStart.y,
    );
  }

  private activate(context: BossSkillContext): void {
    this.clear();
    context.runState.recordEndlessBossSkillUse();

    if (getDistanceSegmentToPoint(
      this.beamStart,
      this.beamEnd,
      context.getPlayerPosition(),
    ) <= this.config.width / 2) {
      const incomingDamage = context.boss.damage * this.config.damageMultiplier;
      const result = context.applyPlayerDamage('boss_skill:beam', incomingDamage, {
        knockbackDirection: this.beamDirection,
        knockbackDistance: this.config.knockbackDistance ?? 0,
        isBossSkill: true,
      });

      if (result.hit) {
        context.runState.recordEndlessBossSkillHit(result.actualDamage, incomingDamage);
      }
    }

    const line = context.scene.add.line(
      this.beamStart.x,
      this.beamStart.y,
      0,
      0,
      this.beamEnd.x - this.beamStart.x,
      this.beamEnd.y - this.beamStart.y,
      0xff6633,
      0.8,
    ).setOrigin(0, 0).setDepth(35);
    context.scene.time.delayedCall(140, () => line.destroy());
    this.cooldownRemainingMs = this.config.cooldownMs;
    this.warningRemainingMs = 0;
  }

  private captureBeam(context: BossSkillContext): void {
    this.beamStart.set(context.boss.body.x, context.boss.body.y);
    this.beamDirection = context.getPlayerPosition().subtract(this.beamStart);
    if (this.beamDirection.lengthSq() === 0) {
      this.beamDirection.set(1, 0);
    }
    this.beamDirection.normalize();
    this.beamEnd = this.beamStart.clone().add(this.beamDirection.clone().scale(this.config.length));
  }
}
