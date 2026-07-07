import type { AutoPlayer } from '../auto/AutoPlayer';
import type { AutoUpgradeSelector } from '../auto/AutoUpgradeSelector';
import { GeneratedStrategyPhaseTracker } from '../strategy/generated/GeneratedStrategyPhaseTracker';
import type { AutoStrategyProfile } from '../strategy/profile/AutoStrategyProfile';
import type { AutoTreasurePolicy } from '../strategy/policies/AutoTreasurePolicy';

export interface GameSceneRuntimeStrategyProfileSyncContext {
  gameTimeSeconds: number;
  autoPlayer: AutoPlayer;
  autoUpgradeSelector: AutoUpgradeSelector;
  autoTreasurePolicy: AutoTreasurePolicy;
}

export class GameSceneRuntimeStrategyProfileSynchronizer {
  private readonly generatedStrategyPhaseTracker = new GeneratedStrategyPhaseTracker();

  setStrategyForProfileId(strategyProfileId: string | undefined): void {
    this.generatedStrategyPhaseTracker.setStrategyForProfileId(strategyProfileId);
  }

  clear(): void {
    this.generatedStrategyPhaseTracker.clear();
  }

  hasGeneratedStrategy(): boolean {
    return this.generatedStrategyPhaseTracker.hasStrategy();
  }

  sync(
    profile: AutoStrategyProfile | undefined,
    context: GameSceneRuntimeStrategyProfileSyncContext,
  ): void {
    const activeProfile = this.generatedStrategyPhaseTracker.getActiveProfile(
      context.gameTimeSeconds,
    ) ?? profile;

    if (!activeProfile) {
      return;
    }

    context.autoPlayer.setStrategyProfile(activeProfile);
    context.autoUpgradeSelector.setStrategyProfile(activeProfile);
    context.autoTreasurePolicy.setProfile(activeProfile);
  }
}
