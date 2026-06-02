import Phaser from 'phaser';

import { Enemy } from '../enemy/Enemy';

import { Weapon, WeaponConfig, WeaponUpdateContext } from './Weapon';

type MagicWandWeaponConfig = WeaponConfig & {
  projectileCount?: number;
};

type MagicProjectileBody = Phaser.GameObjects.GameObject & {
  x: number;
  y: number;
  destroy: () => void;
};

interface MagicProjectile {
  body: MagicProjectileBody;
  target: Enemy;
  ageMs: number;
}

export class MagicWandWeapon extends Weapon {
  private static readonly PROJECTILE_LIFETIME_MS = 3000;
  private static readonly HIT_DISTANCE = 18;
  private static readonly MAX_PROJECTILE_COUNT = 4;

  private readonly projectiles: MagicProjectile[] = [];
  private projectileCount: number;

  constructor(scene: Phaser.Scene, id: string, config: WeaponConfig) {
    super(scene, id, config);
    this.projectileCount = this.getInitialProjectileCount(config);
  }

  override update(context: WeaponUpdateContext): void {
    super.update(context);
    this.updateProjectiles(context);
  }

  destroy(): void {
    this.clearProjectiles();
  }

  clearProjectiles(): void {
    for (const projectile of this.projectiles) {
      projectile.body.destroy();
    }

    this.projectiles.length = 0;
  }

  override applyUpgrade(upgradeId: string): boolean {
    if (this.id !== 'magic_wand') {
      return false;
    }

    switch (upgradeId) {
      case 'magic_wand_damage_up':
        this.increaseDamage(0.1);
        return true;
      case 'magic_wand_cooldown_up':
        this.reduceCooldown(0.1, 0.35);
        return true;
      case 'magic_wand_projectile_count_up':
        if (this.projectileCount >= MagicWandWeapon.MAX_PROJECTILE_COUNT) {
          console.warn('Magic Wand projectile count is already at the maximum');
          return false;
        }

        this.projectileCount = Math.min(
          this.projectileCount + 1,
          MagicWandWeapon.MAX_PROJECTILE_COUNT,
        );
        return true;
      default:
        return false;
    }
  }

  protected activate(context: WeaponUpdateContext): void {
    const targets = this.findNearestEnemies(context.player, context.enemies);

    if (targets.length === 0) {
      return;
    }

    for (const target of targets.slice(0, this.projectileCount)) {
      this.projectiles.push({
        body: this.createProjectileBody(context.player.x, context.player.y),
        target,
        ageMs: 0,
      });
    }
  }

  private updateProjectiles(context: WeaponUpdateContext): void {
    for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
      const projectile = this.projectiles[index];

      projectile.ageMs += context.deltaMs;

      if (projectile.target.isDead || projectile.ageMs >= MagicWandWeapon.PROJECTILE_LIFETIME_MS) {
        this.destroyProjectile(index);
        continue;
      }

      this.moveProjectile(projectile, context.deltaMs);

      if (!this.isProjectileTouchingTarget(projectile)) {
        continue;
      }

      const actualDamage = projectile.target.takeDamage(this.createHitResult());

      this.recordEnemyHit(projectile.target, actualDamage);

      if (projectile.target.isDead) {
        projectile.target.destroy();
      }

      this.destroyProjectile(index);
    }
  }

  private moveProjectile(projectile: MagicProjectile, deltaMs: number): void {
    const direction = new Phaser.Math.Vector2(
      projectile.target.body.x - projectile.body.x,
      projectile.target.body.y - projectile.body.y,
    );

    if (direction.lengthSq() === 0) {
      return;
    }

    direction.normalize().scale(this.modifiedProjectileSpeed * (deltaMs / 1000));
    projectile.body.x += direction.x;
    projectile.body.y += direction.y;
  }

  private isProjectileTouchingTarget(projectile: MagicProjectile): boolean {
    return Phaser.Math.Distance.Between(
      projectile.body.x,
      projectile.body.y,
      projectile.target.body.x,
      projectile.target.body.y,
    ) <= MagicWandWeapon.HIT_DISTANCE;
  }

  getProjectileCount(): number {
    return this.projectileCount;
  }

  private findNearestEnemies(
    player: WeaponUpdateContext['player'],
    enemies: readonly Enemy[],
  ): Enemy[] {
    return enemies
      .filter((enemy) => !enemy.isDead)
      .map((enemy) => ({
        enemy,
        distanceSq: Phaser.Math.Distance.Squared(
          player.x,
          player.y,
          enemy.body.x,
          enemy.body.y,
        ),
      }))
      .sort((left, right) => left.distanceSq - right.distanceSq)
      .map(({ enemy }) => enemy);
  }

  private createProjectileBody(x: number, y: number): MagicProjectileBody {
    if (!this.scene.textures.exists('magic_wand_projectile')) {
      return this.scene.add.circle(x, y, 6, 0x38bdf8);
    }

    const body = this.scene.add.image(x, y, 'magic_wand_projectile');
    body.setDisplaySize(14, 14);

    return body;
  }

  private destroyProjectile(index: number): void {
    this.projectiles[index].body.destroy();
    this.projectiles.splice(index, 1);
  }

  private getInitialProjectileCount(config: WeaponConfig): number {
    const magicWandConfig = config as MagicWandWeaponConfig;

    return Math.max(
      1,
      Math.min(
        MagicWandWeapon.MAX_PROJECTILE_COUNT,
        Math.floor(magicWandConfig.projectileCount ?? 1),
      ),
    );
  }
}
