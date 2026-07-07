import Phaser from 'phaser';

import { DamageTargetContext } from '../combat/DamageCalculator';
import { HitResult } from '../combat/HitResult';
import { EventBus } from '../core/EventBus';
import type { EnemyStats } from '../core/domain/EnemyTypes';
import type { GameEventMap } from '../core/domain/GameEvents';
import type { Vector2Like } from '../core/domain/Vector2';
import { ShadowConfig, ShadowType } from '../visual/ShadowConfig';
import { ShadowFactory } from '../visual/ShadowFactory';
import { VisualScale } from '../visual/VisualScale';
import { createEnemyDeathResult } from './EnemyDeathTypes';
import { ENEMY_POPULATION_CONFIG } from './EnemyPopulationConfig';
import { EnemyModel } from './EnemyModel';
import type { EnemyQuery } from './EnemyQuery';
import { EnemyModifierDeathContext } from './modifiers/EnemyModifier';
import { EnemyModifierRuntime } from './modifiers/EnemyModifierRuntime';
import type { AutoBossWarningSnapshot } from '../auto/AutoPlayerTypes';

type BossDashState = 'idle' | 'warning' | 'dashing';

export type {
  EnemyKilledEvent,
  EnemyStats,
} from '../core/domain/EnemyTypes';
export {
  isEnemyKilledEvent,
  isExpGainedEvent,
  isLevelUpEvent,
} from '../core/domain/GameEvents';
export type {
  ExpGainedEvent,
  GameEventMap,
  LevelUpEvent,
} from '../core/domain/GameEvents';

export class Enemy implements EnemyQuery {
  private static nextAutoMoveId = 1;
  private static readonly DASH_WARNING_DURATION_MULTIPLIER = 0.8;
  private static readonly BOSS_DASH_DISTANCE_MULTIPLIER = 1.35;
  private static readonly NORMAL_WEAPON_KNOCKBACK_IMMUNITY_MS = 3000;
  private static readonly MINI_BOSS_WEAPON_KNOCKBACK_IMMUNITY_MS = 5000;
  private static readonly MAP_SLOW_SNOWFLAKE_COLOR = '#bfdbfe';
  private static readonly MAP_SLOW_SNOWFLAKE_ALPHA_MIN = 0.45;
  private static readonly MAP_SLOW_SNOWFLAKE_ALPHA_MAX = 0.85;
  private static readonly MAP_SLOW_VISUAL_MIN_MULTIPLIER = 0.25;

  readonly body: Phaser.GameObjects.Arc;
  readonly moveSpeed: number;
  damage: number;
  exp: number;
  scale: number;
  readonly bossLike: boolean;
  readonly dashEnabled: boolean;
  readonly dashCooldown: number;
  readonly dashWarningDuration: number;
  readonly dashDuration: number;
  readonly dashSpeed: number;
  readonly dashDamageMultiplier: number;
  private readonly autoMoveId: string;

