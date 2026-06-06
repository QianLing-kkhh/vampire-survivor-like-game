import Phaser from 'phaser';

import { AssetKeyResolver } from '../assets/AssetKeyResolver';
import { Enemy } from '../enemy/Enemy';
import { VisualScale } from '../visual/VisualScale';

import { Weapon, WeaponConfig, WeaponUpdateContext } from './Weapon';
import { OrbitBehaviorConfig } from './behavior/WeaponBehaviorConfig';

type OrbitProjectileBody = Phaser.GameObjects.GameObject & {
  x: number;
  y: number;
  rotation?: number;
  destroy: () => void;
};

type OrbitWeaponConfig = WeaponConfig & {
  orbitCount?: number;
  hitRadius?: number;
};

interface OrbitProjectile {
  body: OrbitProjectileBody;
  angleDeg: number;
}

export class OrbitWeapon extends Weapon {
  private static readonly PROJECTILE_ROTATION_RADIANS_PER_SECOND = 3;

  private readonly projectiles: OrbitProjectile[] = [];
  private readonly hitCooldowns = new Map<Enemy, number>();
  private orbitSpeedDegreesPerSecond: number;
  private orbitProjectileCount: number;
  private readonly hitRadius: number;
  private orbitRadiusElapsedMs = 0;

  constructor(scene: Phaser.Scene, id: string, config: WeaponConfig) {
    super(scene, id, config);
    const orbitConfig = config as OrbitWeaponConfig;

    this.orbitSpeedDegreesPerSecond = config.orbitSpeed ?? 180;
    this.orbitProjectileCount = this.getInitialOrbitCount(config);
    this.hitRadius = orbitConfig.hitRadius ?? 36;
  }

  override update(context: WeaponUpdateContext): void {
    this.ensureProjectiles(context);
    this.updateHitCooldowns(context.deltaMs);
    this.updateProjectiles(context);
    this.checkHits(context);
  }

  destroy(): void {
    for (const projectile of this.projectiles) {
      projectile.body.destroy();
    }

    this.projectiles.length = 0;
    this.hitCooldowns.clear();
  }

  override applyUpgrade(upgradeId: string): boolean {
    if (this.id !== 'bible') {
      return false;
    }

    switch (upgradeId) {
      case 'bible_damage_up':
        this.increaseDamage(0.1);
        return true;
      case 'bible_orbit_speed_up':
        this.orbitSpeedDegreesPerSecond = Math.min(
          this.orbitSpeedDegreesPerSecond * 1.1,
          360,
        );
        return true;
      case 'bible_orbit_count_up':
        if (this.orbitProjectileCount >= 6) {
          console.warn('Bible orbit count is already at the maximum');
          return false;
        }

        this.orbitProjectileCount = Math.min(this.orbitProjectileCount + 1, 6);
        this.rebuildProjectiles();
        return true;
      default:
        return false;
    }
  }

  protected activate(_context: WeaponUpdateContext): void {
    // Orbit weapons update continuously instead of firing on the base cooldown.
  }

  private ensureProjectiles(context: WeaponUpdateContext): void {
    if (this.projectiles.length > 0) {
      return;
    }

    const currentRadiusPixels = this.currentRadiusPixels;

    for (let index = 0; index < this.orbitCount; index += 1) {
      const angleDeg = (360 / this.orbitCount) * index;
      const angleRad = Phaser.Math.DegToRad(angleDeg);

      this.projectiles.push({
        body: this.createProjectileBody(
          context.player.x + Math.cos(angleRad) * currentRadiusPixels,
          context.player.y + Math.sin(angleRad) * currentRadiusPixels,
        ),
        angleDeg,
      });
    }
  }

  private updateHitCooldowns(deltaMs: number): void {
    for (const [enemy, cooldownMs] of this.hitCooldowns) {
      const nextCooldownMs = cooldownMs - deltaMs;

      if (nextCooldownMs > 0 && !enemy.isDead) {
        this.hitCooldowns.set(enemy, nextCooldownMs);
        continue;
      }

      this.hitCooldowns.delete(enemy);
    }
  }

