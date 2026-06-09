import Phaser from 'phaser';

import { BossSkill } from './BossSkill';
import { BossSkillContext } from './BossSkillContext';
import { SlowZoneSkillConfig } from './BossSkillConfig';
import type { AutoBossWarningSnapshot } from '../../auto/AutoPlayerTypes';

export class SlowZoneSkill implements BossSkill {
  readonly type = 'slowZone' as const;

  private cooldownRemainingMs: number;
  private warningRemainingMs = 0;
  private zonePosition = new Phaser.Math.Vector2();
  private warningCircle?: Phaser.GameObjects.Arc;

  constructor(private readonly config: SlowZoneSkillConfig) {
    this.cooldownRemainingMs = config.initialDelayMs ?? config.cooldownMs;
  }

  update(deltaMs: number, context: BossSkillContext): void {
    if (this.config.enabled === false || context.boss.isDead) {
      return;
    }

    if (this.warningRemainingMs > 0) {
      this.warningRemainingMs -= deltaMs;

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

  getAutoBossWarnings(): AutoBossWarningSnapshot[] {
    if (this.warningRemainingMs <= 0) {
      return [];
    }

    return [{
      shape: 'circle',
      kind: 'slowZone',
      danger: 'slow',
      x: this.zonePosition.x,
      y: this.zonePosition.y,
      radius: this.config.radius,
      remainingMs: Math.max(0, this.warningRemainingMs),
    }];
  }

  private startWarning(context: BossSkillContext): void {
    this.zonePosition = context.getPlayerPosition();
    const warningMs = this.config.warningMs ?? 0;

    if (warningMs <= 0) {
      this.activate(context);
      return;
    }

    this.warningRemainingMs = warningMs;
    this.warningCircle = context.scene.add.circle(
      this.zonePosition.x,
      this.zonePosition.y,
      this.config.radius,
      0x66ccff,
      0.18,
    ).setStrokeStyle(3, 0x99ddff, 0.7).setDepth(9);
  }

  private activate(context: BossSkillContext): void {
    this.clear();
    context.runState.recordEndlessBossSkillUse();
    const visual = context.scene.add.circle(
      this.zonePosition.x,
      this.zonePosition.y,
      this.config.radius,
      0x66ccff,
      0.16,
    ).setStrokeStyle(3, 0x99ddff, 0.55).setDepth(8);

    context.addPlayerSlowZone?.({
      x: this.zonePosition.x,
      y: this.zonePosition.y,
      radius: this.config.radius,
      durationMs: this.config.durationMs,
      playerSpeedMultiplier: this.config.playerSpeedMultiplier,
      visual,
    });

    this.cooldownRemainingMs = this.config.cooldownMs;
    this.warningRemainingMs = 0;
  }
}
