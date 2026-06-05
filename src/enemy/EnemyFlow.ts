import Phaser from 'phaser';

import { AudioManager } from '../audio/AudioManager';
import { CharacterRuntime } from '../character/CharacterRuntime';
import { DamageCalculator } from '../combat/DamageCalculator';
import { EventBus } from '../core/EventBus';
import { EndlessRewardManager } from '../endless/EndlessRewardManager';
import { GameEventBus } from '../events/GameEventBus';
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
  gameEventBus?: GameEventBus;
  getGameTimeSeconds?: () => number;
  getRunId?: () => string | undefined;
  floatingTextManager: FloatingTextManager;
  playtestSettings: PlaytestSettingsState;
  worldWidth: number;
  worldHeight: number;
  playerHitRadius: number;
  contactDamageCooldownMs: number;
  characterRuntime?: CharacterRuntime;
  isBossPhaseActive(): boolean;
  onEnemyKilled?(event: GameEventMap['EnemyKilled']): void;
}

export interface PlayerDamageResult {
  hit: boolean;
  actualDamage: number;
  shieldAbsorbed: boolean;
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
    this.config.playerHealth.updateInvulnerability(deltaMs);
    this.config.playerHealth.updateTemporaryEffects(deltaMs);
    this.config.characterRuntime?.updateDamageReaction(deltaMs, {
      player: this.config.player,
    });
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

  applyPlayerDamage(
    damage: number,
    options?: {
      sourceEnemy?: Enemy;
      knockbackDirection?: Phaser.Math.Vector2;
      knockbackDistance?: number;
      triggerReaction?: boolean;
    },
  ): PlayerDamageResult {
    const incomingDamage = Math.max(0, damage);
    const nowMs = this.config.scene.time.now;

    if (
      incomingDamage > 0
      && (
        this.config.playerHealth.isInvulnerable()
        || this.config.characterRuntime?.isDamageInvulnerable(nowMs)
      )
    ) {
      return {
        hit: false,
        actualDamage: 0,
        shieldAbsorbed: false,
      };
    }

    const shieldAbsorbed = incomingDamage > 0
      && (
        this.config.playerHealth.consumeShieldStack()
        || EndlessRewardManager.consumeGlobalShieldStack(incomingDamage)
      );
    const actualDamage = shieldAbsorbed
      ? 0
      : this.config.playerHealth.takeDamage(incomingDamage);
    const gameTimeSeconds = this.config.getGameTimeSeconds?.() ?? 0;

    if (options?.sourceEnemy) {
      this.setContactCooldown(options.sourceEnemy);
    }

    if (actualDamage > 0) {
      this.recordPlayerDamage(actualDamage);
    }

    if (actualDamage > 0 || shieldAbsorbed) {
      this.config.gameEventBus?.emit('player.damageTaken', {
        actualDamage,
        incomingDamage,
        shieldAbsorbed,
        currentHp: this.config.playerHealth.currentHp,
        gameTimeSeconds,
      }, {
        gameTimeSeconds,
        runId: this.config.getRunId?.(),
      });
    }

    if (shieldAbsorbed) {
      this.config.gameEventBus?.emit('player.shieldConsumed', {
        incomingDamage,
        gameTimeSeconds,
      }, {
        gameTimeSeconds,
        runId: this.config.getRunId?.(),
      });
    }

    if (options?.knockbackDirection && (actualDamage > 0 || shieldAbsorbed)) {
      this.knockPlayerBack(options.knockbackDirection, options.knockbackDistance ?? 0);
    }

    if (actualDamage > 0 && options?.triggerReaction !== false) {
      this.triggerDamageReaction();
    }

    return {
      hit: actualDamage > 0 || shieldAbsorbed,
      actualDamage,
      shieldAbsorbed,
    };
  }

  clear(): void {
    this.unsubscribeEnemyKilled();
    this.config.characterRuntime?.clear();
    this.contactDamageCooldowns.clear();
  }

  removeDeadEnemies(): void {
    for (let index = this.config.enemies.length - 1; index >= 0; index -= 1) {
      if (!this.config.enemies[index].isDead) {
        continue;
      }

      this.config.enemies[index].triggerModifierDeathEffects({
        scene: this.config.scene,
      });
      this.config.enemies.splice(index, 1);
    }
  }

  private updateEnemyMovement(deltaMs: number): void {
    const enemySpeedMultiplier = EndlessRewardManager.getGlobalEnemySpeedMultiplier();

    for (const enemy of this.config.enemies) {
      enemy.updateModifiers(deltaMs);

      if (enemy.isDead || enemy.dashEnabled) {
        continue;
      }

      if (enemy.updateWeaponKnockback(deltaMs, {
        width: this.config.worldWidth,
        height: this.config.worldHeight,
      })) {
        continue;
      }

      this.config.enemyMovement.moveToward(
        enemy,
        this.config.player.body,
        deltaMs,
        enemySpeedMultiplier * this.getZoneEnemySpeedMultiplier(enemy),
      );
    }
  }

  private getZoneEnemySpeedMultiplier(enemy: Enemy): number {
    if (enemy.bossLike || enemy.id === 'boss' || enemy.id.startsWith('endless_')) {
      return 1;
    }

    return this.config.characterRuntime?.getEnemySpeedMultiplierAt(
      enemy.body.x,
      enemy.body.y,
    ) ?? 1;
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

      this.applyPlayerDamage(enemy.damage, { sourceEnemy: enemy });
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
    this.config.characterRuntime?.tryTriggerDamageReaction({
      scene: this.config.scene,
      player: this.config.player,
      playerHealth: this.config.playerHealth,
      enemies: this.config.enemies,
      damageCalculator: this.config.damageCalculator,
      worldWidth: this.config.worldWidth,
      worldHeight: this.config.worldHeight,
      nowMs: this.config.scene.time.now,
      showPlayerHeal: (healAmount) => {
        this.config.floatingTextManager.showPlayerHeal(
          this.config.player.body.x,
          this.config.player.body.y,
          healAmount,
        );
      },
    });
  }

  private getEnemyRadius(enemy: Enemy): number {
    const body = enemy.body as Phaser.GameObjects.GameObject & { radius?: number };

    return body.radius ?? 12;
  }

}
