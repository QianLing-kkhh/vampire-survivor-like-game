import type { AutoStrategyProfile } from '../strategy/profile/AutoStrategyProfile';
import type {
  LiveStrategyControlHandler,
  LiveStrategyPanelContext,
  LiveStrategyPatchLike,
} from '../strategy/runtime/LiveStrategyControlHandler';
import type { RunState } from '../run/RunState';
import type { EnemyDamageFeedbackPayload } from '../ui/EnemyDamageFeedbackController';
import type { PauseFlowHandler, PauseFlowHandlerContext } from '../ui/pause/PauseFlowHandler';
import type {
  UpgradeSelectionFlowContext,
  UpgradeSelectionFlowHandler,
} from '../progression/UpgradeSelectionFlowHandler';

import type { GameSceneInputBindingHandlers } from './GameSceneInputBindings';

export interface GameSceneInputBindingScenePort {
  upgradeSelectionFlowHandler: UpgradeSelectionFlowHandler;
  pauseFlowHandler: PauseFlowHandler;
  liveStrategyControlHandler: LiveStrategyControlHandler;
  runState: RunState;
  gameplayContext?: { runtimeStrategyState?: Parameters<LiveStrategyControlHandler['handlePatch']>[1]['runtimeStrategyState'] };
  timeManager: { gameTimeSeconds: number };
  getUpgradeSelectionFlowContext(): UpgradeSelectionFlowContext;
  getPauseFlowContext(): PauseFlowHandlerContext;
  getLiveStrategyPanelContext(): LiveStrategyPanelContext;
  syncRuntimeStrategyProfile(profile?: AutoStrategyProfile): void;
  refreshLevelUpPanelAutoSelection(): void;
  emitHUDState(): void;
  showEnemyDamageFloatingText(payload: EnemyDamageFeedbackPayload): void;
  toggleDebugPanel(): void;
  handleResize(): void;
  cleanup(): void;
}

export function createGameSceneInputBindingHandlers(
  scene: GameSceneInputBindingScenePort,
): GameSceneInputBindingHandlers {
  return {
    handleUpgradeSelected: (option) => (
      scene.upgradeSelectionFlowHandler.handleUpgradeSelected(
        option,
        scene.getUpgradeSelectionFlowContext(),
      )
    ),
    handleEscapePressed: () => scene.pauseFlowHandler.handleEscapePressed(
      scene.getPauseFlowContext(),
    ),
    resumeFromPauseMenu: () => scene.pauseFlowHandler.resume(scene.getPauseFlowContext()),
    restartFromPauseMenu: () => scene.pauseFlowHandler.restart(scene.getPauseFlowContext()),
    backToTitleFromPauseMenu: () => scene.pauseFlowHandler.backToTitle(
      scene.getPauseFlowContext(),
    ),
    openDeveloperSceneFromPauseMenu: (sceneKey) => (
      scene.pauseFlowHandler.openDeveloperScene(scene.getPauseFlowContext(), sceneKey)
    ),
    handleLiveStrategyPatch: (payload: LiveStrategyPatchLike) => scene.liveStrategyControlHandler.handlePatch(
      payload,
      {
        runState: scene.runState,
        runtimeStrategyState: scene.gameplayContext?.runtimeStrategyState,
        gameTimeSeconds: scene.timeManager.gameTimeSeconds,
        syncRuntimeStrategyProfile: (profile) => scene.syncRuntimeStrategyProfile(profile),
        refreshLevelUpPanelAutoSelection: () => scene.refreshLevelUpPanelAutoSelection(),
        emitHUDState: () => scene.emitHUDState(),
      },
    ),
    handleStrategyTacticsPanelExpandedChanged: (payload) => (
      scene.liveStrategyControlHandler.handleExpandedChanged(
        payload,
        scene.getLiveStrategyPanelContext(),
      )
    ),
    handleStrategyTacticsPanelPauseWhenOpenChanged: (pauseWhenOpen) => (
      scene.liveStrategyControlHandler.handlePauseWhenOpenChanged(
        pauseWhenOpen,
        scene.getLiveStrategyPanelContext(),
      )
    ),
    showEnemyDamageFloatingText: (payload: EnemyDamageFeedbackPayload) => (
      scene.showEnemyDamageFloatingText(payload)
    ),
    toggleDebugPanel: () => scene.toggleDebugPanel(),
    handleResize: () => scene.handleResize(),
    cleanup: () => scene.cleanup(),
  };
}
