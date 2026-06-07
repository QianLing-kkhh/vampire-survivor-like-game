import Phaser from 'phaser';

import { AssetKeyResolver } from '../assets/AssetKeyResolver';
import { Enemy } from '../enemy/Enemy';
import { ShadowFactory } from '../visual/ShadowFactory';
import { VisualScale } from '../visual/VisualScale';

import { Weapon, WeaponConfig, WeaponUpdateContext } from './Weapon';
import { ArcingBehaviorConfig } from './behavior/WeaponBehaviorConfig';

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
  shadow?: Phaser.GameObjects.Ellipse;
  startX: number;
  startY: number;
  direction: Phaser.Math.Vector2;
  baseDisplaySize: number;
  previousX: number;
  previousY: number;
  ageMs: number;
  hitEnemies: Set<Enemy>;
}

export class AxeWeapon extends Weapon {
  private static readonly MAX_PROJECTILE_COUNT = 4;
  private static readonly MAX_EVOLVED_PROJECTILE_COUNT = 8;
  private static readonly DEFAULT_ARC_HEIGHT = 220;
  private static readonly AXE_SPIRAL_TURNS = 2.0;
  private static readonly AXE_MAX_SPIRAL_RADIUS = 70;
  private static readonly AXE_ACCELERATION = 220;
  private static readonly DEATH_SPIRAL_TURNS = 3.0;
  private static readonly DEATH_SPIRAL_MAX_SPIRAL_RADIUS = 110;
  private static readonly DEATH_SPIRAL_ACCELERATION = 280;
  private static readonly PROJECTILE_ROTATION_STEP = 0.18;

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
      ShadowFactory.destroyShadow(projectile.shadow);
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
        this.increaseDamage(0.092);
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

    const projectileDirections = this.getProjectileDirections(baseDirection);

    for (const direction of projectileDirections) {
      const body = this.createProjectileBody(context.player.x, context.player.y);
      const shadow = ShadowFactory.createShadow(
        this.scene,
        body,
        this.id === 'death_spiral' ? 'largeProjectile' : 'axeProjectile',
      );

      this.projectiles.push({
        body,
        shadow,
        startX: context.player.x,
        startY: context.player.y,
        direction,
        baseDisplaySize: VisualScale.getProjectileDisplaySize(this.id),
        previousX: body.x,
        previousY: body.y,
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

      if (this.isProjectileBlocked(projectile, context)) {
        this.destroyProjectile(index);
        continue;
      }

      this.checkProjectileHits(projectile, context.enemies, context.deltaMs);

      if (projectile.ageMs < this.lifetimeMs) {
        continue;
      }

      ShadowFactory.destroyShadow(projectile.shadow);
      projectile.body.destroy();
      this.projectiles.splice(index, 1);
    }
  }

  private destroyProjectile(index: number): void {
    const projectile = this.projectiles[index];

    ShadowFactory.destroyShadow(projectile.shadow);
    projectile.body.destroy();
    this.projectiles.splice(index, 1);
  }

  private isProjectileBlocked(projectile: AxeProjectile, context: WeaponUpdateContext): boolean {
    return context.isProjectilePathBlocked?.(
      projectile.previousX,
      projectile.previousY,
      projectile.body.x,
      projectile.body.y,
      this.getProjectileHitRadius(projectile),
    ) ?? false;
  }

  private moveProjectile(projectile: AxeProjectile): void {
    const progress = Math.min(1, projectile.ageMs / this.lifetimeMs);
    const elapsedSeconds = projectile.ageMs / 1000;
    const behavior = this.getArcingBehavior();
    const acceleration = behavior?.acceleration ?? (this.id === 'death_spiral'
      ? AxeWeapon.DEATH_SPIRAL_ACCELERATION
      : AxeWeapon.AXE_ACCELERATION);
    const spiralTurns = behavior?.spiralTurns ?? (this.id === 'death_spiral'
      ? AxeWeapon.DEATH_SPIRAL_TURNS
      : AxeWeapon.AXE_SPIRAL_TURNS);
    const maxSpiralRadius = behavior?.maxSpiralRadius ?? (this.id === 'death_spiral'
      ? AxeWeapon.DEATH_SPIRAL_MAX_SPIRAL_RADIUS
      : AxeWeapon.AXE_MAX_SPIRAL_RADIUS);
    const launchProgress = 0.18;
    const launchSeconds = this.lifetimeMs / 1000 * launchProgress;
    const launchDistance = this.modifiedProjectileSpeed * launchSeconds
      + 0.5 * acceleration * launchSeconds * launchSeconds;
    const baseAngle = Math.atan2(projectile.direction.y, projectile.direction.x);
    const spiralProgress = Math.max(0, (progress - launchProgress) / (1 - launchProgress));
    const spiralSeconds = Math.max(0, elapsedSeconds - launchSeconds);
    const spiralDistanceGrowth = this.modifiedProjectileSpeed * spiralSeconds
      + 0.5 * acceleration * spiralSeconds * spiralSeconds;
    const travelDistance = progress <= launchProgress
      ? this.modifiedProjectileSpeed * elapsedSeconds
        + 0.5 * acceleration * elapsedSeconds * elapsedSeconds
      : launchDistance + spiralDistanceGrowth + maxSpiralRadius * spiralProgress;
    const travelAngle = progress <= launchProgress
      ? baseAngle
      : baseAngle + spiralProgress * spiralTurns * Math.PI * 2;

    projectile.previousX = projectile.body.x;
    projectile.previousY = projectile.body.y;
    projectile.body.x = projectile.startX + Math.cos(travelAngle) * travelDistance;
    projectile.body.y = projectile.startY + Math.sin(travelAngle) * travelDistance;
    projectile.body.rotation += AxeWeapon.PROJECTILE_ROTATION_STEP;
    this.updateProjectileScale(projectile, progress);
    projectile.shadow = projectile.shadow
      ? ShadowFactory.updateShadow(
        projectile.shadow,
        projectile.body,
        this.id === 'death_spiral' ? 'largeProjectile' : 'axeProjectile',
      )
      : ShadowFactory.createShadow(
        this.scene,
        projectile.body,
        this.id === 'death_spiral' ? 'largeProjectile' : 'axeProjectile',
      );
  }

  private checkProjectileHits(
    projectile: AxeProjectile,
    enemies: readonly Enemy[],
    deltaMs: number,
  ): void {
    const movementDirection = new Phaser.Math.Vector2(
      projectile.body.x - projectile.previousX,
      projectile.body.y - projectile.previousY,
    );
    const hitSpeed = deltaMs <= 0
      ? this.modifiedProjectileSpeed
      : movementDirection.length() / (deltaMs / 1000);

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
        ) > this.getProjectileHitRadius(projectile)
      ) {
        continue;
      }

