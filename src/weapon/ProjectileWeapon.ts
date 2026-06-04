import Phaser from 'phaser';

import { AssetKeyResolver } from '../assets/AssetKeyResolver';
import { AudioManager } from '../audio/AudioManager';
import { Enemy } from '../enemy/Enemy';
import { VisualScale } from '../visual/VisualScale';

import { Weapon, WeaponConfig, WeaponUpdateContext } from './Weapon';

type ProjectileBody = Phaser.GameObjects.GameObject & {
  x: number;
  y: number;
  rotation: number;
  destroy: () => void;
};

type ProjectileWeaponConfig = WeaponConfig & {
  projectileCount?: number;
  spreadAngle?: number;
};

interface Projectile {
  body: ProjectileBody;
  target: Enemy;
  velocity: Phaser.Math.Vector2;
  previousX: number;
  previousY: number;
  ageMs: number;
  pierceRemaining: number;
  hitEnemies: Set<Enemy>;
}

export class ProjectileWeapon extends Weapon {
  private readonly projectiles: Projectile[] = [];

  constructor(scene: Phaser.Scene, id: string, config: WeaponConfig) {
    super(scene, id, config);
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
    if (this.id !== 'knife') {
      return false;
    }

    switch (upgradeId) {
      case 'knife_damage_up':
        this.increaseDamage(0.1);
        return true;
      case 'knife_cooldown_up':
        this.reduceCooldown(0.1, 0.3);
        return true;
      default:
        return false;
    }
  }

  protected activate(context: WeaponUpdateContext): void {
    const target = this.findNearestEnemy(context);

    if (!target) {
      return;
    }

    const baseDirection = this.getDirection(context, target);
    const speed = this.modifiedProjectileSpeed || this.config.projectileSpeed || 6;

    for (const direction of this.getProjectileDirections(baseDirection)) {
      const projectile = this.createProjectileBody(context.player.x, context.player.y);
      const velocity = direction.scale(speed);
      const projectileState: Projectile = {
        body: projectile,
        target,
        velocity,
        previousX: projectile.x,
        previousY: projectile.y,
        ageMs: 0,
        pierceRemaining: this.config.pierce ?? 1,
        hitEnemies: new Set<Enemy>(),
      };

      this.alignProjectileToVelocity(projectileState);
      this.projectiles.push(projectileState);
    }

    AudioManager.playWeapon(
      this.scene,
      this.id === 'thousand_edge' ? 'thousand_edge_attack' : 'knife_attack',
    );
  }

  private getDirection(
    context: WeaponUpdateContext,
    target: Enemy,
  ): Phaser.Math.Vector2 {
    const direction = new Phaser.Math.Vector2(
      target.body.x - context.player.x,
      target.body.y - context.player.y,
    );

    if (direction.lengthSq() === 0) {
      return new Phaser.Math.Vector2(1, 0);
    }

    return direction.normalize();
  }

  private findNearestEnemy(context: WeaponUpdateContext): Enemy | undefined {
    let nearestEnemy: Enemy | undefined;
    let nearestDistanceSq = Number.POSITIVE_INFINITY;

    for (const enemy of context.enemies) {
      if (enemy.isDead) {
        continue;
      }

      const distanceSq = Phaser.Math.Distance.Squared(
        context.player.x,
        context.player.y,
        enemy.body.x,
        enemy.body.y,
      );

      if (distanceSq >= nearestDistanceSq) {
        continue;
      }

      nearestEnemy = enemy;
      nearestDistanceSq = distanceSq;
    }

    return nearestEnemy;
  }

  private getProjectileDirections(baseDirection: Phaser.Math.Vector2): Phaser.Math.Vector2[] {
    const config = this.config as ProjectileWeaponConfig;
    const projectileCount = Math.max(1, Math.floor(config.projectileCount ?? 1));
    const spreadAngle = config.spreadAngle ?? 0;
    const startAngle = projectileCount === 1 ? 0 : -spreadAngle / 2;
    const angleStep = projectileCount === 1 ? 0 : spreadAngle / (projectileCount - 1);

    return Array.from({ length: projectileCount }, (_value, index) => (
      baseDirection.clone().rotate(Phaser.Math.DegToRad(startAngle + angleStep * index))
    ));
  }

