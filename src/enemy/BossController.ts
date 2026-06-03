import Phaser from 'phaser';

import { AudioManager } from '../audio/AudioManager';
import { BossAttackController } from '../boss/BossAttackController';
import { EventBus } from '../core/EventBus';
import { BossSpawnDirector } from '../boss/BossSpawnDirector';
import { EnemyFactory } from './EnemyFactory';
import { EnemyMovement } from './EnemyMovement';
import { PlayerController } from '../player/PlayerController';
import { PlayerHealth } from '../player/PlayerHealth';
import { RunState } from '../run/RunState';

import { Enemy, GameEventMap } from './Enemy';
import { EnemyFlow } from './EnemyFlow';

export interface BossControllerConfig {
  scene: Phaser.Scene;
  eventBus: EventBus<GameEventMap>;
  enemies: Enemy[];
  enemyFactory: EnemyFactory;
  enemyMovement: EnemyMovement;
  bossSpawnDirector: BossSpawnDirector;
  enemyFlow: EnemyFlow;
  player: PlayerController;
  playerHealth: PlayerHealth;
  runState: RunState;
  worldWidth: number;
  worldHeight: number;
  warningTimeSeconds: number;
  finalBossTimeSeconds: number;
  finalBossId: string;
  dashHitRadius: number;
  dashImpactRadius: number;
  dashImpactDamage: number;
  dashKnockbackDistance: number;
  contactDamageCooldownMs: number;
  onCenterMessage(message: string): void;
}

export class BossController {
  private finalBossWarningShown = false;
  private finalBossSpawned = false;
  private finalBossDefeated = false;
  private finalBossSpawnTime = 0;
  private finalBossKillTime = 0;
  private finalBoss?: Enemy;
  private bossAttackController?: BossAttackController;

  constructor(private readonly config: BossControllerConfig) {}

  update(timeSeconds: number, deltaMs: number): void {
    this.updateFinalBossEvent(timeSeconds);
    this.config.bossSpawnDirector.update(timeSeconds);
    this.updateBossProjectiles(deltaMs);
    this.updateFinalBossDash(deltaMs);
    this.updateBossDashImpacts();
  }

  handleEnemyKilled(event: GameEventMap['EnemyKilled'], timeSeconds: number): void {
    if (!event.isBoss) {
      return;
    }

    this.config.onCenterMessage('Boss Defeated!');

    if (event.enemyId !== this.config.finalBossId) {
      return;
    }

    this.finalBossKillTime = timeSeconds;
    this.finalBossDefeated = true;
    this.bossAttackController?.destroy();
    this.bossAttackController = undefined;
    this.finalBoss = undefined;
  }

  isBossActive(): boolean {
    return this.finalBossSpawned && !this.finalBossDefeated;
  }

  hasBossSpawned(): boolean {
    return this.finalBossSpawned;
  }

  hasBossBeenKilled(): boolean {
    return this.finalBossDefeated;
  }

  getBossSpawnTime(): number {
    return this.finalBossSpawnTime;
  }

  getBossKillTime(): number {
    return this.finalBossKillTime;
  }

  getHUDMessage(): string | undefined {
    if (this.bossAttackController?.isWarningActive()) {
      return 'Boss Attack Incoming';
    }

    if (this.finalBossSpawned && !this.finalBossDefeated) {
      return 'Defeat the Boss';
    }

    if (this.finalBossWarningShown && !this.finalBossSpawned) {
      return 'Boss Coming';
    }

    return undefined;
  }

  clear(): void {
    this.bossAttackController?.destroy();
    this.bossAttackController = undefined;
    this.finalBoss = undefined;
  }

  private updateFinalBossEvent(timeSeconds: number): void {
    if (
      !this.finalBossWarningShown
      && timeSeconds >= this.config.warningTimeSeconds
    ) {
      this.finalBossWarningShown = true;
      this.config.onCenterMessage('Boss Coming');
    }

    if (
      !this.finalBossSpawned
      && timeSeconds >= this.config.finalBossTimeSeconds
    ) {
      this.spawnFinalBoss(timeSeconds);
    }
  }

  private spawnFinalBoss(timeSeconds: number): void {
    const position = this.getFinalBossSpawnPosition();
    const boss = this.config.enemyFactory.create(
      this.config.finalBossId,
      position.x,
      position.y,
    );

    boss.setEventBus(this.config.eventBus);
    this.config.enemies.push(boss);
    this.finalBoss = boss;
    this.finalBossSpawned = true;
    this.finalBossSpawnTime = timeSeconds;
    this.config.runState.setBossPhaseInitialHp(this.config.playerHealth.currentHp);
    this.bossAttackController = new BossAttackController(this.config.scene, boss);
    AudioManager.playSfx(this.config.scene, 'boss_spawn');
    AudioManager.playBgm(this.config.scene, 'boss_bgm');
    this.config.onCenterMessage('Boss Appears!');
  }

