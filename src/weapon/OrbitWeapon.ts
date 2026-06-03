import Phaser from 'phaser';

import { Enemy } from '../enemy/Enemy';

import { Weapon, WeaponConfig, WeaponUpdateContext } from './Weapon';

type OrbitProjectileBody = Phaser.GameObjects.GameObject & {
  x: number;
  y: number;
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
  private readonly projectiles: OrbitProjectile[] = [];
  private readonly hitCooldowns = new Map<Enemy, number>();
  private orbitSpeedDegreesPerSecond: number;
  private orbitProjectileCount: number;
  private readonly hitRadius: number;

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

    for (let index = 0; index < this.orbitCount; index += 1) {
      const angleDeg = (360 / this.orbitCount) * index;
      const angleRad = Phaser.Math.DegToRad(angleDeg);

      this.projectiles.push({
        body: this.createProjectileBody(
          context.player.x + Math.cos(angleRad) * this.radiusPixels,
          context.player.y + Math.sin(angleRad) * this.radiusPixels,
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

    for (const projectile of this.projectiles) {
      projectile.angleDeg += this.orbitSpeedDegreesPerSecond * deltaSeconds;

      const angleRad = Phaser.Math.DegToRad(projectile.angleDeg);
      projectile.body.x = context.player.x + Math.cos(angleRad) * this.radiusPixels;
      projectile.body.y = context.player.y + Math.sin(angleRad) * this.radiusPixels;
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

      const actualDamage = enemy.takeDamage(this.createHitResult());

      this.recordEnemyHit(enemy, actualDamage);
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

  private createProjectileBody(x: number, y: number): OrbitProjectileBody {
    const artTextureKey = this.id === 'unholy_vespers'
      ? 'art_weapons_unholy_vespers_orbit_book_sheet'
      : 'art_weapons_bible_orbit_book_sheet';

    if (this.scene.textures.exists(artTextureKey)) {
      const body = this.scene.add.sprite(x, y, artTextureKey);
      body.setDisplaySize(this.id === 'unholy_vespers' ? 34 : 28, this.id === 'unholy_vespers' ? 34 : 28);
      body.play(this.id === 'unholy_vespers'
        ? 'art_unholy_vespers_orbit_book_spin'
        : 'art_bible_orbit_book_spin');

      return body;
    }

    const textureKey = this.id === 'unholy_vespers'
      ? 'unholy_vespers_orbit_book'
      : 'bible_orbit_projectile';

    if (!this.scene.textures.exists(textureKey)) {
      return this.scene.add.circle(x, y, 11, 0xa78bfa);
    }

    const body = this.scene.add.image(x, y, textureKey);
    body.setDisplaySize(this.id === 'unholy_vespers' ? 30 : 24, this.id === 'unholy_vespers' ? 30 : 24);

    return body;
  }
}
