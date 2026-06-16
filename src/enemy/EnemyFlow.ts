import Phaser from 'phaser';

import { AssetKeyResolver } from '../assets/AssetKeyResolver';
import { AudioManager } from '../audio/AudioManager';
import { CharacterRuntime } from '../character/CharacterRuntime';
import { DamageCalculator } from '../combat/DamageCalculator';
import { EventBus } from '../core/EventBus';
import {
  isEnemyKilledEvent,
  type GameEventMap,
} from '../core/domain/GameEvents';
import { Math2D } from '../core/domain/Math2D';
import { EndlessRewardManager } from '../endless/EndlessRewardManager';
import { GameEventBus } from '../events/GameEventBus';
import { MapMechanicRuntime } from '../map/mechanics/MapMechanicRuntime';
import { PlayerController } from '../player/PlayerController';
import { PlayerHealth } from '../player/PlayerHealth';
import { PlayerStats } from '../player/PlayerStats';
import { RunState } from '../run/RunState';
import type { ScoreSource } from '../score/ScoreRules';
import { PlaytestSettingsState } from '../settings/PlaytestSettings';
import { RunStats } from '../stats/RunStats';
import { FloatingTextManager } from '../ui/FloatingTextManager';

import { Enemy } from './Enemy';
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
  shouldShowDamageNumbers(): boolean;
  isBossPhaseActive(): boolean;
  onEnemyKilled?(event: GameEventMap['EnemyKilled']): void;
}

export interface PlayerDamageResult {
  hit: boolean;
  actualDamage: number;
  shieldAbsorbed: boolean;
}

interface PendingEnemyMerge {
  left: Enemy;
  right: Enemy;
  remainingMs: number;
  lineEffect: Phaser.GameObjects.Line;
}

export class EnemyFlow {
  private readonly contactDamageCooldowns = new Map<Enemy, number>();
  private readonly unsubscribeEnemyKilled: () => void;
  private readonly previousPlayerPosition: Phaser.Math.Vector2;
  private readonly pendingEnemyMerges: PendingEnemyMerge[] = [];
  private enemyMergeCount = 0;
  private enemyMergeCreatedLv2 = 0;
  private enemyMergeCreatedLv3 = 0;
  private enemyMergeMaxLevelReached = 0;
  private maxMergeLevelSeen = 1;
  private maxAliveEnemyCount = 0;
  private aliveEnemySampleCount = 0;
  private aliveEnemySampleTotal = 0;