  private getFinalBossSpawnPosition(): { x: number; y: number } {
    const padding = 120;
    const candidates = [
      { x: this.config.worldWidth / 2, y: padding },
      { x: this.config.worldWidth - padding, y: this.config.worldHeight / 2 },
      { x: this.config.worldWidth / 2, y: this.config.worldHeight - padding },
      { x: padding, y: this.config.worldHeight / 2 },
    ];
    let farthestPosition = candidates[0];
    let farthestDistance = -1;

    for (const candidate of candidates) {
      const distance = Phaser.Math.Distance.Between(
        this.config.player.body.x,
        this.config.player.body.y,
        candidate.x,
        candidate.y,
      );

      if (distance <= farthestDistance) {
        continue;
      }

      farthestPosition = candidate;
      farthestDistance = distance;
    }

    return farthestPosition;
  }

  private updateFinalBossDash(deltaMs: number): void {
    const boss = this.finalBoss;

    if (!boss || boss.isDead) {
      return;
    }

    const dashHandledMovement = boss.updateDash(
      deltaMs,
      this.config.player.body,
      { width: this.config.worldWidth, height: this.config.worldHeight },
    );

    if (boss.consumeDashStarted()) {
      this.config.runState.recordBossDash();
      AudioManager.playSfx(this.config.scene, 'boss_dash');
    }

    if (!dashHandledMovement) {
      this.config.enemyMovement.moveToward(boss, this.config.player.body, deltaMs);
    }

    this.updateBossDashContact(boss);
  }

  private updateBossProjectiles(deltaMs: number): void {
    this.bossAttackController?.update(
      deltaMs,
      this.config.player.body,
      (damage) => this.applyBossProjectileDamage(damage),
    );
  }

  private applyBossProjectileDamage(damage: number): void {
    const actualDamage = this.config.playerHealth.takeDamage(damage);

    if (actualDamage <= 0) {
      return;
    }

    this.config.enemyFlow.recordPlayerDamage(actualDamage);
  }

  private updateBossDashContact(enemy: Enemy): void {
    if (!enemy.isDashing() || !this.isPlayerHitByBossDash(enemy)) {
      return;
    }

    if (!enemy.consumeDashHit()) {
      return;
    }

    const actualDamage = this.config.playerHealth.takeDamage(
      enemy.damage * enemy.dashDamageMultiplier,
    );
    this.config.enemyFlow.setContactCooldown(enemy);

    if (actualDamage <= 0) {
      return;
    }

    this.config.runState.recordBossDashHit();
    this.config.enemyFlow.knockPlayerBack(
      enemy.getDashDirection(),
      this.config.dashKnockbackDistance,
    );
    this.config.enemyFlow.recordPlayerDamage(actualDamage);
  }

  private updateBossDashImpacts(): void {
    for (const enemy of this.config.enemies) {
      if (enemy.isDead) {
        continue;
      }

      const impactPosition = enemy.consumeDashImpact();

      if (!impactPosition) {
        continue;
      }

      const distance = Phaser.Math.Distance.Between(
        this.config.player.body.x,
        this.config.player.body.y,
        impactPosition.x,
        impactPosition.y,
      );

      if (
        distance > this.config.dashImpactRadius
        || !enemy.consumeDashHit()
      ) {
        continue;
      }

      const actualDamage = this.config.playerHealth.takeDamage(
        this.config.dashImpactDamage,
      );

      if (actualDamage <= 0) {
        continue;
      }

      this.config.runState.recordBossDashHit();
      this.config.enemyFlow.recordPlayerDamage(actualDamage);
      this.config.enemyFlow.knockPlayerBack(
        new Phaser.Math.Vector2(
          this.config.player.body.x - impactPosition.x,
          this.config.player.body.y - impactPosition.y,
        ),
        this.config.dashKnockbackDistance,
      );
      this.config.enemyFlow.setContactCooldown(enemy);
    }
  }

  private isPlayerHitByBossDash(enemy: Enemy): boolean {
    const dashSegment = enemy.getDashSegment();

    if (!dashSegment) {
      return false;
    }

    return this.getPointToSegmentDistance(
      this.config.player.body.x,
      this.config.player.body.y,
      dashSegment.start.x,
      dashSegment.start.y,
      dashSegment.end.x,
      dashSegment.end.y,
    ) <= this.config.dashHitRadius;
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
}
