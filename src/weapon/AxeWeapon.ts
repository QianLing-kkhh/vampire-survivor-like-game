import Phaser from 'phaser';

import { Enemy } from '../enemy/Enemy';

import { Weapon, WeaponConfig, WeaponUpdateContext } from './Weapon';

type AxeWeaponConfig = WeaponConfig & {
  projectileCount?: number;
  spreadAngle?: number;
  hitRadius?: number;
  lifetime?: number;
  arcHeight?: number;
};

type AxeProjectileBody = Phaser.GameObjects.GameObject & {
  x: number;
  y: number;
  rotation: number;
  destroy: () => void;
};

interface AxeProjectile {
  body: AxeProjectileBody;
  startX: number;
  startY: number;
  direction: Phaser.Math.Vector2;
  ageMs: number;
  hitEnemies: Set<Enemy>;
}

export class AxeWeapon extends Weapon {
  private static readonly MAX_PROJECTILE_COUNT = 4;
  private static readonly MAX_EVOLVED_PROJECTILE_COUNT = 8;
  private static readonly DEFAULT_ARC_HEIGHT = 220;

  private readonly projectiles: AxeProjectile[] = [];
  private readonly hitRadius: number;
  private readonly lifetimeMs: number;
  private readonly arcHeight: number;
  private readonly spreadAngle: number;
  private projectileCount: number;

  constructor(scene: Phaser.Scene, id: string, config: WeaponConfig) {
    super(scene, id, config);
    const axeConfig = config as AxeWeaponConfig;

    this.projectileCount = this.getInitialProjectileCount(axeConfig);
    this.hitRadius = axeConfig.hitRadius ?? 32;
    this.lifetimeMs = (axeConfig.lifetime ?? 2) * 1000;
    this.arcHeight = axeConfig.arcHeight ?? AxeWeapon.DEFAULT_ARC_HEIGHT;
    this.spreadAngle = axeConfig.spreadAngle ?? 18;
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
    if (this.id !== 'axe') {
      return false;
    }

    switch (upgradeId) {
      case 'axe_damage_up':
        this.increaseDamage(0.1);
        return true;
      case 'axe_cooldown_up':
        this.reduceCooldown(0.1, 0.6);
        return true;
      case 'axe_projectile_count_up':
        if (this.projectileCount >= AxeWeapon.MAX_PROJECTILE_COUNT) {
          console.warn('Axe projectile count is already at the maximum');
          return false;
        }

        this.projectileCount = Math.min(
          this.projectileCount + 1,
          AxeWeapon.MAX_PROJECTILE_COUNT,
        );
        return true;
      default:
        return false;
    }
  }

  protected activate(context: WeaponUpdateContext): void {
    const groupCenter = this.findEnemyGroupCenter(context);

    if (!groupCenter) {
      return;
    }

    const baseDirection = new Phaser.Math.Vector2(
      groupCenter.x - context.player.x,
      groupCenter.y - context.player.y,
    );

    if (baseDirection.lengthSq() === 0) {
      baseDirection.set(1, 0);
    }

    baseDirection.normalize();

    for (const direction of this.getProjectileDirections(baseDirection)) {
      this.projectiles.push({
        body: this.createProjectileBody(context.player.x, context.player.y),
        startX: context.player.x,
        startY: context.player.y,
        direction,
        ageMs: 0,
        hitEnemies: new Set<Enemy>(),
      });
    }
  }

  getProjectileCount(): number {
    return this.projectileCount;
  }

