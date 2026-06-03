import Phaser from 'phaser';

import { AudioManager } from '../audio/AudioManager';
import { DamageCalculator } from '../combat/DamageCalculator';
import { EventBus } from '../core/EventBus';
import { PlayerController } from '../player/PlayerController';
import { PlayerHealth } from '../player/PlayerHealth';
import { RunState } from '../run/RunState';
import { PlaytestSettingsState } from '../settings/PlaytestSettings';
import { RunStats } from '../stats/RunStats';
import { FloatingTextManager } from '../ui/FloatingTextManager';

import { Enemy, GameEventMap, isEnemyKilledEvent } from './Enemy';
import { EnemyMovement } from './EnemyMovement';

export interface EnemyFlowConfig {
  scene: Phaser.Scene;
  enemies: Enemy[];
  eventBus: EventBus<GameEventMap>;
  enemyMovement: EnemyMovement;
  damageCalculator: DamageCalculator;
  player: PlayerController;
  playerHealth: PlayerHealth;
  runState: RunState;
  runStats: RunStats;
  floatingTextManager: FloatingTextManager;
  playtestSettings: PlaytestSettingsState;
  worldWidth: number;
  worldHeight: number;
  playerHitRadius: number;
  contactDamageCooldownMs: number;
  damageReactionRadius: number;
  damageReactionDamage: number;
  damageReactionKnockbackDistance: number;
  isBossPhaseActive(): boolean;
  onEnemyKilled?(event: GameEventMap['EnemyKilled']): void;
}

export class EnemyFlow {
  private readonly contactDamageCooldowns = new Map<Enemy, number>();
  private readonly unsubscribeEnemyKilled: () => void;
  private readonly previousPlayerPosition: Phaser.Math.Vector2;

  constructor(private readonly config: EnemyFlowConfig) {
    this.previousPlayerPosition = new Phaser.Math.Vector2(
      config.player.body.x,
      config.player.body.y,
    );
    this.unsubscribeEnemyKilled = config.eventBus.subscribe('EnemyKilled', (event) => {
      if (!isEnemyKilledEvent(event)) {
        return;
      }

      this.config.runState.recordKill();
      AudioManager.playSfx(this.config.scene, 'enemy_killed', {
        autoMode: this.config.playtestSettings.autoMode,
      });

      if (this.config.isBossPhaseActive()) {
        this.config.runState.recordBossPhaseKill();
      }

      this.config.onEnemyKilled?.(event);
    });
  }

  update(_timeSeconds: number, deltaMs: number): void {
    this.removeDeadEnemies();
    this.updateEnemyMovement(deltaMs);
    this.updateContactDamage(deltaMs);
    this.previousPlayerPosition.set(
      this.config.player.body.x,
      this.config.player.body.y,
    );
  }

  getEnemies(): Enemy[] {
    return this.config.enemies;
  }

  recordPlayerDamage(actualDamage: number): void {
    AudioManager.playSfx(this.config.scene, 'player_hit');
    this.config.floatingTextManager.showPlayerDamage(
      this.config.player.body.x,
      this.config.player.body.y,
      actualDamage,
    );
    this.config.runStats.recordDamageTaken(
      actualDamage,
      this.config.playerHealth.currentHp,
    );

    if (this.config.isBossPhaseActive()) {
      this.config.runState.recordBossPhaseDamage(
        actualDamage,
        this.config.playerHealth.currentHp,
      );
    }

    this.config.runState.recordEndlessDamage(actualDamage);
  }

  knockPlayerBack(direction: Phaser.Math.Vector2, distance: number): void {
    const knockbackDirection = direction.clone();

    if (knockbackDirection.lengthSq() === 0) {
      knockbackDirection.set(1, 0);
    }

    knockbackDirection.normalize().scale(distance);

    const radius = this.config.player.body.radius;
    this.config.player.body.x = Phaser.Math.Clamp(
      this.config.player.body.x + knockbackDirection.x,
      radius,
      this.config.worldWidth - radius,
    );
    this.config.player.body.y = Phaser.Math.Clamp(
      this.config.player.body.y + knockbackDirection.y,
      radius,
      this.config.worldHeight - radius,
    );
  }

  setContactCooldown(enemy: Enemy): void {
    this.contactDamageCooldowns.set(enemy, this.config.contactDamageCooldownMs);
  }

  clear(): void {
    this.unsubscribeEnemyKilled();
    this.contactDamageCooldowns.clear();
  }

  removeDeadEnemies(): void {
    for (let index = this.config.enemies.length - 1; index >= 0; index -= 1) {
      if (!this.config.enemies[index].isDead) {
        continue;
      }

      this.config.enemies.splice(index, 1);
    }
  }

