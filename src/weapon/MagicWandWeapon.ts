import Phaser from 'phaser';

import { AssetKeyResolver } from '../assets/AssetKeyResolver';
import { AudioManager } from '../audio/AudioManager';
import { Enemy } from '../enemy/Enemy';
import { VisualScale } from '../visual/VisualScale';

import { Weapon, WeaponConfig, WeaponUpdateContext } from './Weapon';
import { HomingBehaviorConfig } from './behavior/WeaponBehaviorConfig';

type MagicWandWeaponConfig = WeaponConfig & {
  projectileCount?: number;
};

type MagicProjectileBody = Phaser.GameObjects.GameObject & {
  x: number;
  y: number;
  rotation?: number;
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

    const playerPosition = context.player.getPositionLike();
    for (const target of targets.slice(0, this.projectileCount)) {
      this.projectiles.push({
        body: this.createProjectileBody(playerPosition.x, playerPosition.y),
        target,
        ageMs: 0,
      });
    }

    AudioManager.playWeapon(
      this.scene,
      this.id === 'holy_wand' ? 'holy_wand_shot' : 'magic_wand_shot',
    );
  }

  private updateProjectiles(context: WeaponUpdateContext): void {
    for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
      const projectile = this.projectiles[index];

      projectile.ageMs += context.deltaMs;

      if (projectile.target.isDead || projectile.ageMs >= MagicWandWeapon.PROJECTILE_LIFETIME_MS) {
        this.destroyProjectile(index);
        continue;
      }

      const previousX = projectile.body.x;
      const previousY = projectile.body.y;

      this.moveProjectile(projectile, context.deltaMs);

      if (this.isProjectileBlocked(projectile, context, previousX, previousY)) {
        this.destroyProjectile(index);
        continue;
      }

      if (!this.isProjectileTouchingTarget(projectile)) {
        continue;
      }

      const actualDamage = projectile.target.takeDamage(this.createHitResult(projectile.target));

      this.recordEnemyHit(projectile.target, actualDamage);
      this.applyWitchSlowBonusHit(projectile, context, actualDamage);
      this.applyWeaponKnockback(
        projectile.target,
        new Phaser.Math.Vector2(
          projectile.target.body.x - projectile.body.x,
          projectile.target.body.y - projectile.body.y,
        ),
        this.modifiedProjectileSpeed,
      );
      this.applyExplosionDamage(projectile, context.enemies, actualDamage);

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
    projectile.body.rotation = Math.atan2(direction.y, direction.x);
  }

  private isProjectileTouchingTarget(projectile: MagicProjectile): boolean {
    return Phaser.Math.Distance.Between(
      projectile.body.x,
      projectile.body.y,
      projectile.target.body.x,
      projectile.target.body.y,
    ) <= MagicWandWeapon.HIT_DISTANCE;
  }

  private isProjectileBlocked(
    projectile: MagicProjectile,
    context: WeaponUpdateContext,
    previousX: number,
    previousY: number,
  ): boolean {
    return context.isProjectilePathBlocked?.(
      previousX,
      previousY,
      projectile.body.x,
      projectile.body.y,
      VisualScale.getProjectileDisplaySize(this.id) / 2,
    ) ?? false;
  }

  getProjectileCount(): number {
    return this.projectileCount;
  }

  private findNearestEnemies(
    player: WeaponUpdateContext['player'],
    enemies: readonly Enemy[],
  ): Enemy[] {
    const playerPosition = player.getPositionLike();
    return enemies
      .filter((enemy) => !enemy.isDead)
      .map((enemy) => ({
        enemy,
        distanceSq: Phaser.Math.Distance.Squared(
          playerPosition.x,
          playerPosition.y,
          enemy.body.x,
          enemy.body.y,
        ),
      }))
      .sort((left, right) => left.distanceSq - right.distanceSq)
      .map(({ enemy }) => enemy);
  }

  private createProjectileBody(x: number, y: number): MagicProjectileBody {
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
      return this.scene.add.circle(x, y, displaySize / 2, 0x38bdf8);
    }

    const body = this.scene.add.image(x, y, textureKey);
    body.setDisplaySize(displaySize, displaySize);

    return body;
  }

  private applyExplosionDamage(
    projectile: MagicProjectile,
    enemies: readonly Enemy[],
    primaryDamage: number,
  ): void {
    if (primaryDamage <= 0) {
      return;
    }

    const homingBehavior = this.getHomingBehavior();
    const explosionRadius = homingBehavior?.explosionRadius
      ?? (this.id === 'holy_wand' ? 60 : 45);
    const damageMultiplier = homingBehavior?.explosionDamageMultiplier
      ?? (this.id === 'holy_wand' ? 0.5 : 0.4);
    const explosionDamage = primaryDamage * damageMultiplier;
    const centerX = projectile.target.body.x;
    const centerY = projectile.target.body.y;

    this.showExplosionFeedback(centerX, centerY, explosionRadius);

    for (const enemy of enemies) {
      if (
        enemy === projectile.target
        || enemy.isDead
        || Phaser.Math.Distance.Between(centerX, centerY, enemy.body.x, enemy.body.y)
          > explosionRadius
      ) {
        continue;
      }

      const actualDamage = enemy.takeDamage(this.createHitResultFromDamage(explosionDamage, enemy));

      this.recordEnemyHit(enemy, actualDamage);
      this.applyWeaponKnockback(
        enemy,
        new Phaser.Math.Vector2(enemy.body.x - centerX, enemy.body.y - centerY),
        this.modifiedProjectileSpeed,
        0.5,
      );

      if (enemy.isDead) {
        enemy.destroy();
      }
    }
  }

  private applyWitchSlowBonusHit(
    projectile: MagicProjectile,
    context: WeaponUpdateContext,
    primaryDamage: number,
  ): void {
    if (
      this.id !== 'magic_wand'
      || primaryDamage <= 0
      || context.characterRuntime?.getCharacterId() !== 'witch'
      || this.isBossLike(projectile.target)
      || context.characterRuntime.getEnemySpeedMultiplierAt(
        projectile.target.body.x,
        projectile.target.body.y,
      ) >= 1
    ) {
      return;
    }

    const actualDamage = projectile.target.takeDamage(
      this.createHitResultFromDamage(primaryDamage * 0.22, projectile.target),
    );

    this.recordEnemyHit(projectile.target, actualDamage);
    this.showWitchBonusFeedback(projectile.target.body.x, projectile.target.body.y);
  }

  private showWitchBonusFeedback(x: number, y: number): void {
    const feedback = this.scene.add.circle(x, y, 22, 0xa78bfa, 0.14);

    feedback.setStrokeStyle(2, 0xddd6fe, 0.6);
    feedback.setDepth(27);
    this.scene.tweens.add({
      targets: feedback,
      alpha: 0,
      scaleX: 1.45,
      scaleY: 1.45,
      duration: 150,
      onComplete: () => feedback.destroy(),
    });
  }

  private isBossLike(enemy: Enemy): boolean {
    return enemy.bossLike || enemy.id === 'boss' || enemy.id.startsWith('endless_');
  }

  private showExplosionFeedback(x: number, y: number, radius: number): void {
    const feedback = this.scene.add.circle(x, y, radius, 0x38bdf8, 0.18);

    feedback.setStrokeStyle(3, 0xbae6fd, 0.75);
    feedback.setDepth(26);

    this.scene.tweens.add({
      targets: feedback,
      alpha: 0,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 170,
      onComplete: () => feedback.destroy(),
    });
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

  private getHomingBehavior(): HomingBehaviorConfig | undefined {
    return this.config.behavior?.type === 'homing'
      ? this.config.behavior
      : undefined;
  }
}
