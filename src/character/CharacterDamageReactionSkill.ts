import Phaser from 'phaser';

import { AssetKeyResolver } from '../assets/AssetKeyResolver';
import { DamageCalculator } from '../combat/DamageCalculator';
import { Enemy } from '../enemy/Enemy';
import { PlayerController } from '../player/PlayerController';
import { PlayerHealth } from '../player/PlayerHealth';

export type CharacterDamageReactionType =
  | 'shockwave'
  | 'blinkForward'
  | 'slowTrail'
  | 'holySanctuary'
  | 'ironCounter'
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
  damageReductionMultiplier?: number;
  damageReductionDurationMs?: number;
  recoveryMs?: number;
  recoveryPickupRangeMultiplier?: number;
  pickupRangeMultiplier?: number;
  pickupRangeDurationMs?: number;
  minimumMapMoveSpeedMultiplier?: number;
  minimumMapMoveSpeedDurationMs?: number;
  pressureScaling?: {
    enabled?: boolean;
    nearbyEnemyRadius?: number;
    mediumThreshold?: number;
    highThreshold?: number;
    mediumRadiusMultiplier?: number;
    highRadiusMultiplier?: number;
    mediumKnockbackMultiplier?: number;
    highKnockbackMultiplier?: number;
    highArmorFlatBonus?: number;
    highArmorDurationMs?: number;
  };
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
  characterId?: string;
  skinId?: string;
  showPlayerHeal?: (healAmount: number) => void;
}

export interface CharacterDamageReactionSkill {
  readonly type: CharacterDamageReactionType;
  tryTrigger(context: CharacterDamageReactionContext): boolean;
  tryTriggerLevelUpPulse(context: CharacterDamageReactionContext): boolean;
  update(deltaMs: number, player: PlayerController): void;
  isInvulnerable(nowMs: number): boolean;
  getEnemySpeedMultiplierAt(x: number, y: number): number;
  getPickupRangeMultiplier(): number;
  getMapMoveSpeedFloorMultiplier(): number;
  getTemporaryArmorFlatBonus(): number;
  clear(): void;
}

export class NoneCharacterDamageReactionSkill implements CharacterDamageReactionSkill {
  readonly type = 'none';

  tryTrigger(): boolean {
    return false;
  }

  tryTriggerLevelUpPulse(): boolean {
    return false;
  }

  update(_deltaMs: number, _player: PlayerController): void {}

  isInvulnerable(): boolean {
    return false;
  }

  getEnemySpeedMultiplierAt(_x: number, _y: number): number {
    return 1;
  }

  getPickupRangeMultiplier(): number {
    return 1;
  }

  getMapMoveSpeedFloorMultiplier(): number {
    return 0;
  }

