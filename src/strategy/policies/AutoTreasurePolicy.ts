import type { AutoStrategyProfile } from '../profile/AutoStrategyProfile';
import { DEFAULT_AUTO_STRATEGY_PROFILE } from '../profile/AutoStrategyDefaults';
import { StrategyProfileValidator } from '../profile/StrategyProfileValidator';

export class AutoTreasurePolicy {
  private profile = StrategyProfileValidator.normalize(DEFAULT_AUTO_STRATEGY_PROFILE);

  setProfile(profile: AutoStrategyProfile): void {
    this.profile = StrategyProfileValidator.normalize(profile);
  }

  shouldAutoOpenTreasure(hpRatio = 1, hasEvolutionCandidate = false): boolean {
    if (hasEvolutionCandidate && this.profile.treasure.evolutionChestPriority >= 50) {
      return true;
    }

    return hpRatio * 100 >= 100 - this.profile.treasure.openRiskTolerance;
  }

  getRouteDeviationMultiplier(): number {
    return 0.5 + this.profile.treasure.routeDeviationTolerance / 100;
  }
}