      const actualDamage = enemy.takeDamage(this.createHitResult(enemy));

      this.recordEnemyHit(enemy, actualDamage);
      this.applyWeaponKnockback(enemy, movementDirection, hitSpeed);
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
    const textureKey = AssetKeyResolver.getWeaponProjectileTextureKey(this.scene, this.id);
    const animationKey = AssetKeyResolver.getWeaponProjectileAnimationKey(this.scene, this.id);
    const displaySize = VisualScale.getProjectileDisplaySize(this.id);

    if (textureKey && animationKey) {
      const body = this.scene.add.sprite(x, y, textureKey);
      body.setDisplaySize(displaySize, displaySize);
      body.play(animationKey);

      return body;
    }

    if (textureKey) {
      const body = this.scene.add.image(x, y, textureKey);
      body.setDisplaySize(displaySize, displaySize);

      return body;
    }

    const body = this.scene.add.rectangle(x, y, displaySize, displaySize * 0.56, 0xf97316);

    body.setStrokeStyle(2, 0xffedd5, 0.8);

    return body;
  }

  private updateProjectileScale(projectile: AxeProjectile, progress: number): void {
    const scale = this.getProjectileScale(progress);
    const displaySize = projectile.baseDisplaySize * scale;
    const body = projectile.body as AxeProjectileBody & {
      setDisplaySize?: (width: number, height: number) => void;
      setScale?: (x: number, y?: number) => void;
    };

    if (body.setDisplaySize) {
      body.setDisplaySize(displaySize, displaySize);
      return;
    }

    body.setScale?.(scale);
  }

  private getProjectileScale(progress: number): number {
    const config = this.getArcingBehavior()?.scaleOverLifetime;

    if (!config?.enabled) {
      return 1;
    }

    const curveProgress = this.getPostLaunchCurveProgress(progress, config.curve);
    const startScale = Math.max(0.01, config.startScale ?? 1);
    const endScale = Math.max(startScale, config.endScale ?? startScale);

    return Phaser.Math.Linear(startScale, endScale, curveProgress);
  }

  private getProjectileHitRadius(projectile: AxeProjectile): number {
    const config = this.getArcingBehavior()?.hitRadiusOverLifetime;

    if (!config?.enabled) {
      return this.hitRadius;
    }

    const progress = Math.min(1, projectile.ageMs / this.lifetimeMs);
    const curveProgress = this.getPostLaunchCurveProgress(progress, config.curve);
    const startRadius = Math.max(0, config.startRadius ?? this.hitRadius);
    const endRadius = Math.max(startRadius, config.endRadius ?? startRadius);

    return Phaser.Math.Linear(startRadius, endRadius, curveProgress);
  }

  private getPostLaunchCurveProgress(
    progress: number,
    curve: 'linear' | 'easeOut' | undefined,
  ): number {
    const launchProgress = 0.18;
    const normalizedProgress = Phaser.Math.Clamp(
      (progress - launchProgress) / (1 - launchProgress),
      0,
      1,
    );

    if (curve !== 'easeOut') {
      return normalizedProgress;
    }

    return 1 - (1 - normalizedProgress) * (1 - normalizedProgress);
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

  private getArcingBehavior(): ArcingBehaviorConfig | undefined {
    return this.config.behavior?.type === 'arcing'
      ? this.config.behavior
      : undefined;
  }
}
