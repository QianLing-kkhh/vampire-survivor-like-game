import Phaser from 'phaser';

import { AssetKeyResolver } from '../assets/AssetKeyResolver';
import { Enemy } from '../enemy/Enemy';
import { VisualScale } from '../visual/VisualScale';

import { Weapon, WeaponConfig, WeaponUpdateContext } from './Weapon';
import { OrbitPositionCalculator } from './OrbitPositionCalculator';
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
  private readonly positionCalculator = new OrbitPositionCalculator();
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
    const playerPosition = context.player.getPositionLike();

    for (let index = 0; index < this.orbitCount; index += 1) {
      const angleDeg = (360 / this.orbitCount) * index;
      const projectilePosition = this.positionCalculator.getPosition({
        center: playerPosition,
        angleDeg,
        radiusPixels: currentRadiusPixels,
      });

      this.projectiles.push({
        body: this.createProjectileBody(
          projectilePosition.x,
          projectilePosition.y,
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
    const playerPosition = context.player.getPositionLike();

    for (const projectile of this.projectiles) {
      projectile.angleDeg += this.orbitSpeedDegreesPerSecond * deltaSeconds;

      const projectilePosition = this.positionCalculator.getPosition({
        center: playerPosition,
        angleDeg: projectile.angleDeg,
        radiusPixels: currentRadiusPixels,
      });
      projectile.body.x = projectilePosition.x;
      projectile.body.y = projectilePosition.y;
      projectile.body.rotation = (projectile.body.rotation ?? 0)
        + deltaSeconds * OrbitWeapon.PROJECTILE_ROTATION_RADIANS_PER_SECOND;
    }
  }

  private checkHits(context: WeaponUpdateContext): void {
    const playerPosition = context.player.getPositionLike();

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
          enemy.body.x - playerPosition.x,
          enemy.body.y - playerPosition.y,
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
    return this.positionCalculator.getRadiusScale({
      elapsedMs: this.orbitRadiusElapsedMs,
      behavior: this.getOrbitBehavior(),
    });
  }

  private getOrbitBehavior(): OrbitBehaviorConfig | undefined {
    return this.config.behavior?.type === 'orbit'
      ? this.config.behavior
      : undefined;
  }

  private createProjectileBody(x: number, y: number): OrbitProjectileBody {
    const visualTier = this.getVisualTierInput();
    const textureKey = AssetKeyResolver.getWeaponProjectileTextureKey(this.scene, this.id, visualTier);
    const animationKey = AssetKeyResolver.getWeaponProjectileAnimationKey(this.scene, this.id, visualTier);
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
