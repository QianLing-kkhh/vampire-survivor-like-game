import Phaser from 'phaser';

import { AssetKeyResolver } from '../assets/AssetKeyResolver';
import { AudioManager } from '../audio/AudioManager';
import { CharacterRuntime } from '../character/CharacterRuntime';
import { DamageCalculator } from '../combat/DamageCalculator';
import { EventBus } from '../core/EventBus';
import { EndlessRewardManager } from '../endless/EndlessRewardManager';
import { GameEventBus } from '../events/GameEventBus';
import { MapMechanicRuntime } from '../map/mechanics/MapMechanicRuntime';
import { PlayerController } from '../player/PlayerController';
import { PlayerHealth } from '../player/PlayerHealth';
import { PlayerStats } from '../player/PlayerStats';
import { RunState } from '../run/RunState';
import { PlaytestSettingsState } from '../settings/PlaytestSettings';
import { RunStats } from '../stats/RunStats';
import { FloatingTextManager } from '../ui/FloatingTextManager';

import { Enemy, GameEventMap, isEnemyKilledEvent } from './Enemy';
import { ENEMY_POPULATION_CONFIG } from './EnemyPopulationConfig';
import { EnemyMovement } from './EnemyMovement';

export interface EnemyFlowConfig {
  scene: Phaser.Scene;
  enemies: Enemy[];
  eventBus: EventBus<GameEventMap>;
  enemyMovement: EnemyMovement;
  damageCalculator: DamageCalculator;
  player: PlayerController;
  playerHealth: PlayerHealth;
  playerStats: PlayerStats;
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
  finalBossId: string;
  characterRuntime?: CharacterRuntime;
  mapMechanicRuntime?: MapMechanicRuntime;
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
  private enemyMergeCount = 0;
  private enemyMergeCreatedLv2 = 0;
  private enemyMergeCreatedLv3 = 0;
  private enemyMergeMaxLevelReached = 0;
  private maxMergeLevelSeen = 1;
  private maxAliveEnemyCount = 0;
  private aliveEnemySampleCount = 0;
  private aliveEnemySampleTotal = 0;

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
      this.config.runState.recordScore(this.getScoreSource(event));
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
    this.updateEnemyMerges();
    this.updateContactDamage(deltaMs);
    this.updateAliveEnemyStats();
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
    this.showCharacterHitFx();
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
    const incomingDamage = Math.max(
      0,
      damage - this.getArmorFlatReduction(),
    );
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

