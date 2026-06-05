import Phaser from 'phaser';

import { DamageCalculator } from '../combat/DamageCalculator';
import { Enemy } from '../enemy/Enemy';
import { PlayerController } from '../player/PlayerController';
import { PlayerHealth } from '../player/PlayerHealth';

export type CharacterDamageReactionType =
  | 'shockwave'
  | 'blinkForward'
  | 'slowTrail'
  | 'holySanctuary'
  | 'gainShield'
  | 'none';

export interface CharacterDamageReactionConfig {
  type: CharacterDamageReactionType;
  cooldownMs?: number;
  damage?: number;
  healAmount?: number;
  radius?: number;
  knockbackDistance?: number;
  shieldStacks?: number;
  blinkDistance?: number;
  invulnerableMs?: number;
  moveSpeedMultiplier?: number;
  speedBuffMs?: number;
  trailDurationMs?: number;
  tickIntervalMs?: number;
  zoneRadius?: number;
  zoneDurationMs?: number;
  enemySpeedMultiplier?: number;
}

export interface CharacterDamageReactionContext {
  scene: Phaser.Scene;
  player: PlayerController;
  playerHealth: PlayerHealth;
  enemies: Enemy[];
  damageCalculator: DamageCalculator;
  worldWidth: number;
  worldHeight: number;
  nowMs: number;
  showPlayerHeal?: (healAmount: number) => void;
}

export interface CharacterDamageReactionSkill {
  readonly type: CharacterDamageReactionType;
  tryTrigger(context: CharacterDamageReactionContext): boolean;
  update(deltaMs: number, player: PlayerController): void;
  isInvulnerable(nowMs: number): boolean;
  getEnemySpeedMultiplierAt(x: number, y: number): number;
  clear(): void;
}

export class NoneCharacterDamageReactionSkill implements CharacterDamageReactionSkill {
  readonly type = 'none';

  tryTrigger(): boolean {
    return false;
  }

  update(_deltaMs: number, _player: PlayerController): void {}

  isInvulnerable(): boolean {
    return false;
  }

  getEnemySpeedMultiplierAt(_x: number, _y: number): number {
    return 1;
  }

  clear(): void {}
}

abstract class BaseCharacterDamageReactionSkill implements CharacterDamageReactionSkill {
  private nextReadyAtMs = 0;
  protected invulnerableUntilMs = 0;

  abstract readonly type: CharacterDamageReactionType;

  constructor(protected readonly config: CharacterDamageReactionConfig) {}

  tryTrigger(context: CharacterDamageReactionContext): boolean {
    if (this.isInvulnerable(context.nowMs) || context.nowMs < this.nextReadyAtMs) {
      return false;
    }

    const triggered = this.activate(context);

    if (triggered) {
      this.nextReadyAtMs = context.nowMs + Math.max(0, this.config.cooldownMs ?? 0);
    }

    return triggered;
  }

  isInvulnerable(nowMs: number): boolean {
    return nowMs < this.invulnerableUntilMs;
  }

  update(_deltaMs: number, _player: PlayerController): void {}

  getEnemySpeedMultiplierAt(_x: number, _y: number): number {
    return 1;
  }

  clear(): void {
    this.nextReadyAtMs = 0;
    this.invulnerableUntilMs = 0;
  }

  protected abstract activate(context: CharacterDamageReactionContext): boolean;

  protected getEnemyRadius(enemy: Enemy): number {
    const body = enemy.body as Phaser.GameObjects.GameObject & { radius?: number };

    return body.radius ?? 12;
  }
}

export class ShockwaveDamageReactionSkill extends BaseCharacterDamageReactionSkill {
  readonly type = 'shockwave';

