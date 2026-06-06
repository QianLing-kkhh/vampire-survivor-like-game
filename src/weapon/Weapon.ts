import Phaser from 'phaser';

import { DamageCalculator } from '../combat/DamageCalculator';
import { DamageType } from '../combat/DamageType';
import { HitResult } from '../combat/HitResult';
import { CharacterRuntime } from '../character/CharacterRuntime';
import { Enemy } from '../enemy/Enemy';
import { RunStats } from '../stats/RunStats';
import { WeaponBehaviorConfig } from './behavior/WeaponBehaviorConfig';
import { WeaponTag } from './tags/WeaponTag';

export type WeaponType = 'projectile' | 'aura' | 'orbit' | 'magic_wand' | 'axe';

export interface WeaponConfig {
  type: WeaponType | string;
  tags?: WeaponTag[];
  behavior?: WeaponBehaviorConfig;
  damage: number;
  cooldown: number;
  projectileSpeed?: number;
  projectileCount?: number;
  spreadAngle?: number;
  pierce?: number;
  radius?: number;
  orbitSpeed?: number;
  orbitCount?: number;
  hitRadius?: number;
  lifetime?: number;
  arcHeight?: number;
  knockbackPower?: number;
  knockbackSpeedFactor?: number;
  knockbackDurationMs?: number;
}

export interface WeaponUpdateContext {
  player: Phaser.GameObjects.GameObject & { x: number; y: number };
  enemies: readonly Enemy[];
  deltaMs: number;
  characterRuntime?: CharacterRuntime;
  isProjectilePathBlocked?: (
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    projectileRadius?: number,
  ) => boolean;
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

  get totalDamageDealt(): number {
    return this.totalDamage;
  }

  protected createHitResult(enemy?: Enemy): HitResult {
    return this.damageCalculator.calculateDamage(
      this.getTargetModifiedDamage(this.modifiedDamage, enemy),
      DamageType.Normal,
    );
  }

  protected createHitResultWithMultiplier(multiplier: number, enemy?: Enemy): HitResult {
    return this.damageCalculator.calculateDamage(
      this.getTargetModifiedDamage(this.modifiedDamage * multiplier, enemy),
      DamageType.Normal,
    );
  }

  protected createHitResultFromDamage(damage: number, enemy?: Enemy): HitResult {
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

  private getTargetModifiedDamage(damage: number, enemy: Enemy | undefined): number {
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

  protected recordEnemyHit(enemy: Enemy, damage: number): void {
    if (damage <= 0) {
      return;
    }

    this.recordDamageDealt(damage);
    this.runStats?.recordWeaponHit(this.id);

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
