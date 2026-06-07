import { RandomManager } from '../random/RandomManager';
import { RelicDefinition } from '../relic/RelicDefinition';
import { RelicManager } from '../relic/RelicManager';
import { RelicRewardSelector } from '../relic/RelicRewardSelector';
import { RunState } from '../run/RunState';

export interface TreasureRewardCoordinatorContext {
  runState: RunState;
  relicManager?: RelicManager;
  randomManager?: RandomManager;
  relicRewardSelector: RelicRewardSelector;
  relicDefinitions: readonly RelicDefinition[];
}

export interface TreasureOpenedResult {
  relicAwarded?: {
    id: string;
    name: string;
  };
  shouldRefreshHud: boolean;
}

export class TreasureRewardCoordinator {
  private static readonly RELIC_AWARD_CHANCE = 0.2;

  handleChestOpened(context: TreasureRewardCoordinatorContext): TreasureOpenedResult {
    context.runState.recordTreasureOpen();
    context.runState.recordScore('treasure', this.getTreasureScoreMultiplier(context));

    const relicAwarded = this.tryAwardRelicFromChest(context);

    return {
      relicAwarded: relicAwarded ? {
        id: relicAwarded.id,
        name: relicAwarded.name ?? relicAwarded.nameKey ?? relicAwarded.id,
      } : undefined,
      shouldRefreshHud: relicAwarded !== undefined,
    };
  }

  getTreasureScoreMultiplier(context: TreasureRewardCoordinatorContext): number {
    return context.relicManager?.getStatModifiers().treasureScoreMultiplier ?? 1;
  }

  private tryAwardRelicFromChest(
    context: TreasureRewardCoordinatorContext,
  ): RelicDefinition | undefined {
    const { relicManager, randomManager } = context;

    if (!relicManager || !randomManager) {
      return undefined;
    }

    const random = randomManager.getSource('relic');

    if (!random.chance(TreasureRewardCoordinator.RELIC_AWARD_CHANCE)) {
      return undefined;
    }

    const relic = context.relicRewardSelector.selectAvailableRelic({
      ownedRelicIds: relicManager.getRelicIds(),
      random,
      definitions: context.relicDefinitions,
    });

    if (!relic || !relicManager.addRelic(relic.id)) {
      return undefined;
    }

    return relic;
  }
}
