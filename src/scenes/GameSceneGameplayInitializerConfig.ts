import Phaser from 'phaser';

import type { AutoPlayer } from '../auto/AutoPlayer';
import type { AutoUpgradeSelectionContext, AutoUpgradeSelector } from '../auto/AutoUpgradeSelector';
import type { DamageCalculator } from '../combat/DamageCalculator';
import type { EventBus } from '../core/EventBus';
import type { Enemy, GameEventMap } from '../enemy/Enemy';
import type { EnemyMovement } from '../enemy/EnemyMovement';
import type { GameplayInitializerConfig } from '../gameplay/GameplayInitializer';
import type { ProgressionEffectSyncContext } from '../progression/ProgressionEffectSynchronizer';
import type { UpgradeSelectionContext } from '../progression/UpgradeSelector';
import type { UpgradeSelectionFlowContext } from '../progression/UpgradeSelectionFlowHandler';
import type { RunState } from '../run/RunState';
import { SettingsManager } from '../settings/SettingsManager';
import type { PlaytestSettingsState } from '../settings/PlaytestSettings';
import type { TimeManager } from '../core/TimeManager';
import type { CenterMessageController } from '../ui/CenterMessageController';
import type { PauseFlowHandlerContext } from '../ui/pause/PauseFlowHandler';
import type { SpawnEventReporterContext } from '../enemy/SpawnEventReporter';

export interface GameSceneGameplayInitializerStaticConfig {
  PLAYER_HIT_RADIUS: number;
  CONTACT_DAMAGE_COOLDOWN_MS: number;
  BOSS_DASH_HIT_RADIUS: number;
  BOSS_DASH_IMPACT_RADIUS: number;
  BOSS_DASH_IMPACT_DAMAGE: number;
  BOSS_DASH_KNOCKBACK_DISTANCE: number;
}

export interface GameSceneGameplayInitializerScenePort extends Phaser.Scene {
  eventBus: EventBus<GameEventMap>;
  runId: string;
  autoPlayer: AutoPlayer;
  autoUpgradeSelector: AutoUpgradeSelector;
  damageCalculator: DamageCalculator;
  enemyMovement: EnemyMovement;
  timeManager: TimeManager;
  runState: RunState;
  playtestSettings: PlaytestSettingsState;
  worldWidth: number;
  worldHeight: number;
  currentStage: {
    finalBossId: string;
    finalBossSpawnTimeSeconds: number;
  };
  finalBossWarningTimeSeconds: number;
  playerPickupRange: number;
  pauseFlowHandler: { handleEscapePressed(context: PauseFlowHandlerContext): void };
  progressionEffectSynchronizer: {
    handleUpgradeApplied(context: ProgressionEffectSyncContext): number;
  };
  upgradeSelectionFlowHandler: {
    handleTreasureRewardRequested(context: UpgradeSelectionFlowContext): void;
  };
  spawnEventReporter: {
    recordEnemySpawn(enemy: Enemy, context: SpawnEventReporterContext): void;
    recordBossSpawn(boss: Enemy, context: SpawnEventReporterContext): void;
  };
  centerMessageController: CenterMessageController;
  getPauseFlowContext(): PauseFlowHandlerContext;
  getUpgradeSelectionContext(): UpgradeSelectionContext;
  getAutoUpgradeSelectionContext(): AutoUpgradeSelectionContext;
  getProgressionEffectSyncContext(): ProgressionEffectSyncContext;
  getUpgradeSelectionFlowContext(): UpgradeSelectionFlowContext;
  getSpawnEventReporterContext(): SpawnEventReporterContext;
  handleChestOpened(): void;
}

export function createGameSceneGameplayInitializerConfig(
  scene: GameSceneGameplayInitializerScenePort,
  staticConfig: GameSceneGameplayInitializerStaticConfig,
): GameplayInitializerConfig {
  return {
    scene,
    eventBus: scene.eventBus,
    runId: scene.runId,
    autoPlayer: scene.autoPlayer,
    autoUpgradeSelector: scene.autoUpgradeSelector,
    damageCalculator: scene.damageCalculator,
    enemyMovement: scene.enemyMovement,
    timeManager: scene.timeManager,
    runState: scene.runState,
    playtestSettings: scene.playtestSettings,
    centerX: scene.scale.width / 2,
    centerY: scene.scale.height / 2,
    worldWidth: scene.worldWidth,
    worldHeight: scene.worldHeight,
    finalBossId: scene.currentStage.finalBossId,
    finalBossWarningSeconds: scene.finalBossWarningTimeSeconds,
    finalBossTimeSeconds: scene.currentStage.finalBossSpawnTimeSeconds,
    playerHitRadius: staticConfig.PLAYER_HIT_RADIUS,
    contactDamageCooldownMs: staticConfig.CONTACT_DAMAGE_COOLDOWN_MS,
    bossDashHitRadius: staticConfig.BOSS_DASH_HIT_RADIUS,
    bossDashImpactRadius: staticConfig.BOSS_DASH_IMPACT_RADIUS,
    bossDashImpactDamage: staticConfig.BOSS_DASH_IMPACT_DAMAGE,
    bossDashKnockbackDistance: staticConfig.BOSS_DASH_KNOCKBACK_DISTANCE,
    callbacks: {
      onPauseRequested: () => (
        scene.pauseFlowHandler.handleEscapePressed(scene.getPauseFlowContext())
      ),
      getUpgradeSelectionContext: () => scene.getUpgradeSelectionContext(),
      getAutoUpgradeSelectionContext: () => scene.getAutoUpgradeSelectionContext(),
      onUpgradeApplied: () => {
        scene.playerPickupRange = scene.progressionEffectSynchronizer.handleUpgradeApplied(
          scene.getProgressionEffectSyncContext(),
        );
      },
      onChestDropped: () => {
        scene.runState.recordTreasureDrop();
      },
      onChestOpened: () => scene.handleChestOpened(),
      onTreasureRewardRequested: () => (
        scene.upgradeSelectionFlowHandler.handleTreasureRewardRequested(
          scene.getUpgradeSelectionFlowContext(),
        )
      ),
      onEnemySpawned: (enemy) => (
        scene.spawnEventReporter.recordEnemySpawn(enemy, scene.getSpawnEventReporterContext())
      ),
      onBossSpawned: (boss) => (
        scene.spawnEventReporter.recordBossSpawn(boss, scene.getSpawnEventReporterContext())
      ),
      onCenterMessage: (message, options) => (
        scene.centerMessageController.show(message, options)
      ),
      shouldShowDamageNumbers: () => SettingsManager.getGameplay().showDamageNumbers,
    },
  };
}
