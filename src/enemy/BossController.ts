import Phaser from 'phaser';

import type { AutoBossWarningSnapshot } from '../auto/AutoPlayerTypes';
import { BossLifecycleController } from '../boss/BossLifecycleController';
import { BossSpawnDirector } from '../boss/BossSpawnDirector';
import { EventBus } from '../core/EventBus';
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
  onCenterMessage(message: string, options?: { kind?: 'normal' | 'boss'; durationMs?: number }): void;
}

export class BossController {
  private readonly lifecycle: BossLifecycleController;

  constructor(private readonly config: BossControllerConfig) {
    this.lifecycle = new BossLifecycleController({
      scene: config.scene,
      eventBus: config.eventBus,
      enemies: config.enemies,
      enemyFactory: config.enemyFactory,
      enemyMovement: config.enemyMovement,
      enemyFlow: config.enemyFlow,
      player: config.player,
      playerHealth: config.playerHealth,
      runState: config.runState,
      worldWidth: config.worldWidth,
      worldHeight: config.worldHeight,
      warningTimeSeconds: config.warningTimeSeconds,
      finalBossTimeSeconds: config.finalBossTimeSeconds,
      finalBossId: config.finalBossId,
      dashHitRadius: config.dashHitRadius,
      dashImpactRadius: config.dashImpactRadius,
      dashImpactDamage: config.dashImpactDamage,
      dashKnockbackDistance: config.dashKnockbackDistance,
      onCenterMessage: config.onCenterMessage,
    });
  }

  update(timeSeconds: number, deltaMs: number): void {
    this.lifecycle.updateWarningAndSpawn(timeSeconds);
    this.config.bossSpawnDirector.update(timeSeconds);
    this.lifecycle.updateActiveBoss(deltaMs);
  }

  handleEnemyKilled(event: GameEventMap['EnemyKilled'], timeSeconds: number): void {
    this.lifecycle.handleEnemyKilled(event, timeSeconds);
  }

  isBossActive(): boolean {
    return this.lifecycle.isBossActive();
  }

  hasBossSpawned(): boolean {
    return this.lifecycle.hasBossSpawned();
  }

  hasBossBeenKilled(): boolean {
    return this.lifecycle.hasBossBeenKilled();
  }

  getBossSpawnTime(): number {
    return this.lifecycle.getBossSpawnTime();
  }

  getBossKillTime(): number {
    return this.lifecycle.getBossKillTime();
  }

  getHUDMessage(): string | undefined {
    return this.lifecycle.getHUDMessage();
  }

  getAutoBossWarnings(): AutoBossWarningSnapshot[] {
    return this.lifecycle.getAutoBossWarnings();
  }

  clear(): void {
    this.lifecycle.clear();
  }
}