  private updateProjectiles(context: WeaponUpdateContext): void {
    for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
      const projectile = this.projectiles[index];

      projectile.ageMs += context.deltaMs;
      this.moveProjectile(projectile);
      this.checkProjectileHits(projectile, context.enemies);

      if (projectile.ageMs < this.lifetimeMs) {
        continue;
      }

      projectile.body.destroy();
      this.projectiles.splice(index, 1);
    }
  }

  private moveProjectile(projectile: AxeProjectile): void {
    const progress = Math.min(1, projectile.ageMs / this.lifetimeMs);
    const travelDistance = this.modifiedProjectileSpeed * (projectile.ageMs / 1000);
    const arcOffset = -Math.sin(progress * Math.PI) * this.arcHeight;

    projectile.body.x = projectile.startX + projectile.direction.x * travelDistance;
    projectile.body.y = projectile.startY
      + projectile.direction.y * travelDistance
      + arcOffset;
    projectile.body.rotation += 0.28;
  }

  private checkProjectileHits(
    projectile: AxeProjectile,
    enemies: readonly Enemy[],
  ): void {
    for (const enemy of enemies) {
      if (enemy.isDead || projectile.hitEnemies.has(enemy)) {
        continue;
      }

      if (
        Phaser.Math.Distance.Between(
          projectile.body.x,
          projectile.body.y,
          enemy.body.x,
          enemy.body.y,
        ) > this.hitRadius
      ) {
        continue;
      }

      const actualDamage = enemy.takeDamage(this.createHitResult());

      this.recordEnemyHit(enemy, actualDamage);
      projectile.hitEnemies.add(enemy);

      if (enemy.isDead) {
        enemy.destroy();
      }
    }
  }

  private findEnemyGroupCenter(context: WeaponUpdateContext): { x: number; y: number } | undefined {
    const nearbyEnemies = context.enemies
      .filter((enemy) => !enemy.isDead)
      .map((enemy) => ({
        enemy,
        distanceSq: Phaser.Math.Distance.Squared(
          context.player.x,
          context.player.y,
          enemy.body.x,
          enemy.body.y,
        ),
      }))
      .sort((left, right) => left.distanceSq - right.distanceSq)
      .slice(0, 8)
      .map(({ enemy }) => enemy);

    if (nearbyEnemies.length === 0) {
      return undefined;
    }

    const total = nearbyEnemies.reduce(
      (accumulator, enemy) => ({
        x: accumulator.x + enemy.body.x,
        y: accumulator.y + enemy.body.y,
      }),
      { x: 0, y: 0 },
    );

    return {
      x: total.x / nearbyEnemies.length,
      y: total.y / nearbyEnemies.length,
    };
  }

  private getProjectileDirections(baseDirection: Phaser.Math.Vector2): Phaser.Math.Vector2[] {
    if (this.spreadAngle >= 360 && this.projectileCount > 1) {
      return Array.from({ length: this.projectileCount }, (_value, index) => (
        baseDirection.clone().rotate(Phaser.Math.DegToRad((360 / this.projectileCount) * index))
      ));
    }

    const startAngle = this.projectileCount === 1 ? 0 : -this.spreadAngle / 2;
    const angleStep = this.projectileCount === 1
      ? 0
      : this.spreadAngle / (this.projectileCount - 1);

    return Array.from({ length: this.projectileCount }, (_value, index) => (
      baseDirection.clone().rotate(Phaser.Math.DegToRad(startAngle + angleStep * index))
    ));
  }

  private createProjectileBody(x: number, y: number): AxeProjectileBody {
    const textureKey = this.id === 'death_spiral'
      ? 'death_spiral_projectile'
      : 'axe_projectile';

    if (this.scene.textures.exists(textureKey)) {
      const body = this.scene.add.image(x, y, textureKey);
      body.setDisplaySize(this.id === 'death_spiral' ? 26 : 22, this.id === 'death_spiral' ? 26 : 18);

      return body;
    }

    const body = this.scene.add.rectangle(x, y, 18, 10, 0xf97316);

    body.setStrokeStyle(2, 0xffedd5, 0.8);

    return body;
  }

  private getInitialProjectileCount(config: AxeWeaponConfig): number {
    const maxProjectileCount = this.id === 'axe'
      ? AxeWeapon.MAX_PROJECTILE_COUNT
      : AxeWeapon.MAX_EVOLVED_PROJECTILE_COUNT;

    return Math.max(
      1,
      Math.min(
        maxProjectileCount,
        Math.floor(config.projectileCount ?? 1),
      ),
    );
  }
}
