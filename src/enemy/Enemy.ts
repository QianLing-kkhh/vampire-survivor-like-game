import Phaser from 'phaser';

import { DamageTargetContext } from '../combat/DamageCalculator';
import { HitResult } from '../combat/HitResult';
import { EventBus } from '../core/EventBus';
import { ShadowConfig, ShadowType } from '../visual/ShadowConfig';
import { ShadowFactory } from '../visual/ShadowFactory';
import { VisualScale } from '../visual/VisualScale';
import { EnemyModifierDeathContext } from './modifiers/EnemyModifier';
import { EnemyModifierRuntime } from './modifiers/EnemyModifierRuntime';

export interface EnemyStats {
  hp: number;
  moveSpeed: number;
  damage: number;
  exp: number;
  scale?: number;
  bossLike?: boolean;
  dashEnabled?: boolean;
  dashCooldown?: number;
  dashWarningDuration?: number;
  dashDuration?: number;
  dashSpeed?: number;
  dashDamageMultiplier?: number;
}

type BossDashState = 'idle' | 'warning' | 'dashing';

export interface EnemyKilledEvent {
  x: number;
  y: number;
  exp: number;
  enemyId?: string;
  isBoss?: boolean;
}

export interface ExpGainedEvent {
  amount: number;
  currentExp: number;
  totalExp: number;
}

export interface LevelUpEvent {
  previousLevel: number;
  currentLevel: number;
  requiredExp: number;
}

export type GameEventMap = Record<string, unknown> & {
  EnemyKilled: EnemyKilledEvent;
  ExpGained: ExpGainedEvent;
  LevelUp: LevelUpEvent;
};

export function isEnemyKilledEvent(value: unknown): value is EnemyKilledEvent {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const event = value as Partial<EnemyKilledEvent>;

  return (
    typeof event.x === 'number'
    && typeof event.y === 'number'
    && typeof event.exp === 'number'
  );
}

export function isExpGainedEvent(value: unknown): value is ExpGainedEvent {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const event = value as Partial<ExpGainedEvent>;

  return (
    typeof event.amount === 'number'
    && typeof event.currentExp === 'number'
    && typeof event.totalExp === 'number'
  );
}

export function isLevelUpEvent(value: unknown): value is LevelUpEvent {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const event = value as Partial<LevelUpEvent>;

  return (
    typeof event.previousLevel === 'number'
    && typeof event.currentLevel === 'number'
    && typeof event.requiredExp === 'number'
  );
}

export class Enemy {
  private static readonly DASH_WARNING_DURATION_MULTIPLIER = 0.8;
  private static readonly NORMAL_WEAPON_KNOCKBACK_IMMUNITY_MS = 3000;
  private static readonly MINI_BOSS_WEAPON_KNOCKBACK_IMMUNITY_MS = 5000;

  readonly body: Phaser.GameObjects.Arc;
  readonly maxHp: number;
  readonly moveSpeed: number;
  readonly damage: number;
  readonly exp: number;
  readonly scale: number;
  readonly bossLike: boolean;
  readonly dashEnabled: boolean;
  readonly dashCooldown: number;
  readonly dashWarningDuration: number;
  readonly dashDuration: number;
  readonly dashSpeed: number;
  readonly dashDamageMultiplier: number;

