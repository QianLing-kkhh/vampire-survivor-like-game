import type { GameSceneChestOpenHandler } from './GameSceneChestOpenHandler';
import type { GameplayContext } from '../gameplay/GameplayContext';
import type { ProgressionEffectSyncContext } from '../progression/ProgressionEffectSynchronizer';
import type { ProgressionEffectSynchronizer } from '../progression/ProgressionEffectSynchronizer';
import type { RelicAcquiredPresenter } from '../ui/relic/RelicAcquiredPresenter';
import type { RelicRewardSelector } from '../relic/RelicRewardSelector';
import type { RunState } from '../run/RunState';
import type { TreasureRewardCoordinator } from '../treasure/TreasureRewardCoordinator';

export interface GameSceneChestOpenScenePort {
  chestOpenHandler: GameSceneChestOpenHandler;
  runState: RunState;
  gameplayContext?: GameplayContext;
  relicRewardSelector: RelicRewardSelector;
  treasureRewardCoordinator: TreasureRewardCoordinator;
  progressionEffectSynchronizer: ProgressionEffectSynchronizer;
  playerPickupRange: number;
  relicAcquiredPresenter: RelicAcquiredPresenter;
  getProgressionEffectSyncContext(): ProgressionEffectSyncContext;
  emitHUDState(): void;
}

export class GameSceneChestOpenAdapter {
  handle(scene: GameSceneChestOpenScenePort): void {
    const playerPickupRange = scene.chestOpenHandler.handle({
      runState: scene.runState,
      gameplayContext: scene.gameplayContext,
      relicRewardSelector: scene.relicRewardSelector,
      treasureRewardCoordinator: scene.treasureRewardCoordinator,
      progressionEffectSynchronizer: scene.progressionEffectSynchronizer,
      progressionEffectSyncContext: scene.getProgressionEffectSyncContext(),
      relicAcquiredPresenter: scene.relicAcquiredPresenter,
      emitHUDState: () => scene.emitHUDState(),
    });

    if (playerPickupRange !== undefined) {
      scene.playerPickupRange = playerPickupRange;
    }
  }
}
