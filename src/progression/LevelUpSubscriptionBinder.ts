import Phaser from 'phaser';

import type { EventBus } from '../core/EventBus';
import type { GameEventMap } from '../enemy/Enemy';
import type { EvolutionManager } from '../evolution/EvolutionManager';
import type { GameplayContext } from '../gameplay/GameplayContext';
import type { PlayerController } from '../player/PlayerController';
import type { PlayerHealth } from '../player/PlayerHealth';
import type { RunState } from '../run/RunState';
import type { PlayerFeedbackController } from '../ui/PlayerFeedbackController';
import type { ProgressionEffectSynchronizer } from './ProgressionEffectSynchronizer';
import type {
  UpgradeSelectionFlowContext,
  UpgradeSelectionFlowHandler,
} from './UpgradeSelectionFlowHandler';

import type { LevelUpEventHandler } from './LevelUpEventHandler';
import type { UpgradeApplier } from './UpgradeApplier';
import type { UpgradeFlow } from './UpgradeFlow';
import type { UpgradeOption } from './UpgradeOption';

export interface LevelUpSubscriptionBinderContext {
  eventBus: EventBus<GameEventMap>;
  handler: LevelUpEventHandler;
  scene: Phaser.Scene;
  uiScene: Phaser.Scene;
  runState: RunState;
  runId: string;
  playerFeedbackController: PlayerFeedbackController;
  getGameplayContext(): GameplayContext | undefined;
  getPlayer(): PlayerController | undefined;
  getPlayerHealth(): PlayerHealth | undefined;
  getUpgradeFlow(): UpgradeFlow | undefined;
  getUpgradeApplier(): UpgradeApplier | undefined;
  getEvolutionManager(): EvolutionManager | undefined;
  getGameTimeSeconds(): number;
  getWorldWidth(): number;
  getWorldHeight(): number;
  getNowMs(): number;
  applyCharacterLevelStats(level: number): void;
  emitHUDState(): void;
  clearUpgradeSelection(): void;
  openLevelUpSelection(options: UpgradeOption[]): void;
  refreshLevelUpPanelAutoSelection(): void;
}

export interface LevelUpGameScenePort {
  eventBus: EventBus<GameEventMap>;
  levelUpEventHandler: LevelUpEventHandler;
  runState: RunState;
  runId: string;
  playerFeedbackController: PlayerFeedbackController;
  gameplayContext?: GameplayContext;
  player?: PlayerController;
  playerHealth?: PlayerHealth;
  upgradeFlow?: UpgradeFlow;
  upgradeApplier?: UpgradeApplier;
  evolutionManager?: EvolutionManager;
  timeManager: { gameTimeSeconds: number };
  time: { now: number };
  worldWidth: number;
  worldHeight: number;
  playerPickupRange: number;
  progressionEffectSynchronizer: ProgressionEffectSynchronizer;
  upgradeSelectionFlowHandler: UpgradeSelectionFlowHandler;
  getProgressionEffectSyncContext(): Parameters<ProgressionEffectSynchronizer['applyCharacterLevelStats']>[1];
  emitHUDState(): void;
  getUpgradeSelectionFlowContext(): UpgradeSelectionFlowContext;
  refreshLevelUpPanelAutoSelection(): void;
}

export class LevelUpSubscriptionBinder {
  bindGameScene(scene: LevelUpGameScenePort & Phaser.Scene, uiScene: Phaser.Scene): () => void {
    return this.bind({
      eventBus: scene.eventBus,
      handler: scene.levelUpEventHandler,
      scene,
      uiScene,
      runState: scene.runState,
      runId: scene.runId,
      playerFeedbackController: scene.playerFeedbackController,
      getGameplayContext: () => scene.gameplayContext,
      getPlayer: () => scene.player,
      getPlayerHealth: () => scene.playerHealth,
      getUpgradeFlow: () => scene.upgradeFlow,
      getUpgradeApplier: () => scene.upgradeApplier,
      getEvolutionManager: () => scene.evolutionManager,
      getGameTimeSeconds: () => scene.timeManager.gameTimeSeconds,
      getWorldWidth: () => scene.worldWidth,
      getWorldHeight: () => scene.worldHeight,
      getNowMs: () => scene.time.now,
      applyCharacterLevelStats: (level) => {
        scene.playerPickupRange = scene.progressionEffectSynchronizer.applyCharacterLevelStats(
          level,
          scene.getProgressionEffectSyncContext(),
        );
      },
      emitHUDState: () => scene.emitHUDState(),
      clearUpgradeSelection: () => (
        scene.upgradeSelectionFlowHandler.clearSelection(scene.getUpgradeSelectionFlowContext())
      ),
      openLevelUpSelection: (options) => (
        scene.upgradeSelectionFlowHandler.openSelection(
          'levelUp',
          options,
          scene.getUpgradeSelectionFlowContext(),
        )
      ),
      refreshLevelUpPanelAutoSelection: () => scene.refreshLevelUpPanelAutoSelection(),
    });
  }

  bind(context: LevelUpSubscriptionBinderContext): () => void {
    return context.eventBus.subscribe('LevelUp', (event) => {
      context.handler.handle({
        scene: context.scene,
        uiScene: context.uiScene,
        gameplayContext: context.getGameplayContext(),
        player: context.getPlayer(),
        playerHealth: context.getPlayerHealth(),
        upgradeFlow: context.getUpgradeFlow(),
        upgradeApplier: context.getUpgradeApplier(),
        evolutionManager: context.getEvolutionManager(),
        runState: context.runState,
        currentLevel: event.currentLevel,
        gameTimeSeconds: context.getGameTimeSeconds(),
        runId: context.runId,
        worldWidth: context.getWorldWidth(),
        worldHeight: context.getWorldHeight(),
        nowMs: context.getNowMs(),
        playerFeedbackController: context.playerFeedbackController,
        applyCharacterLevelStats: context.applyCharacterLevelStats,
        emitHUDState: context.emitHUDState,
        clearUpgradeSelection: context.clearUpgradeSelection,
        openLevelUpSelection: context.openLevelUpSelection,
        refreshLevelUpPanelAutoSelection: context.refreshLevelUpPanelAutoSelection,
      });
    });
  }
}
