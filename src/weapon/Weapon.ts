import Phaser from 'phaser';

import { DamageCalculator } from '../combat/DamageCalculator';
import { DamageType } from '../combat/DamageType';
import { HitResult } from '../combat/HitResult';
import { Enemy } from '../enemy/Enemy';
import type { EnemyQuery } from '../enemy/EnemyQuery';
import { RunStats } from '../stats/RunStats';
import type { WeaponConfig } from '../core/domain/WeaponTypes';
import type { WeaponRuntimeContext } from './WeaponRuntimeContext';
import type { WeaponTarget } from './WeaponTarget';

export type { WeaponConfig, WeaponType } from '../core/domain/WeaponTypes';
export type {
  ProjectilePathQuery,
  WeaponCharacterRuntimeView,
  WeaponRuntimeContext,
} from './WeaponRuntimeContext';

export interface WeaponUpdateContext extends WeaponRuntimeContext {
  enemies: readonly Enemy[];
}

export interface WeaponCooldownStatus {
  remainingMs: number;
  totalMs: number;
  ready: boolean;
}

export abstract class Weapon {
  private elapsedCooldownMs = 0;
  private totalDamage = 0;
  protected damage: number;
  protected cooldownSeconds: number;
  protected radius: number;
  protected projectileSpeed: number;
  private runStats?: RunStats;
  private passiveDamageMultiplier = 1;
  private passiveBossDamageMultiplier = 1;
  private passiveEliteDamageMultiplier = 1;
  private passiveCooldownMultiplier = 1;
  private passiveProjectileSpeedMultiplier = 1;
  private passiveKnockbackPowerMultiplier = 1;
  private runtimeDamageMultiplierProvider?: (weaponId: string) => number;
  private visualTierProvider?: (weaponId: string) => {
    level?: number;
    maxLevel?: number;
    evolved?: boolean;
  };

  protected constructor(
    protected readonly scene: Phaser.Scene,
    readonly id: string,
    protected readonly config: WeaponConfig,
    private readonly damageCalculator = new DamageCalculator(),
  ) {
    this.damage = config.damage;
    this.cooldownSeconds = config.cooldown;
    this.radius = config.radius ?? 0;
    this.projectileSpeed = config.projectileSpeed ?? 0;
  }

  update(context: WeaponUpdateContext): void {
    this.elapsedCooldownMs += context.deltaMs;

    if (this.elapsedCooldownMs < this.cooldownMs) {
      return;
    }

    this.elapsedCooldownMs = 0;
    this.activate(context);
  }

  applyUpgrade(_upgradeId: string): boolean {
    return false;
  }

  setRunStats(runStats: RunStats): void {
    this.runStats = runStats;
  }

  setPassiveModifiers(modifiers: {
    damageMultiplier: number;
    bossDamageMultiplier?: number;
    eliteDamageMultiplier?: number;
    cooldownMultiplier: number;
    projectileSpeedMultiplier: number;
    knockbackPowerMultiplier?: number;
  }): void {
    this.passiveDamageMultiplier = modifiers.damageMultiplier;
    this.passiveBossDamageMultiplier = modifiers.bossDamageMultiplier ?? 1;
    this.passiveEliteDamageMultiplier = modifiers.eliteDamageMultiplier ?? 1;
    this.passiveCooldownMultiplier = modifiers.cooldownMultiplier;
    this.passiveProjectileSpeedMultiplier = modifiers.projectileSpeedMultiplier;
    this.passiveKnockbackPowerMultiplier = modifiers.knockbackPowerMultiplier ?? 1;
  }

  setRuntimeDamageMultiplierProvider(provider: ((weaponId: string) => number) | undefined): void {
    this.runtimeDamageMultiplierProvider = provider;
  }

  setVisualTierProvider(provider: ((weaponId: string) => {
    level?: number;
    maxLevel?: number;
    evolved?: boolean;
  }) | undefined): void {
    this.visualTierProvider = provider;
  }

  get totalDamageDealt(): number {
    return this.totalDamage;
  }