  protected activate(context: CharacterDamageReactionContext): boolean {
    const radius = Math.max(0, this.config.radius ?? 0);
    const feedback = context.scene.add.circle(
      context.player.body.x,
      context.player.body.y,
      radius,
      0x60a5fa,
      0.18,
    );

    feedback.setStrokeStyle(2, 0xbfdbfe, 0.8);
    feedback.setDepth(25);
    context.scene.tweens.add({
      targets: feedback,
      alpha: 0,
      scaleX: 1.18,
      scaleY: 1.18,
      duration: 180,
      onComplete: () => {
        feedback.destroy();
      },
    });

    const hitResult = context.damageCalculator.calculateDamage(this.config.damage ?? 0);

    for (const enemy of context.enemies) {
      if (
        enemy.isDead
        || Phaser.Math.Distance.Between(
          context.player.body.x,
          context.player.body.y,
          enemy.body.x,
          enemy.body.y,
        ) > radius
      ) {
        continue;
      }

      enemy.takeDamage(hitResult);

      if (enemy.isDead) {
        enemy.destroy();
        continue;
      }

      this.knockEnemyBack(enemy, context);
    }

    return true;
  }

  private knockEnemyBack(enemy: Enemy, context: CharacterDamageReactionContext): void {
    const direction = new Phaser.Math.Vector2(
      enemy.body.x - context.player.body.x,
      enemy.body.y - context.player.body.y,
    );

    if (direction.lengthSq() === 0) {
      direction.set(1, 0);
    }

    direction.normalize().scale(Math.max(0, this.config.knockbackDistance ?? 0));

    const enemyRadius = this.getEnemyRadius(enemy);
    enemy.body.x = Phaser.Math.Clamp(
      enemy.body.x + direction.x,
      enemyRadius,
      context.worldWidth - enemyRadius,
    );
    enemy.body.y = Phaser.Math.Clamp(
      enemy.body.y + direction.y,
      enemyRadius,
      context.worldHeight - enemyRadius,
    );
  }
}

export class BlinkForwardDamageReactionSkill extends BaseCharacterDamageReactionSkill {
  readonly type = 'blinkForward';

  protected activate(context: CharacterDamageReactionContext): boolean {
    const direction = context.player.getLastFacingDirection();
    const blinkDistance = Math.max(0, this.config.blinkDistance ?? 0);
    const invulnerableMs = Math.max(0, this.config.invulnerableMs ?? 0);
    const speedMultiplier = Math.max(0.1, this.config.moveSpeedMultiplier ?? 1);
    const speedBuffMs = Math.max(0, this.config.speedBuffMs ?? 0);

    context.player.applyExternalDisplacement(direction.scale(blinkDistance));
    context.playerHealth.setInvulnerable(invulnerableMs);
    context.player.setTemporaryMoveSpeedMultiplier(speedMultiplier, speedBuffMs);
    this.invulnerableUntilMs = context.nowMs + invulnerableMs;
    this.showBlinkFeedback(context);
    return true;
  }

  private showBlinkFeedback(context: CharacterDamageReactionContext): void {
    const flash = context.scene.add.circle(
      context.player.body.x,
      context.player.body.y,
      22,
      0x93c5fd,
      0.28,
    );

    flash.setStrokeStyle(1, 0xdbeafe, 0.75);
    flash.setDepth(25);
    context.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 1.7,
      scaleY: 1.7,
      duration: 160,
      onComplete: () => {
        flash.destroy();
      },
    });
  }
}

interface SlowTrailZone {
  x: number;
  y: number;
  radius: number;
  remainingMs: number;
  enemySpeedMultiplier: number;
  visual: Phaser.GameObjects.Arc;
}

export class SlowTrailDamageReactionSkill extends BaseCharacterDamageReactionSkill {
  private static readonly DEFAULT_TRAIL_DURATION_MS = 3000;
  private static readonly DEFAULT_TICK_INTERVAL_MS = 200;
  private static readonly DEFAULT_ZONE_RADIUS = 90;
  private static readonly DEFAULT_ZONE_DURATION_MS = 3000;
  private static readonly DEFAULT_ENEMY_SPEED_MULTIPLIER = 0.5;
  private static readonly MAX_ACTIVE_ZONES = 40;

  readonly type = 'slowTrail';

  private scene?: Phaser.Scene;
  private activeRemainingMs = 0;
  private tickRemainingMs = 0;
  private readonly activeZones: SlowTrailZone[] = [];

  update(deltaMs: number, player: PlayerController): void {
    const effectiveDeltaMs = Math.max(0, deltaMs);

    this.updateZones(effectiveDeltaMs);

    if (this.activeRemainingMs <= 0 || !this.scene) {
      return;
    }

    this.activeRemainingMs = Math.max(0, this.activeRemainingMs - effectiveDeltaMs);
    this.tickRemainingMs -= effectiveDeltaMs;

    while (this.tickRemainingMs <= 0 && this.activeRemainingMs > 0) {
      this.createZone(player);
      this.tickRemainingMs += this.getTickIntervalMs();
    }
  }

