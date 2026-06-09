import Phaser from 'phaser';

import { Enemy } from '../enemy/Enemy';
import type { AutoBossWarningSnapshot } from '../auto/AutoPlayerTypes';

import { BossProjectile } from './BossProjectile';

interface Position {
  x: number;
  y: number;
}

export class BossAttackController {
  private static readonly COOLDOWN_MS = 8000;
  private static readonly WARNING_MS = 2000;
  private static readonly PROJECTILE_COUNT = 16;
  private static readonly PROJECTILE_SPEED = 140;
  private static readonly PROJECTILE_DAMAGE = 12;
  private static readonly PROJECTILE_LIFETIME_MS = 6000;
  private static readonly PROJECTILE_HIT_RADIUS = 14;
  private static readonly WARNING_RADIUS = 180;

  private readonly projectiles: BossProjectile[] = [];
  private warningRing?: Phaser.GameObjects.Arc;
  private state: 'cooldown' | 'warning' = 'cooldown';
  private timerMs = BossAttackController.COOLDOWN_MS;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly boss: Enemy,
  ) {}

  update(
    deltaMs: number,
    playerPosition: Position,
    onPlayerHit: (damage: number) => void,
  ): void {
    if (this.boss.isDead) {
      this.destroy();
      return;
    }

    this.updateAttackState(deltaMs);
    this.updateWarningRing();
    this.updateProjectiles(deltaMs, playerPosition, onPlayerHit);
  }

  isWarningActive(): boolean {
    return this.state === 'warning';
  }

  getAutoBossWarnings(): AutoBossWarningSnapshot[] {
    if (!this.isWarningActive()) {
      return [];
    }

    return [{
      shape: 'circle',
      kind: 'ring',
      danger: 'damage',
      bossId: 'final_boss',
      skillId: 'final_boss_ring_bullets',
      x: this.boss.body.x,
      y: this.boss.body.y,
      radius: BossAttackController.WARNING_RADIUS,
      bulletCount: BossAttackController.PROJECTILE_COUNT,
      angleOffset: 0,
      projectileSpeed: BossAttackController.PROJECTILE_SPEED,
      bulletRadius: BossAttackController.PROJECTILE_HIT_RADIUS,
      remainingMs: Math.max(0, this.timerMs),
    }];
  }

  destroy(): void {
    this.destroyWarningRing();

    for (const projectile of this.projectiles) {
      projectile.destroy();
    }

    this.projectiles.length = 0;
  }

  private updateAttackState(deltaMs: number): void {
    this.timerMs -= deltaMs;

    if (this.timerMs > 0) {
      return;
    }

    if (this.state === 'cooldown') {
      this.state = 'warning';
      this.timerMs = BossAttackController.WARNING_MS;
      this.createWarningRing();
      return;
    }

    this.fireRingProjectiles();
    this.destroyWarningRing();
    this.state = 'cooldown';
    this.timerMs = BossAttackController.COOLDOWN_MS;
  }

  private createWarningRing(): void {
    this.warningRing = this.scene.add.circle(
      this.boss.body.x,
      this.boss.body.y,
      BossAttackController.WARNING_RADIUS,
      0xef4444,
      0.12,
    );
    this.warningRing.setStrokeStyle(5, 0xef4444, 0.85);
    this.warningRing.setDepth(32);
  }

  private updateWarningRing(): void {
    if (!this.warningRing?.active) {
      return;
    }

    this.warningRing.setPosition(this.boss.body.x, this.boss.body.y);
  }

  private destroyWarningRing(): void {
    if (this.warningRing?.active) {
      this.warningRing.destroy();
    }

    this.warningRing = undefined;
  }

  private fireRingProjectiles(): void {
    for (let index = 0; index < BossAttackController.PROJECTILE_COUNT; index += 1) {
      const angle = (Math.PI * 2 * index) / BossAttackController.PROJECTILE_COUNT;
      const direction = new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle));

      this.projectiles.push(new BossProjectile(
        this.scene,
        this.boss.body.x,
        this.boss.body.y,
        direction,
        BossAttackController.PROJECTILE_SPEED,
        BossAttackController.PROJECTILE_DAMAGE,
        BossAttackController.PROJECTILE_LIFETIME_MS,
        BossAttackController.PROJECTILE_HIT_RADIUS,
      ));
    }
  }

  private updateProjectiles(
    deltaMs: number,
    playerPosition: Position,
    onPlayerHit: (damage: number) => void,
  ): void {
    for (const projectile of this.projectiles) {
      projectile.update(deltaMs);

      if (!projectile.canHit(playerPosition)) {
        continue;
      }

      const damage = projectile.consumeHit();

      if (damage > 0) {
        onPlayerHit(damage);
      }
    }

    for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
      if (!this.projectiles[index].body.active) {
        this.projectiles.splice(index, 1);
      }
    }
  }
}
