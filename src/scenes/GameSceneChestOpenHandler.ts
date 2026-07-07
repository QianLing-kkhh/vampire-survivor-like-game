import type { GameplayContext } from '../gameplay/GameplayContext';
import { RelicRegistry } from '../relic/RelicRegistry';
import type { RelicRewardSelector } from '../relic/RelicRewardSelector';
import type {
  ProgressionEffectSyncContext,
  ProgressionEffectSynchronizer,
} from '../progression/ProgressionEffectSynchronizer';
import type { RunState } from '../run/RunState';
import type { TreasureRewardCoordinator } from '../treasure/TreasureRewardCoordinator';
import type { RelicAcquiredPresenter } from '../ui/relic/RelicAcquiredPresenter';

export interface GameSceneChestOpenContext {
  runState: RunState;
  gameplayContext?: GameplayContext;
  relicRewardSelector: RelicRewardSelector;
  treasureRewardCoordinator: TreasureRewardCoordinator;
  progressionEffectSynchronizer: ProgressionEffectSynchronizer;
  progressionEffectSyncContext: ProgressionEffectSyncContext;
  relicAcquiredPresenter: RelicAcquiredPresenter;
  emitHUDState: () => void;
}

export class GameSceneChestOpenHandler {
  handle(context: GameSceneChestOpenContext): number | undefined {
    const result = context.treasureRewardCoordinator.handleChestOpened({
      runState: context.runState,
      relicManager: context.gameplayContext?.relicManager,
      randomManager: context.gameplayContext?.randomManager,
      relicRewardSelector: context.relicRewardSelector,
      relicDefinitions: RelicRegistry.list(),
    });

    if (!result.relicAwarded) {
      return undefined;
    }

    const playerPickupRange = context.progressionEffectSynchronizer.syncPlayerPickupRange(
      context.progressionEffectSyncContext,
    );
    context.relicAcquiredPresenter.show(result.relicAwarded);

    if (result.shouldRefreshHud) {
      context.emitHUDState();
    }

    return playerPickupRange;
  }
}