  private readonly model: EnemyModel;
  private eventBus?: EventBus<GameEventMap>;
  private readonly baseScale: number;
  private readonly mergeable: boolean;
  private spawnMergeLockRemainingMs = ENEMY_POPULATION_CONFIG.spawnMergeLockMs;
  private mergeCooldownRemainingMs = 0;
  private mergeCheckCooldownRemainingMs = 0;
  private mergePreparationRemainingMs = 0;
  private mergePreparationPartner?: Enemy;
  private movementLockRemainingMs = 0;
  private contactDamageImmunityRemainingMs = 0;
  private removedByMerge = false;
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
  private dashTravelDistance = 0;
  private dashPreviousPosition = new Phaser.Math.Vector2();
  private dashCurrentPosition = new Phaser.Math.Vector2();
  private dashImpactPosition = new Phaser.Math.Vector2();
  private knockbackVelocity = new Phaser.Math.Vector2();
  private knockbackRemainingMs = 0;
  private weaponKnockbackImmunityMs = 0;
  private modifierRuntime?: EnemyModifierRuntime;
  private shadow?: Phaser.GameObjects.Ellipse;
  private readonly shadowType: ShadowType;
  private mapSlowVisual?: Phaser.GameObjects.Text;
  private isMapSlowVisualActive = false;
  private destroyed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly id: string,
    stats: EnemyStats,
    x: number,
    y: number,
  ) {
    this.autoMoveId = `enemy-${Enemy.nextAutoMoveId}`;
    Enemy.nextAutoMoveId += 1;
    this.moveSpeed = stats.moveSpeed;
    this.damage = stats.damage;
    this.exp = stats.exp;
    this.scale = stats.scale ?? 1;
    this.baseScale = this.scale;
    this.bossLike = stats.bossLike === true;
    this.dashEnabled = this.id === 'boss' && stats.dashEnabled === true;
    this.mergeable = stats.mergeable !== false
      && !this.bossLike
      && !this.dashEnabled
      && !this.id.endsWith('_boss')
      && this.id !== 'boss'
      && !this.id.startsWith('endless_');
    this.dashCooldown = stats.dashCooldown ?? 0;
    this.dashWarningDuration = stats.dashWarningDuration ?? 0;
    this.dashDuration = stats.dashDuration ?? 0;
    this.dashSpeed = stats.dashSpeed ?? 0;
    this.dashDamageMultiplier = stats.dashDamageMultiplier ?? 1;
    this.model = new EnemyModel({
      id,
      position: { x, y },
      collisionRadius: 12 * this.scale,
      maxHp: stats.hp,
      currentHp: stats.hp,
      alive: true,
      bossLike: this.bossLike,
      mergeLevel: 1,
    });
    this.dashTimerMs = this.dashCooldown * 1000;
    this.body = this.createFallbackBody(scene, x, y);
    this.shadowType = this.resolveShadowType();
    this.shadow = ShadowFactory.createShadow(scene, this.body, this.shadowType, this.getShadowOptions());
    this.captureBaseScale(this.body);
  }

  getAutoMoveId(): string {
    return this.autoMoveId;
  }

  get maxHp(): number {
    return this.model.maxHp;
  }

  set maxHp(value: number) {
    this.model.maxHp = Math.max(0, value);
  }

  get currentHp(): number {
    return this.model.currentHp;
  }

  set currentHp(value: number) {
    this.model.currentHp = Math.max(0, value);
    this.model.alive = this.model.currentHp > 0 && this.model.alive;
  }

  get isDead(): boolean {
    return !this.model.alive;
  }

  set isDead(value: boolean) {
    this.model.alive = !value;
  }

  get mergeLevel(): number {
    return this.model.mergeLevel;
  }

  set mergeLevel(value: number) {
    this.model.mergeLevel = Math.max(1, Math.floor(value));
  }

  getPositionLike(): Vector2Like {
    this.model.syncPosition(this.body);
    return {
      x: this.model.position.x,
      y: this.model.position.y,
    };
  }

  getCollisionRadius(): number {
    this.model.syncCollisionRadius(this.getBodyRadius());
    return this.model.collisionRadius;
  }

  getHealthSnapshot(): { currentHp: number; maxHp: number } {
    return {
      currentHp: this.currentHp,
      maxHp: this.maxHp,
    };
  }

  getEnemySnapshot(): ReturnType<EnemyQuery['getEnemySnapshot']> {
    const targetContext = this.getDamageTargetContext();

    return {
      id: this.id,
      autoMoveId: this.getAutoMoveId(),
      position: this.getPositionLike(),
      collisionRadius: this.getCollisionRadius(),
      health: this.getHealthSnapshot(),
      moveSpeed: this.moveSpeed,
      damage: this.damage,
      alive: this.isAlive(),
      bossLike: this.bossLike,
      boss: targetContext.isBoss,
      elite: targetContext.isElite,
      miniBoss: targetContext.isMiniBoss,
      endlessBoss: targetContext.isEndlessBoss,
      mergeLevel: this.mergeLevel,
    };
  }

  isBossLike(): boolean {
    return this.bossLike;
  }

  isBoss(): boolean {
    return this.getDamageTargetContext().isBoss;
  }

  isElite(): boolean {
    return this.getDamageTargetContext().isElite;
  }

  isAlive(): boolean {
    return !this.isDead;
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
    this.updateMergeState(deltaMs);
    this.modifierRuntime?.update(deltaMs);
  }

  canMergeWith(other: Enemy, maxMergeLevel = ENEMY_POPULATION_CONFIG.mergeMaxLevel): boolean {
    return (
      this.canMerge(maxMergeLevel)
      && other.canMerge(maxMergeLevel)
      && this.id === other.id
      && this.mergeLevel === other.mergeLevel
      && this.isTouching(other)
    );
  }

  beginMergePreparation(other: Enemy): boolean {
    if (!this.canMergeWith(other)) {
      return false;
    }

    this.mergePreparationPartner = other;
    other.mergePreparationPartner = this;
    this.mergePreparationRemainingMs = ENEMY_POPULATION_CONFIG.mergePreparationDurationMs;
    other.mergePreparationRemainingMs = ENEMY_POPULATION_CONFIG.mergePreparationDurationMs;
    this.markMergeChecked();
    other.markMergeChecked();
    return true;
  }

  cancelMergePreparation(): void {
    const partner = this.mergePreparationPartner;

    this.mergePreparationPartner = undefined;
    this.mergePreparationRemainingMs = 0;

    if (partner?.mergePreparationPartner === this) {
      partner.mergePreparationPartner = undefined;
      partner.mergePreparationRemainingMs = 0;
    }
  }

  isPreparingMerge(): boolean {
    return this.mergePreparationPartner !== undefined;
  }

  getMergePreparationRemainingMs(): number {
    return this.mergePreparationRemainingMs;
  }

  setMergePreparationRemainingMs(remainingMs: number): void {
    if (!this.isPreparingMerge()) {
      return;
    }

    this.mergePreparationRemainingMs = Math.max(0, remainingMs);
  }

  completeMergeWith(other: Enemy): boolean {
    if (this.isDead || other.isDead) {
      return false;
    }

    this.cancelMergePreparation();
    other.cancelMergePreparation();
    this.mergeLevel = Math.min(
      ENEMY_POPULATION_CONFIG.mergeMaxLevel,
      this.mergeLevel + 1,
    );
    this.maxHp += other.maxHp;
    this.currentHp += other.currentHp;
    this.damage += other.damage;
    this.exp = (this.exp + other.exp) * 2;
    this.scale = this.baseScale * (
      1 + ENEMY_POPULATION_CONFIG.mergeScaleGrowthPerLevel * (this.mergeLevel - 1)
    );
    this.mergeCooldownRemainingMs = ENEMY_POPULATION_CONFIG.mergeCooldownMs;
    this.mergeCheckCooldownRemainingMs = ENEMY_POPULATION_CONFIG.mergeCheckCooldownMs;
    this.contactDamageImmunityRemainingMs = ENEMY_POPULATION_CONFIG.mergeContactDamageImmunityMs;
    this.refreshVisualScale();
    other.isDead = true;
    other.removedByMerge = true;
    other.destroy();
    return true;
  }

  wasRemovedByMerge(): boolean {
    return this.removedByMerge;
  }

  markMergeChecked(): void {
    this.mergeCheckCooldownRemainingMs = ENEMY_POPULATION_CONFIG.mergeCheckCooldownMs;
  }

  isMovementLocked(): boolean {
    return this.movementLockRemainingMs > 0 || this.isPreparingMerge();
  }

  isContactDamageSuppressed(): boolean {
    return this.contactDamageImmunityRemainingMs > 0;
  }

  refreshShadow(): void {
    ShadowFactory.destroyShadow(this.shadow);
    this.shadow = ShadowFactory.createShadow(this.scene, this.body, this.shadowType, this.getShadowOptions());
  }

  refreshVisualScale(): void {
    const displaySize = VisualScale.getEnemyDisplaySize(this.id, this.scale)
      * VisualScale.getEnemyVisualDisplayMultiplier(this.id);
    const body = this.body as Phaser.GameObjects.GameObject & {
      radius?: number;
      setDisplaySize?: (width: number, height: number) => void;
      setScale?: (x: number, y?: number) => void;
    };
    body.radius = 12 * this.scale;

    if (body.setDisplaySize) {
      body.setDisplaySize(displaySize, displaySize);
    } else {
      body.setScale?.(VisualScale.getEnemyFallbackVisualRadius(this.id, this.scale) / this.getBodyRadius());
    }

    this.captureBaseScale(body, true);
    this.updateShadow();
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

  getAutoBossWarnings(): AutoBossWarningSnapshot[] {
    if (this.dashState !== 'warning') {
      return [];
    }

    return [
      {
        shape: 'line',
        kind: 'dash',
        danger: 'damage',
        bossId: 'final_boss',
        skillId: 'final_boss_dash',
        start: { x: this.body.x, y: this.body.y },
        end: { x: this.dashImpactPosition.x, y: this.dashImpactPosition.y },
        width: 220,
        remainingMs: Math.max(0, this.dashTimerMs),
      },
      {
        shape: 'circle',
        kind: 'impact',
        danger: 'damage',
        bossId: 'final_boss',
        skillId: 'final_boss_dash_impact',
        x: this.dashImpactPosition.x,
        y: this.dashImpactPosition.y,
        radius: 140,
        remainingMs: Math.max(0, this.dashTimerMs),
      },
    ];
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.destroyDashWarnings();
    ShadowFactory.destroyShadow(this.shadow);
    this.shadow = undefined;
    this.destroyMapSlowVisual();

    if (this.body.scene) {
      this.body.destroy();
    }
  }

  setMapSlowVisual(active: boolean, multiplier = 1): boolean {
    if (active) {
      if (!this.isBodyUsable()) {
        this.clearMapSlowVisual();
        return false;
      }

      const normalizedMultiplier = Math.max(
        Enemy.MAP_SLOW_VISUAL_MIN_MULTIPLIER,
        Math.min(1, multiplier),
      );
      const intensity = (1 - normalizedMultiplier) / (1 - Enemy.MAP_SLOW_VISUAL_MIN_MULTIPLIER);
      const alpha = Phaser.Math.Linear(
        Enemy.MAP_SLOW_SNOWFLAKE_ALPHA_MIN,
        Enemy.MAP_SLOW_SNOWFLAKE_ALPHA_MAX,
        Phaser.Math.Clamp(intensity, 0, 1),
      );
      const fontSize = Math.round(this.getBodyRadius() * (1 + intensity * 0.2));
      const wasActive = this.isMapSlowVisualActive;

      if (!this.mapSlowVisual) {
        this.mapSlowVisual = this.scene.add.text(
          this.body.x,
          this.body.y,
          '\u2744',
          {
            color: Enemy.MAP_SLOW_SNOWFLAKE_COLOR,
            fontSize: `${fontSize}px`,
            fontStyle: 'bold',
            stroke: '#0f172a',
            strokeThickness: 2,
          },
        );
        this.mapSlowVisual.setOrigin(0.5);
        this.mapSlowVisual.setDepth(this.getMapSlowVisualDepth());
      }

      this.mapSlowVisual.setPosition(this.body.x, this.body.y - this.getBodyRadius() * 1.2);
      this.mapSlowVisual.setFontSize(fontSize);
      this.mapSlowVisual.setAlpha(alpha);
      this.mapSlowVisual.setVisible(true);
      this.isMapSlowVisualActive = true;
      return !wasActive;
    }

    this.clearMapSlowVisual();
    return false;
  }

  clearMapSlowVisual(): void {
    this.mapSlowVisual?.setVisible(false);
    this.mapSlowVisual?.setAlpha(0);
    this.isMapSlowVisualActive = false;
  }

  private destroyMapSlowVisual(): void {
    if (this.mapSlowVisual?.scene) {
      this.mapSlowVisual.destroy();
    }

    this.mapSlowVisual = undefined;
    this.isMapSlowVisualActive = false;
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
    let targetDistance = this.dashDirection.length();

    if (this.dashDirection.lengthSq() === 0) {
      this.dashDirection.set(1, 0);
      targetDistance = this.dashSpeed * this.dashDuration;
    }

    this.dashDirection.normalize();
    this.dashTravelDistance = targetDistance * Enemy.BOSS_DASH_DISTANCE_MULTIPLIER;
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
    const dashDurationMs = Math.max(1, this.dashDuration * 1000);
    const distance = this.dashTravelDistance * (deltaMs / dashDurationMs);
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
      this.dashDirection.x * this.dashTravelDistance,
      this.dashDirection.y * this.dashTravelDistance,
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
      this.dashDirection.x * this.dashTravelDistance,
      this.dashDirection.y * this.dashTravelDistance,
    );
    this.dashImpactWarningCircle?.setPosition(
      this.dashImpactPosition.x,
      this.dashImpactPosition.y,
    );
  }

  private updateDashImpactPosition(worldBounds: { width: number; height: number }): void {
    const radius = this.getBodyRadius();
    this.dashImpactPosition.set(
      Phaser.Math.Clamp(
        this.body.x + this.dashDirection.x * this.dashTravelDistance,
        radius,
        worldBounds.width - radius,
      ),
      Phaser.Math.Clamp(
        this.body.y + this.dashDirection.y * this.dashTravelDistance,
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

  private updateMergeState(deltaMs: number): void {
    const effectiveDeltaMs = Math.max(0, deltaMs);

    this.spawnMergeLockRemainingMs = Math.max(0, this.spawnMergeLockRemainingMs - effectiveDeltaMs);
    this.mergeCooldownRemainingMs = Math.max(0, this.mergeCooldownRemainingMs - effectiveDeltaMs);
    this.mergeCheckCooldownRemainingMs = Math.max(0, this.mergeCheckCooldownRemainingMs - effectiveDeltaMs);
    this.movementLockRemainingMs = Math.max(0, this.movementLockRemainingMs - effectiveDeltaMs);
    this.contactDamageImmunityRemainingMs = Math.max(
      0,
      this.contactDamageImmunityRemainingMs - effectiveDeltaMs,
    );
  }

  private canMerge(maxMergeLevel: number): boolean {
    return (
      this.mergeable
      && !this.isDead
      && !this.isPreparingMerge()
      && this.mergeLevel < maxMergeLevel
      && this.spawnMergeLockRemainingMs <= 0
      && this.mergeCooldownRemainingMs <= 0
      && this.mergeCheckCooldownRemainingMs <= 0
    );
  }

  private isTouching(other: Enemy): boolean {
    return Phaser.Math.Distance.Between(
      this.body.x,
      this.body.y,
      other.body.x,
      other.body.y,
    ) <= (
      this.getBodyRadius()
      + other.getBodyRadius()
    ) * ENEMY_POPULATION_CONFIG.mergeDetectionRadiusMultiplier;
  }

  private getMapSlowVisualDepth(): number {
    if (this.bossLike || this.id === 'boss' || this.id.startsWith('endless_')) {
      return 36;
    }

    return 34;
  }

  private isBodyUsable(): boolean {
    return Boolean(this.body && this.body.scene && this.body.active !== false);
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
    force = false,
  ): void {
    if (!force && this.baseScaleBody === body) {
      return;
    }

    this.baseScaleBody = body;
    this.baseScaleX = body.scaleX ?? 1;
    this.baseScaleY = body.scaleY ?? 1;
  }

  private publishKilled(): void {
    const deathResult = createEnemyDeathResult({
      position: this.getPositionLike(),
      exp: this.exp,
      mergeLevel: this.mergeLevel,
      enemyId: this.id,
      isBoss: this.id.endsWith('_boss') || this.id === 'boss',
      isBossLike: this.bossLike,
    });

    this.eventBus?.publish('EnemyKilled', deathResult.enemyKilledEvent);
  }
}