  constructor(private readonly config: EnemyFlowConfig) {
    const playerPosition = config.player.getPositionLike();
    this.previousPlayerPosition = new Phaser.Math.Vector2(
      playerPosition.x,
      playerPosition.y,
    );
    this.unsubscribeEnemyKilled = config.eventBus.subscribe('EnemyKilled', (event) => {
      if (!isEnemyKilledEvent(event)) {
        return;
      }

      const scoreSource = this.getScoreSource(event);

      this.config.runState.recordKill();
      this.config.runState.recordScore(
        scoreSource,
        this.getScoreMultiplier(event, scoreSource),
      );
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
    this.updatePendingEnemyMerges(deltaMs);
    this.removeDeadEnemies();
    this.updateEnemyMovement(deltaMs);
    this.updateEnemyMerges();
    this.updateContactDamage(deltaMs);
    this.updateAliveEnemyStats();
    const playerPosition = this.config.player.getPositionLike();
    this.previousPlayerPosition.set(
      playerPosition.x,
      playerPosition.y,
    );
  }

  getEnemies(): Enemy[] {
    return this.config.enemies;
  }

  recordPlayerDamage(actualDamage: number): void {
    AudioManager.playSfx(this.config.scene, 'player_hit');
    const playerPosition = this.config.player.getPositionLike();
    if (this.config.shouldShowDamageNumbers()) {
      this.config.floatingTextManager.showPlayerDamage(
        playerPosition.x,
        playerPosition.y,
        actualDamage,
      );
    }
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

    const playerPosition = this.config.player.getPositionLike();
    const radius = this.config.player.getCollisionRadius();
    const nextX = Math2D.clamp(
      playerPosition.x + knockbackDirection.x,
      radius,
      this.config.worldWidth - radius,
    );
    const nextY = Math2D.clamp(
      playerPosition.y + knockbackDirection.y,
      radius,
      this.config.worldHeight - radius,
    );

    this.config.player.applyExternalDisplacementLike({
      x: nextX - playerPosition.x,
      y: nextY - playerPosition.y,
    });
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
    this.clearPendingEnemyMerges();
  }

  removeDeadEnemies(): void {
    for (let index = this.config.enemies.length - 1; index >= 0; index -= 1) {
      const enemy = this.config.enemies[index];

      if (!enemy.isDead) {
        continue;
      }

      if (!enemy.wasRemovedByMerge()) {
        enemy.triggerModifierDeathEffects({
          scene: this.config.scene,
        });
      }
      this.contactDamageCooldowns.delete(enemy);
      enemy.destroy();
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
        this.setEnemyMapSlowVisual(enemy, false);
        enemy.updateShadow();
        continue;
      }

      if (enemy.isMovementLocked()) {
        const mapSlowState = this.getMapEnemySlowState(enemy);
        this.setEnemyMapSlowVisual(enemy, mapSlowState.isSlowed, mapSlowState.multiplier);
        enemy.updateShadow();
        continue;
      }

      if (enemy.updateWeaponKnockback(deltaMs, {
        width: this.config.worldWidth,
        height: this.config.worldHeight,
      })) {
        enemy.updateShadow();
        const mapSlowState = this.getMapEnemySlowState(enemy);
        this.setEnemyMapSlowVisual(enemy, mapSlowState.isSlowed, mapSlowState.multiplier);
        continue;
      }

      const mapSlowState = this.getMapEnemySlowState(enemy);
      this.config.enemyMovement.moveToward(
        enemy,
        this.config.player.getPositionLike(),
        deltaMs,
        enemySpeedMultiplier
          * this.getZoneEnemySpeedMultiplier(enemy)
          * mapSlowState.multiplier,
      );
      this.config.mapMechanicRuntime?.resolveEnemyObstacleCollision(enemy);
      const finalMapSlowState = this.getMapEnemySlowState(enemy);
      this.setEnemyMapSlowVisual(
        enemy,
        finalMapSlowState.isSlowed,
        finalMapSlowState.multiplier,
      );
      enemy.updateShadow();
    }
  }

  private setEnemyMapSlowVisual(enemy: Enemy, active: boolean, multiplier = 1): void {
    const slowAcquired = enemy.setMapSlowVisual(active, multiplier);

    if (!slowAcquired) {
      return;
    }

    this.config.floatingTextManager.showMoveSpeedDown(enemy.body.x, enemy.body.y);
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
    const playerPosition = this.config.player.getPositionLike();
    const currentDistance = Phaser.Math.Distance.Between(
      playerPosition.x,
      playerPosition.y,
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
      playerPosition.x,
      playerPosition.y,
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
        const playerPosition = this.config.player.getPositionLike();
        this.config.floatingTextManager.showPlayerHeal(
          playerPosition.x,
          playerPosition.y,
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

    let remainingMergeStarts = ENEMY_POPULATION_CONFIG.maxMergesPerFrame;

    for (let leftIndex = 0; leftIndex < this.config.enemies.length; leftIndex += 1) {
      if (remainingMergeStarts <= 0) {
        return;
      }

      const left = this.config.enemies[leftIndex];

      if (left.isDead) {
        continue;
      }

      for (let rightIndex = leftIndex + 1; rightIndex < this.config.enemies.length; rightIndex += 1) {
        if (remainingMergeStarts <= 0) {
          return;
        }

        const right = this.config.enemies[rightIndex];

        if (right.isDead || !left.canMergeWith(right)) {
          continue;
        }

        if (!left.beginMergePreparation(right)) {
          left.markMergeChecked();
          right.markMergeChecked();
          continue;
        }

        this.pendingEnemyMerges.push({
          left,
          right,
          remainingMs: ENEMY_POPULATION_CONFIG.mergePreparationDurationMs,
          lineEffect: this.createMergePreparationLine(left, right),
        });
        remainingMergeStarts -= 1;
      }
    }
  }

  private updatePendingEnemyMerges(deltaMs: number): void {
    for (let index = this.pendingEnemyMerges.length - 1; index >= 0; index -= 1) {
      const pendingMerge = this.pendingEnemyMerges[index];

      if (!this.isPendingEnemyMergeValid(pendingMerge)) {
        this.cancelPendingEnemyMerge(pendingMerge);
        this.pendingEnemyMerges.splice(index, 1);
        continue;
      }

      pendingMerge.remainingMs = Math.max(0, pendingMerge.remainingMs - Math.max(0, deltaMs));
      pendingMerge.left.setMergePreparationRemainingMs(pendingMerge.remainingMs);
      pendingMerge.right.setMergePreparationRemainingMs(pendingMerge.remainingMs);
      this.updateMergePreparationLine(pendingMerge);

      if (pendingMerge.remainingMs > 0) {
        continue;
      }

      this.completePendingEnemyMerge(pendingMerge);
      this.pendingEnemyMerges.splice(index, 1);
    }
  }

  private isPendingEnemyMergeValid(pendingMerge: PendingEnemyMerge): boolean {
    return (
      !pendingMerge.left.isDead
      && !pendingMerge.right.isDead
      && this.config.enemies.includes(pendingMerge.left)
      && this.config.enemies.includes(pendingMerge.right)
    );
  }

  private cancelPendingEnemyMerge(pendingMerge: PendingEnemyMerge): void {
    pendingMerge.left.cancelMergePreparation();
    pendingMerge.right.cancelMergePreparation();
    this.destroyMergePreparationLine(pendingMerge);
  }

  private completePendingEnemyMerge(pendingMerge: PendingEnemyMerge): void {
    const survivor = this.getMergeSurvivor(pendingMerge);
    const removed = survivor === pendingMerge.left ? pendingMerge.right : pendingMerge.left;
    const beforeMergeLevel = survivor.mergeLevel;

    this.destroyMergePreparationLine(pendingMerge);

    if (!survivor.completeMergeWith(removed)) {
      survivor.cancelMergePreparation();
      removed.cancelMergePreparation();
      survivor.markMergeChecked();
      removed.markMergeChecked();
      return;
    }

    this.config.floatingTextManager.showEnemyMergeLevelUp(
      survivor.body.x,
      survivor.body.y,
      beforeMergeLevel,
      survivor.mergeLevel,
      ENEMY_POPULATION_CONFIG.mergeMaxLevel,
    );
    this.recordMerge(survivor.mergeLevel);
    this.contactDamageCooldowns.delete(removed);
    this.removeMergedEnemyFromList(removed);
  }

  private getMergeSurvivor(pendingMerge: PendingEnemyMerge): Enemy {
    const playerPosition = this.config.player.getPositionLike();
    const playerX = playerPosition.x;
    const playerY = playerPosition.y;
    const leftDistanceSq = Phaser.Math.Distance.Squared(
      pendingMerge.left.body.x,
      pendingMerge.left.body.y,
      playerX,
      playerY,
    );
    const rightDistanceSq = Phaser.Math.Distance.Squared(
      pendingMerge.right.body.x,
      pendingMerge.right.body.y,
      playerX,
      playerY,
    );

    return leftDistanceSq >= rightDistanceSq ? pendingMerge.left : pendingMerge.right;
  }

  private removeMergedEnemyFromList(enemy: Enemy): void {
    const enemyIndex = this.config.enemies.indexOf(enemy);

    if (enemyIndex >= 0) {
      this.config.enemies.splice(enemyIndex, 1);
    }
  }

  private createMergePreparationLine(left: Enemy, right: Enemy): Phaser.GameObjects.Line {
    const line = this.config.scene.add.line(
      0,
      0,
      left.body.x,
      left.body.y,
      right.body.x,
      right.body.y,
      0x93c5fd,
      0.65,
    );

    line.setOrigin(0, 0);
    line.setLineWidth(3);
    line.setDepth(35);
    return line;
  }

  private updateMergePreparationLine(pendingMerge: PendingEnemyMerge): void {
    pendingMerge.lineEffect.setTo(
      pendingMerge.left.body.x,
      pendingMerge.left.body.y,
      pendingMerge.right.body.x,
      pendingMerge.right.body.y,
    );
  }

  private destroyMergePreparationLine(pendingMerge: PendingEnemyMerge): void {
    if (pendingMerge.lineEffect.active) {
      pendingMerge.lineEffect.destroy();
    }
  }

  private clearPendingEnemyMerges(): void {
    for (const pendingMerge of this.pendingEnemyMerges) {
      this.cancelPendingEnemyMerge(pendingMerge);
    }

    this.pendingEnemyMerges.length = 0;
  }

  private recordMerge(mergeLevel: number): void {
    this.enemyMergeCount += 1;
    this.maxMergeLevelSeen = Math.max(this.maxMergeLevelSeen, mergeLevel);

    if (mergeLevel === 2) {
      this.enemyMergeCreatedLv2 += 1;
    }

    if (mergeLevel === 3) {
      this.enemyMergeCreatedLv3 += 1;
    }

    if (mergeLevel === ENEMY_POPULATION_CONFIG.mergeMaxLevel) {
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

    const playerPosition = this.config.player.getPositionLike();
    const hitFx = this.config.scene.add.image(
      playerPosition.x,
      playerPosition.y,
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

  private getScoreSource(event: GameEventMap['EnemyKilled']): ScoreSource {
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

  private getScoreMultiplier(event: GameEventMap['EnemyKilled'], scoreSource: ScoreSource): number {
    if (scoreSource !== 'normalEnemy') {
      return 1;
    }

    const mergeLevel = Math.max(1, Math.floor(event.mergeLevel ?? 1));

    return 4 ** (mergeLevel - 1);
  }

}
