import type { AutoStrategyProfile } from '../profile/AutoStrategyProfile';
import { DEFAULT_AUTO_STRATEGY_PROFILE } from '../profile/AutoStrategyDefaults';
import { StrategyProfileValidator } from '../profile/StrategyProfileValidator';

export class AutoRelicPolicy {
  private profile = StrategyProfileValidator.normalize(DEFAULT_AUTO_STRATEGY_PROFILE);

  setProfile(profile: AutoStrategyProfile): void {
    this.profile = StrategyProfileValidator.normalize(profile);
  }

  getRelicScoreBiases(): AutoStrategyProfile['relic'] {
    return { ...this.profile.relic };
  }
}