  currentHp: number;
  isDead = false;
  private eventBus?: EventBus<GameEventMap>;
  private baseScaleX = 1;
  private baseScaleY = 1;
  private baseScaleBody?: Phaser.GameObjects.GameObject;
  private dashState: BossDashState = 'idle';
  private dashTimerMs = 0;
  private dashDirection = new Phaser.Math.Vector2(1, 0);
  private dashWarningLine?: Phaser.GameObjects.Line;
  private dashImpactWarningCircle?: Phaser.GameObjects.Arc;
  private dashStartedPending = false;
  private dashHitConsumed = false;
  private dashImpactPending = false;
  private dashPreviousPosition = new Phaser.Math.Vector2();
  private dashCurrentPosition = new Phaser.Math.Vector2();
  private dashImpactPosition = new Phaser.Math.Vector2();
  private knockbackVelocity = new Phaser.Math.Vector2();
  private knockbackRemainingMs = 0;
  private weaponKnockbackImmunityMs = 0;
  private modifierRuntime?: EnemyModifierRuntime;
  private shadow?: Phaser.GameObjects.Ellipse;
  private readonly shadowType: ShadowType;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly id: string,
    stats: EnemyStats,
    x: number,
    y: number,
  ) {
    this.maxHp = stats.hp;
    this.currentHp = stats.hp;
    this.moveSpeed = stats.moveSpeed;
    this.damage = stats.damage;
    this.exp = stats.exp;
    this.scale = stats.scale ?? 1;
    this.bossLike = stats.bossLike === true;
    this.dashEnabled = this.id === 'boss' && stats.dashEnabled === true;
    this.dashCooldown = stats.dashCooldown ?? 0;
    this.dashWarningDuration = stats.dashWarningDuration ?? 0;
    this.dashDuration = stats.dashDuration ?? 0;
    this.dashSpeed = stats.dashSpeed ?? 0;
    this.dashDamageMultiplier = stats.dashDamageMultiplier ?? 1;
    this.dashTimerMs = this.dashCooldown * 1000;
    this.body = this.createFallbackBody(scene, x, y);
    this.shadowType = this.resolveShadowType();
    this.shadow = ShadowFactory.createShadow(scene, this.body, this.shadowType, this.getShadowOptions());
    this.captureBaseScale(this.body);
  }

  setEventBus(eventBus: EventBus<GameEventMap>): void {
    this.eventBus = eventBus;
  }

  setModifierRuntime(modifierRuntime: EnemyModifierRuntime): void {
    if (modifierRuntime.isEmpty) {
      return;
    }

    this.modifierRuntime = modifierRuntime;
    this.modifierRuntime.attach(this);
  }

  takeDamage(hitResult: HitResult): number {
    if (this.isDead) {
      return 0;
    }

    const incomingDamage = Math.max(0, hitResult.damage);
    const modifiedDamage = this.modifierRuntime?.beforeTakeDamage(hitResult, incomingDamage) ?? {
      damage: incomingDamage,
      absorbedDamage: 0,
    };
    const actualDamage = Math.min(this.currentHp, Math.max(0, modifiedDamage.damage));

    this.currentHp -= actualDamage;
    this.modifierRuntime?.afterTakeDamage({
      enemy: this,
      hitResult,
      incomingDamage,
      actualDamage,
      absorbedDamage: modifiedDamage.absorbedDamage,
    });

    if (actualDamage > 0) {
      this.scene.events.emit('EnemyDamagedFloatingText', {
        x: this.body.x,
        y: this.body.y,
        damage: actualDamage,
        isBoss: this.bossLike || this.id.endsWith('_boss') || this.id === 'boss',
      });
    }

    if (this.currentHp <= 0) {
      this.currentHp = 0;
      this.isDead = true;
      this.publishKilled();
      return actualDamage;
    }

    this.playHitFeedback();
    return actualDamage;
  }

  updateModifiers(deltaMs: number): void {
    this.modifierRuntime?.update(deltaMs);
  }

  refreshShadow(): void {
    ShadowFactory.destroyShadow(this.shadow);
    this.shadow = ShadowFactory.createShadow(this.scene, this.body, this.shadowType, this.getShadowOptions());
  }

  updateShadow(): void {
    this.shadow = this.shadow
      ? ShadowFactory.updateShadow(this.shadow, this.body, this.shadowType, this.getShadowOptions())
      : ShadowFactory.createShadow(this.scene, this.body, this.shadowType, this.getShadowOptions());
  }

  getDamageTargetContext(): DamageTargetContext {
    const isEndlessBoss = this.id.startsWith('endless_') && this.bossLike;
    const isMiniBoss = this.id.endsWith('_boss');
    const isBoss = this.id === 'boss' || isEndlessBoss;
    const isElite = !isBoss && (isMiniBoss || this.bossLike);

    return {
      enemyId: this.id,
      isBoss,
      isElite,
      isMiniBoss,
      isEndlessBoss,
    };
  }

  triggerModifierDeathEffects(context: Omit<EnemyModifierDeathContext, 'enemy'>): void {
    this.modifierRuntime?.onDeath({
      ...context,
      enemy: this,
    });
  }

  updateDash(
    deltaMs: number,
    target: { x: number; y: number },
    worldBounds: { width: number; height: number },
  ): boolean {
    if (!this.dashEnabled || this.isDead) {
      return false;
    }

    if (this.dashState === 'idle') {
      this.dashTimerMs -= deltaMs;

      if (this.dashTimerMs > 0) {
        return false;
      }

      this.startDashWarning(target, worldBounds);
      return true;
    }

    if (this.dashState === 'warning') {
      this.dashTimerMs -= deltaMs;
      this.updateDashWarningLine();

      if (this.dashTimerMs <= 0) {
        this.startDashing();
      }

      return true;
    }

    this.updateDashMovement(deltaMs, worldBounds);
    return true;
  }

  applyWeaponKnockback(
    direction: Phaser.Math.Vector2,
    strength: number,
    durationMs: number,
  ): boolean {
    if (
      this.id === 'boss'
      || this.bossLike
      || this.isDead
      || this.isWeaponKnockbackImmune()
      || strength <= 0
      || durationMs <= 0
    ) {
      return false;
    }

    const knockbackDirection = direction.clone();

    if (knockbackDirection.lengthSq() === 0) {
      knockbackDirection.set(1, 0);
    }

    const resistanceMultiplier = this.id.endsWith('_boss') ? 0.5 : 1;
    const adjustedStrength = strength * resistanceMultiplier;

    this.knockbackVelocity = knockbackDirection
      .normalize()
      .scale(adjustedStrength / (durationMs / 1000));
    this.knockbackRemainingMs = durationMs;
    this.weaponKnockbackImmunityMs = this.getWeaponKnockbackImmunityDurationMs();
    return true;
  }

  updateWeaponKnockback(
    deltaMs: number,
    worldBounds: { width: number; height: number },
  ): boolean {
    this.weaponKnockbackImmunityMs = Math.max(
      0,
      this.weaponKnockbackImmunityMs - deltaMs,
    );

    if (this.knockbackRemainingMs <= 0 || this.isDead) {
      return false;
    }

    const deltaSeconds = deltaMs / 1000;
    const radius = this.getBodyRadius();

    this.body.x = Phaser.Math.Clamp(
      this.body.x + this.knockbackVelocity.x * deltaSeconds,
      radius,
      worldBounds.width - radius,
    );
    this.body.y = Phaser.Math.Clamp(
      this.body.y + this.knockbackVelocity.y * deltaSeconds,
      radius,
      worldBounds.height - radius,
    );
    this.knockbackRemainingMs = Math.max(0, this.knockbackRemainingMs - deltaMs);

    if (this.knockbackRemainingMs <= 0) {
      this.knockbackVelocity.set(0, 0);
    }

    this.updateShadow();
    return true;
  }

  isWeaponKnockbackImmune(): boolean {
    return this.weaponKnockbackImmunityMs > 0;
  }

  private getWeaponKnockbackImmunityDurationMs(): number {
    return this.id.endsWith('_boss')
      ? Enemy.MINI_BOSS_WEAPON_KNOCKBACK_IMMUNITY_MS
      : Enemy.NORMAL_WEAPON_KNOCKBACK_IMMUNITY_MS;
  }

  isDashing(): boolean {
    return this.dashState === 'dashing';
  }

  consumeDashStarted(): boolean {
    if (!this.dashStartedPending) {
      return false;
    }

    this.dashStartedPending = false;
    return true;
  }

  consumeDashHit(): boolean {
    if (this.dashHitConsumed || (!this.isDashing() && !this.dashImpactPending)) {
      return false;
    }

    this.dashHitConsumed = true;
    return true;
  }

  consumeDashImpact(): Phaser.Math.Vector2 | undefined {
    if (!this.dashImpactPending) {
      return undefined;
    }

    this.dashImpactPending = false;
    return this.dashImpactPosition.clone();
  }

  getDashSegment(): {
    start: Phaser.Math.Vector2;
    end: Phaser.Math.Vector2;
  } | undefined {
    if (!this.isDashing()) {
      return undefined;
    }

    return {
      start: this.dashPreviousPosition.clone(),
      end: this.dashCurrentPosition.clone(),
    };
  }

  getDashDirection(): Phaser.Math.Vector2 {
    return this.dashDirection.clone();
  }

  destroy(): void {
    this.destroyDashWarnings();
    ShadowFactory.destroyShadow(this.shadow);
    this.shadow = undefined;
    this.body.destroy();
  }

  private startDashWarning(
    target: { x: number; y: number },
    worldBounds: { width: number; height: number },
  ): void {
    this.dashState = 'warning';
    this.dashTimerMs = this.dashWarningDuration
      * Enemy.DASH_WARNING_DURATION_MULTIPLIER
      * 1000;
    this.dashDirection.set(target.x - this.body.x, target.y - this.body.y);

    if (this.dashDirection.lengthSq() === 0) {
      this.dashDirection.set(1, 0);
    }

    this.dashDirection.normalize();
    this.updateDashImpactPosition(worldBounds);
    this.createDashWarningLine();
    this.createDashImpactWarningCircle();
  }

  private startDashing(): void {
    this.dashState = 'dashing';
    this.dashTimerMs = this.dashDuration * 1000;
    this.dashStartedPending = true;
    this.dashHitConsumed = false;
    this.dashPreviousPosition.set(this.body.x, this.body.y);
    this.dashCurrentPosition.set(this.body.x, this.body.y);
    this.destroyDashWarnings();
  }

  private updateDashMovement(
    deltaMs: number,
    worldBounds: { width: number; height: number },
  ): void {
    const distance = this.dashSpeed * (deltaMs / 1000);
    const radius = this.getBodyRadius();
    this.dashPreviousPosition.set(this.body.x, this.body.y);
    const nextX = Phaser.Math.Clamp(
      this.body.x + this.dashDirection.x * distance,
      radius,
      worldBounds.width - radius,
    );
    const nextY = Phaser.Math.Clamp(
      this.body.y + this.dashDirection.y * distance,
      radius,
      worldBounds.height - radius,
    );
    const hitBoundary = nextX === this.body.x && nextY === this.body.y;

    this.body.setPosition(nextX, nextY);
    this.dashCurrentPosition.set(this.body.x, this.body.y);
    this.updateShadow();
    this.dashTimerMs -= deltaMs;

    if (this.dashTimerMs <= 0 || hitBoundary) {
      this.finishDash();
    }
  }

  private finishDash(): void {
    this.dashImpactPending = true;
    this.dashImpactPosition.set(this.body.x, this.body.y);
    this.showDashImpactFeedback();
    this.dashState = 'idle';
    this.dashTimerMs = this.dashCooldown * 1000;
  }

  private createDashWarningLine(): void {
    this.destroyDashWarnings();
    this.dashWarningLine = this.scene.add.line(
      this.body.x,
      this.body.y,
      0,
      0,
      this.dashDirection.x * 620,
      this.dashDirection.y * 620,
      0xef4444,
      0.42,
    );
    this.dashWarningLine.setOrigin(0, 0);
    this.dashWarningLine.setLineWidth(18);
    this.dashWarningLine.setDepth(34);
  }

  private createDashImpactWarningCircle(): void {
    this.destroyDashImpactWarningCircle();
    this.dashImpactWarningCircle = this.scene.add.circle(
      this.dashImpactPosition.x,
      this.dashImpactPosition.y,
      140,
      0xef4444,
      0.16,
    );
    this.dashImpactWarningCircle.setStrokeStyle(3, 0xfca5a5, 0.75);
    this.dashImpactWarningCircle.setDepth(33);
  }

  private updateDashWarningLine(): void {
    if (!this.dashWarningLine?.active) {
      return;
    }

    this.dashWarningLine.setPosition(this.body.x, this.body.y);
    this.dashWarningLine.setTo(
      0,
      0,
      this.dashDirection.x * 620,
      this.dashDirection.y * 620,
    );
    this.dashImpactWarningCircle?.setPosition(
      this.dashImpactPosition.x,
      this.dashImpactPosition.y,
    );
  }

  private updateDashImpactPosition(worldBounds: { width: number; height: number }): void {
    const distance = this.dashSpeed * this.dashDuration;
    const radius = this.getBodyRadius();
    this.dashImpactPosition.set(
      Phaser.Math.Clamp(
        this.body.x + this.dashDirection.x * distance,
        radius,
        worldBounds.width - radius,
      ),
      Phaser.Math.Clamp(
        this.body.y + this.dashDirection.y * distance,
        radius,
        worldBounds.height - radius,
      ),
    );
  }

  private showDashImpactFeedback(): void {
    const impact = this.scene.add.circle(
      this.dashImpactPosition.x,
      this.dashImpactPosition.y,
      140,
      0xf97316,
      0.24,
    );

    impact.setStrokeStyle(4, 0xf97316, 0.9);
    impact.setDepth(36);

    this.scene.tweens.add({
      targets: impact,
      alpha: 0,
      scaleX: 1.25,
      scaleY: 1.25,
      duration: 220,
      onComplete: () => {
        if (impact.active) {
          impact.destroy();
        }
      },
    });
  }

  private destroyDashWarnings(): void {
    if (this.dashWarningLine?.active) {
      this.dashWarningLine.destroy();
    }

    this.dashWarningLine = undefined;
    this.destroyDashImpactWarningCircle();
  }

  private destroyDashImpactWarningCircle(): void {
    if (this.dashImpactWarningCircle?.active) {
      this.dashImpactWarningCircle.destroy();
    }

    this.dashImpactWarningCircle = undefined;
  }

  private getBodyRadius(): number {
    const body = this.body as Phaser.GameObjects.GameObject & { radius?: number };

    return body.radius ?? 12 * this.scale;
  }

  private createFallbackBody(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Arc {
    const collisionRadius = 12 * this.scale;
    const visualRadius = VisualScale.getEnemyFallbackVisualRadius(this.id, this.scale);
    const body = scene.add.circle(x, y, collisionRadius, 0xef4444);

    body.setScale(visualRadius / Math.max(1, collisionRadius));
    return body;
  }

  private resolveShadowType(): ShadowType {
    if (this.id === 'boss' || (this.id.startsWith('endless_') && this.bossLike)) {
      return 'boss';
    }

    if (this.bossLike || this.id.endsWith('_boss')) {
      return 'miniBoss';
    }

    return 'enemy';
  }

  private getShadowOptions(): Partial<ShadowConfig> | undefined {
    if (this.shadowType === 'enemy') {
      return undefined;
    }

    return {
      width: this.shadowType === 'boss' ? 120 * this.scale : 72 * this.scale,
      height: this.shadowType === 'boss' ? 40 * this.scale : 24 * this.scale,
      offsetY: this.shadowType === 'boss' ? 60 * this.scale : 36 * this.scale,
    };
  }

  private playHitFeedback(): void {
    const body = this.body as Phaser.GameObjects.GameObject & {
      active: boolean;
      alpha: number;
      scaleX: number;
      scaleY: number;
      setAlpha?: (value: number) => void;
      setFillStyle?: (color: number) => void;
      setScale?: (x: number, y?: number) => void;
      setTint?: (color: number) => void;
      clearTint?: () => void;
    };

    this.captureBaseScale(body);
    body.setScale?.(this.baseScaleX, this.baseScaleY);
    body.setFillStyle?.(0xffffff);
    body.setTint?.(0xffffff);
    body.setAlpha?.(0.65);

    this.scene.tweens.add({
      targets: body,
      duration: 90,
      alpha: 1,
      onComplete: () => {
        if (!body.active || this.isDead) {
          return;
        }

        body.clearTint?.();
        body.setFillStyle?.(0xef4444);
        body.setScale?.(this.baseScaleX, this.baseScaleY);
      },
    });
  }

  private captureBaseScale(
    body: Phaser.GameObjects.GameObject & { scaleX?: number; scaleY?: number },
  ): void {
    if (this.baseScaleBody === body) {
      return;
    }

    this.baseScaleBody = body;
    this.baseScaleX = body.scaleX ?? 1;
    this.baseScaleY = body.scaleY ?? 1;
  }

  private publishKilled(): void {
    this.eventBus?.publish('EnemyKilled', {
      x: this.body.x,
      y: this.body.y,
      exp: this.exp,
      enemyId: this.id,
      isBoss: this.id.endsWith('_boss') || this.id === 'boss',
    });
  }
}