  getEnemySpeedMultiplierAt(x: number, y: number): number {
    let multiplier = 1;

    for (const zone of this.activeZones) {
      if (Phaser.Math.Distance.Between(x, y, zone.x, zone.y) > zone.radius) {
        continue;
      }

      multiplier = Math.min(multiplier, zone.enemySpeedMultiplier);
    }

    return multiplier;
  }

  clear(): void {
    super.clear();
    this.activeRemainingMs = 0;
    this.tickRemainingMs = 0;
    this.clearZones();
    this.scene = undefined;
  }

  protected activate(context: CharacterDamageReactionContext): boolean {
    this.scene = context.scene;
    this.activeRemainingMs = this.getTrailDurationMs();
    this.tickRemainingMs = 0;
    this.createZone(context.player);
    this.tickRemainingMs = this.getTickIntervalMs();
    return true;
  }

  private createZone(player: PlayerController): void {
    if (!this.scene) {
      return;
    }

    const radius = this.getZoneRadius();
    const visual = this.scene.add.circle(
      player.body.x,
      player.body.y,
      radius,
      0x7c3aed,
      0.12,
    );

    visual.setStrokeStyle(2, 0xa78bfa, 0.42);
    visual.setDepth(8);
    this.activeZones.push({
      x: player.body.x,
      y: player.body.y,
      radius,
      remainingMs: this.getZoneDurationMs(),
      enemySpeedMultiplier: this.getEnemySpeedMultiplier(),
      visual,
    });

    if (this.activeZones.length > SlowTrailDamageReactionSkill.MAX_ACTIVE_ZONES) {
      this.destroyZone(this.activeZones.shift());
    }
  }

  private updateZones(deltaMs: number): void {
    for (let index = this.activeZones.length - 1; index >= 0; index -= 1) {
      const zone = this.activeZones[index];
      zone.remainingMs -= deltaMs;

      if (zone.remainingMs > 0) {
        continue;
      }

      this.destroyZone(zone);
      this.activeZones.splice(index, 1);
    }
  }

  private clearZones(): void {
    this.activeZones.forEach((zone) => this.destroyZone(zone));
    this.activeZones.length = 0;
  }

  private destroyZone(zone: SlowTrailZone | undefined): void {
    if (zone?.visual.active) {
      zone.visual.destroy();
    }
  }

  private getTrailDurationMs(): number {
    return Math.max(
      0,
      this.config.trailDurationMs ?? SlowTrailDamageReactionSkill.DEFAULT_TRAIL_DURATION_MS,
    );
  }

  private getTickIntervalMs(): number {
    return Math.max(
      16,
      this.config.tickIntervalMs ?? SlowTrailDamageReactionSkill.DEFAULT_TICK_INTERVAL_MS,
    );
  }

  private getZoneRadius(): number {
    return Math.max(
      0,
      this.config.zoneRadius ?? SlowTrailDamageReactionSkill.DEFAULT_ZONE_RADIUS,
    );
  }

  private getZoneDurationMs(): number {
    return Math.max(
      0,
      this.config.zoneDurationMs ?? SlowTrailDamageReactionSkill.DEFAULT_ZONE_DURATION_MS,
    );
  }

  private getEnemySpeedMultiplier(): number {
    return Phaser.Math.Clamp(
      this.config.enemySpeedMultiplier
        ?? SlowTrailDamageReactionSkill.DEFAULT_ENEMY_SPEED_MULTIPLIER,
      0,
      1,
    );
  }
}

export class HolySanctuaryDamageReactionSkill extends BaseCharacterDamageReactionSkill {
  private static readonly DEFAULT_RADIUS = 140;
  private static readonly DEFAULT_KNOCKBACK_DISTANCE = 120;
  private static readonly DEFAULT_HEAL_AMOUNT = 10;
  private static readonly DEFAULT_SHIELD_STACKS = 1;
  private static readonly DEFAULT_ZONE_DURATION_MS = 1200;

  readonly type = 'holySanctuary';

