import Phaser from 'phaser';

import { BossSkill } from './BossSkill';
import { BossSkillContext } from './BossSkillContext';
import { DashSkillConfig } from './BossSkillConfig';
import type { AutoBossWarningSnapshot } from '../../auto/AutoPlayer';

export class DashSkill implements BossSkill {
  readonly type = 'dash' as const;

  private cooldownRemainingMs: number;
  private warningRemainingMs = 0;
  private dashDirection = new Phaser.Math.Vector2(1, 0);
  private dashStart = new Phaser.Math.Vector2();
  private warningLine?: Phaser.GameObjects.Line;

  constructor(private readonly config: DashSkillConfig) {
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
    if (this.cooldownRemainingMs > 0) {
      return;
    }

    this.startWarning(context);
  }

  clear(): void {
    this.warningLine?.destroy();
    this.warningLine = undefined;
  }

  isActive(): boolean {
    return this.warningRemainingMs > 0;
  }

  getAutoBossWarnings(): AutoBossWarningSnapshot[] {
    if (this.warningRemainingMs <= 0) {
      return [];
    }

    const end = this.dashStart.clone().add(this.dashDirection.clone().scale(this.config.speed));

    return [{
      shape: 'line',
      kind: 'dash',
      danger: 'damage',
      start: { x: this.dashStart.x, y: this.dashStart.y },
      end: { x: end.x, y: end.y },
      width: this.config.hitRadius * 2,
      remainingMs: Math.max(0, this.warningRemainingMs),
    }];
  }

  private startWarning(context: BossSkillContext): void {
    const bossPosition = new Phaser.Math.Vector2(context.boss.body.x, context.boss.body.y);
    const playerPosition = context.getPlayerPosition();

    this.dashStart = bossPosition.clone();
    this.dashDirection = playerPosition.clone().subtract(bossPosition);
    if (this.dashDirection.lengthSq() === 0) {
      this.dashDirection.set(1, 0);
    }
    this.dashDirection.normalize();

    const warningMs = this.config.warningMs ?? 0;
    if (warningMs <= 0) {
      this.activate(context);
      return;
    }

    this.warningRemainingMs = warningMs;
    this.warningLine = context.scene.add.line(
      bossPosition.x,
      bossPosition.y,
      0,
      0,
      this.dashDirection.x * this.config.speed,
      this.dashDirection.y * this.config.speed,
      0xff3333,
      0.65,
    ).setOrigin(0, 0).setDepth(34);
  }

  private updateWarningLine(context: BossSkillContext): void {
    if (!this.warningLine?.active) {
      return;
    }

    this.warningLine.setPosition(context.boss.body.x, context.boss.body.y);
    this.warningLine.setTo(
      0,
      0,
      this.dashDirection.x * this.config.speed,
      this.dashDirection.y * this.config.speed,
    );
  }

  private activate(context: BossSkillContext): void {
    this.clear();
    context.runState.recordEndlessBossSkillUse();
    context.playSfx?.('boss_dash');

    const distance = this.config.speed * (this.config.durationMs / 1000);
    const target = this.dashStart.clone().add(this.dashDirection.clone().scale(distance));
    const worldSize = context.getWorldSize();
    const end = new Phaser.Math.Vector2(
      Phaser.Math.Clamp(target.x, 48, worldSize.width - 48),
      Phaser.Math.Clamp(target.y, 48, worldSize.height - 48),
    );

    context.boss.body.setPosition(end.x, end.y);
    this.hitPlayerAlongSegment(context, this.dashStart, end);
    this.createImpactCircle(context, end.x, end.y, this.config.hitRadius + 10, 0xff5522);
    this.cooldownRemainingMs = this.config.cooldownMs;
    this.warningRemainingMs = 0;
  }

  private hitPlayerAlongSegment(
    context: BossSkillContext,
    start: Phaser.Math.Vector2,
    end: Phaser.Math.Vector2,
  ): void {
    const distance = getDistanceSegmentToPoint(start, end, context.getPlayerPosition());

    if (distance > this.config.hitRadius) {
      return;
    }

    const incomingDamage = context.boss.damage * this.config.damageMultiplier;
    const result = context.applyPlayerDamage('boss_skill:dash', incomingDamage, {
      knockbackDirection: this.dashDirection,
      knockbackDistance: this.config.knockbackDistance ?? 0,
      isBossSkill: true,
    });

    if (result.hit) {
      context.runState.recordEndlessBossSkillHit(result.actualDamage, incomingDamage);
    }
  }

  private createImpactCircle(
    context: BossSkillContext,
    x: number,
    y: number,
    radius: number,
    color: number,
  ): void {
    const circle = context.scene.add.circle(x, y, radius, color, 0.22)
      .setStrokeStyle(4, color, 0.75)
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

export function getDistanceSegmentToPoint(
  start: Phaser.Math.Vector2,
  end: Phaser.Math.Vector2,
  point: Phaser.Math.Vector2,
): number {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const lengthSq = segmentX * segmentX + segmentY * segmentY;

  if (lengthSq <= 0) {
    return Phaser.Math.Distance.Between(start.x, start.y, point.x, point.y);
  }

  const t = Phaser.Math.Clamp(
    ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) / lengthSq,
    0,
    1,
  );

  return Phaser.Math.Distance.Between(
    point.x,
    point.y,
    start.x + segmentX * t,
    start.y + segmentY * t,
  );
}