  private updateEnemyMovement(deltaMs: number): void {
    for (const enemy of this.config.enemies) {
      if (enemy.isDead || enemy.dashEnabled) {
        continue;
      }

      this.config.enemyMovement.moveToward(enemy, this.config.player.body, deltaMs);
    }
  }

  private updateContactDamage(deltaMs: number): void {
    for (const [enemy, cooldownMs] of this.contactDamageCooldowns) {
      const nextCooldownMs = cooldownMs - deltaMs;

      if (nextCooldownMs > 0 && !enemy.isDead) {
        this.contactDamageCooldowns.set(enemy, nextCooldownMs);
        continue;
      }

      this.contactDamageCooldowns.delete(enemy);
    }

    for (const enemy of this.config.enemies) {
      if (
        enemy.isDead
        || enemy.isDashing()
        || this.contactDamageCooldowns.has(enemy)
        || !this.isPlayerHitByEnemy(enemy)
      ) {
        continue;
      }

      const hpBeforeDamage = this.config.playerHealth.currentHp;
      const actualDamage = this.config.playerHealth.takeDamage(enemy.damage);
      this.setContactCooldown(enemy);

      if (actualDamage > 0) {
        this.recordPlayerDamage(actualDamage);
      }

      if (this.config.playerHealth.currentHp < hpBeforeDamage) {
        this.triggerDamageReaction();
      }
    }
  }

  private isPlayerHitByEnemy(enemy: Enemy): boolean {
    const enemyRadius = this.getEnemyRadius(enemy);
    const contactRadius = this.config.playerHitRadius + enemyRadius;
    const currentDistance = Phaser.Math.Distance.Between(
      this.config.player.body.x,
      this.config.player.body.y,
      enemy.body.x,
      enemy.body.y,
    );

    if (currentDistance <= contactRadius) {
      return true;
    }

    return this.getPointToSegmentDistance(
      enemy.body.x,
      enemy.body.y,
      this.previousPlayerPosition.x,
      this.previousPlayerPosition.y,
      this.config.player.body.x,
      this.config.player.body.y,
    ) <= contactRadius;
  }

  private getPointToSegmentDistance(
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

    const rawT = (
      ((pointX - startX) * segmentX + (pointY - startY) * segmentY)
      / segmentLengthSq
    );
    const t = Phaser.Math.Clamp(rawT, 0, 1);
    const closestX = startX + segmentX * t;
    const closestY = startY + segmentY * t;

    return Phaser.Math.Distance.Between(pointX, pointY, closestX, closestY);
  }

  private triggerDamageReaction(): void {
    this.showDamageReactionFeedback(
      this.config.player.body.x,
      this.config.player.body.y,
    );

    const hitResult = this.config.damageCalculator.calculateDamage(
      this.config.damageReactionDamage,
    );

    for (const enemy of this.config.enemies) {
      if (enemy.isDead || !this.isEnemyInDamageReactionRange(enemy)) {
        continue;
      }

      enemy.takeDamage(hitResult);

      if (enemy.isDead) {
        enemy.destroy();
        continue;
      }

      this.knockEnemyBack(enemy);
    }
  }

  private isEnemyInDamageReactionRange(enemy: Enemy): boolean {
    return Phaser.Math.Distance.Between(
      this.config.player.body.x,
      this.config.player.body.y,
      enemy.body.x,
      enemy.body.y,
    ) <= this.config.damageReactionRadius;
  }

  private knockEnemyBack(enemy: Enemy): void {
    const direction = new Phaser.Math.Vector2(
      enemy.body.x - this.config.player.body.x,
      enemy.body.y - this.config.player.body.y,
    );

    if (direction.lengthSq() === 0) {
      direction.set(1, 0);
    }

    direction.normalize().scale(this.config.damageReactionKnockbackDistance);

    const enemyRadius = this.getEnemyRadius(enemy);
    enemy.body.x = Phaser.Math.Clamp(
      enemy.body.x + direction.x,
      enemyRadius,
      this.config.worldWidth - enemyRadius,
    );
    enemy.body.y = Phaser.Math.Clamp(
      enemy.body.y + direction.y,
      enemyRadius,
      this.config.worldHeight - enemyRadius,
    );
  }

  private getEnemyRadius(enemy: Enemy): number {
    const body = enemy.body as Phaser.GameObjects.GameObject & { radius?: number };

    return body.radius ?? 12;
  }

  private showDamageReactionFeedback(x: number, y: number): void {
    const feedback = this.config.scene.add.circle(
      x,
      y,
      this.config.damageReactionRadius,
      0x60a5fa,
      0.18,
    );

    feedback.setStrokeStyle(2, 0xbfdbfe, 0.8);
    feedback.setDepth(25);

    this.config.scene.tweens.add({
      targets: feedback,
      alpha: 0,
      scaleX: 1.18,
      scaleY: 1.18,
      duration: 180,
      onComplete: () => {
        feedback.destroy();
      },
    });
  }
}