  private readonly activeVisuals: Phaser.GameObjects.Arc[] = [];

  clear(): void {
    super.clear();
    this.activeVisuals.forEach((visual) => {
      if (visual.active) {
        visual.destroy();
      }
    });
    this.activeVisuals.length = 0;
  }

  protected activate(context: CharacterDamageReactionContext): boolean {
    this.showSanctuaryVisual(context);
    this.knockEnemiesBack(context);
    const healAmount = context.playerHealth.heal(this.getHealAmount());

    if (healAmount > 0) {
      context.showPlayerHeal?.(healAmount);
    }

    context.playerHealth.addShieldStacks(this.getShieldStacks());
    return true;
  }

  private showSanctuaryVisual(context: CharacterDamageReactionContext): void {
    const visual = context.scene.add.circle(
      context.player.body.x,
      context.player.body.y,
      this.getRadius(),
      0xfacc15,
      0.12,
    );

    visual.setStrokeStyle(3, 0xfef3c7, 0.55);
    visual.setDepth(9);
    this.activeVisuals.push(visual);
    context.scene.tweens.add({
      targets: visual,
      alpha: 0,
      scaleX: 1.12,
      scaleY: 1.12,
      duration: this.getZoneDurationMs(),
      onComplete: () => {
        this.destroyVisual(visual);
      },
    });
  }

  private knockEnemiesBack(context: CharacterDamageReactionContext): void {
    const radius = this.getRadius();

    for (const enemy of context.enemies) {
      if (enemy.isDead || this.isKnockbackImmune(enemy)) {
        continue;
      }

      if (
        Phaser.Math.Distance.Between(
          context.player.body.x,
          context.player.body.y,
          enemy.body.x,
          enemy.body.y,
        ) > radius
      ) {
        continue;
      }

      this.knockEnemyBack(enemy, context);
    }
  }

  private knockEnemyBack(enemy: Enemy, context: CharacterDamageReactionContext): void {
    const direction = new Phaser.Math.Vector2(
      enemy.body.x - context.player.body.x,
      enemy.body.y - context.player.body.y,
    );

    if (direction.lengthSq() === 0) {
      direction.set(1, 0);
    }

    const miniBossMultiplier = enemy.id.endsWith('_boss') ? 0.5 : 1;
    direction.normalize().scale(this.getKnockbackDistance() * miniBossMultiplier);

    const enemyRadius = this.getEnemyRadius(enemy);
    enemy.body.x = Phaser.Math.Clamp(
      enemy.body.x + direction.x,
      enemyRadius,
      context.worldWidth - enemyRadius,
    );
    enemy.body.y = Phaser.Math.Clamp(
      enemy.body.y + direction.y,
      enemyRadius,
      context.worldHeight - enemyRadius,
    );
  }

  private destroyVisual(visual: Phaser.GameObjects.Arc): void {
    const index = this.activeVisuals.indexOf(visual);

    if (index >= 0) {
      this.activeVisuals.splice(index, 1);
    }

    if (visual.active) {
      visual.destroy();
    }
  }

  private isKnockbackImmune(enemy: Enemy): boolean {
    return enemy.bossLike || enemy.id === 'boss' || enemy.id.startsWith('endless_');
  }

  private getRadius(): number {
    return Math.max(0, this.config.radius ?? HolySanctuaryDamageReactionSkill.DEFAULT_RADIUS);
  }

  private getKnockbackDistance(): number {
    return Math.max(
      0,
      this.config.knockbackDistance
        ?? HolySanctuaryDamageReactionSkill.DEFAULT_KNOCKBACK_DISTANCE,
    );
  }

  private getHealAmount(): number {
    return Math.max(0, this.config.healAmount ?? HolySanctuaryDamageReactionSkill.DEFAULT_HEAL_AMOUNT);
  }

  private getShieldStacks(): number {
    return Math.max(
      0,
      Math.floor(this.config.shieldStacks ?? HolySanctuaryDamageReactionSkill.DEFAULT_SHIELD_STACKS),
    );
  }

  private getZoneDurationMs(): number {
    return Math.max(
      0,
      this.config.zoneDurationMs ?? HolySanctuaryDamageReactionSkill.DEFAULT_ZONE_DURATION_MS,
    );
  }
}