  getTemporaryArmorFlatBonus(): number {
    return 0;
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

  tryTriggerLevelUpPulse(_context: CharacterDamageReactionContext): boolean {
    return false;
  }

  update(_deltaMs: number, _player: PlayerController): void {}

  getEnemySpeedMultiplierAt(_x: number, _y: number): number {
    return 1;
  }

  getPickupRangeMultiplier(): number {
    return 1;
  }

  getMapMoveSpeedFloorMultiplier(): number {
    return 0;
  }

  getTemporaryArmorFlatBonus(): number {
    return 0;
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

  protected createEffectImage(
    context: CharacterDamageReactionContext,
    effectId: string,
    x: number,
    y: number,
    displayWidth: number,
    displayHeight: number,
    depth: number,
    alpha = 1,
  ): Phaser.GameObjects.Image | null {
    const textureKey = AssetKeyResolver.getPlayerEffectTextureKey(
      context.scene,
      effectId,
      context.skinId,
      context.characterId,
    );

    if (!textureKey) {
      return null;
    }

    const image = context.scene.add.image(x, y, textureKey);
    image.setDisplaySize(displayWidth, displayHeight);
    image.setDepth(depth);
    image.setAlpha(alpha);
    return image;
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

  private recoveryRemainingMs = 0;

  update(deltaMs: number, _player: PlayerController): void {
    if (this.recoveryRemainingMs <= 0) {
      return;
    }

    this.recoveryRemainingMs = Math.max(0, this.recoveryRemainingMs - Math.max(0, deltaMs));
  }

  getPickupRangeMultiplier(): number {
    return this.recoveryRemainingMs > 0
      ? Phaser.Math.Clamp(this.config.recoveryPickupRangeMultiplier ?? 0.75, 0.1, 1)
      : 1;
  }

  clear(): void {
    super.clear();
    this.recoveryRemainingMs = 0;
  }

  protected activate(context: CharacterDamageReactionContext): boolean {
    const direction = context.player.getLastFacingDirection();
    const blinkDistance = Math.max(0, this.config.blinkDistance ?? 0);
    const invulnerableMs = Math.max(0, this.config.invulnerableMs ?? 0);
    const speedMultiplier = Math.max(0.1, this.config.moveSpeedMultiplier ?? 1);
    const speedBuffMs = Math.max(0, this.config.speedBuffMs ?? 0);
    const startX = context.player.body.x;
    const startY = context.player.body.y;

    context.player.applyExternalDisplacement(direction.scale(blinkDistance));
    context.playerHealth.setInvulnerable(invulnerableMs);
    context.player.setTemporaryMoveSpeedMultiplier(speedMultiplier, speedBuffMs);
    this.recoveryRemainingMs = Math.max(0, this.config.recoveryMs ?? 900);
    this.invulnerableUntilMs = context.nowMs + invulnerableMs;
    this.showBlinkFeedback(context, startX, startY);
    return true;
  }

  private showBlinkFeedback(
    context: CharacterDamageReactionContext,
    startX: number,
    startY: number,
  ): void {
    const trail = this.createEffectImage(context, 'blink_trail', startX, startY, 96, 48, 24, 0.65);
    trail?.setRotation(Phaser.Math.Angle.Between(
      startX,
      startY,
      context.player.body.x,
      context.player.body.y,
    ));

    if (trail) {
      context.scene.tweens.add({
        targets: trail,
        alpha: 0,
        scaleX: 1.15,
        duration: 180,
        onComplete: () => trail.destroy(),
      });
    }

    const flash = this.createEffectImage(
      context,
      'blink_flash',
      context.player.body.x,
      context.player.body.y,
      52,
      52,
      25,
      0.72,
    );

    if (!flash) {
      const fallback = context.scene.add.circle(
        context.player.body.x,
        context.player.body.y,
        22,
        0x93c5fd,
        0.28,
      );

      fallback.setStrokeStyle(1, 0xdbeafe, 0.75);
      fallback.setDepth(25);
      context.scene.tweens.add({
        targets: fallback,
        alpha: 0,
        scaleX: 1.7,
        scaleY: 1.7,
        duration: 160,
        onComplete: () => {
          fallback.destroy();
        },
      });
      return;
    }

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
  visual: Phaser.GameObjects.GameObject & { active: boolean; destroy(): void };
}

export class SlowTrailDamageReactionSkill extends BaseCharacterDamageReactionSkill {
  private static readonly DEFAULT_TRAIL_DURATION_MS = 3000;
  private static readonly DEFAULT_TICK_INTERVAL_MS = 200;
  private static readonly DEFAULT_ZONE_RADIUS = 90;
  private static readonly DEFAULT_ZONE_DURATION_MS = 3000;
  private static readonly DEFAULT_ENEMY_SPEED_MULTIPLIER = 0.5;
  private static readonly LEVEL_UP_PULSE_RADIUS_MULTIPLIER = 1.6;
  private static readonly LEVEL_UP_PULSE_DURATION_MULTIPLIER = 0.8;
  private static readonly MAX_ACTIVE_ZONES = 40;

  readonly type = 'slowTrail';

  private scene?: Phaser.Scene;
  private activeRemainingMs = 0;
  private tickRemainingMs = 0;
  private pickupRangeBuffRemainingMs = 0;
  private readonly activeZones: SlowTrailZone[] = [];

  update(deltaMs: number, player: PlayerController): void {
    const effectiveDeltaMs = Math.max(0, deltaMs);

    this.updateZones(effectiveDeltaMs);
    this.updatePickupRangeBuff(effectiveDeltaMs);

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
    this.pickupRangeBuffRemainingMs = 0;
    this.clearZones();
    this.scene = undefined;
  }

  getPickupRangeMultiplier(): number {
    return this.pickupRangeBuffRemainingMs > 0
      ? Math.max(1, this.config.pickupRangeMultiplier ?? 1)
      : 1;
  }

  tryTriggerLevelUpPulse(context: CharacterDamageReactionContext): boolean {
    this.scene = context.scene;
    this.createZone(
      context.player,
      this.getZoneRadius() * SlowTrailDamageReactionSkill.LEVEL_UP_PULSE_RADIUS_MULTIPLIER,
      this.getZoneDurationMs() * SlowTrailDamageReactionSkill.LEVEL_UP_PULSE_DURATION_MULTIPLIER,
    );
    this.showPulseFeedback(context);
    return true;
  }

  protected activate(context: CharacterDamageReactionContext): boolean {
    this.scene = context.scene;
    this.activeRemainingMs = this.getTrailDurationMs();
    this.tickRemainingMs = 0;
    this.pickupRangeBuffRemainingMs = this.getPickupRangeDurationMs();
    this.createZone(context.player);
    this.tickRemainingMs = this.getTickIntervalMs();
    return true;
  }

  private createZone(
    player: PlayerController,
    radius = this.getZoneRadius(),
    durationMs = this.getZoneDurationMs(),
  ): void {
    if (!this.scene) {
      return;
    }

    const textureKey = AssetKeyResolver.getPlayerEffectTextureKey(
      this.scene,
      'slow_zone',
      'witch_default',
      'witch',
    );
    const visual = textureKey
      ? this.scene.add.image(player.body.x, player.body.y, textureKey)
      : this.scene.add.circle(player.body.x, player.body.y, radius, 0x7c3aed, 0.12);

    if ('setDisplaySize' in visual) {
      visual.setDisplaySize(radius * 2, radius * 2);
    }

    if ('setStrokeStyle' in visual) {
      visual.setStrokeStyle(2, 0xa78bfa, 0.42);
    }

    visual.setDepth(8);
    this.activeZones.push({
      x: player.body.x,
      y: player.body.y,
      radius,
      remainingMs: durationMs,
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

  private updatePickupRangeBuff(deltaMs: number): void {
    if (this.pickupRangeBuffRemainingMs <= 0) {
      return;
    }

    this.pickupRangeBuffRemainingMs = Math.max(
      0,
      this.pickupRangeBuffRemainingMs - deltaMs,
    );
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

  private getPickupRangeDurationMs(): number {
    return Math.max(0, this.config.pickupRangeDurationMs ?? 0);
  }

  private showPulseFeedback(context: CharacterDamageReactionContext): void {
    const radius = this.getZoneRadius() * SlowTrailDamageReactionSkill.LEVEL_UP_PULSE_RADIUS_MULTIPLIER;
    const feedback = context.scene.add.circle(
      context.player.body.x,
      context.player.body.y,
      radius,
      0x8b5cf6,
      0.08,
    );

    feedback.setStrokeStyle(3, 0xc4b5fd, 0.5);
    feedback.setDepth(10);
    context.scene.tweens.add({
      targets: feedback,
      alpha: 0,
      scaleX: 1.12,
      scaleY: 1.12,
      duration: 320,
      onComplete: () => feedback.destroy(),
    });
  }
}

export class HolySanctuaryDamageReactionSkill extends BaseCharacterDamageReactionSkill {
  private static readonly DEFAULT_RADIUS = 140;
  private static readonly DEFAULT_KNOCKBACK_DISTANCE = 120;
  private static readonly DEFAULT_HEAL_AMOUNT = 10;
  private static readonly DEFAULT_SHIELD_STACKS = 1;
  private static readonly DEFAULT_ZONE_DURATION_MS = 1200;
  private static readonly SANCTUARY_DAMAGE_REDUCTION_MULTIPLIER = 0.88;
  private static readonly SANCTUARY_ENEMY_SPEED_MULTIPLIER = 0.78;

  readonly type = 'holySanctuary';

  private readonly activeVisuals: Array<Phaser.GameObjects.GameObject & { active: boolean; destroy(): void }> = [];
  private readonly activeZones: Array<{ x: number; y: number; radius: number; remainingMs: number }> = [];

  clear(): void {
    super.clear();
    this.activeVisuals.forEach((visual) => {
      if (visual.active) {
        visual.destroy();
      }
    });
    this.activeVisuals.length = 0;
    this.activeZones.length = 0;
  }

  update(deltaMs: number, _player: PlayerController): void {
    const effectiveDeltaMs = Math.max(0, deltaMs);

    for (let index = this.activeZones.length - 1; index >= 0; index -= 1) {
      this.activeZones[index].remainingMs -= effectiveDeltaMs;

      if (this.activeZones[index].remainingMs <= 0) {
        this.activeZones.splice(index, 1);
      }
    }
  }

  getEnemySpeedMultiplierAt(x: number, y: number): number {
    for (const zone of this.activeZones) {
      if (Phaser.Math.Distance.Between(x, y, zone.x, zone.y) <= zone.radius) {
        return HolySanctuaryDamageReactionSkill.SANCTUARY_ENEMY_SPEED_MULTIPLIER;
      }
    }

    return 1;
  }

  protected activate(context: CharacterDamageReactionContext): boolean {
    this.showSanctuaryVisual(context);
    this.createSanctuaryZone(context);
    this.knockEnemiesBack(context);
    const healAmount = context.playerHealth.heal(this.getHealAmount());

    if (healAmount > 0) {
      context.showPlayerHeal?.(healAmount);
    }

    context.playerHealth.addShieldStacks(this.getShieldStacks());
    context.playerHealth.addTemporaryDamageTakenMultiplier(
      HolySanctuaryDamageReactionSkill.SANCTUARY_DAMAGE_REDUCTION_MULTIPLIER,
      this.getZoneDurationMs(),
    );
    return true;
  }

  private showSanctuaryVisual(context: CharacterDamageReactionContext): void {
    const visual = this.createEffectImage(
      context,
      'sanctuary_circle',
      context.player.body.x,
      context.player.body.y,
      this.getRadius() * 2,
      this.getRadius() * 2,
      9,
      0.7,
    ) ?? context.scene.add.circle(
        context.player.body.x,
        context.player.body.y,
        this.getRadius(),
        0xfacc15,
        0.12,
      );

    if ('setStrokeStyle' in visual) {
      visual.setStrokeStyle(3, 0xfef3c7, 0.55);
    }

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

  private createSanctuaryZone(context: CharacterDamageReactionContext): void {
    this.activeZones.push({
      x: context.player.body.x,
      y: context.player.body.y,
      radius: this.getRadius(),
      remainingMs: this.getZoneDurationMs(),
    });
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

  private destroyVisual(visual: Phaser.GameObjects.GameObject & { active: boolean; destroy(): void }): void {
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

export class IronCounterDamageReactionSkill extends BaseCharacterDamageReactionSkill {
  private static readonly DEFAULT_RADIUS = 150;
  private static readonly DEFAULT_DAMAGE = 15;
  private static readonly DEFAULT_KNOCKBACK_DISTANCE = 150;
  private static readonly DEFAULT_DAMAGE_REDUCTION_MULTIPLIER = 0.65;
  private static readonly DEFAULT_DAMAGE_REDUCTION_DURATION_MS = 2500;
  private static readonly DEFAULT_ZONE_DURATION_MS = 500;
  private static readonly HIGH_PRESSURE_DAMAGE_REDUCTION_MULTIPLIER = 0.55;

  readonly type = 'ironCounter';

  private readonly activeVisuals: Array<Phaser.GameObjects.GameObject & { active: boolean; destroy(): void }> = [];
  private mapMoveSpeedFloorRemainingMs = 0;
  private temporaryArmorFlatBonus = 0;
  private temporaryArmorFlatRemainingMs = 0;

  clear(): void {
    super.clear();
    this.activeVisuals.forEach((visual) => {
      if (visual.active) {
        visual.destroy();
      }
    });
    this.activeVisuals.length = 0;
    this.mapMoveSpeedFloorRemainingMs = 0;
    this.temporaryArmorFlatBonus = 0;
    this.temporaryArmorFlatRemainingMs = 0;
  }

  update(deltaMs: number, _player: PlayerController): void {
    const effectiveDeltaMs = Math.max(0, deltaMs);

    if (this.mapMoveSpeedFloorRemainingMs > 0) {
      this.mapMoveSpeedFloorRemainingMs = Math.max(
        0,
        this.mapMoveSpeedFloorRemainingMs - effectiveDeltaMs,
      );
    }

    if (this.temporaryArmorFlatRemainingMs <= 0) {
      return;
    }

    this.temporaryArmorFlatRemainingMs = Math.max(
      0,
      this.temporaryArmorFlatRemainingMs - effectiveDeltaMs,
    );

    if (this.temporaryArmorFlatRemainingMs <= 0) {
      this.temporaryArmorFlatBonus = 0;
    }
  }

  getMapMoveSpeedFloorMultiplier(): number {
    return this.mapMoveSpeedFloorRemainingMs > 0
      ? Phaser.Math.Clamp(this.config.minimumMapMoveSpeedMultiplier ?? 0, 0, 1)
      : 0;
  }

  getTemporaryArmorFlatBonus(): number {
    return this.temporaryArmorFlatRemainingMs > 0
      ? Math.max(0, this.temporaryArmorFlatBonus)
      : 0;
  }

  protected activate(context: CharacterDamageReactionContext): boolean {
    const pressureCount = this.countNearbyPressureEnemies(context);
    const radiusMultiplier = this.getRadiusPressureMultiplier(pressureCount);
    const knockbackMultiplier = this.getKnockbackPressureMultiplier(pressureCount);

    this.showCounterVisual(context, radiusMultiplier);
    this.hitAndKnockEnemies(context, radiusMultiplier, knockbackMultiplier);
    context.playerHealth.addTemporaryDamageTakenMultiplier(
      this.isHighPressure(pressureCount)
        ? IronCounterDamageReactionSkill.HIGH_PRESSURE_DAMAGE_REDUCTION_MULTIPLIER
        : this.getDamageReductionMultiplier(),
      this.getDamageReductionDurationMs(),
    );
    this.tryApplyHighPressureArmorBonus(pressureCount);
    this.mapMoveSpeedFloorRemainingMs = this.getMinimumMapMoveSpeedDurationMs();
    return true;
  }

  private showCounterVisual(context: CharacterDamageReactionContext, radiusMultiplier: number): void {
    const radius = this.getRadius() * radiusMultiplier;
    const visual = this.createEffectImage(
      context,
      'counter_wave',
      context.player.body.x,
      context.player.body.y,
      radius * 2,
      radius * 2,
      25,
      0.72,
    ) ?? context.scene.add.circle(
        context.player.body.x,
        context.player.body.y,
        radius,
        0xf97316,
        0.08,
      );

    if ('setStrokeStyle' in visual) {
      visual.setStrokeStyle(3, 0xfdba74, 0.6);
    }

    visual.setScale(0.05);
    visual.setDepth(25);
    this.activeVisuals.push(visual);
    context.scene.tweens.add({
      targets: visual,
      scaleX: 1.12,
      scaleY: 1.12,
      alpha: 0,
      duration: this.getZoneDurationMs(),
      onComplete: () => {
        this.destroyVisual(visual);
      },
    });
  }

  private hitAndKnockEnemies(
    context: CharacterDamageReactionContext,
    radiusMultiplier: number,
    knockbackMultiplier: number,
  ): void {
    const radius = this.getRadius() * radiusMultiplier;
    const hitResult = context.damageCalculator.calculateDamage(this.getDamage());

    for (const enemy of context.enemies) {
      if (enemy.isDead || this.isFinalOrEndlessBoss(enemy)) {
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

      enemy.takeDamage(hitResult);

      if (!enemy.isDead && !this.isKnockbackImmune(enemy)) {
        this.knockEnemyBack(enemy, context, knockbackMultiplier);
      }
    }
  }

  private knockEnemyBack(
    enemy: Enemy,
    context: CharacterDamageReactionContext,
    knockbackMultiplier: number,
  ): void {
    const direction = new Phaser.Math.Vector2(
      enemy.body.x - context.player.body.x,
      enemy.body.y - context.player.body.y,
    );

    if (direction.lengthSq() === 0) {
      direction.set(1, 0);
    }

    direction.normalize().scale(this.getKnockbackDistance() * knockbackMultiplier);

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

  private destroyVisual(visual: Phaser.GameObjects.GameObject & { active: boolean; destroy(): void }): void {
    const index = this.activeVisuals.indexOf(visual);

    if (index >= 0) {
      this.activeVisuals.splice(index, 1);
    }

    if (visual.active) {
      visual.destroy();
    }
  }

  private countNearbyPressureEnemies(context: CharacterDamageReactionContext): number {
    const radius = Math.max(
      0,
      this.config.pressureScaling?.nearbyEnemyRadius ?? this.getRadius(),
    );

    return context.enemies.filter((enemy) => (
      !enemy.isDead
      && !this.isFinalOrEndlessBoss(enemy)
      && Phaser.Math.Distance.Between(
        context.player.body.x,
        context.player.body.y,
        enemy.body.x,
        enemy.body.y,
      ) <= radius
    )).length;
  }

  private getRadiusPressureMultiplier(pressureCount: number): number {
    if (this.isHighPressure(pressureCount)) {
      return this.getHighRadiusMultiplier();
    }

    if (this.isMediumPressure(pressureCount)) {
      return this.getMediumRadiusMultiplier();
    }

    return 1;
  }

  private isFinalOrEndlessBoss(enemy: Enemy): boolean {
    return enemy.id === 'boss' || enemy.id.startsWith('endless_');
  }

  private isKnockbackImmune(enemy: Enemy): boolean {
    return enemy.bossLike || this.isFinalOrEndlessBoss(enemy);
  }

  private getRadius(): number {
    return Math.max(0, this.config.radius ?? IronCounterDamageReactionSkill.DEFAULT_RADIUS);
  }

  private getDamage(): number {
    return Math.max(0, this.config.damage ?? IronCounterDamageReactionSkill.DEFAULT_DAMAGE);
  }

  private getKnockbackDistance(): number {
    return Math.max(
      0,
      this.config.knockbackDistance ?? IronCounterDamageReactionSkill.DEFAULT_KNOCKBACK_DISTANCE,
    );
  }

  private getDamageReductionMultiplier(): number {
    return Phaser.Math.Clamp(
      this.config.damageReductionMultiplier
        ?? IronCounterDamageReactionSkill.DEFAULT_DAMAGE_REDUCTION_MULTIPLIER,
      0,
      1,
    );
  }

  private getDamageReductionDurationMs(): number {
    return Math.max(
      0,
      this.config.damageReductionDurationMs
        ?? IronCounterDamageReactionSkill.DEFAULT_DAMAGE_REDUCTION_DURATION_MS,
    );
  }

  private getZoneDurationMs(): number {
    return Math.max(
      0,
      this.config.zoneDurationMs ?? IronCounterDamageReactionSkill.DEFAULT_ZONE_DURATION_MS,
    );
  }

  private getMinimumMapMoveSpeedDurationMs(): number {
    return Math.max(0, this.config.minimumMapMoveSpeedDurationMs ?? 0);
  }

  private getMediumThreshold(): number {
    return Math.max(1, Math.floor(this.config.pressureScaling?.mediumThreshold ?? 5));
  }

  private getHighThreshold(): number {
    return Math.max(this.getMediumThreshold(), Math.floor(this.config.pressureScaling?.highThreshold ?? 9));
  }

  private isMediumPressure(pressureCount: number): boolean {
    return this.config.pressureScaling?.enabled === true
      && pressureCount >= this.getMediumThreshold();
  }

  private isHighPressure(pressureCount: number): boolean {
    return this.config.pressureScaling?.enabled === true
      && pressureCount >= this.getHighThreshold();
  }

  private getMediumRadiusMultiplier(): number {
    return Math.max(1, this.config.pressureScaling?.mediumRadiusMultiplier ?? 1.15);
  }

  private getHighRadiusMultiplier(): number {
    return Math.max(
      this.getMediumRadiusMultiplier(),
      this.config.pressureScaling?.highRadiusMultiplier ?? 1.25,
    );
  }

  private getKnockbackPressureMultiplier(pressureCount: number): number {
    if (this.isHighPressure(pressureCount)) {
      return Math.max(
        this.getMediumKnockbackMultiplier(),
        this.config.pressureScaling?.highKnockbackMultiplier ?? 1.25,
      );
    }

    if (this.isMediumPressure(pressureCount)) {
      return this.getMediumKnockbackMultiplier();
    }

    return 1;
  }

  private getMediumKnockbackMultiplier(): number {
    return Math.max(1, this.config.pressureScaling?.mediumKnockbackMultiplier ?? 1.15);
  }

  private tryApplyHighPressureArmorBonus(pressureCount: number): void {
    if (!this.isHighPressure(pressureCount)) {
      return;
    }

    const armorBonus = Math.max(0, this.config.pressureScaling?.highArmorFlatBonus ?? 0);
    const armorDurationMs = Math.max(0, this.config.pressureScaling?.highArmorDurationMs ?? 0);

    if (armorBonus <= 0 || armorDurationMs <= 0) {
      return;
    }

    this.temporaryArmorFlatBonus = armorBonus;
    this.temporaryArmorFlatRemainingMs = armorDurationMs;
  }
}