      if (!this.config.enemies[index].wasRemovedByMerge()) {
        this.config.enemies[index].triggerModifierDeathEffects({
          scene: this.config.scene,
        });
      }
      this.contactDamageCooldowns.delete(this.config.enemies[index]);
      this.config.enemies.splice(index, 1);
    }
  }

  getPopulationStats(): {
    enemyMergeCount: number;
    enemyMergeCreatedLv2: number;
    enemyMergeCreatedLv3: number;
    enemyMergeMaxLevelReached: number;
    maxMergeLevelSeen: number;
    maxAliveEnemyCount: number;
    averageAliveEnemyCount: number;
  } {
    return {
      enemyMergeCount: this.enemyMergeCount,
      enemyMergeCreatedLv2: this.enemyMergeCreatedLv2,
      enemyMergeCreatedLv3: this.enemyMergeCreatedLv3,
      enemyMergeMaxLevelReached: this.enemyMergeMaxLevelReached,
      maxMergeLevelSeen: this.maxMergeLevelSeen,
      maxAliveEnemyCount: this.maxAliveEnemyCount,
      averageAliveEnemyCount: this.aliveEnemySampleCount <= 0
        ? 0
        : this.aliveEnemySampleTotal / this.aliveEnemySampleCount,
    };
  }

  private updateEnemyMovement(deltaMs: number): void {
    const enemySpeedMultiplier = EndlessRewardManager.getGlobalEnemySpeedMultiplier();

    this.config.enemyMovement.prepareFrame(this.config.enemies);

    for (const enemy of this.config.enemies) {
      enemy.updateModifiers(deltaMs);

      if (enemy.isDead || enemy.dashEnabled) {
        enemy.setMapSlowVisual(false);
        enemy.updateShadow();
        continue;
      }

      if (enemy.isMovementLocked()) {
        const mapSlowState = this.getMapEnemySlowState(enemy);
        enemy.setMapSlowVisual(mapSlowState.isSlowed, mapSlowState.multiplier);
        enemy.updateShadow();
        continue;
      }

      if (enemy.updateWeaponKnockback(deltaMs, {
        width: this.config.worldWidth,
        height: this.config.worldHeight,
      })) {
        enemy.updateShadow();
        const mapSlowState = this.getMapEnemySlowState(enemy);
        enemy.setMapSlowVisual(mapSlowState.isSlowed, mapSlowState.multiplier);
        continue;
      }

      const mapSlowState = this.getMapEnemySlowState(enemy);
      this.config.enemyMovement.moveToward(
        enemy,
        this.config.player.body,
        deltaMs,
        enemySpeedMultiplier
          * this.getZoneEnemySpeedMultiplier(enemy)
          * mapSlowState.multiplier,
      );
      this.config.mapMechanicRuntime?.resolveEnemyObstacleCollision(enemy);
      const finalMapSlowState = this.getMapEnemySlowState(enemy);
      enemy.setMapSlowVisual(finalMapSlowState.isSlowed, finalMapSlowState.multiplier);
      enemy.updateShadow();
    }
  }

  private getMapEnemySlowState(enemy: Enemy): {
    isSlowed: boolean;
    multiplier: number;
  } {
    return this.config.mapMechanicRuntime?.getEnemySlowState(
      enemy,
      enemy.body.x,
      enemy.body.y,
    ) ?? {
      isSlowed: false,
      multiplier: 1,
    };
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
        || enemy.isContactDamageSuppressed()
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
      characterId: this.config.characterRuntime?.getCharacterId(),
      skinId: this.config.characterRuntime?.getSkinId(),
      showPlayerHeal: (healAmount) => {
        this.config.floatingTextManager.showPlayerHeal(
          this.config.player.body.x,
          this.config.player.body.y,
          healAmount,
        );
      },
    });
  }

  private getArmorFlatReduction(): number {
    return Math.max(
      0,
      this.config.playerStats.armorFlat
        + (this.config.characterRuntime?.getTemporaryArmorFlatBonus() ?? 0),
    );
  }

  private updateEnemyMerges(): void {
    if (!ENEMY_POPULATION_CONFIG.mergeEnabled) {
      return;
    }

    let remainingMerges = ENEMY_POPULATION_CONFIG.maxMergesPerFrame;

    for (let leftIndex = 0; leftIndex < this.config.enemies.length; leftIndex += 1) {
      if (remainingMerges <= 0) {
        return;
      }

      const survivor = this.config.enemies[leftIndex];

      if (survivor.isDead) {
        continue;
      }

      for (let rightIndex = leftIndex + 1; rightIndex < this.config.enemies.length; rightIndex += 1) {
        if (remainingMerges <= 0) {
          return;
        }

        const removed = this.config.enemies[rightIndex];

        if (removed.isDead || !survivor.canMergeWith(removed)) {
          continue;
        }

        if (!survivor.mergeWith(removed)) {
          survivor.markMergeChecked();
          removed.markMergeChecked();
          continue;
        }

        remainingMerges -= 1;
        this.recordMerge(survivor.mergeLevel);
        this.contactDamageCooldowns.delete(removed);
        this.config.enemies.splice(rightIndex, 1);
        rightIndex -= 1;
      }
    }
  }

  private recordMerge(mergeLevel: number): void {
    this.enemyMergeCount += 1;
    this.maxMergeLevelSeen = Math.max(this.maxMergeLevelSeen, mergeLevel);

    if (mergeLevel === 2) {
      this.enemyMergeCreatedLv2 += 1;
    }

    if (mergeLevel === 3) {
      this.enemyMergeCreatedLv3 += 1;
      this.enemyMergeMaxLevelReached += 1;
    }
  }

  private updateAliveEnemyStats(): void {
    const aliveEnemyCount = this.config.enemies.filter((enemy) => !enemy.isDead).length;

    this.maxAliveEnemyCount = Math.max(this.maxAliveEnemyCount, aliveEnemyCount);
    this.aliveEnemySampleTotal += aliveEnemyCount;
    this.aliveEnemySampleCount += 1;
  }

  private showCharacterHitFx(): void {
    const textureKey = AssetKeyResolver.getPlayerEffectTextureKey(
      this.config.scene,
      'hit_fx',
      this.config.characterRuntime?.getSkinId(),
      this.config.characterRuntime?.getCharacterId(),
    );

    if (!textureKey) {
      return;
    }

    const hitFx = this.config.scene.add.image(
      this.config.player.body.x,
      this.config.player.body.y,
      textureKey,
    );

    hitFx.setDisplaySize(58, 58);
    hitFx.setDepth(26);
    hitFx.setAlpha(0.72);
    this.config.scene.tweens.add({
      targets: hitFx,
      alpha: 0,
      scaleX: 1.25,
      scaleY: 1.25,
      duration: 180,
      onComplete: () => hitFx.destroy(),
    });
  }

  private getEnemyRadius(enemy: Enemy): number {
    const body = enemy.body as Phaser.GameObjects.GameObject & { radius?: number };

    return body.radius ?? 12;
  }

  private getScoreSource(event: GameEventMap['EnemyKilled']) {
    const enemyId = event.enemyId ?? '';

    if (enemyId === this.config.finalBossId) {
      return 'finalBoss';
    }

    if (
      enemyId.endsWith('_boss')
      || enemyId.startsWith('endless_')
      || event.isBoss === true
      || event.isBossLike === true
    ) {
      return 'miniBoss';
    }

    return 'normalEnemy';
  }

}
