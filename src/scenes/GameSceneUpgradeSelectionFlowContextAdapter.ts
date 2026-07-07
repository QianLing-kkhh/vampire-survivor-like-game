import type { EvolutionManager } from '../evolution/EvolutionManager';
import type { GameplayContext } from '../gameplay/GameplayContext';
import type { LevelUpOptionsPresenter } from '../ui/LevelUpOptionsPresenter';
import type { PlayerController } from '../player/PlayerController';
import type { PlaytestSettingsState } from '../settings/PlaytestSettings';
import type { TreasureRewardFeedbackController } from '../ui/TreasureRewardFeedbackController';
import type { UpgradeApplier } from '../progression/UpgradeApplier';
import type { UpgradeFlow } from '../progression/UpgradeFlow';
import type { UpgradeSelectionFlowContext } from '../progression/UpgradeSelectionFlowHandler';
import type { UpgradeSelectionState } from '../progression/UpgradeSelectionState';

interface GameplayActivityController {
  setGameplayActive(active: boolean): void;
}

export interface GameSceneUpgradeSelectionFlowScenePort {
  gameplayContext?: GameplayContext;
  upgradeSelectionState: UpgradeSelectionState;
  upgradeFlow?: UpgradeFlow;
  upgradeApplier?: UpgradeApplier;
  evolutionManager?: EvolutionManager;
  player?: PlayerController;
  playtestSettings: PlaytestSettingsState;
  timeManager: { gameTimeSeconds: number };
  runId: string;
  isGameplayPaused: boolean;
  virtualJoystick?: GameplayActivityController;
  treasureRewardFeedbackController: TreasureRewardFeedbackController;
  levelUpOptionsPresenter: LevelUpOptionsPresenter;
  shouldVirtualJoystickBeActive(): boolean;
  syncRuntimeStrategyProfile(profile?: unknown): void;
}

export class GameSceneUpgradeSelectionFlowContextAdapter {
  build(scene: GameSceneUpgradeSelectionFlowScenePort): UpgradeSelectionFlowContext {
    return {
      gameplayContext: scene.gameplayContext,
      upgradeSelectionState: scene.upgradeSelectionState,
      upgradeFlow: scene.upgradeFlow,
      upgradeApplier: scene.upgradeApplier,
      evolutionManager: scene.evolutionManager,
      player: scene.player,
      autoOpenTreasure: scene.playtestSettings.autoOpenTreasure,
      gameTimeSeconds: scene.timeManager.gameTimeSeconds,
      runId: scene.runId,
      setGameplayPaused: (paused: boolean) => {
        scene.isGameplayPaused = paused;
      },
      setVirtualJoystickActive: (active: boolean) => (
        scene.virtualJoystick?.setGameplayActive(active)
      ),
      shouldVirtualJoystickBeActive: () => scene.shouldVirtualJoystickBeActive(),
      syncRuntimeStrategyProfile: () => (
        scene.syncRuntimeStrategyProfile(scene.gameplayContext?.runtimeStrategyState?.getProfile())
      ),
      treasureRewardFeedbackController: scene.treasureRewardFeedbackController,
      levelUpOptionsPresenter: scene.levelUpOptionsPresenter,
    };
  }
}
