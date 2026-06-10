import { RandomManager } from '../random/RandomManager';
import { RelicDefinition } from '../relic/RelicDefinition';
import { RelicManager } from '../relic/RelicManager';
import { RelicRewardSelector } from '../relic/RelicRewardSelector';
import { RunState } from '../run/RunState';
import { SCORE_RULES } from '../score/ScoreRules';

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
    description?: string;
    rarity?: string;
    iconKey?: string;
  };
  shouldRefreshHud: boolean;
}

export class TreasureRewardCoordinator {
  private static readonly RELIC_AWARD_CHANCE = 0.2;

  handleChestOpened(context: TreasureRewardCoordinatorContext): TreasureOpenedResult {
    const treasureScoreMultiplier = this.getTreasureScoreMultiplier(context);

    context.runState.recordTreasureOpen();
    context.runState.recordScore('treasure', treasureScoreMultiplier);
    this.recordTreasureScoreRelicStats(context, treasureScoreMultiplier);

    const relicAwarded = this.tryAwardRelicFromChest(context);

    return {
      relicAwarded: relicAwarded ? {
        id: relicAwarded.id,
        name: relicAwarded.name ?? relicAwarded.nameKey ?? relicAwarded.id,
        description: relicAwarded.description ?? relicAwarded.descriptionKey,
        rarity: relicAwarded.rarity ?? 'common',
        iconKey: relicAwarded.iconKey,
      } : undefined,
      shouldRefreshHud: relicAwarded !== undefined,
    };
  }

  getTreasureScoreMultiplier(context: TreasureRewardCoordinatorContext): number {
    return context.relicManager?.getStatModifiers().treasureScoreMultiplier ?? 1;
  }

  private recordTreasureScoreRelicStats(
    context: TreasureRewardCoordinatorContext,
    treasureScoreMultiplier: number,
  ): void {
    const { relicManager } = context;

    if (!relicManager?.hasRelic('golden_scarab')) {
      return;
    }

    const extraScore = SCORE_RULES.treasureOpen * Math.max(0, treasureScoreMultiplier - 1);

    if (extraScore <= 0) {
      return;
    }

    relicManager.recordRelicTrigger('golden_scarab');
    relicManager.recordRelicScore('golden_scarab', extraScore);
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