  getCooldownStatus(): WeaponCooldownStatus {
    const totalMs = Math.max(0, this.cooldownMs);
    const remainingMs = Math.max(0, totalMs - this.elapsedCooldownMs);

    return {
      remainingMs,
      totalMs,
      ready: remainingMs <= 0,
    };
  }

  shouldShowCooldownInHud(): boolean {
    const behaviorType = this.config.behavior?.type;

    return this.config.type !== 'aura'
      && this.config.type !== 'orbit'
      && behaviorType !== 'aura'
      && behaviorType !== 'orbit';
  }

  protected createHitResult(enemy?: WeaponTarget): HitResult {
    return this.damageCalculator.calculateDamage(
      this.getTargetModifiedDamage(this.modifiedDamage, enemy),
      DamageType.Normal,
    );
  }

  protected createHitResultWithMultiplier(multiplier: number, enemy?: WeaponTarget): HitResult {
    return this.damageCalculator.calculateDamage(
      this.getTargetModifiedDamage(this.modifiedDamage * multiplier, enemy),
      DamageType.Normal,
    );
  }

  protected createHitResultFromDamage(damage: number, enemy?: WeaponTarget): HitResult {
    return this.damageCalculator.calculateDamage(
      this.getTargetModifiedDamage(damage, enemy),
      DamageType.Normal,
    );
  }

  protected get modifiedDamage(): number {
    return this.damage
      * this.passiveDamageMultiplier
      * (this.runtimeDamageMultiplierProvider?.(this.id) ?? 1);
  }

  protected get cooldownMs(): number {
    return this.cooldownSeconds * this.passiveCooldownMultiplier * 1000;
  }

  protected get modifiedProjectileSpeed(): number {
    return this.projectileSpeed * this.passiveProjectileSpeedMultiplier;
  }

  protected getVisualTierInput(): { level?: number; maxLevel?: number; evolved?: boolean } | undefined {
    return this.visualTierProvider?.(this.id);
  }

  private getTargetModifiedDamage(damage: number, enemy: WeaponTarget | undefined): number {
    return damage * this.damageCalculator.getTargetDamageMultiplier(
      enemy?.getDamageTargetContext(),
      {
        bossDamageMultiplier: this.passiveBossDamageMultiplier,
        eliteDamageMultiplier: this.passiveEliteDamageMultiplier,
      },
    );
  }

  protected increaseDamage(rate: number): void {
    this.damage *= 1 + rate;
  }

  protected reduceCooldown(rate: number, minimumSeconds: number): void {
    this.cooldownSeconds = Math.max(
      minimumSeconds,
      this.cooldownSeconds * (1 - rate),
    );
  }

  protected increaseRadius(rate: number): void {
    this.radius *= 1 + rate;
  }

  protected recordDamageDealt(damage: number): void {
    this.totalDamage += Math.max(0, damage);
    this.runStats?.recordWeaponDamage(this.id, damage);
  }

  protected recordEnemyHit(enemy: EnemyQuery, damage: number): void {
    if (damage <= 0) {
      return;
    }

    this.recordDamageDealt(damage);
    this.runStats?.recordWeaponHit(this.id);

    if (enemy.isBoss()) {
      this.runStats?.recordBossDamageDealt(damage);
    }

    if (enemy.isDead) {
      this.runStats?.recordWeaponKill(this.id);
    }
  }

  protected applyWeaponKnockback(
    enemy: Enemy,
    direction: Phaser.Math.Vector2,
    hitSpeed: number,
    strengthMultiplier = 1,
  ): void {
    const knockbackPower = this.config.knockbackPower ?? 0;

    if (knockbackPower <= 0) {
      return;
    }

    const strength = (
      knockbackPower
      + Math.max(0, hitSpeed) * (this.config.knockbackSpeedFactor ?? 0)
    ) * strengthMultiplier * this.passiveKnockbackPowerMultiplier;

    enemy.applyWeaponKnockback(
      direction,
      strength,
      this.config.knockbackDurationMs ?? 120,
    );
  }

  protected abstract activate(context: WeaponUpdateContext): void;
}
