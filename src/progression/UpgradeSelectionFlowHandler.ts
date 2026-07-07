import type { EvolutionManager } from '../evolution/EvolutionManager';
import type { GameplayContext } from '../gameplay/GameplayContext';
import type { PlayerController } from '../player/PlayerController';
import type { LevelUpOptionsPresenter } from '../ui/LevelUpOptionsPresenter';
import type { TreasureRewardFeedbackController } from '../ui/TreasureRewardFeedbackController';

import type { UpgradeApplier } from './UpgradeApplier';
import type { UpgradeFlow } from './UpgradeFlow';
import type { UpgradeOption } from './UpgradeOption';
import type { UpgradeSelectionSource, UpgradeSelectionState } from './UpgradeSelectionState';

export interface UpgradeSelectionFlowContext {
  gameplayContext?: GameplayContext;
  upgradeSelectionState: UpgradeSelectionState;
  upgradeFlow?: UpgradeFlow;
  upgradeApplier?: UpgradeApplier;
  evolutionManager?: EvolutionManager;
  player?: PlayerController;
  autoOpenTreasure: boolean;
  gameTimeSeconds: number;
  runId: string;
  setGameplayPaused: (paused: boolean) => void;
  setVirtualJoystickActive: (active: boolean) => void;
  shouldVirtualJoystickBeActive: () => boolean;
  syncRuntimeStrategyProfile: () => void;
  treasureRewardFeedbackController: TreasureRewardFeedbackController;
  levelUpOptionsPresenter: LevelUpOptionsPresenter;
}

export class UpgradeSelectionFlowHandler {
  handleUpgradeSelected(option: UpgradeOption, context: UpgradeSelectionFlowContext): void {
    context.gameplayContext?.gameEventBus.emit('upgrade.selected', {
      upgradeId: option.id,
      source: context.upgradeSelectionState.source ?? 'levelUp',
      gameTimeSeconds: context.gameTimeSeconds,
    }, {
      gameTimeSeconds: context.gameTimeSeconds,
      runId: context.runId,
    });

    if (context.upgradeSelectionState.source === 'treasure') {
      const result = context.upgradeFlow?.applyTreasureSelectedReward(option);

      if (result) {
        context.treasureRewardFeedbackController.show(
          context.player?.getPositionLike(),
          result,
        );
      }
    } else {
      context.upgradeFlow?.applyLevelUpUpgrade(option);
    }

    this.clearSelection(context);
    context.setVirtualJoystickActive(context.shouldVirtualJoystickBeActive());
  }

  handleTreasureRewardRequested(context: UpgradeSelectionFlowContext): void {
    if (!context.upgradeFlow) {
      return;
    }

    context.syncRuntimeStrategyProfile();
    const result = context.upgradeFlow.applyTreasureReward(context.autoOpenTreasure);

    if (result.type !== 'pending' || !result.options?.length) {
      context.treasureRewardFeedbackController.show(
        context.player?.getPositionLike(),
        result,
      );
      return;
    }

    const selectedOptions = result.options.map((option) => ({
      ...option,
      displayInfo: context.upgradeApplier?.getUpgradeDisplayInfo(
        option,
        context.evolutionManager,
      ),
    }));

    this.openSelection('treasure', selectedOptions, context);
    context.gameplayContext?.gameEventBus.emit('upgrade.optionsShown', {
      optionIds: selectedOptions.map((option) => option.id),
      source: 'treasure',
      gameTimeSeconds: context.gameTimeSeconds,
    }, {
      gameTimeSeconds: context.gameTimeSeconds,
      runId: context.runId,
    });
    context.levelUpOptionsPresenter.show(selectedOptions);
  }

  openSelection(
    source: UpgradeSelectionSource,
    options: UpgradeOption[],
    context: UpgradeSelectionFlowContext,
  ): void {
    context.setGameplayPaused(true);
    context.upgradeSelectionState.open(source, options);
  }

  clearSelection(context: UpgradeSelectionFlowContext): void {
    context.setGameplayPaused(false);
    context.upgradeSelectionState.clear();
  }
}