  private updateProjectiles(context: WeaponUpdateContext): void {
    for (const projectile of this.projectiles) {
      projectile.ageMs += context.deltaMs;
      projectile.previousX = projectile.body.x;
      projectile.previousY = projectile.body.y;
      projectile.body.x += projectile.velocity.x * (context.deltaMs / (1000 / 60));
      projectile.body.y += projectile.velocity.y * (context.deltaMs / (1000 / 60));
      this.alignProjectileToVelocity(projectile);
    }

    for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
      const projectile = this.projectiles[index];

      const hitEnemy = this.findHitEnemy(projectile, context.enemies);

      if (hitEnemy) {
        const damageMultiplier = Math.pow(0.5, projectile.hitEnemies.size);
        const actualDamage = hitEnemy.takeDamage(
          this.createHitResultWithMultiplier(damageMultiplier),
        );

        this.recordEnemyHit(hitEnemy, actualDamage);
        this.applyWeaponKnockback(
          hitEnemy,
          projectile.velocity.clone(),
          projectile.velocity.length(),
        );
        this.applyHolyWandExplosion(projectile, hitEnemy, context.enemies, actualDamage);
        projectile.hitEnemies.add(hitEnemy);
        projectile.pierceRemaining -= 1;

        if (hitEnemy.isDead) {
          hitEnemy.destroy();
        }

        if (projectile.pierceRemaining <= 0) {
          projectile.body.destroy();
          this.projectiles.splice(index, 1);
        }

        continue;
      }

      if (projectile.ageMs < 2000) {
        continue;
      }

      projectile.body.destroy();
      this.projectiles.splice(index, 1);
    }
  }

  private findHitEnemy(
    projectile: Projectile,
    enemies: readonly Enemy[],
  ): Enemy | undefined {
    const hitDistance = 14;

    return enemies.find((enemy) => (
      !enemy.isDead
      && !projectile.hitEnemies.has(enemy)
      && this.isEnemyOnProjectilePath(projectile, enemy, hitDistance)
    ));
  }

  private isEnemyOnProjectilePath(
    projectile: Projectile,
    enemy: Enemy,
    hitDistance: number,
  ): boolean {
    const currentDistance = Phaser.Math.Distance.Between(
      projectile.body.x,
      projectile.body.y,
      enemy.body.x,
      enemy.body.y,
    );

    if (currentDistance <= hitDistance) {
      return true;
    }

    return this.getDistanceToSegment(
      enemy.body.x,
      enemy.body.y,
      projectile.previousX,
      projectile.previousY,
      projectile.body.x,
      projectile.body.y,
    ) <= hitDistance;
  }

  private getDistanceToSegment(
    pointX: number,
    pointY: number,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
  ): number {
    const segmentX = endX - startX;
    const segmentY = endY - startY;
    const segmentLengthSq = segmentX * segmentX + segmentY * segmentY;

    if (segmentLengthSq === 0) {
      return Phaser.Math.Distance.Between(pointX, pointY, startX, startY);
    }

    const projectedPosition = Phaser.Math.Clamp(
      ((pointX - startX) * segmentX + (pointY - startY) * segmentY) / segmentLengthSq,
      0,
      1,
    );
    const closestX = startX + segmentX * projectedPosition;
    const closestY = startY + segmentY * projectedPosition;

    return Phaser.Math.Distance.Between(pointX, pointY, closestX, closestY);
  }

  private applyHolyWandExplosion(
    projectile: Projectile,
    primaryTarget: Enemy,
    enemies: readonly Enemy[],
    primaryDamage: number,
  ): void {
    if (this.id !== 'holy_wand' || primaryDamage <= 0) {
      return;
    }

    const explosionRadius = 60;
    const explosionDamage = primaryDamage * 0.5;

    this.showExplosionFeedback(projectile.body.x, projectile.body.y, explosionRadius);

    for (const enemy of enemies) {
      if (
        enemy === primaryTarget
        || enemy.isDead
        || Phaser.Math.Distance.Between(
          projectile.body.x,
          projectile.body.y,
          enemy.body.x,
          enemy.body.y,
        ) > explosionRadius
      ) {
        continue;
      }

      const actualDamage = enemy.takeDamage(this.createHitResultFromDamage(explosionDamage));

      this.recordEnemyHit(enemy, actualDamage);
      this.applyWeaponKnockback(
        enemy,
        new Phaser.Math.Vector2(enemy.body.x - projectile.body.x, enemy.body.y - projectile.body.y),
        projectile.velocity.length(),
        0.5,
      );

      if (enemy.isDead) {
        enemy.destroy();
      }
    }
  }

  private showExplosionFeedback(x: number, y: number, radius: number): void {
    const feedback = this.scene.add.circle(x, y, radius, 0x93c5fd, 0.18);

    feedback.setStrokeStyle(3, 0xdbeafe, 0.75);
    feedback.setDepth(26);

    this.scene.tweens.add({
      targets: feedback,
      alpha: 0,
      scaleX: 1.25,
      scaleY: 1.25,
      duration: 180,
      onComplete: () => feedback.destroy(),
    });
  }

  private createProjectileBody(x: number, y: number): ProjectileBody {
    const textureKey = AssetKeyResolver.getWeaponProjectileTextureKey(this.scene, this.id);
    const animationKey = AssetKeyResolver.getWeaponProjectileAnimationKey(this.scene, this.id);
    const displaySize = VisualScale.getProjectileDisplaySize(this.id);

    if (
      textureKey
      && animationKey
    ) {
      const body = this.scene.add.sprite(x, y, textureKey);
      body.setDisplaySize(displaySize, displaySize);
      body.play(animationKey);

      return body;
    }

    if (!textureKey) {
      return this.scene.add.circle(x, y, displaySize / 2, 0xfacc15);
    }

    const body = this.scene.add.image(x, y, textureKey);
    body.setDisplaySize(displaySize, displaySize);

    return body;
  }

  private alignProjectileToVelocity(projectile: Projectile): void {
    if (projectile.velocity.lengthSq() === 0) {
      return;
    }

    projectile.body.rotation = Math.atan2(
      projectile.velocity.y,
      projectile.velocity.x,
    ) + this.getProjectileRotationOffset();
  }

  private getProjectileRotationOffset(): number {
    switch (this.id) {
      case 'knife':
      case 'thousand_edge':
        return Math.PI / 4;
      default:
        return 0;
    }
  }

}