  private updateProjectiles(context: WeaponUpdateContext): void {
    const deltaSeconds = context.deltaMs / 1000;

    this.orbitRadiusElapsedMs += Math.max(0, context.deltaMs);
    const currentRadiusPixels = this.currentRadiusPixels;

    for (const projectile of this.projectiles) {
      projectile.angleDeg += this.orbitSpeedDegreesPerSecond * deltaSeconds;

      const angleRad = Phaser.Math.DegToRad(projectile.angleDeg);
      projectile.body.x = context.player.x + Math.cos(angleRad) * currentRadiusPixels;
      projectile.body.y = context.player.y + Math.sin(angleRad) * currentRadiusPixels;
      projectile.body.rotation = (projectile.body.rotation ?? 0)
        + deltaSeconds * OrbitWeapon.PROJECTILE_ROTATION_RADIANS_PER_SECOND;
    }
  }

  private checkHits(context: WeaponUpdateContext): void {
    for (const enemy of context.enemies) {
      if (enemy.isDead || this.hitCooldowns.has(enemy)) {
        continue;
      }

      if (!this.isEnemyTouchingProjectile(enemy)) {
        continue;
      }

      const actualDamage = enemy.takeDamage(this.createHitResult(enemy));

      this.recordEnemyHit(enemy, actualDamage);
      this.applyWeaponKnockback(
        enemy,
        new Phaser.Math.Vector2(
          enemy.body.x - context.player.x,
          enemy.body.y - context.player.y,
        ),
        Phaser.Math.DegToRad(this.orbitSpeedDegreesPerSecond) * this.currentRadiusPixels,
      );
      this.hitCooldowns.set(enemy, this.cooldownMs);

      if (enemy.isDead) {
        enemy.body.destroy();
      }
    }
  }

  private isEnemyTouchingProjectile(enemy: Enemy): boolean {
    return this.projectiles.some((projectile) => (
      Phaser.Math.Distance.Between(
        projectile.body.x,
        projectile.body.y,
        enemy.body.x,
        enemy.body.y,
      ) <= this.hitRadius
    ));
  }

  private get radiusPixels(): number {
    return (this.radius || 3) * 48;
  }

  private get currentRadiusPixels(): number {
    return this.radiusPixels * this.getCurrentRadiusScale();
  }

  private get orbitCount(): number {
    return this.orbitProjectileCount;
  }

  getOrbitCount(): number {
    return this.orbitProjectileCount;
  }

  getOrbitSpeed(): number {
    return this.orbitSpeedDegreesPerSecond;
  }

  private getInitialOrbitCount(config: WeaponConfig): number {
    const orbitConfig = config as OrbitWeaponConfig;

    return Math.max(1, Math.min(6, Math.floor(orbitConfig.orbitCount ?? 1)));
  }

  private rebuildProjectiles(): void {
    for (const projectile of this.projectiles) {
      projectile.body.destroy();
    }

    this.projectiles.length = 0;
    this.hitCooldowns.clear();
  }

  private getCurrentRadiusScale(): number {
    const behavior = this.getOrbitBehavior();
    const minScale = Math.max(0, behavior?.radiusScaleMin ?? 1);
    const maxScale = Math.max(minScale, behavior?.radiusScaleMax ?? minScale);
    const cycleMs = Math.max(0, behavior?.radiusCycleMs ?? 0);

    if (cycleMs <= 0 || maxScale === minScale) {
      return minScale;
    }

    const cycleProgress = (this.orbitRadiusElapsedMs % cycleMs) / cycleMs;
    const triangleProgress = cycleProgress < 0.5
      ? cycleProgress * 2
      : (1 - cycleProgress) * 2;

    return minScale + (maxScale - minScale) * triangleProgress;
  }

  private getOrbitBehavior(): OrbitBehaviorConfig | undefined {
    return this.config.behavior?.type === 'orbit'
      ? this.config.behavior
      : undefined;
  }

  private createProjectileBody(x: number, y: number): OrbitProjectileBody {
    const textureKey = AssetKeyResolver.getWeaponProjectileTextureKey(this.scene, this.id);
    const animationKey = AssetKeyResolver.getWeaponProjectileAnimationKey(this.scene, this.id);
    const displaySize = VisualScale.getProjectileDisplaySize(this.id);

    if (textureKey && animationKey) {
      const body = this.scene.add.sprite(x, y, textureKey);
      body.setDisplaySize(displaySize, displaySize);
      body.play(animationKey);

      return body;
    }

    if (!textureKey) {
      return this.scene.add.circle(x, y, displaySize / 2, 0xa78bfa);
    }

    const body = this.scene.add.image(x, y, textureKey);
    body.setDisplaySize(displaySize, displaySize);

    return body;
  }
}
